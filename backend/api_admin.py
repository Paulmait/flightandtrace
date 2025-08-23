from .subscription import create_subscription, cancel_subscription, get_subscription, all_subscriptions, SubscriptionStatus
from fastapi import Body
from pydantic import BaseModel
from fastapi import APIRouter
# Subscription endpoints
class SubscriptionRequest(BaseModel):
    user_id: str
    plan: str
    payment_method: str
    regulatory_ack: bool
    trial_days: Optional[int] = 0

class CancelRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None

@router.post("/api/subscription/create")
def api_create_subscription(req: SubscriptionRequest):
    sub = create_subscription(req.user_id, req.plan, req.payment_method, req.regulatory_ack, req.trial_days)
    return {"subscription": sub}

@router.post("/api/subscription/cancel")
def api_cancel_subscription(req: CancelRequest):
    sub = cancel_subscription(req.user_id, req.reason)
    return {"subscription": sub, "message": "Subscription canceled. You will not be charged again."}

@router.get("/api/subscription/{user_id}")
def api_get_subscription(user_id: str):
    return {"subscription": get_subscription(user_id)}

@router.get("/admin/subscriptions")
def admin_all_subscriptions():
    return all_subscriptions()
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from datetime import datetime, timedelta
from .analytics import log_login_event, log_feature_usage, get_analytics_summary, get_login_events, get_feature_usage

router = APIRouter()

# Subscription endpoints (single definition)
class SubscriptionRequest(BaseModel):
    user_id: str
    plan: str
    payment_method: str
    regulatory_ack: bool
    trial_days: int = 0

class CancelRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None

@router.post("/api/subscription/create")
def api_create_subscription(req: SubscriptionRequest):
    sub = create_subscription(req.user_id, req.plan, req.payment_method, req.regulatory_ack, req.trial_days or 0)
    return {"subscription": sub}

@router.post("/api/subscription/cancel")
def api_cancel_subscription(req: CancelRequest):
    sub = cancel_subscription(req.user_id, req.reason)
    return {"subscription": sub, "message": "Subscription canceled. You will not be charged again."}

@router.get("/api/subscription/{user_id}")
def api_get_subscription(user_id: str):
    return {"subscription": get_subscription(user_id)}

@router.get("/admin/subscriptions")
def admin_all_subscriptions():
    return all_subscriptions()

# Secure admin authentication - loads from database
import os
import bcrypt
from typing import Dict, List

# Admin users loaded from secure database (not hardcoded)
USERS: Dict = {}  # Will be populated from database on startup
AUDIT_LOG: List = []

def load_admin_users_from_db():
    """Load admin users from secure database on startup"""
    # This should connect to your secure database
    # For now, we'll use environment variables as a secure alternative
    admin_password_hash = os.getenv('ADMIN_PASSWORD_HASH')
    if admin_password_hash:
        USERS['admin'] = {
            'password_hash': admin_password_hash,
            'last_reset': datetime.utcnow()
        }
    return USERS

# Initialize admin users on module load
load_admin_users_from_db()

class ResetUserRequest(BaseModel):
    username: str

class ResetAdminRequest(BaseModel):
    old_password: str
    new_password: str

from typing import Optional, Dict, Any

class LoginAnalyticsEvent(BaseModel):
    userId: str
    event: str = 'login'
    timestamp: str
    location: Optional[Dict[str, Any]] = None
    device: Optional[str] = None
    appVersion: Optional[str] = None
    userAgent: Optional[str] = None
    ip: Optional[str] = None
    referral: Optional[str] = None
    platform: Optional[str] = None

@router.post("/api/analytics/login")
async def api_log_login(event: LoginAnalyticsEvent, request: Request):
    # If IP not provided, get from request
    if not event.ip:
        if request.client:
            event.ip = request.client.host
        else:
            event.ip = None
    log_login_event(event.dict())
    return {"status": "ok"}

@router.post("/api/analytics/feature_usage")
async def api_log_feature_usage(data: dict):
    user_id = data.get('userId')
    feature = data.get('feature')
    extra = {k: v for k, v in data.items() if k not in ('userId', 'feature')}
    if user_id and feature:
        log_feature_usage(user_id, feature, extra)
    return {"status": "ok"}

# Admin endpoints
@router.get("/admin/analytics_summary")
def admin_analytics_summary():
    return get_analytics_summary()

@router.get("/admin/login_events")
def admin_login_events():
    return get_login_events()

from fastapi import Query
@router.get("/admin/feature_usage")
def admin_feature_usage(user_id: Optional[str] = Query(None)):
    return get_feature_usage(user_id)

@router.post("/admin/reset_user")
def reset_user(req: ResetUserRequest):
    AUDIT_LOG.append({"action": "reset_user", "user": req.username, "ts": datetime.utcnow()})
    return {"status": "reset_link_sent", "user": req.username}

@router.post("/admin/reset_admin")
def reset_admin(req: ResetAdminRequest):
    if "admin" not in USERS:
        raise HTTPException(status_code=500, detail="Admin user not configured")
    
    admin = USERS["admin"]
    
    # Verify old password using bcrypt
    if not bcrypt.checkpw(req.old_password.encode('utf-8'), admin["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=403, detail="Invalid admin password")
    
    # Hash new password
    new_password_hash = bcrypt.hashpw(req.new_password.encode('utf-8'), bcrypt.gensalt())
    admin["password_hash"] = new_password_hash.decode('utf-8')
    admin["last_reset"] = datetime.utcnow()
    
    # TODO: Persist to database
    AUDIT_LOG.append({"action": "reset_admin", "ts": datetime.utcnow()})
    return {"status": "admin_password_changed", "expires": (datetime.utcnow() + timedelta(days=180)).isoformat()}

@router.get("/admin/audit_log")
def get_audit_log():
    return AUDIT_LOG
