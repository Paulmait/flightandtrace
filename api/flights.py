"""
Flight tracking API endpoint for real-time flight data.
"""

import json
import random
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler

# Sample flight data for demonstration
SAMPLE_FLIGHTS = [
    {
        "flight_number": "AA2351",
        "airline": "American Airlines",
        "aircraft": "Boeing 737-800",
        "origin": {"code": "JFK", "name": "John F Kennedy Intl", "city": "New York"},
        "destination": {"code": "LAX", "name": "Los Angeles Intl", "city": "Los Angeles"},
        "status": "En Route",
        "altitude": 35000,
        "speed": 485,
        "heading": 270,
        "position": {"lat": 39.5, "lng": -105.2},
        "departure_time": "08:15",
        "arrival_time": "11:45",
        "progress": 65
    },
    {
        "flight_number": "DL1847", 
        "airline": "Delta Air Lines",
        "aircraft": "Airbus A320",
        "origin": {"code": "ATL", "name": "Hartsfield-Jackson", "city": "Atlanta"},
        "destination": {"code": "ORD", "name": "O'Hare Intl", "city": "Chicago"},
        "status": "En Route",
        "altitude": 38000,
        "speed": 510,
        "heading": 315,
        "position": {"lat": 35.8, "lng": -89.5},
        "departure_time": "09:30",
        "arrival_time": "10:45",
        "progress": 78
    },
    {
        "flight_number": "UA523",
        "airline": "United Airlines", 
        "aircraft": "Boeing 777-200",
        "origin": {"code": "SFO", "name": "San Francisco Intl", "city": "San Francisco"},
        "destination": {"code": "EWR", "name": "Newark Liberty", "city": "Newark"},
        "status": "Scheduled",
        "altitude": 0,
        "speed": 0,
        "heading": 90,
        "position": {"lat": 37.6, "lng": -122.3},
        "departure_time": "14:30",
        "arrival_time": "22:45",
        "progress": 0
    },
    {
        "flight_number": "SW4521",
        "airline": "Southwest Airlines",
        "aircraft": "Boeing 737-700",
        "origin": {"code": "DEN", "name": "Denver Intl", "city": "Denver"},
        "destination": {"code": "PHX", "name": "Phoenix Sky Harbor", "city": "Phoenix"},
        "status": "Landed",
        "altitude": 0,
        "speed": 0,
        "heading": 225,
        "position": {"lat": 33.4373, "lng": -112.0078},
        "departure_time": "08:30",
        "arrival_time": "10:45",
        "progress": 100
    },
    {
        "flight_number": "B61923",
        "airline": "JetBlue Airways",
        "aircraft": "Airbus A321",
        "origin": {"code": "BOS", "name": "Logan Intl", "city": "Boston"},
        "destination": {"code": "FLL", "name": "Fort Lauderdale", "city": "Fort Lauderdale"},
        "status": "En Route",
        "altitude": 41000,
        "speed": 520,
        "heading": 195,
        "position": {"lat": 38.2, "lng": -78.4},
        "departure_time": "07:00",
        "arrival_time": "10:30",
        "progress": 45
    }
]

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests for flight data."""
        path = self.path.split('?')[0]
        
        # CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        
        # Parse query parameters
        query_params = {}
        if '?' in self.path:
            query_string = self.path.split('?')[1]
            for param in query_string.split('&'):
                if '=' in param:
                    key, value = param.split('=', 1)
                    query_params[key] = value
        
        response_data = {}
        
        # Route different endpoints
        if '/search' in path:
            flight_number = query_params.get('flight', '').upper()
            if flight_number:
                # Search for specific flight
                flights = [f for f in SAMPLE_FLIGHTS if f['flight_number'] == flight_number]
                response_data = {
                    "status": "success",
                    "results": flights,
                    "count": len(flights)
                }
            else:
                response_data = {
                    "status": "error",
                    "message": "Flight number required"
                }
                
        elif '/live' in path:
            # Return all live flights (with simulated position updates)
            live_flights = []
            for flight in SAMPLE_FLIGHTS:
                flight_copy = flight.copy()
                if flight_copy['status'] == 'En Route':
                    # Simulate slight position changes
                    flight_copy['position']['lat'] += random.uniform(-0.1, 0.1)
                    flight_copy['position']['lng'] += random.uniform(-0.1, 0.1)
                    flight_copy['speed'] += random.randint(-10, 10)
                    flight_copy['altitude'] += random.randint(-500, 500)
                live_flights.append(flight_copy)
            
            response_data = {
                "status": "success",
                "flights": live_flights,
                "count": len(live_flights),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
        elif '/routes' in path:
            origin = query_params.get('from', '').upper()
            destination = query_params.get('to', '').upper()
            
            if origin and destination:
                # Filter flights by route
                route_flights = [
                    f for f in SAMPLE_FLIGHTS 
                    if f['origin']['code'] == origin and f['destination']['code'] == destination
                ]
                response_data = {
                    "status": "success",
                    "route": f"{origin} to {destination}",
                    "flights": route_flights,
                    "count": len(route_flights)
                }
            else:
                response_data = {
                    "status": "error",
                    "message": "Origin and destination required"
                }
                
        elif '/airport' in path:
            airport_code = query_params.get('code', '').upper()
            flight_type = query_params.get('type', 'all')
            
            if airport_code:
                airport_flights = []
                for flight in SAMPLE_FLIGHTS:
                    if flight_type == 'arrivals' and flight['destination']['code'] == airport_code:
                        airport_flights.append(flight)
                    elif flight_type == 'departures' and flight['origin']['code'] == airport_code:
                        airport_flights.append(flight)
                    elif flight_type == 'all' and (
                        flight['origin']['code'] == airport_code or 
                        flight['destination']['code'] == airport_code
                    ):
                        airport_flights.append(flight)
                
                response_data = {
                    "status": "success",
                    "airport": airport_code,
                    "type": flight_type,
                    "flights": airport_flights,
                    "count": len(airport_flights)
                }
            else:
                response_data = {
                    "status": "error",
                    "message": "Airport code required"
                }
                
        else:
            # Default: return statistics
            en_route = len([f for f in SAMPLE_FLIGHTS if f['status'] == 'En Route'])
            scheduled = len([f for f in SAMPLE_FLIGHTS if f['status'] == 'Scheduled'])
            landed = len([f for f in SAMPLE_FLIGHTS if f['status'] == 'Landed'])
            
            response_data = {
                "status": "success",
                "statistics": {
                    "total_flights": len(SAMPLE_FLIGHTS),
                    "en_route": en_route,
                    "scheduled": scheduled,
                    "landed": landed,
                    "last_updated": datetime.utcnow().isoformat() + "Z"
                },
                "sample_flights": SAMPLE_FLIGHTS[:3]  # Return first 3 as samples
            }
        
        # Send response
        self.wfile.write(json.dumps(response_data, indent=2).encode())
        
    def do_OPTIONS(self):
        """Handle preflight CORS requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()