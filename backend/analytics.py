from datetime import datetime
from typing import Optional, Dict, Any
from collections import defaultdict
import threading

# In-memory analytics store (replace with DB in production)
_analytics_lock = threading.Lock()
LOGIN_EVENTS = []  # List of dicts: {user_id, timestamp, location, device, platform, app_version, user_agent, ip, referral, ...}
FEATURE_USAGE = defaultdict(list)  # {user_id: [{feature, timestamp, ...}]}

# Efficient schema: append-only for events, aggregate on read

def log_login_event(event: Dict[str, Any]):
    with _analytics_lock:
        LOGIN_EVENTS.append(event)

def log_feature_usage(user_id: str, feature: str, extra: Optional[Dict[str, Any]] = None):
    with _analytics_lock:
        entry = {'feature': feature, 'timestamp': datetime.utcnow()}
        if extra:
            entry.update(extra)
        FEATURE_USAGE[user_id].append(entry)

def get_analytics_summary():
    with _analytics_lock:
        # Aggregate user count by location
        location_counts = defaultdict(int)
        for e in LOGIN_EVENTS:
            loc = e.get('location')
            if loc:
                key = f"{loc.get('lat', 'NA')},{loc.get('lon', 'NA')}"
                location_counts[key] += 1
        # Aggregate device/platform
        device_counts = defaultdict(int)
        for e in LOGIN_EVENTS:
            device = e.get('device', 'unknown')
            device_counts[device] += 1
        # Aggregate by app version
        version_counts = defaultdict(int)
        for e in LOGIN_EVENTS:
            v = e.get('appVersion', 'unknown')
            version_counts[v] += 1
        # Total logins
        total_logins = len(LOGIN_EVENTS)
        return {
            'total_logins': total_logins,
            'user_count_by_location': dict(location_counts),
            'device_counts': dict(device_counts),
            'version_counts': dict(version_counts),
        }

def get_login_events():
    with _analytics_lock:
        return list(LOGIN_EVENTS)

def get_feature_usage(user_id: Optional[str] = None):
    with _analytics_lock:
        if user_id:
            return FEATURE_USAGE.get(user_id, [])
        return dict(FEATURE_USAGE)
