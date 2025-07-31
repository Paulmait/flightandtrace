from datetime import datetime
from typing import Optional, Dict
import threading

# In-memory subscription store (replace with DB in production)
_sub_lock = threading.Lock()
SUBSCRIPTIONS = {}

class SubscriptionStatus:
    ACTIVE = 'active'
    CANCELED = 'canceled'
    TRIAL = 'trial'
    EXPIRED = 'expired'

# Schema: {user_id: {plan, status, start, end, cancel_at, payment_method, renewal, cancellation_reason, regulatory_ack, ...}}
def create_subscription(user_id: str, plan: str, payment_method: str, regulatory_ack: bool, trial_days: int = 0):
    now = datetime.utcnow()
    with _sub_lock:
        SUBSCRIPTIONS[user_id] = {
            'plan': plan,
            'status': SubscriptionStatus.TRIAL if trial_days else SubscriptionStatus.ACTIVE,
            'start': now,
            'end': now if not trial_days else now.replace(day=now.day + trial_days),
            'cancel_at': None,
            'payment_method': payment_method,
            'renewal': True,
            'cancellation_reason': None,
            'regulatory_ack': regulatory_ack,
        }
    return SUBSCRIPTIONS[user_id]

def cancel_subscription(user_id: str, reason: Optional[str] = None):
    with _sub_lock:
        sub = SUBSCRIPTIONS.get(user_id)
        if sub:
            sub['status'] = SubscriptionStatus.CANCELED
            sub['cancel_at'] = datetime.utcnow()
            sub['cancellation_reason'] = reason
            sub['renewal'] = False
    return sub

def get_subscription(user_id: str) -> Optional[Dict]:
    with _sub_lock:
        return SUBSCRIPTIONS.get(user_id)

def all_subscriptions():
    with _sub_lock:
        return dict(SUBSCRIPTIONS)
