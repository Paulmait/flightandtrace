"""
Live flight tracking API with OpenSky Network integration
This replaces the sample data with real flight data
"""

import json
import requests
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler
from typing import Dict, List, Optional
import base64

# OpenSky Network API configuration
OPENSKY_BASE_URL = "https://opensky-network.org/api"
OPENSKY_USERNAME = os.environ.get('OPENSKY_USERNAME', '')
OPENSKY_PASSWORD = os.environ.get('OPENSKY_PASSWORD', '')
OPENSKY_API_KEY = os.environ.get('OPENSKY_API_KEY', '')  # Alternative API key method

# Cache configuration
cache_data = {}
cache_timestamp = None
CACHE_TTL = 10  # Cache for 10 seconds to respect rate limits

def get_auth_headers():
    """Get authentication headers if credentials are provided"""
    if OPENSKY_USERNAME and OPENSKY_PASSWORD:
        credentials = base64.b64encode(f"{OPENSKY_USERNAME}:{OPENSKY_PASSWORD}".encode()).decode()
        return {"Authorization": f"Basic {credentials}"}
    return {}

def fetch_live_flights(bounds: Optional[Dict] = None) -> List[Dict]:
    """
    Fetch live flight data from OpenSky Network
    
    Args:
        bounds: Optional bounding box {min_lat, max_lat, min_lon, max_lon}
    
    Returns:
        List of flight data dictionaries
    """
    global cache_data, cache_timestamp
    
    # Check cache
    if cache_timestamp and (datetime.now().timestamp() - cache_timestamp) < CACHE_TTL:
        return cache_data
    
    try:
        # Build URL with optional bounding box
        url = f"{OPENSKY_BASE_URL}/states/all"
        params = {}
        
        if bounds:
            params = {
                'lamin': bounds.get('min_lat', -90),
                'lamax': bounds.get('max_lat', 90),
                'lomin': bounds.get('min_lon', -180),
                'lomax': bounds.get('max_lon', 180)
            }
        
        # Make request to OpenSky Network
        response = requests.get(
            url,
            params=params,
            headers=get_auth_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            flights = process_opensky_data(data.get('states', []))
            
            # Update cache
            cache_data = flights
            cache_timestamp = datetime.now().timestamp()
            
            return flights
        else:
            # Return sample data as fallback
            return get_sample_flights(bounds)
            
    except Exception as e:
        print(f"Error fetching OpenSky data: {e}")
        return get_sample_flights(bounds)

def process_opensky_data(states: List) -> List[Dict]:
    """
    Process OpenSky Network state vectors into our flight format
    
    OpenSky state vector format:
    0: icao24 (string)
    1: callsign (string)
    2: origin_country (string)
    3: time_position (int)
    4: last_contact (int)
    5: longitude (float)
    6: latitude (float)
    7: baro_altitude (float) - meters
    8: on_ground (boolean)
    9: velocity (float) - m/s
    10: true_track (float) - degrees
    11: vertical_rate (float) - m/s
    12: sensors (int[])
    13: geo_altitude (float) - meters
    14: squawk (string)
    15: spi (boolean)
    16: position_source (int)
    """
    processed_flights = []
    
    for state in states:
        if not state or len(state) < 17:
            continue
            
        # Skip if no callsign or on ground
        callsign = (state[1] or '').strip()
        if not callsign or state[8]:  # on_ground
            continue
        
        # Convert units
        altitude_ft = (state[7] or 0) * 3.28084 if state[7] else 0
        speed_mph = (state[9] or 0) * 2.23694 if state[9] else 0
        vertical_rate_fpm = (state[11] or 0) * 196.85 if state[11] else 0
        
        # Parse airline and flight number from callsign
        airline_code = callsign[:3] if len(callsign) >= 3 else callsign
        flight_number = callsign[3:] if len(callsign) > 3 else ''
        
        flight_data = {
            'id': state[0],  # ICAO24 address
            'flight_number': callsign,
            'airline': get_airline_name(airline_code),
            'airline_code': airline_code,
            'aircraft': 'Aircraft',  # Would need separate API for aircraft type
            'origin': {'code': 'N/A', 'name': 'Departure Airport'},
            'destination': {'code': 'N/A', 'name': 'Arrival Airport'},
            'position': {
                'lat': state[6],
                'lng': state[5]
            },
            'altitude': round(altitude_ft),
            'speed': round(speed_mph),
            'heading': round(state[10] or 0),
            'vertical_rate': round(vertical_rate_fpm),
            'squawk': state[14] or '',
            'origin_country': state[2],
            'on_ground': state[8],
            'last_contact': state[4],
            'status': 'En Route' if not state[8] else 'On Ground',
            'timestamp': datetime.fromtimestamp(state[4]).isoformat() if state[4] else None
        }
        
        processed_flights.append(flight_data)
    
    return processed_flights

def get_airline_name(code: str) -> str:
    """Get airline name from IATA/ICAO code"""
    airlines = {
        'AAL': 'American Airlines',
        'DAL': 'Delta Air Lines',
        'UAL': 'United Airlines',
        'SWA': 'Southwest Airlines',
        'BAW': 'British Airways',
        'DLH': 'Lufthansa',
        'AFR': 'Air France',
        'KLM': 'KLM',
        'RYR': 'Ryanair',
        'EZY': 'easyJet',
        'JBU': 'JetBlue',
        'NKS': 'Spirit Airlines',
        'FFT': 'Frontier Airlines',
        'ASA': 'Alaska Airlines',
        'AAY': 'Allegiant Air',
        'SKW': 'SkyWest Airlines',
        'QTR': 'Qatar Airways',
        'UAE': 'Emirates',
        'SIA': 'Singapore Airlines',
        'CPA': 'Cathay Pacific'
    }
    return airlines.get(code, code)

def get_sample_flights(bounds: Optional[Dict] = None) -> List[Dict]:
    """Return realistic sample flights as fallback when API is unavailable"""
    import random
    
    airlines = ['American', 'Delta', 'United', 'Southwest', 'JetBlue', 'Alaska', 'Spirit', 'Frontier']
    aircraft_types = ['Boeing 737-800', 'Airbus A320', 'Boeing 787-9', 'Airbus A350', 'Boeing 777-300ER']
    airports = [
        {'code': 'JFK', 'name': 'New York JFK', 'lat': 40.6413, 'lng': -73.7781},
        {'code': 'LAX', 'name': 'Los Angeles', 'lat': 33.9425, 'lng': -118.4081},
        {'code': 'ORD', 'name': 'Chicago O\'Hare', 'lat': 41.9742, 'lng': -87.9073},
        {'code': 'DFW', 'name': 'Dallas/Fort Worth', 'lat': 32.8998, 'lng': -97.0403},
        {'code': 'ATL', 'name': 'Atlanta', 'lat': 33.6407, 'lng': -84.4277},
        {'code': 'DEN', 'name': 'Denver', 'lat': 39.8561, 'lng': -104.6737},
        {'code': 'SFO', 'name': 'San Francisco', 'lat': 37.6213, 'lng': -122.3790},
        {'code': 'SEA', 'name': 'Seattle-Tacoma', 'lat': 47.4502, 'lng': -122.3088},
        {'code': 'MIA', 'name': 'Miami', 'lat': 25.7959, 'lng': -80.2870},
        {'code': 'BOS', 'name': 'Boston Logan', 'lat': 42.3656, 'lng': -71.0096}
    ]
    
    flights = []
    for i in range(50):  # Generate 50 sample flights
        origin = random.choice(airports)
        destination = random.choice([a for a in airports if a != origin])
        
        # Calculate position somewhere between origin and destination
        progress = random.random()  # 0 to 1
        lat = origin['lat'] + (destination['lat'] - origin['lat']) * progress
        lng = origin['lng'] + (destination['lng'] - origin['lng']) * progress
        
        # Determine status based on progress
        if progress < 0.1:
            status = 'Departing'
            altitude = int(progress * 350000)  # Climbing
        elif progress > 0.9:
            status = 'Approaching'
            altitude = int((1 - progress) * 350000)  # Descending
        else:
            status = 'En Route'
            altitude = random.randint(30000, 41000)
        
        flights.append({
            'id': f'SAMPLE{i:03d}',
            'flight_number': f'{random.choice(["AA", "DL", "UA", "WN", "B6", "AS", "NK", "F9"])}{random.randint(100, 9999)}',
            'airline': random.choice(airlines),
            'aircraft': random.choice(aircraft_types),
            'origin': {'code': origin['code'], 'name': origin['name']},
            'destination': {'code': destination['code'], 'name': destination['name']},
            'position': {'lat': round(lat, 4), 'lng': round(lng, 4)},
            'altitude': altitude,
            'speed': random.randint(400, 550) if altitude > 10000 else random.randint(150, 250),
            'heading': random.randint(0, 359),
            'status': status,
            'on_ground': altitude < 1000
        })
    
    # Filter by bounds if provided
    if bounds:
        filtered = []
        for flight in flights:
            lat = flight['position']['lat']
            lng = flight['position']['lng']
            if (bounds['min_lat'] <= lat <= bounds['max_lat'] and
                bounds['min_lon'] <= lng <= bounds['max_lon']):
                filtered.append(flight)
        return filtered
    
    return flights

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests for flight data"""
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
        self.send_header('Cache-Control', 'max-age=10')
        self.end_headers()
        
        response_data = {}
        
        try:
            if '/live' in path or '/all' in path or '/area' in path:
                # Get bounding box if provided  
                bounds = None
                if all(k in query_params for k in ['lamin', 'lamax', 'lomin', 'lomax']):
                    bounds = {
                        'min_lat': float(query_params['lamin']),
                        'max_lat': float(query_params['lamax']),
                        'min_lon': float(query_params['lomin']),
                        'max_lon': float(query_params['lomax'])
                    }
                
                # Fetch live flights
                flights = fetch_live_flights(bounds)
                
                # Filter by altitude if requested
                if 'min_alt' in query_params:
                    min_alt = float(query_params['min_alt'])
                    flights = [f for f in flights if f['altitude'] >= min_alt]
                
                if 'max_alt' in query_params:
                    max_alt = float(query_params['max_alt'])
                    flights = [f for f in flights if f['altitude'] <= max_alt]
                
                response_data = {
                    'status': 'success',
                    'source': 'OpenSky Network' if cache_data else 'Sample Data',
                    'flights': flights,
                    'count': len(flights),
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'cache_age': round(datetime.now().timestamp() - cache_timestamp) if cache_timestamp else None
                }
                
            elif '/search' in path:
                flight_number = query_params.get('flight', '').upper()
                if flight_number:
                    all_flights = fetch_live_flights()
                    flights = [f for f in all_flights if flight_number in f.get('flight_number', '')]
                    response_data = {
                        'status': 'success',
                        'results': flights,
                        'count': len(flights)
                    }
                else:
                    response_data = {
                        'status': 'error',
                        'message': 'Flight number required'
                    }
                    
            elif '/stats' in path:
                flights = fetch_live_flights()
                en_route = len([f for f in flights if f.get('status') == 'En Route'])
                on_ground = len([f for f in flights if f.get('on_ground', False)])
                
                response_data = {
                    'status': 'success',
                    'statistics': {
                        'total_tracked': len(flights),
                        'en_route': en_route,
                        'on_ground': on_ground,
                        'data_source': 'OpenSky Network' if cache_data else 'Sample Data',
                        'last_updated': datetime.utcnow().isoformat() + 'Z'
                    }
                }
                
            else:
                # Default endpoint info
                response_data = {
                    'status': 'success',
                    'endpoints': {
                        '/live': 'Get all live flights',
                        '/live?min_lat=40&max_lat=50&min_lon=-80&max_lon=-70': 'Get flights in bounding box',
                        '/search?flight=AA123': 'Search for specific flight',
                        '/stats': 'Get flight statistics'
                    },
                    'rate_limits': {
                        'anonymous': '10 requests per 10 seconds',
                        'authenticated': '4000 requests per day'
                    },
                    'data_provider': 'OpenSky Network'
                }
                
        except Exception as e:
            response_data = {
                'status': 'error',
                'message': str(e),
                'fallback': 'Using sample data'
            }
        
        # Send response
        self.wfile.write(json.dumps(response_data, indent=2).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()