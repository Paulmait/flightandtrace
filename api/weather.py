"""
Weather API integration with OpenWeatherMap
Provides weather data for flight tracking and airports
"""

import json
import requests
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler
from typing import Dict, Optional

# OpenWeatherMap configuration
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', '')
OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'

# Cache for weather data
weather_cache = {}
CACHE_TTL = 300  # Cache for 5 minutes

def get_weather_by_coords(lat: float, lon: float) -> Dict:
    """Get current weather for coordinates"""
    cache_key = f"{lat},{lon}"
    
    # Check cache
    if cache_key in weather_cache:
        cached = weather_cache[cache_key]
        if (datetime.now().timestamp() - cached['timestamp']) < CACHE_TTL:
            return cached['data']
    
    if not OPENWEATHER_API_KEY:
        return {
            'status': 'error',
            'message': 'OpenWeatherMap API key not configured',
            'sample_data': True,
            'weather': {
                'temp': 72,
                'description': 'Clear sky',
                'wind_speed': 10,
                'visibility': 10000
            }
        }
    
    try:
        url = f"{OPENWEATHER_BASE_URL}/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': OPENWEATHER_API_KEY,
            'units': 'imperial'  # Use Fahrenheit and mph
        }
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            processed = {
                'status': 'success',
                'location': data.get('name', 'Unknown'),
                'weather': {
                    'temp': data['main']['temp'],
                    'feels_like': data['main']['feels_like'],
                    'humidity': data['main']['humidity'],
                    'pressure': data['main']['pressure'],
                    'description': data['weather'][0]['description'],
                    'icon': data['weather'][0]['icon'],
                    'wind_speed': data['wind']['speed'],
                    'wind_deg': data['wind'].get('deg', 0),
                    'visibility': data.get('visibility', 10000),
                    'clouds': data['clouds']['all']
                },
                'timestamp': datetime.now().timestamp()
            }
            
            # Update cache
            weather_cache[cache_key] = {
                'data': processed,
                'timestamp': datetime.now().timestamp()
            }
            
            return processed
        else:
            return {
                'status': 'error',
                'message': f'Weather API error: {response.status_code}'
            }
            
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }

def get_metar(airport_code: str) -> Dict:
    """Get METAR data for airport"""
    # For premium implementation, would use AVWX API or similar
    return {
        'status': 'success',
        'airport': airport_code,
        'metar': f'{airport_code} 121851Z 27015KT 10SM FEW250 23/14 A3012',
        'decoded': {
            'time': '18:51Z',
            'wind': '270° at 15 knots',
            'visibility': '10 miles',
            'clouds': 'Few at 25,000 ft',
            'temperature': '23°C',
            'dewpoint': '14°C',
            'altimeter': '30.12 inHg'
        }
    }

def get_weather_map_url(layer: str, lat: float, lon: float, zoom: int = 5) -> str:
    """Get weather map tile URL"""
    if not OPENWEATHER_API_KEY:
        return ''
    
    layers = {
        'precipitation': 'precipitation_new',
        'clouds': 'clouds_new',
        'pressure': 'pressure_new',
        'wind': 'wind_new',
        'temp': 'temp_new'
    }
    
    layer_name = layers.get(layer, 'precipitation_new')
    
    # Calculate tile coordinates
    import math
    n = 2.0 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n)
    
    return f"https://tile.openweathermap.org/map/{layer_name}/{zoom}/{x}/{y}.png?appid={OPENWEATHER_API_KEY}"

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle weather data requests"""
        path = self.path.split('?')[0]
        
        # Parse query parameters
        query_params = {}
        if '?' in self.path:
            query_string = self.path.split('?')[1]
            for param in query_string.split('&'):
                if '=' in param:
                    key, value = param.split('=', 1)
                    query_params[key] = value
        
        # CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'max-age=300')
        self.end_headers()
        
        response_data = {}
        
        if '/current' in path:
            # Get current weather for coordinates
            lat = float(query_params.get('lat', 0))
            lon = float(query_params.get('lon', 0))
            
            if lat and lon:
                response_data = get_weather_by_coords(lat, lon)
            else:
                response_data = {
                    'status': 'error',
                    'message': 'Latitude and longitude required'
                }
                
        elif '/airport' in path:
            # Get weather for airport
            airport = query_params.get('code', '').upper()
            
            # Airport coordinates (sample data)
            airports = {
                'JFK': (40.6413, -73.7781),
                'LAX': (33.9425, -118.4081),
                'ORD': (41.9742, -87.9073),
                'ATL': (33.6407, -84.4277),
                'DFW': (32.8998, -97.0403)
            }
            
            if airport in airports:
                lat, lon = airports[airport]
                weather = get_weather_by_coords(lat, lon)
                weather['airport'] = airport
                response_data = weather
            else:
                response_data = {
                    'status': 'error',
                    'message': 'Unknown airport code'
                }
                
        elif '/metar' in path:
            # Get METAR for airport
            airport = query_params.get('airport', '').upper()
            if airport:
                response_data = get_metar(airport)
            else:
                response_data = {
                    'status': 'error',
                    'message': 'Airport code required'
                }
                
        elif '/map' in path:
            # Get weather map tile URL
            layer = query_params.get('layer', 'precipitation')
            lat = float(query_params.get('lat', 40))
            lon = float(query_params.get('lon', -95))
            zoom = int(query_params.get('zoom', 5))
            
            url = get_weather_map_url(layer, lat, lon, zoom)
            response_data = {
                'status': 'success',
                'tile_url': url,
                'layer': layer,
                'available_layers': ['precipitation', 'clouds', 'pressure', 'wind', 'temp']
            }
            
        else:
            # API info
            response_data = {
                'status': 'success',
                'endpoints': {
                    '/current?lat=40&lon=-73': 'Get current weather for coordinates',
                    '/airport?code=JFK': 'Get weather for airport',
                    '/metar?airport=JFK': 'Get METAR data',
                    '/map?layer=precipitation&lat=40&lon=-95&zoom=5': 'Get weather map tile URL'
                },
                'api_configured': bool(OPENWEATHER_API_KEY),
                'cache_ttl': CACHE_TTL
            }
        
        self.wfile.write(json.dumps(response_data, indent=2).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()