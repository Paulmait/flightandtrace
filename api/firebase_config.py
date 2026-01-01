"""
Firebase Configuration API
Returns Firebase config with API key from environment variables
"""
import os
import json

def handler(request):
    """Return Firebase configuration for client-side use"""

    # Get Firebase config from environment variables
    firebase_config = {
        "apiKey": os.environ.get("FIREBASE_API_KEY", ""),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN", "flighttrace-749f1.firebaseapp.com"),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID", "flighttrace-749f1"),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", "flighttrace-749f1.firebasestorage.app"),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID", "994719406353"),
        "appId": os.environ.get("FIREBASE_APP_ID", "1:994719406353:web:01523b9811eeefad5094b0"),
        "measurementId": os.environ.get("FIREBASE_MEASUREMENT_ID", "G-HS9H3GM0V1")
    }

    # Return as JavaScript that sets window.__FIREBASE_API_KEY__
    js_content = f"""
// Firebase Configuration - Auto-generated from environment
window.__FIREBASE_API_KEY__ = "{firebase_config['apiKey']}";
window.__FIREBASE_CONFIG__ = {json.dumps(firebase_config)};
"""

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/javascript",
            "Cache-Control": "public, max-age=3600"
        },
        "body": js_content
    }
