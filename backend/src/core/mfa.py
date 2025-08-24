# MFA (Multi-Factor Authentication) backend scaffold for FastAPI
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from src.core.auth import get_current_active_user
from src.db.database import get_connection
import pyotp
import base64
import os

router = APIRouter(tags=["mfa"])

class MFASetupRequest(BaseModel):
    method: str  # 'totp', 'email', 'sms'

class MFAVerifyRequest(BaseModel):
    code: str
    method: str


@router.post("/mfa/setup")
def setup_mfa(req: MFASetupRequest, current_user: dict = Depends(get_current_active_user)):
    if req.method == 'totp':
        secret = base64.b32encode(os.urandom(10)).decode('utf-8')
        # Store secret in DB for user
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE user_id = ?", (secret, current_user["user_id"]))
        conn.commit()
        conn.close()
        uri = pyotp.totp.TOTP(secret).provisioning_uri(name=current_user["email"], issuer_name="FlightTrace")
        return {"secret": secret, "uri": uri}
    # ...handle email/sms setup...
    raise HTTPException(status_code=400, detail="Unsupported MFA method")


@router.post("/mfa/verify")
def verify_mfa(req: MFAVerifyRequest, current_user: dict = Depends(get_current_active_user)):
    # Retrieve user's MFA secret from DB
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT mfa_secret FROM users WHERE user_id = ?", (current_user["user_id"],))
    row = cursor.fetchone()
    conn.close()
    if not row or not row[0]:
        raise HTTPException(status_code=400, detail="MFA not set up")
    secret = row[0]
    if req.method == 'totp':
        totp = pyotp.TOTP(secret)
        if totp.verify(req.code):
            # Optionally mark MFA as verified for session (implement session logic as needed)
            return {"verified": True}
        raise HTTPException(status_code=401, detail="Invalid MFA code")
    # ...handle email/sms verification...
    raise HTTPException(status_code=400, detail="Unsupported MFA method")
