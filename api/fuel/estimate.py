"""
Vercel Function: Fuel Estimation API Endpoint
"""

import json
import sys
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from src.core.fuel_estimation_v2 import EnhancedFuelEstimator

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests for fuel estimation"""
        try:
            # Parse query parameters
            from urllib.parse import urlparse, parse_qs
            parsed_url = urlparse(self.path)
            params = parse_qs(parsed_url.query)
            
            flight_id = params.get('flightId', [''])[0]
            aircraft_type = params.get('aircraftType', [''])[0]
            
            if not flight_id or not aircraft_type:
                self.send_error(400, "Missing required parameters: flightId, aircraftType")
                return
            
            # Create sample altitude data for demo
            # In production, this would come from your database
            base_time = datetime.utcnow()
            samples = [
                (base_time, 0),
                (base_time.replace(hour=base_time.hour+1), 35000),
                (base_time.replace(hour=base_time.hour+2), 35000),
                (base_time.replace(hour=base_time.hour+3), 0)
            ]
            
            # Estimate fuel
            estimator = EnhancedFuelEstimator()
            estimate = estimator.estimate_fuel(
                flight_id=flight_id,
                aircraft_type=aircraft_type,
                altitude_samples=samples,
                distance_nm=500
            )
            
            # Prepare response
            response = {
                "fuelKg": round(estimate.fuel_kg, 1),
                "fuelL": round(estimate.fuel_l, 1),
                "fuelGal": round(estimate.fuel_gal, 1),
                "co2Kg": round(estimate.co2_kg, 1),
                "confidence": estimate.confidence.value,
                "assumptions": estimate.assumptions
            }
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def do_POST(self):
        """Handle POST requests with altitude series"""
        try:
            # Read body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            flight_id = data.get('flight_id')
            aircraft_type = data.get('aircraft_type')
            altitude_series = data.get('altitude_series', [])
            distance_nm = data.get('distance_nm', 500)
            
            if not flight_id or not aircraft_type:
                self.send_error(400, "Missing required fields: flight_id, aircraft_type")
                return
            
            # Convert altitude series
            samples = [
                (datetime.fromisoformat(point['timestamp'].replace('Z', '+00:00')), point['altitude'])
                for point in altitude_series
            ]
            
            # Estimate fuel
            estimator = EnhancedFuelEstimator()
            estimate = estimator.estimate_fuel(
                flight_id=flight_id,
                aircraft_type=aircraft_type,
                altitude_samples=samples,
                distance_nm=distance_nm
            )
            
            # Prepare response
            response = {
                "fuelKg": round(estimate.fuel_kg, 1),
                "fuelL": round(estimate.fuel_l, 1),
                "fuelGal": round(estimate.fuel_gal, 1),
                "co2Kg": round(estimate.co2_kg, 1),
                "confidence": estimate.confidence.value,
                "phases": [
                    {
                        "phase": phase.phase.value,
                        "duration_minutes": phase.duration_seconds / 60,
                        "fuel_burn_kg": phase.fuel_burn_kg,
                        "average_altitude_ft": phase.avg_altitude_ft
                    }
                    for phase in estimate.phases
                ],
                "assumptions": estimate.assumptions
            }
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_error(500, str(e))