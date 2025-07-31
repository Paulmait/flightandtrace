"""
AI-powered predictions and smart notifications for FlightTrace
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import json
import logging
from sklearn.ensemble import RandomForestRegressor
import joblib
import aiohttp
from src.db.database import get_connection

logger = logging.getLogger(__name__)

class FlightPredictionEngine:
    def __init__(self):
        self.delay_model = None
        self.turbulence_model = None
        self.weather_cache = {}
        self.airport_stats = {}
        
    async def predict_delay(self, flight_data: Dict) -> Dict:
        """Predict flight delays using ML model"""
        try:
            features = self._extract_delay_features(flight_data)
            
            # Get weather data
            weather = await self._get_weather_data(
                flight_data['departure_airport'],
                flight_data['arrival_airport']
            )
            
            # Historical performance
            historical = self._get_historical_performance(
                flight_data['tail_number'],
                flight_data['route']
            )
            
            # Calculate delay probability
            delay_probability = self._calculate_delay_probability(
                features, weather, historical
            )
            
            # Generate smart notification
            notification = self._generate_smart_notification(
                delay_probability,
                flight_data
            )
            
            return {
                "delay_probability": delay_probability,
                "predicted_delay_minutes": delay_probability.get("expected_delay", 0),
                "confidence": delay_probability.get("confidence", 0.7),
                "factors": delay_probability.get("factors", []),
                "notification": notification,
                "recommendations": self._get_recommendations(delay_probability)
            }
            
        except Exception as e:
            logger.error(f"Error predicting delay: {str(e)}")
            return {"error": "Prediction unavailable"}
    
    def _extract_delay_features(self, flight_data: Dict) -> np.ndarray:
        """Extract features for delay prediction"""
        features = []
        
        # Time features
        departure_time = datetime.fromisoformat(flight_data['scheduled_departure'])
        features.extend([
            departure_time.hour,
            departure_time.weekday(),
            departure_time.month,
            int(departure_time.strftime('%j'))  # Day of year
        ])
        
        # Route features
        features.extend([
            self._encode_airport(flight_data['departure_airport']),
            self._encode_airport(flight_data['arrival_airport']),
            flight_data.get('distance', 0),
            flight_data.get('scheduled_duration', 0)
        ])
        
        # Aircraft features
        features.extend([
            self._encode_aircraft_type(flight_data.get('aircraft_type', '')),
            flight_data.get('aircraft_age', 0)
        ])
        
        return np.array(features).reshape(1, -1)
    
    async def _get_weather_data(self, departure: str, arrival: str) -> Dict:
        """Get weather data for airports"""
        weather_data = {}
        
        for airport in [departure, arrival]:
            if airport in self.weather_cache:
                # Use cached data if recent
                cache_time, data = self.weather_cache[airport]
                if datetime.utcnow() - cache_time < timedelta(minutes=30):
                    weather_data[airport] = data
                    continue
            
            # Fetch new weather data
            try:
                # In production, use real weather API
                weather = {
                    "visibility": 10,  # miles
                    "wind_speed": 15,  # knots
                    "precipitation": 0,  # inches
                    "temperature": 72,  # fahrenheit
                    "conditions": "clear"
                }
                
                self.weather_cache[airport] = (datetime.utcnow(), weather)
                weather_data[airport] = weather
                
            except Exception as e:
                logger.error(f"Error fetching weather for {airport}: {e}")
                weather_data[airport] = {}
        
        return weather_data
    
    def _get_historical_performance(self, tail_number: str, route: Tuple[str, str]) -> Dict:
        """Get historical performance data"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Get on-time performance for this aircraft
            cursor.execute("""
                SELECT 
                    AVG(CAST(julianday(actual_arrival) - julianday(scheduled_arrival) AS REAL) * 24 * 60) as avg_delay,
                    COUNT(*) as total_flights,
                    SUM(CASE WHEN actual_arrival > scheduled_arrival THEN 1 ELSE 0 END) as delayed_flights
                FROM flight_history
                WHERE tail_number = ?
                AND departure_airport = ?
                AND arrival_airport = ?
                AND timestamp >= datetime('now', '-90 days')
            """, (tail_number, route[0], route[1]))
            
            result = cursor.fetchone()
            
            if result and result[1] > 0:
                return {
                    "average_delay": result[0] or 0,
                    "total_flights": result[1],
                    "delay_rate": result[2] / result[1] if result[1] > 0 else 0
                }
            
            return {"average_delay": 0, "total_flights": 0, "delay_rate": 0}
            
        finally:
            conn.close()
    
    def _calculate_delay_probability(self, features: np.ndarray, 
                                   weather: Dict, historical: Dict) -> Dict:
        """Calculate delay probability using multiple factors"""
        
        # Base probability from historical data
        base_probability = historical.get('delay_rate', 0.2)
        
        # Weather impact
        weather_factor = 0
        for airport, conditions in weather.items():
            if conditions.get('visibility', 10) < 3:
                weather_factor += 0.3
            if conditions.get('wind_speed', 0) > 25:
                weather_factor += 0.2
            if conditions.get('precipitation', 0) > 0.5:
                weather_factor += 0.25
        
        # Time of day impact (rush hours)
        hour = features[0][0]
        if 6 <= hour <= 9 or 16 <= hour <= 19:
            time_factor = 0.15
        else:
            time_factor = 0
        
        # Day of week impact (Fridays and Sundays are busier)
        day = features[0][1]
        if day in [4, 6]:  # Friday or Sunday
            day_factor = 0.1
        else:
            day_factor = 0
        
        # Calculate final probability
        total_probability = min(0.95, base_probability + weather_factor + time_factor + day_factor)
        
        # Expected delay calculation
        if total_probability > 0.5:
            expected_delay = int(15 + (total_probability - 0.5) * 60)
        else:
            expected_delay = int(total_probability * 15)
        
        # Identify main factors
        factors = []
        if weather_factor > 0.2:
            factors.append("weather")
        if time_factor > 0:
            factors.append("peak_hours")
        if historical.get('average_delay', 0) > 15:
            factors.append("historical_delays")
        
        return {
            "probability": total_probability,
            "expected_delay": expected_delay,
            "confidence": 0.8 if historical['total_flights'] > 10 else 0.6,
            "factors": factors
        }
    
    def _generate_smart_notification(self, prediction: Dict, flight_data: Dict) -> Dict:
        """Generate intelligent notification based on prediction"""
        
        probability = prediction['probability']
        expected_delay = prediction['expected_delay']
        factors = prediction['factors']
        
        # Determine notification priority
        if probability > 0.8 or expected_delay > 60:
            priority = "high"
            urgency = "immediate"
        elif probability > 0.5 or expected_delay > 30:
            priority = "medium"
            urgency = "soon"
        else:
            priority = "low"
            urgency = "informational"
        
        # Create personalized message
        if probability > 0.8:
            title = f"⚠️ High Delay Risk for {flight_data['tail_number']}"
            message = f"Flight likely delayed by {expected_delay} minutes"
        elif probability > 0.5:
            title = f"⏰ Possible Delay for {flight_data['tail_number']}"
            message = f"Flight may be delayed by {expected_delay} minutes"
        else:
            title = f"✈️ {flight_data['tail_number']} On Schedule"
            message = "Flight expected to depart on time"
        
        # Add factor-specific advice
        advice = []
        if "weather" in factors:
            advice.append("Check weather conditions at airports")
        if "peak_hours" in factors:
            advice.append("Allow extra time due to busy period")
        if "historical_delays" in factors:
            advice.append("This route frequently experiences delays")
        
        return {
            "title": title,
            "message": message,
            "priority": priority,
            "urgency": urgency,
            "advice": advice,
            "actions": self._get_notification_actions(probability, flight_data)
        }
    
    def _get_notification_actions(self, probability: float, flight_data: Dict) -> List[Dict]:
        """Get actionable items for notifications"""
        actions = []
        
        if probability > 0.7:
            actions.append({
                "type": "rebook",
                "label": "Check rebooking options",
                "url": f"/flights/{flight_data['tail_number']}/alternatives"
            })
        
        if probability > 0.5:
            actions.append({
                "type": "notify_family",
                "label": "Alert family members",
                "action": "send_family_alert"
            })
        
        actions.append({
            "type": "track_live",
            "label": "Track live position",
            "url": f"/flights/{flight_data['tail_number']}/live"
        })
        
        return actions
    
    def _get_recommendations(self, prediction: Dict) -> List[str]:
        """Get personalized recommendations"""
        recommendations = []
        
        if prediction['probability'] > 0.7:
            recommendations.extend([
                "Consider arriving at the airport earlier",
                "Download entertainment for potential wait time",
                "Check if lounge access is available"
            ])
        
        if "weather" in prediction.get('factors', []):
            recommendations.append("Monitor weather updates closely")
        
        if prediction['expected_delay'] > 45:
            recommendations.append("Consider rebooking on an earlier flight")
        
        return recommendations
    
    def _encode_airport(self, airport_code: str) -> int:
        """Encode airport code as numeric feature"""
        # In production, use proper encoding
        return hash(airport_code) % 1000
    
    def _encode_aircraft_type(self, aircraft_type: str) -> int:
        """Encode aircraft type as numeric feature"""
        types = {
            "cessna": 1,
            "piper": 2,
            "beechcraft": 3,
            "cirrus": 4,
            "other": 5
        }
        return types.get(aircraft_type.lower(), 5)

