"""
Family sharing features for FlightTrace
"""

from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
import json
import logging
from src.db.database import get_connection
from src.core.auth import get_current_active_user
from src.core.notification import send_notification
import secrets
import hashlib

logger = logging.getLogger(__name__)

class FamilyGroup:
    def __init__(self, family_id: int):
        self.family_id = family_id
        self.members = []
        self.settings = {}
        self.shared_flights = set()
        self._load_family_data()
    
    def _load_family_data(self):
        """Load family data from database"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Load family settings
            cursor.execute("""
                SELECT name, settings, created_by, created_at
                FROM family_groups
                WHERE family_id = ?
            """, (self.family_id,))
            
            result = cursor.fetchone()
            if result:
                self.name = result[0]
                self.settings = json.loads(result[1]) if result[1] else {}
                self.owner_id = result[2]
                self.created_at = result[3]
            
            # Load members
            cursor.execute("""
                SELECT fm.member_id, fm.role, fm.permissions, fm.joined_at,
                       u.username, u.email
                FROM family_members fm
                JOIN users u ON fm.member_id = u.user_id
                WHERE fm.family_id = ?
                ORDER BY fm.role DESC, fm.joined_at
            """, (self.family_id,))
            
            self.members = []
            for row in cursor.fetchall():
                self.members.append({
                    "user_id": row[0],
                    "role": row[1],
                    "permissions": json.loads(row[2]) if row[2] else {},
                    "joined_at": row[3],
                    "username": row[4],
                    "email": row[5]
                })
            
            # Load shared flights
            cursor.execute("""
                SELECT tail_number FROM family_shared_flights
                WHERE family_id = ? AND is_active = 1
            """, (self.family_id,))
            
            self.shared_flights = {row[0] for row in cursor.fetchall()}
            
        finally:
            conn.close()
    
    def add_member(self, inviter_id: int, email: str, role: str = "member") -> str:
        """Add new family member"""
        if not self.can_manage_members(inviter_id):
            raise PermissionError("No permission to add members")
        
        # Generate invitation token
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Create invitation
            cursor.execute("""
                INSERT INTO family_invitations 
                (family_id, email, role, token_hash, invited_by, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                self.family_id, email, role, token_hash, inviter_id,
                datetime.utcnow() + timedelta(days=7)
            ))
            
            conn.commit()
            
            # Send invitation email
            self._send_invitation_email(email, token)
            
            return token
            
        finally:
            conn.close()
    
    def accept_invitation(self, user_id: int, token: str) -> bool:
        """Accept family invitation"""
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Verify invitation
            cursor.execute("""
                SELECT family_id, role, email
                FROM family_invitations
                WHERE token_hash = ? AND expires_at > datetime('now')
                AND accepted_at IS NULL
            """, (token_hash,))
            
            result = cursor.fetchone()
            if not result:
                return False
            
            family_id, role, invited_email = result
            
            # Add member to family
            default_permissions = self._get_default_permissions(role)
            
            cursor.execute("""
                INSERT INTO family_members (family_id, member_id, role, permissions)
                VALUES (?, ?, ?, ?)
            """, (family_id, user_id, role, json.dumps(default_permissions)))
            
            # Mark invitation as accepted
            cursor.execute("""
                UPDATE family_invitations
                SET accepted_at = ?, accepted_by = ?
                WHERE token_hash = ?
            """, (datetime.utcnow(), user_id, token_hash))
            
            conn.commit()
            
            # Notify family members
            self._notify_family_members(f"New member joined: {invited_email}")
            
            return True
            
        finally:
            conn.close()
    
    def update_member_permissions(self, updater_id: int, member_id: int, 
                                permissions: Dict) -> bool:
        """Update member permissions"""
        if not self.can_manage_members(updater_id):
            raise PermissionError("No permission to manage members")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                UPDATE family_members
                SET permissions = ?, updated_at = ?
                WHERE family_id = ? AND member_id = ?
            """, (json.dumps(permissions), datetime.utcnow(), 
                  self.family_id, member_id))
            
            conn.commit()
            return cursor.rowcount > 0
            
        finally:
            conn.close()
    
    def share_flight(self, user_id: int, tail_number: str, 
                    share_settings: Optional[Dict] = None) -> bool:
        """Share flight with family"""
        if not self.can_share_flights(user_id):
            raise PermissionError("No permission to share flights")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if user has access to this flight
            cursor.execute("""
                SELECT id FROM tail_numbers
                WHERE user_id = ? AND tail_number = ? AND is_active = 1
            """, (user_id, tail_number))
            
            if not cursor.fetchone():
                raise ValueError("Flight not found or not owned by user")
            
            # Share with family
            settings = share_settings or {
                "notify_all": True,
                "share_history": True,
                "allow_tracking": True
            }
            
            cursor.execute("""
                INSERT OR REPLACE INTO family_shared_flights
                (family_id, tail_number, shared_by, share_settings, is_active)
                VALUES (?, ?, ?, ?, 1)
            """, (self.family_id, tail_number, user_id, json.dumps(settings)))
            
            conn.commit()
            
            # Notify family members
            self._notify_family_members(
                f"Flight {tail_number} shared by {self._get_member_name(user_id)}"
            )
            
            return True
            
        finally:
            conn.close()
    
    def get_shared_flights(self) -> List[Dict]:
        """Get all shared flights with details"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT fsf.tail_number, fsf.shared_by, fsf.share_settings,
                       fsf.shared_at, u.username,
                       fs.status, fs.latitude, fs.longitude, fs.altitude
                FROM family_shared_flights fsf
                JOIN users u ON fsf.shared_by = u.user_id
                LEFT JOIN flight_states fs ON fsf.tail_number = fs.tail_number
                    AND fs.timestamp = (
                        SELECT MAX(timestamp) FROM flight_states 
                        WHERE tail_number = fsf.tail_number
                    )
                WHERE fsf.family_id = ? AND fsf.is_active = 1
            """, (self.family_id,))
            
            flights = []
            for row in cursor.fetchall():
                flights.append({
                    "tail_number": row[0],
                    "shared_by": row[1],
                    "share_settings": json.loads(row[2]) if row[2] else {},
                    "shared_at": row[3],
                    "shared_by_name": row[4],
                    "current_status": {
                        "status": row[5],
                        "position": {
                            "lat": row[6],
                            "lng": row[7],
                            "altitude": row[8]
                        } if row[6] else None
                    }
                })
            
            return flights
            
        finally:
            conn.close()
    
    def get_family_activity(self, days: int = 7) -> List[Dict]:
        """Get recent family activity"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT fa.activity_type, fa.description, fa.member_id,
                       fa.timestamp, u.username
                FROM family_activity fa
                JOIN users u ON fa.member_id = u.user_id
                WHERE fa.family_id = ?
                AND fa.timestamp >= datetime('now', '-' || ? || ' days')
                ORDER BY fa.timestamp DESC
                LIMIT 50
            """, (self.family_id, days))
            
            activities = []
            for row in cursor.fetchall():
                activities.append({
                    "type": row[0],
                    "description": row[1],
                    "member_id": row[2],
                    "timestamp": row[3],
                    "member_name": row[4]
                })
            
            return activities
            
        finally:
            conn.close()
    
    def create_location_alert(self, creator_id: int, alert_config: Dict) -> int:
        """Create location-based alert for family"""
        if not self.can_create_alerts(creator_id):
            raise PermissionError("No permission to create alerts")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO family_location_alerts
                (family_id, tail_number, alert_type, location_data, 
                 radius_nm, created_by, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            """, (
                self.family_id,
                alert_config['tail_number'],
                alert_config['type'],  # arrival, departure, waypoint
                json.dumps(alert_config['location']),
                alert_config.get('radius', 5),
                creator_id
            ))
            
            alert_id = cursor.lastrowid
            conn.commit()
            
            return alert_id
            
        finally:
            conn.close()
    
    def _notify_family_members(self, message: str, exclude_user: Optional[int] = None):
        """Send notification to all family members"""
        for member in self.members:
            if member['user_id'] != exclude_user:
                send_notification(
                    member['user_id'],
                    "family_update",
                    {
                        "family_id": self.family_id,
                        "message": message,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
    
    def can_manage_members(self, user_id: int) -> bool:
        """Check if user can manage family members"""
        member = self._get_member(user_id)
        return member and member['role'] in ['owner', 'admin']
    
    def can_share_flights(self, user_id: int) -> bool:
        """Check if user can share flights"""
        member = self._get_member(user_id)
        return member and member['permissions'].get('share_flights', True)
    
    def can_create_alerts(self, user_id: int) -> bool:
        """Check if user can create alerts"""
        member = self._get_member(user_id)
        return member and member['permissions'].get('create_alerts', True)
    
    def _get_member(self, user_id: int) -> Optional[Dict]:
        """Get member by user ID"""
        for member in self.members:
            if member['user_id'] == user_id:
                return member
        return None
    
    def _get_member_name(self, user_id: int) -> str:
        """Get member's display name"""
        member = self._get_member(user_id)
        return member['username'] if member else 'Unknown'
    
    def _get_default_permissions(self, role: str) -> Dict:
        """Get default permissions for role"""
        if role == 'owner':
            return {
                "share_flights": True,
                "create_alerts": True,
                "manage_members": True,
                "manage_settings": True,
                "delete_family": True
            }
        elif role == 'admin':
            return {
                "share_flights": True,
                "create_alerts": True,
                "manage_members": True,
                "manage_settings": True,
                "delete_family": False
            }
        else:  # member
            return {
                "share_flights": True,
                "create_alerts": True,
                "manage_members": False,
                "manage_settings": False,
                "delete_family": False
            }
    
    def _send_invitation_email(self, email: str, token: str):
        """Send family invitation email"""
        # In production, use proper email service
        logger.info(f"Invitation sent to {email} with token: {token}")

class FamilyManager:
    """Manage family groups"""
    
    @staticmethod
    def create_family(creator_id: int, name: str, settings: Optional[Dict] = None) -> int:
        """Create new family group"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Create family group
            cursor.execute("""
                INSERT INTO family_groups (name, settings, created_by)
                VALUES (?, ?, ?)
            """, (name, json.dumps(settings or {}), creator_id))
            
            family_id = cursor.lastrowid
            
            # Add creator as owner
            cursor.execute("""
                INSERT INTO family_members (family_id, member_id, role, permissions)
                VALUES (?, ?, 'owner', ?)
            """, (family_id, creator_id, json.dumps({
                "share_flights": True,
                "create_alerts": True,
                "manage_members": True,
                "manage_settings": True,
                "delete_family": True
            })))
            
            conn.commit()
            
            return family_id
            
        finally:
            conn.close()
    
    @staticmethod
    def get_user_families(user_id: int) -> List[Dict]:
        """Get all families user belongs to"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT fg.family_id, fg.name, fm.role, fm.joined_at,
                       (SELECT COUNT(*) FROM family_members 
                        WHERE family_id = fg.family_id) as member_count
                FROM family_groups fg
                JOIN family_members fm ON fg.family_id = fm.family_id
                WHERE fm.member_id = ?
                ORDER BY fm.role DESC, fm.joined_at DESC
            """, (user_id,))
            
            families = []
            for row in cursor.fetchall():
                families.append({
                    "family_id": row[0],
                    "name": row[1],
                    "role": row[2],
                    "joined_at": row[3],
                    "member_count": row[4]
                })
            
            return families
            
        finally:
            conn.close()
    
    @staticmethod
    def check_location_alerts(flight_update: Dict):
        """Check if flight triggers any location alerts"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Get active location alerts for this flight
            cursor.execute("""
                SELECT fla.alert_id, fla.family_id, fla.alert_type,
                       fla.location_data, fla.radius_nm
                FROM family_location_alerts fla
                WHERE fla.tail_number = ? AND fla.is_active = 1
            """, (flight_update['tail_number'],))
            
            for row in cursor.fetchall():
                alert_id, family_id, alert_type, location_data, radius = row
                location = json.loads(location_data)
                
                # Check if flight is within alert radius
                distance = calculate_distance(
                    flight_update['lat'], flight_update['lng'],
                    location['lat'], location['lng']
                )
                
                if distance <= radius:
                    # Trigger alert
                    family = FamilyGroup(family_id)
                    message = f"{flight_update['tail_number']} is {alert_type} at {location.get('name', 'location')}"
                    family._notify_family_members(message)
                    
                    # Log alert trigger
                    cursor.execute("""
                        INSERT INTO family_alert_history
                        (alert_id, triggered_at, flight_position)
                        VALUES (?, ?, ?)
                    """, (alert_id, datetime.utcnow(), 
                          json.dumps({'lat': flight_update['lat'], 
                                    'lng': flight_update['lng']})))
            
            conn.commit()
            
        finally:
            conn.close()

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in nautical miles"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 3440.065  # Earth radius in nautical miles
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c