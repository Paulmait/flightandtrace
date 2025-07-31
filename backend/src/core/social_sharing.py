"""
Social sharing features for FlightTrace
"""

from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
import json
import logging
import secrets
import hashlib
from dataclasses import dataclass
from src.db.database import get_connection
from src.core.auth import get_current_active_user
import qrcode
import io
import base64

logger = logging.getLogger(__name__)

@dataclass
class ShareableLink:
    """Shareable flight link data"""
    share_id: str
    url: str
    qr_code: str
    expires_at: Optional[datetime]
    permissions: Dict
    analytics_enabled: bool

class SocialSharingService:
    """Handle social sharing of flight data"""
    
    def __init__(self):
        self.base_url = "https://track.flighttrace.com"
        self.share_cache = {}
    
    async def create_shareable_link(self, user_id: int, flight_data: Dict,
                                  share_options: Dict) -> ShareableLink:
        """Create shareable link for flight"""
        
        # Generate unique share ID
        share_id = secrets.token_urlsafe(16)
        
        # Set expiration
        duration_hours = share_options.get('duration_hours', 24)
        expires_at = None if duration_hours == 0 else \
                    datetime.utcnow() + timedelta(hours=duration_hours)
        
        # Define permissions
        permissions = {
            'view_location': share_options.get('share_location', True),
            'view_history': share_options.get('share_history', False),
            'view_eta': share_options.get('share_eta', True),
            'view_weather': share_options.get('share_weather', True),
            'allow_notifications': share_options.get('allow_notifications', False),
            'require_password': share_options.get('require_password', False)
        }
        
        # Generate password if required
        password_hash = None
        if permissions['require_password']:
            password = share_options.get('password')
            if password:
                password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Store in database
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO shared_flights 
                (share_id, user_id, tail_number, permissions, password_hash,
                 expires_at, created_at, analytics_enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                share_id, user_id, flight_data['tail_number'],
                json.dumps(permissions), password_hash,
                expires_at, datetime.utcnow(),
                share_options.get('analytics', True)
            ))
            
            # Create share metadata
            cursor.execute("""
                INSERT INTO share_metadata
                (share_id, flight_snapshot, custom_message, theme)
                VALUES (?, ?, ?, ?)
            """, (
                share_id,
                json.dumps(self._create_flight_snapshot(flight_data)),
                share_options.get('message', ''),
                share_options.get('theme', 'default')
            ))
            
            conn.commit()
            
            # Generate shareable URL
            url = f"{self.base_url}/track/{share_id}"
            
            # Generate QR code
            qr_code = self._generate_qr_code(url)
            
            # Log share event
            self._log_share_event(user_id, share_id, 'created')
            
            return ShareableLink(
                share_id=share_id,
                url=url,
                qr_code=qr_code,
                expires_at=expires_at,
                permissions=permissions,
                analytics_enabled=share_options.get('analytics', True)
            )
            
        finally:
            conn.close()
    
    def _create_flight_snapshot(self, flight_data: Dict) -> Dict:
        """Create snapshot of current flight data"""
        return {
            'tail_number': flight_data.get('tail_number'),
            'aircraft_type': flight_data.get('aircraft_type'),
            'departure': flight_data.get('departure_airport'),
            'arrival': flight_data.get('arrival_airport'),
            'status': flight_data.get('status'),
            'position': {
                'lat': flight_data.get('latitude'),
                'lng': flight_data.get('longitude'),
                'altitude': flight_data.get('altitude'),
                'speed': flight_data.get('speed'),
                'heading': flight_data.get('heading')
            },
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _generate_qr_code(self, url: str) -> str:
        """Generate QR code for URL"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    async def get_shared_flight(self, share_id: str, 
                               password: Optional[str] = None) -> Dict:
        """Get shared flight data"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Get share data
            cursor.execute("""
                SELECT sf.*, sm.flight_snapshot, sm.custom_message, sm.theme,
                       u.username
                FROM shared_flights sf
                JOIN share_metadata sm ON sf.share_id = sm.share_id
                JOIN users u ON sf.user_id = u.user_id
                WHERE sf.share_id = ? AND sf.is_active = 1
            """, (share_id,))
            
            result = cursor.fetchone()
            if not result:
                raise ValueError("Share link not found or expired")
            
            # Check expiration
            if result['expires_at'] and \
               datetime.fromisoformat(result['expires_at']) < datetime.utcnow():
                raise ValueError("Share link has expired")
            
            # Check password if required
            permissions = json.loads(result['permissions'])
            if permissions.get('require_password') and result['password_hash']:
                if not password:
                    raise ValueError("Password required")
                
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                if password_hash != result['password_hash']:
                    raise ValueError("Invalid password")
            
            # Log view if analytics enabled
            if result['analytics_enabled']:
                self._log_share_event(None, share_id, 'viewed')
            
            # Get current flight data
            tail_number = result['tail_number']
            flight_data = await self._get_current_flight_data(
                tail_number, permissions
            )
            
            return {
                'share_id': share_id,
                'tail_number': tail_number,
                'shared_by': result['username'],
                'message': result['custom_message'],
                'theme': result['theme'],
                'permissions': permissions,
                'flight_data': flight_data,
                'snapshot': json.loads(result['flight_snapshot'])
            }
            
        finally:
            conn.close()
    
    async def _get_current_flight_data(self, tail_number: str, 
                                      permissions: Dict) -> Dict:
        """Get current flight data based on permissions"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Get latest flight state
            cursor.execute("""
                SELECT * FROM flight_states
                WHERE tail_number = ?
                ORDER BY timestamp DESC
                LIMIT 1
            """, (tail_number,))
            
            flight = cursor.fetchone()
            if not flight:
                return {'status': 'No recent data'}
            
            # Build response based on permissions
            data = {
                'status': flight['status'],
                'last_updated': flight['timestamp']
            }
            
            if permissions.get('view_location'):
                data['position'] = {
                    'latitude': flight['latitude'],
                    'longitude': flight['longitude'],
                    'altitude': flight['altitude'],
                    'speed': flight['speed'],
                    'heading': flight['heading']
                }
            
            if permissions.get('view_eta'):
                data['eta'] = flight['estimated_arrival']
                data['route'] = {
                    'departure': flight['departure_airport'],
                    'arrival': flight['arrival_airport']
                }
            
            if permissions.get('view_history'):
                # Get flight path history
                cursor.execute("""
                    SELECT latitude, longitude, altitude, timestamp
                    FROM flight_states
                    WHERE tail_number = ?
                    AND timestamp >= datetime('now', '-4 hours')
                    ORDER BY timestamp
                """, (tail_number,))
                
                data['history'] = [
                    {
                        'lat': row[0],
                        'lng': row[1],
                        'alt': row[2],
                        'time': row[3]
                    }
                    for row in cursor.fetchall()
                ]
            
            return data
            
        finally:
            conn.close()
    
    def _log_share_event(self, user_id: Optional[int], share_id: str, 
                        event_type: str):
        """Log sharing event for analytics"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO share_analytics
                (share_id, event_type, user_id, timestamp, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (share_id, event_type, user_id, datetime.utcnow(), None, None))
            
            conn.commit()
        except Exception as e:
            logger.error(f"Error logging share event: {e}")
        finally:
            conn.close()
    
    async def get_share_analytics(self, user_id: int, share_id: str) -> Dict:
        """Get analytics for shared link"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Verify ownership
            cursor.execute("""
                SELECT user_id FROM shared_flights
                WHERE share_id = ? AND user_id = ?
            """, (share_id, user_id))
            
            if not cursor.fetchone():
                raise PermissionError("Not authorized to view analytics")
            
            # Get view count
            cursor.execute("""
                SELECT COUNT(*), COUNT(DISTINCT ip_address)
                FROM share_analytics
                WHERE share_id = ? AND event_type = 'viewed'
            """, (share_id,))
            
            views, unique_views = cursor.fetchone()
            
            # Get view timeline
            cursor.execute("""
                SELECT DATE(timestamp) as date, COUNT(*) as views
                FROM share_analytics
                WHERE share_id = ? AND event_type = 'viewed'
                GROUP BY DATE(timestamp)
                ORDER BY date
            """, (share_id,))
            
            timeline = [
                {'date': row[0], 'views': row[1]}
                for row in cursor.fetchall()
            ]
            
            # Get referrers
            cursor.execute("""
                SELECT referrer, COUNT(*) as count
                FROM share_analytics
                WHERE share_id = ? AND referrer IS NOT NULL
                GROUP BY referrer
                ORDER BY count DESC
                LIMIT 10
            """, (share_id,))
            
            referrers = [
                {'source': row[0], 'count': row[1]}
                for row in cursor.fetchall()
            ]
            
            return {
                'total_views': views,
                'unique_views': unique_views,
                'timeline': timeline,
                'referrers': referrers,
                'share_id': share_id
            }
            
        finally:
            conn.close()
    
    async def create_social_post(self, user_id: int, flight_data: Dict,
                               platform: str, options: Dict) -> Dict:
        """Create social media post content"""
        
        templates = {
            'twitter': {
                'tracking': "✈️ Tracking {tail_number} from {departure} to {arrival}. "
                          "Currently at {altitude}ft traveling {speed}kts. "
                          "Track live: {url} #FlightTrace",
                'landed': "✈️ {tail_number} has safely landed at {arrival}! "
                         "Flight time: {duration}. Track more flights: {url} #FlightTrace",
                'delayed': "⏰ {tail_number} is delayed. New ETA: {eta}. "
                          "Get real-time updates: {url} #FlightTrace"
            },
            'facebook': {
                'tracking': "I'm tracking {tail_number} on FlightTrace! 🛩️\n\n"
                          "📍 Route: {departure} → {arrival}\n"
                          "🎯 Altitude: {altitude} ft\n"
                          "💨 Speed: {speed} kts\n\n"
                          "Track this flight live: {url}",
                'landed': "Great news! {tail_number} has landed safely at {arrival}. ✈️\n\n"
                         "Flight duration: {duration}\n"
                         "Distance covered: {distance} nm\n\n"
                         "Track your flights with FlightTrace: {url}"
            },
            'instagram': {
                'tracking': "✈️ Live tracking {tail_number}\n"
                          "📍 {departure} → {arrival}\n"
                          "🎯 {altitude}ft | {speed}kts\n\n"
                          "#FlightTracking #Aviation #FlightTrace\n"
                          "Link in bio for live tracking! 🔗"
            }
        }
        
        # Get template
        template = templates.get(platform, {}).get(
            options.get('type', 'tracking'), ''
        )
        
        # Create shareable link
        share_link = await self.create_shareable_link(
            user_id, flight_data, {
                'duration_hours': 48,
                'analytics': True
            }
        )
        
        # Format post content
        content = template.format(
            tail_number=flight_data['tail_number'],
            departure=flight_data.get('departure_airport', 'Unknown'),
            arrival=flight_data.get('arrival_airport', 'Unknown'),
            altitude=flight_data.get('altitude', 0),
            speed=flight_data.get('speed', 0),
            url=share_link.url,
            duration=flight_data.get('flight_duration', 'N/A'),
            distance=flight_data.get('distance', 'N/A'),
            eta=flight_data.get('eta', 'Unknown')
        )
        
        # Generate image if requested
        image_url = None
        if options.get('include_map'):
            image_url = await self._generate_share_image(flight_data)
        
        return {
            'platform': platform,
            'content': content,
            'url': share_link.url,
            'image_url': image_url,
            'hashtags': self._get_hashtags(platform),
            'share_id': share_link.share_id
        }
    
    def _get_hashtags(self, platform: str) -> List[str]:
        """Get recommended hashtags for platform"""
        base_tags = ['FlightTrace', 'FlightTracking', 'Aviation']
        
        platform_tags = {
            'twitter': ['AvGeek', 'PlaneLive'],
            'instagram': ['InstaAviation', 'PlanesOfInstagram', 'AviationLovers'],
            'facebook': ['GeneralAviation', 'Pilots']
        }
        
        return base_tags + platform_tags.get(platform, [])
    
    async def _generate_share_image(self, flight_data: Dict) -> str:
        """Generate shareable map image"""
        # In production, use map generation service
        # This would create a static map image with flight path
        return f"{self.base_url}/api/map/share/{flight_data['tail_number']}.png"


class FlightBlogService:
    """Service for flight blog/journal features"""
    
    async def create_flight_entry(self, user_id: int, flight_data: Dict,
                                entry_data: Dict) -> int:
        """Create blog entry for flight"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Create blog entry
            cursor.execute("""
                INSERT INTO flight_blog_entries
                (user_id, tail_number, flight_date, title, content,
                 weather_conditions, flight_notes, is_public, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                flight_data['tail_number'],
                flight_data['date'],
                entry_data['title'],
                entry_data['content'],
                json.dumps(entry_data.get('weather', {})),
                entry_data.get('notes', ''),
                entry_data.get('is_public', False),
                json.dumps(entry_data.get('tags', []))
            ))
            
            entry_id = cursor.lastrowid
            
            # Add photos if provided
            for photo in entry_data.get('photos', []):
                cursor.execute("""
                    INSERT INTO blog_photos
                    (entry_id, photo_url, caption, taken_at)
                    VALUES (?, ?, ?, ?)
                """, (entry_id, photo['url'], photo.get('caption', ''),
                     photo.get('taken_at')))
            
            conn.commit()
            return entry_id
            
        finally:
            conn.close()
    
    async def get_public_entries(self, limit: int = 20, 
                               offset: int = 0) -> List[Dict]:
        """Get public flight blog entries"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT fbe.*, u.username, 
                       (SELECT COUNT(*) FROM blog_likes 
                        WHERE entry_id = fbe.entry_id) as likes,
                       (SELECT COUNT(*) FROM blog_comments 
                        WHERE entry_id = fbe.entry_id) as comments
                FROM flight_blog_entries fbe
                JOIN users u ON fbe.user_id = u.user_id
                WHERE fbe.is_public = 1
                ORDER BY fbe.created_at DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))
            
            entries = []
            for row in cursor.fetchall():
                entry = dict(row)
                
                # Get photos
                cursor.execute("""
                    SELECT photo_url, caption FROM blog_photos
                    WHERE entry_id = ?
                """, (entry['entry_id'],))
                
                entry['photos'] = [
                    {'url': p[0], 'caption': p[1]}
                    for p in cursor.fetchall()
                ]
                
                entries.append(entry)
            
            return entries
            
        finally:
            conn.close()


# Global service instances
social_sharing = SocialSharingService()
flight_blog = FlightBlogService()