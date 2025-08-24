"""
Test endpoint to debug environment variables
"""

import json
import os
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Get all environment variables
        all_vars = dict(os.environ)
        
        # Filter sensitive data but show keys
        filtered_vars = {}
        for key, value in all_vars.items():
            if 'STRIPE' in key or 'OPENSKY' in key or 'OPENWEATHER' in key or 'FLIGHTTRACE' in key:
                # Show first 10 chars for debugging
                if len(value) > 10:
                    filtered_vars[key] = value[:10] + '...' + value[-4:]
                else:
                    filtered_vars[key] = '***'
            elif key in ['VERCEL', 'VERCEL_ENV', 'VERCEL_REGION', 'NODE_ENV']:
                filtered_vars[key] = value
        
        response = {
            'status': 'success',
            'total_env_vars': len(all_vars),
            'relevant_vars': filtered_vars,
            'python_version': os.environ.get('PYTHON_VERSION', 'not set'),
            'vercel_env': os.environ.get('VERCEL_ENV', 'not set'),
            'has_stripe_key': bool(os.environ.get('FLIGHTTRACE_STRIPE_SECRET_KEY')),
            'has_weather_key': bool(os.environ.get('OPENWEATHER_API_KEY')),
            'has_opensky': bool(os.environ.get('OPENSKY_USERNAME'))
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response, indent=2).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()