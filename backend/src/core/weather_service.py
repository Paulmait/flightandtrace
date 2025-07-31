"""
Weather integration and turbulence prediction service
"""

import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import json
import numpy as np
from dataclasses import dataclass
import logging
from src.core.config import settings
from src.db.database import get_connection
import math

logger = logging.getLogger(__name__)

@dataclass
class WeatherData:
    """Weather data structure"""
    temperature: float  # Celsius
    wind_speed: float  # knots
    wind_direction: int  # degrees
    visibility: float  # miles
    precipitation: float  # mm/hr
    cloud_cover: int  # percentage
    pressure: float  # hPa
    conditions: str
    icon: str
    timestamp: datetime

@dataclass
class TurbulenceData:
    """Turbulence prediction data"""
    severity: str  # none, light, moderate, severe
    probability: float
    altitude_band: Tuple[int, int]  # feet
    causes: List[str]
    advisory: str

class WeatherService:
    """Advanced weather service with multiple data sources"""
    
    def __init__(self):
        self.cache = {}
        self.turbulence_model = TurbulencePredictor()
        self.api_keys = {
            'openweather': settings.OPENWEATHER_API_KEY,
            'aviationweather': settings.AVIATION_WEATHER_API_KEY,
            'windy': settings.WINDY_API_KEY
        }
    
    async def get_weather_for_flight(self, flight_data: Dict) -> Dict:
        """Get comprehensive weather data for entire flight path"""
        try:
            # Get weather for departure and arrival airports
            departure_weather = await self.get_airport_weather(
                flight_data['departure_airport']
            )
            arrival_weather = await self.get_airport_weather(
                flight_data['arrival_airport']
            )
            
            # Get enroute weather
            route_weather = await self.get_route_weather(
                flight_data.get('route_points', [])
            )
            
            # Get turbulence prediction
            turbulence = await self.turbulence_model.predict_turbulence(
                flight_data, route_weather
            )
            
            # Get weather radar data
            radar_url = await self.get_weather_radar_url(
                flight_data['latitude'],
                flight_data['longitude']
            )
            
            return {
                'departure': departure_weather,
                'arrival': arrival_weather,
                'enroute': route_weather,
                'turbulence': turbulence,
                'radar_url': radar_url,
                'advisories': await self.get_weather_advisories(flight_data),
                'updated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting flight weather: {str(e)}")
            return {'error': 'Weather data unavailable'}
    
    async def get_airport_weather(self, airport_code: str) -> WeatherData:
        """Get current weather at airport"""
        # Check cache first
        cache_key = f"airport_weather_{airport_code}"
        if cache_key in self.cache:
            cached_time, cached_data = self.cache[cache_key]
            if datetime.utcnow() - cached_time < timedelta(minutes=15):
                return cached_data
        
        try:
            # Get airport coordinates
            lat, lon = await self._get_airport_coordinates(airport_code)
            
            # Fetch weather data
            weather_data = await self._fetch_weather_data(lat, lon)
            
            # Fetch METAR data for aviation-specific info
            metar_data = await self._fetch_metar(airport_code)
            
            # Combine data sources
            combined_weather = self._combine_weather_sources(
                weather_data, metar_data
            )
            
            # Cache result
            self.cache[cache_key] = (datetime.utcnow(), combined_weather)
            
            return combined_weather
            
        except Exception as e:
            logger.error(f"Error getting airport weather for {airport_code}: {e}")
            return self._get_default_weather()
    
    async def get_route_weather(self, route_points: List[Dict]) -> List[Dict]:
        """Get weather along flight route"""
        if not route_points:
            return []
        
        weather_points = []
        
        # Sample weather every 50nm or at waypoints
        for i, point in enumerate(route_points[::5]):  # Every 5th point
            try:
                weather = await self._fetch_weather_data(
                    point['lat'], point['lng']
                )
                
                weather_points.append({
                    'position': point,
                    'weather': weather,
                    'distance_nm': point.get('distance_from_start', i * 50)
                })
                
            except Exception as e:
                logger.error(f"Error getting route weather: {e}")
        
        return weather_points
    
    async def _fetch_weather_data(self, lat: float, lon: float) -> WeatherData:
        """Fetch weather from OpenWeather API"""
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': self.api_keys['openweather'],
            'units': 'metric'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    return WeatherData(
                        temperature=data['main']['temp'],
                        wind_speed=data['wind']['speed'] * 1.94384,  # m/s to knots
                        wind_direction=data['wind'].get('deg', 0),
                        visibility=data.get('visibility', 10000) / 1609.34,  # m to miles
                        precipitation=data.get('rain', {}).get('1h', 0),
                        cloud_cover=data['clouds']['all'],
                        pressure=data['main']['pressure'],
                        conditions=data['weather'][0]['main'],
                        icon=data['weather'][0]['icon'],
                        timestamp=datetime.utcnow()
                    )
                else:
                    raise Exception(f"Weather API error: {response.status}")
    
    async def _fetch_metar(self, airport_code: str) -> Optional[Dict]:
        """Fetch METAR data for aviation weather"""
        url = f"https://aviationweather.gov/api/data/metar"
        params = {
            'ids': airport_code,
            'format': 'json'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data:
                            return self._parse_metar(data[0])
        except Exception as e:
            logger.error(f"Error fetching METAR: {e}")
        
        return None
    
    def _parse_metar(self, metar_data: Dict) -> Dict:
        """Parse METAR data into usable format"""
        return {
            'visibility_statute_mi': metar_data.get('visib', 10),
            'altimeter_in_hg': metar_data.get('altim', 29.92),
            'wind_speed_kt': metar_data.get('wspd', 0),
            'wind_gust_kt': metar_data.get('wgst'),
            'flight_category': metar_data.get('fltcat', 'VFR'),
            'raw_metar': metar_data.get('rawOb', '')
        }
    
    async def get_weather_radar_url(self, lat: float, lon: float) -> str:
        """Get weather radar image URL for location"""
        # Using RainViewer API for radar data
        base_url = "https://tilecache.rainviewer.com/v2/radar"
        
        # Get latest radar timestamp
        async with aiohttp.ClientSession() as session:
            async with session.get("https://api.rainviewer.com/public/weather-maps.json") as response:
                if response.status == 200:
                    data = await response.json()
                    latest_radar = data['radar']['past'][-1]['path']
                    
                    # Calculate tile coordinates
                    zoom = 8
                    x, y = self._lat_lon_to_tile(lat, lon, zoom)
                    
                    return f"{base_url}/{latest_radar}/256/{zoom}/{x}/{y}.png"
        
        return ""
    
    def _lat_lon_to_tile(self, lat: float, lon: float, zoom: int) -> Tuple[int, int]:
        """Convert lat/lon to tile coordinates"""
        lat_rad = math.radians(lat)
        n = 2.0 ** zoom
        x = int((lon + 180.0) / 360.0 * n)
        y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
        return (x, y)
    
    async def get_weather_advisories(self, flight_data: Dict) -> List[Dict]:
        """Get weather advisories for flight path"""
        advisories = []
        
        # Check for SIGMETs and AIRMETs
        sigmets = await self._fetch_sigmets(flight_data['region'])
        
        for sigmet in sigmets:
            if self._affects_flight(sigmet, flight_data):
                advisories.append({
                    'type': sigmet['hazard'],
                    'severity': sigmet['severity'],
                    'description': sigmet['text'],
                    'valid_from': sigmet['validTimeFrom'],
                    'valid_to': sigmet['validTimeTo']
                })
        
        return advisories
    
    async def _fetch_sigmets(self, region: str) -> List[Dict]:
        """Fetch SIGMETs for region"""
        # In production, use real aviation weather API
        # This is a placeholder
        return []
    
    def _affects_flight(self, advisory: Dict, flight_data: Dict) -> bool:
        """Check if weather advisory affects flight"""
        # Check if flight path intersects with advisory area
        # Simplified check - in production, use proper geometry
        return True
    
    def _combine_weather_sources(self, weather: WeatherData, 
                               metar: Optional[Dict]) -> WeatherData:
        """Combine multiple weather data sources"""
        if metar:
            # Override with more accurate METAR data
            weather.visibility = metar.get('visibility_statute_mi', weather.visibility)
            weather.wind_speed = metar.get('wind_speed_kt', weather.wind_speed)
        
        return weather
    
    def _get_default_weather(self) -> WeatherData:
        """Return default weather when data unavailable"""
        return WeatherData(
            temperature=15.0,
            wind_speed=10.0,
            wind_direction=270,
            visibility=10.0,
            precipitation=0.0,
            cloud_cover=50,
            pressure=1013.25,
            conditions="Unknown",
            icon="01d",
            timestamp=datetime.utcnow()
        )
    
    async def _get_airport_coordinates(self, airport_code: str) -> Tuple[float, float]:
        """Get airport coordinates from database"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT latitude, longitude FROM airports
                WHERE icao_code = ? OR iata_code = ?
            """, (airport_code, airport_code))
            
            result = cursor.fetchone()
            if result:
                return result
            
            # Default coordinates if not found
            return (0.0, 0.0)
            
        finally:
            conn.close()


class TurbulencePredictor:
    """Advanced turbulence prediction using weather data and ML"""
    
    def __init__(self):
        self.jet_stream_altitudes = range(28000, 42000, 1000)
        self.turbulence_factors = {
            'jet_stream': 0.4,
            'convective': 0.3,
            'mountain_wave': 0.2,
            'wind_shear': 0.1
        }
    
    async def predict_turbulence(self, flight_data: Dict, 
                                route_weather: List[Dict]) -> List[TurbulenceData]:
        """Predict turbulence along flight path"""
        predictions = []
        
        # Analyze different altitude bands
        for altitude in range(5000, 45000, 5000):
            if altitude < flight_data.get('cruise_altitude', 35000) + 5000 and \
               altitude > flight_data.get('cruise_altitude', 35000) - 5000:
                
                turbulence = await self._analyze_altitude_band(
                    altitude, flight_data, route_weather
                )
                
                if turbulence.probability > 0.3:
                    predictions.append(turbulence)
        
        return sorted(predictions, key=lambda x: x.probability, reverse=True)
    
    async def _analyze_altitude_band(self, altitude: int, 
                                   flight_data: Dict,
                                   route_weather: List[Dict]) -> TurbulenceData:
        """Analyze turbulence for specific altitude band"""
        
        causes = []
        total_probability = 0.0
        
        # Check jet stream proximity
        jet_stream_prob = self._check_jet_stream(altitude, flight_data['latitude'])
        if jet_stream_prob > 0.5:
            causes.append('jet_stream')
            total_probability += jet_stream_prob * self.turbulence_factors['jet_stream']
        
        # Check convective activity
        convective_prob = self._check_convective_activity(route_weather)
        if convective_prob > 0.3:
            causes.append('thunderstorms')
            total_probability += convective_prob * self.turbulence_factors['convective']
        
        # Check mountain waves (if near mountains)
        if self._near_mountains(flight_data['latitude'], flight_data['longitude']):
            mountain_prob = self._check_mountain_waves(altitude, route_weather)
            if mountain_prob > 0.4:
                causes.append('mountain_waves')
                total_probability += mountain_prob * self.turbulence_factors['mountain_wave']
        
        # Check wind shear
        shear_prob = self._check_wind_shear(route_weather)
        if shear_prob > 0.4:
            causes.append('wind_shear')
            total_probability += shear_prob * self.turbulence_factors['wind_shear']
        
        # Determine severity
        severity = self._calculate_severity(total_probability)
        advisory = self._generate_advisory(severity, causes, altitude)
        
        return TurbulenceData(
            severity=severity,
            probability=min(total_probability, 0.95),
            altitude_band=(altitude - 2500, altitude + 2500),
            causes=causes,
            advisory=advisory
        )
    
    def _check_jet_stream(self, altitude: int, latitude: float) -> float:
        """Check proximity to jet stream"""
        # Jet stream typically between FL280-FL420
        if 28000 <= altitude <= 42000:
            # Jet stream latitude varies by season
            jet_lat = 40 + 10 * math.sin(datetime.utcnow().timetuple().tm_yday * 2 * math.pi / 365)
            lat_diff = abs(latitude - jet_lat)
            
            if lat_diff < 5:
                return 0.8 - (lat_diff * 0.1)
        
        return 0.0
    
    def _check_convective_activity(self, route_weather: List[Dict]) -> float:
        """Check for thunderstorms and convective activity"""
        max_prob = 0.0
        
        for point in route_weather:
            weather = point['weather']
            
            # Check for thunderstorm conditions
            if weather.conditions.lower() in ['thunderstorm', 'storm']:
                max_prob = max(max_prob, 0.9)
            elif weather.cloud_cover > 80 and weather.precipitation > 10:
                max_prob = max(max_prob, 0.6)
            elif weather.temperature > 25 and weather.cloud_cover > 60:
                max_prob = max(max_prob, 0.4)
        
        return max_prob
    
    def _check_mountain_waves(self, altitude: int, route_weather: List[Dict]) -> float:
        """Check for mountain wave turbulence"""
        if altitude < 20000:
            return 0.0
        
        # Check wind conditions
        max_wind = max(w['weather'].wind_speed for w in route_weather)
        
        if max_wind > 30:  # knots
            return min(0.8, max_wind / 50)
        
        return 0.0
    
    def _check_wind_shear(self, route_weather: List[Dict]) -> float:
        """Check for wind shear conditions"""
        if len(route_weather) < 2:
            return 0.0
        
        max_shear = 0.0
        
        for i in range(1, len(route_weather)):
            prev_wind = route_weather[i-1]['weather'].wind_speed
            curr_wind = route_weather[i]['weather'].wind_speed
            
            shear = abs(curr_wind - prev_wind)
            if shear > 20:  # knots
                max_shear = max(max_shear, min(0.8, shear / 30))
        
        return max_shear
    
    def _near_mountains(self, lat: float, lon: float) -> bool:
        """Check if location is near mountainous terrain"""
        # Simplified check - in production use terrain database
        mountain_regions = [
            {'name': 'Rockies', 'bounds': (35, -115, 50, -100)},
            {'name': 'Appalachians', 'bounds': (30, -85, 45, -70)},
            {'name': 'Sierra Nevada', 'bounds': (35, -122, 42, -117)}
        ]
        
        for region in mountain_regions:
            bounds = region['bounds']
            if bounds[0] <= lat <= bounds[2] and bounds[1] <= lon <= bounds[3]:
                return True
        
        return False
    
    def _calculate_severity(self, probability: float) -> str:
        """Calculate turbulence severity"""
        if probability < 0.3:
            return "none"
        elif probability < 0.5:
            return "light"
        elif probability < 0.7:
            return "moderate"
        else:
            return "severe"
    
    def _generate_advisory(self, severity: str, causes: List[str], 
                         altitude: int) -> str:
        """Generate turbulence advisory text"""
        if severity == "none":
            return "Smooth flight conditions expected"
        
        cause_text = ", ".join(causes).replace("_", " ").title()
        
        advisories = {
            "light": f"Light turbulence possible near FL{altitude//100} due to {cause_text}",
            "moderate": f"Moderate turbulence likely near FL{altitude//100} due to {cause_text}. Consider altitude change.",
            "severe": f"Severe turbulence expected near FL{altitude//100} due to {cause_text}. Avoid this altitude."
        }
        
        return advisories.get(severity, "")


# Global weather service instance
weather_service = WeatherService()