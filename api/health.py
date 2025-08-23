"""
Vercel Function: Health Check Endpoint
"""

import json
from http.server import BaseHTTPRequestHandler
from datetime import datetime

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Health check endpoint"""
        response = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "service": "flighttrace-api",
            "version": "2.0.0",
            "features": {
                "fuel_estimation": True,
                "phase_detection": True,
                "carbon_tracking": True
            }
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())