class SmartNotificationEngine:
    """Generate context-aware notifications"""
    
    def __init__(self):
        self.user_preferences = {}
        self.notification_history = {}
    
    async def generate_notification(self, user_id: int, event: Dict) -> Optional[Dict]:
        """Generate smart notification based on user context"""
        
        # Load user preferences
        preferences = await self._load_user_preferences(user_id)
        
        # Check notification fatigue
        if self._check_notification_fatigue(user_id, event):
            return None
        
        # Determine notification channel
        channel = self._select_channel(preferences, event)
        
        # Personalize content
        content = self._personalize_content(preferences, event)
        
        # Add smart timing
        delivery_time = self._calculate_delivery_time(preferences, event)
        
        return {
            "user_id": user_id,
            "channel": channel,
            "content": content,
            "delivery_time": delivery_time,
            "priority": event.get("priority", "medium"),
            "expires_at": delivery_time + timedelta(hours=2)
        }
    
    async def _load_user_preferences(self, user_id: int) -> Dict:
        """Load user notification preferences"""
        if user_id in self.user_preferences:
            return self.user_preferences[user_id]
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT preferences FROM notification_preferences
                WHERE user_id = ?
            """, (user_id,))
            
            result = cursor.fetchone()
            if result:
                preferences = json.loads(result[0])
            else:
                preferences = {
                    "channels": ["push", "email"],
                    "quiet_hours": {"start": 22, "end": 7},
                    "min_priority": "medium",
                    "grouping": True
                }
            
            self.user_preferences[user_id] = preferences
            return preferences
            
        finally:
            conn.close()
    
    def _check_notification_fatigue(self, user_id: int, event: Dict) -> bool:
        """Check if user has received too many notifications"""
        
        # Get recent notifications
        user_history = self.notification_history.get(user_id, [])
        
        # Clean old entries
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        user_history = [n for n in user_history if n['time'] > cutoff_time]
        
        # Check limits
        if len(user_history) > 10:  # More than 10 per hour
            return True
        
        # Check for duplicate notifications
        for recent in user_history[-5:]:
            if recent['type'] == event['type'] and recent['subject'] == event.get('tail_number'):
                return True
        
        # Update history
        user_history.append({
            'time': datetime.utcnow(),
            'type': event['type'],
            'subject': event.get('tail_number')
        })
        self.notification_history[user_id] = user_history
        
        return False
    
    def _select_channel(self, preferences: Dict, event: Dict) -> str:
        """Select best notification channel"""
        
        priority = event.get("priority", "medium")
        available_channels = preferences.get("channels", ["push"])
        
        # High priority always goes to push
        if priority == "high" and "push" in available_channels:
            return "push"
        
        # Check quiet hours
        current_hour = datetime.utcnow().hour
        quiet_start = preferences.get("quiet_hours", {}).get("start", 22)
        quiet_end = preferences.get("quiet_hours", {}).get("end", 7)
        
        in_quiet_hours = (
            current_hour >= quiet_start or current_hour < quiet_end
            if quiet_start > quiet_end
            else quiet_start <= current_hour < quiet_end
        )
        
        if in_quiet_hours and priority != "high":
            return "email"  # Silent delivery
        
        return available_channels[0]
    
    def _personalize_content(self, preferences: Dict, event: Dict) -> Dict:
        """Personalize notification content"""
        
        # Base content from event
        content = {
            "title": event.get("title", "Flight Update"),
            "message": event.get("message", ""),
            "data": event.get("data", {})
        }
        
        # Add personalization
        if preferences.get("detailed_notifications", False):
            content["extended_message"] = self._generate_extended_message(event)
        
        # Add family context if applicable
        if event.get("family_member"):
            member_name = event["family_member"].get("name", "Family member")
            content["title"] = f"{member_name}'s {content['title']}"
        
        return content
    
    def _calculate_delivery_time(self, preferences: Dict, event: Dict) -> datetime:
        """Calculate optimal delivery time"""
        
        base_time = datetime.utcnow()
        
        # Immediate delivery for high priority
        if event.get("priority") == "high":
            return base_time
        
        # Check quiet hours
        quiet_start = preferences.get("quiet_hours", {}).get("start", 22)
        quiet_end = preferences.get("quiet_hours", {}).get("end", 7)
        
        current_hour = base_time.hour
        
        # If in quiet hours and not urgent, delay until end
        if quiet_start <= current_hour or current_hour < quiet_end:
            if event.get("urgency") != "immediate":
                # Calculate next delivery window
                if current_hour >= quiet_start:
                    # Delay to next morning
                    next_day = base_time + timedelta(days=1)
                    return next_day.replace(hour=quiet_end, minute=0, second=0)
                else:
                    # Delay to end of quiet hours today
                    return base_time.replace(hour=quiet_end, minute=0, second=0)
        
        return base_time
    
    def _generate_extended_message(self, event: Dict) -> str:
        """Generate detailed message for users who want more info"""
        
        details = []
        
        if event.get("prediction"):
            pred = event["prediction"]
            details.append(f"Delay probability: {pred['probability']:.0%}")
            details.append(f"Expected delay: {pred['expected_delay']} minutes")
            
            if pred.get("factors"):
                details.append(f"Factors: {', '.join(pred['factors'])}")
        
        if event.get("weather"):
            weather = event["weather"]
            details.append(f"Weather: {weather.get('conditions', 'Unknown')}")
        
        return " | ".join(details)

# Global instances
prediction_engine = FlightPredictionEngine()
notification_engine = SmartNotificationEngine()