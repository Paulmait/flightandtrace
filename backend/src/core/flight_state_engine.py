import time
import json
import redis
import requests
from threading import Thread

# Config
OPENSKY_API_URL = "https://opensky-network.org/api/states/all"
REDIS_URL = "redis://localhost:6379/0"
POLL_INTERVAL = 60  # seconds

# Flight states
STATES = ["Scheduled", "Airborne", "Landed", "Delayed", "Cancelled"]

r = redis.Redis.from_url(REDIS_URL)

# Helper to get flight status from OpenSky (stub)
def get_flight_status(tail_number):
    # Replace with real OpenSky API logic
    response = requests.get(OPENSKY_API_URL)
    # Parse response for tail_number
    # Return one of STATES
    return "Airborne"  # Example

# Poller and state engine
def poll_flights(tracked_tail_numbers):
    while True:
        for tail_number in tracked_tail_numbers:
            current_status = get_flight_status(tail_number)
            prev_status = r.get(f"flight:{tail_number}:status")
            prev_status = prev_status.decode() if prev_status else None
            if prev_status != current_status:
                event = {
                    "tail_number": tail_number,
                    "previous_status": prev_status,
                    "current_status": current_status,
                    "timestamp": int(time.time())
                }
                r.set(f"flight:{tail_number}:status", current_status)
                emit_event(event)
        time.sleep(POLL_INTERVAL)

# Event emitter
def emit_event(event):
    print("Flight state change:", json.dumps(event))
    # Optionally publish to Redis pubsub, webhook, etc.
    r.publish("flight_events", json.dumps(event))

# Start polling in background

def start_flight_state_engine(tracked_tail_numbers):
    Thread(target=poll_flights, args=(tracked_tail_numbers,), daemon=True).start()

# Example usage
if __name__ == "__main__":
    tracked_tail_numbers = ["N12345", "N67890"]
    start_flight_state_engine(tracked_tail_numbers)
    while True:
        time.sleep(10)
