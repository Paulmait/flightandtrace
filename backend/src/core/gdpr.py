"""
GDPR/CCPA Compliance Module for FlightTrace
Handles data export, account deletion, and privacy rights management
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import json
import logging
import hashlib
import secrets
from src.db.database import get_connection
from src.core.auth import get_current_active_user
from src.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["gdpr"])

# Constants
DELETION_GRACE_PERIOD_DAYS = 30
EXPORT_EXPIRY_HOURS = 48
DATA_EXPORT_EMAIL_TEMPLATE = "data_export_ready"

# Models
class DataExportRequest(BaseModel):
    include_flight_history: bool = True
    include_settings: bool = True
    include_alerts: bool = True
    format: str = "json"  # json or csv

class DataExportResponse(BaseModel):
    request_id: str
    status: str
    estimated_completion: datetime
    message: str

class DeletionRequest(BaseModel):
    confirmation: str  # Must be "DELETE" to confirm
    reason: Optional[str] = None
    feedback: Optional[str] = None

class DeletionResponse(BaseModel):
    status: str
    scheduled_deletion_date: datetime
    recovery_deadline: datetime
    message: str

class DeletionCancelResponse(BaseModel):
    status: str
    message: str

class PrivacySettingsRequest(BaseModel):
    analytics_enabled: bool = True
    marketing_emails: bool = False
    third_party_sharing: bool = False
    location_history: bool = True

class UserDataSummary(BaseModel):
    user_id: int
    username: str
    email: str
    created_at: datetime
    flight_count: int
    alert_count: int
    data_size_bytes: int


def generate_export_token() -> str:
    """Generate secure token for data export download"""
    return secrets.token_urlsafe(32)


def hash_export_token(token: str) -> str:
    """Hash token for database storage"""
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/export", response_model=DataExportResponse)
async def request_data_export(
    request: DataExportRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Request export of all user data (GDPR Article 20 - Right to Data Portability)
    Data will be prepared and download link sent via email within 48 hours.
    """
    user_id = current_user["user_id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if there's already a pending export request
        cursor.execute("""
            SELECT id, created_at, status
            FROM data_export_requests
            WHERE user_id = ? AND status = 'pending'
            AND created_at > datetime('now', '-24 hours')
        """, (user_id,))

        existing = cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="You already have a pending export request. Please wait 24 hours."
            )

        # Generate secure download token
        download_token = generate_export_token()
        token_hash = hash_export_token(download_token)

        # Create export request record
        request_id = secrets.token_hex(16)
        estimated_completion = datetime.utcnow() + timedelta(hours=EXPORT_EXPIRY_HOURS)

        cursor.execute("""
            INSERT INTO data_export_requests (
                request_id, user_id, status, format,
                include_flight_history, include_settings, include_alerts,
                download_token_hash, created_at, estimated_completion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request_id, user_id, 'pending', request.format,
            request.include_flight_history, request.include_settings, request.include_alerts,
            token_hash, datetime.utcnow(), estimated_completion
        ))

        # Log the request
        cursor.execute("""
            INSERT INTO audit_log (user_id, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, (user_id, 'data_export_requested', f'Request ID: {request_id}', datetime.utcnow()))

        conn.commit()

        # Queue background task to generate export
        background_tasks.add_task(
            process_data_export,
            request_id,
            user_id,
            request.dict(),
            download_token
        )

        logger.info(f"Data export requested for user {user_id}, request_id: {request_id}")

        return DataExportResponse(
            request_id=request_id,
            status="pending",
            estimated_completion=estimated_completion,
            message="Your data export has been requested. You will receive an email with download link within 48 hours."
        )

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error requesting data export: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to request data export"
        )
    finally:
        conn.close()


async def process_data_export(
    request_id: str,
    user_id: int,
    options: dict,
    download_token: str
):
    """Background task to process data export"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Collect all user data
        export_data = {
            "export_info": {
                "request_id": request_id,
                "exported_at": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "format_version": "1.0"
            },
            "user_profile": {},
            "flight_history": [],
            "alerts": [],
            "settings": {},
            "subscriptions": [],
            "audit_log": []
        }

        # Get user profile
        cursor.execute("""
            SELECT username, email, created_at, role, email_verified,
                   mfa_enabled, last_login
            FROM users WHERE user_id = ?
        """, (user_id,))
        user = cursor.fetchone()

        if user:
            export_data["user_profile"] = {
                "username": user[0],
                "email": user[1],
                "created_at": user[2].isoformat() if user[2] else None,
                "role": user[3],
                "email_verified": bool(user[4]),
                "mfa_enabled": bool(user[5]),
                "last_login": user[6].isoformat() if user[6] else None
            }

        # Get flight history (tail numbers tracked)
        if options.get("include_flight_history", True):
            cursor.execute("""
                SELECT tail_number, added_at, is_active
                FROM tail_numbers WHERE user_id = ?
            """, (user_id,))

            for row in cursor.fetchall():
                export_data["flight_history"].append({
                    "tail_number": row[0],
                    "added_at": row[1].isoformat() if row[1] else None,
                    "is_active": bool(row[2])
                })

        # Get alerts
        if options.get("include_alerts", True):
            cursor.execute("""
                SELECT id, alert_type, flight_number, created_at, status
                FROM alerts WHERE user_id = ?
            """, (user_id,))

            for row in cursor.fetchall():
                export_data["alerts"].append({
                    "alert_id": row[0],
                    "type": row[1],
                    "flight_number": row[2],
                    "created_at": row[3].isoformat() if row[3] else None,
                    "status": row[4]
                })

        # Get settings
        if options.get("include_settings", True):
            cursor.execute("""
                SELECT setting_key, setting_value
                FROM user_settings WHERE user_id = ?
            """, (user_id,))

            for row in cursor.fetchall():
                export_data["settings"][row[0]] = row[1]

        # Get subscriptions
        cursor.execute("""
            SELECT plan, status, started_at, expires_at
            FROM subscriptions WHERE user_id = ?
        """, (user_id,))

        for row in cursor.fetchall():
            export_data["subscriptions"].append({
                "plan": row[0],
                "status": row[1],
                "started_at": row[2].isoformat() if row[2] else None,
                "expires_at": row[3].isoformat() if row[3] else None
            })

        # Store export data
        export_json = json.dumps(export_data, indent=2, default=str)

        cursor.execute("""
            UPDATE data_export_requests
            SET status = 'completed',
                export_data = ?,
                completed_at = ?,
                expires_at = ?
            WHERE request_id = ?
        """, (
            export_json,
            datetime.utcnow(),
            datetime.utcnow() + timedelta(hours=EXPORT_EXPIRY_HOURS),
            request_id
        ))

        conn.commit()

        # Send email notification (stub - integrate with SendGrid)
        await send_export_ready_email(
            user_email=export_data["user_profile"].get("email"),
            request_id=request_id,
            download_token=download_token
        )

        logger.info(f"Data export completed for request {request_id}")

    except Exception as e:
        logger.error(f"Error processing data export: {e}")
        cursor.execute("""
            UPDATE data_export_requests
            SET status = 'failed', error_message = ?
            WHERE request_id = ?
        """, (str(e), request_id))
        conn.commit()
    finally:
        conn.close()


async def send_export_ready_email(user_email: str, request_id: str, download_token: str):
    """Send email notification when export is ready"""
    # This would integrate with SendGrid
    download_url = f"https://api.flightandtrace.com/api/user/export/{request_id}/download?token={download_token}"
    logger.info(f"Export ready email would be sent to {user_email} with link: {download_url}")
    # TODO: Integrate with SendGrid email service


@router.get("/export/{request_id}/download")
async def download_data_export(
    request_id: str,
    token: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Download completed data export"""
    user_id = current_user["user_id"]
    token_hash = hash_export_token(token)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT export_data, status, expires_at, user_id
            FROM data_export_requests
            WHERE request_id = ? AND download_token_hash = ?
        """, (request_id, token_hash))

        result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Export not found or invalid token"
            )

        export_data, status, expires_at, export_user_id = result

        # Verify user owns this export
        if export_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        if status != 'completed':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Export is not ready. Status: {status}"
            )

        if expires_at and datetime.utcnow() > expires_at:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Export has expired. Please request a new export."
            )

        # Log download
        cursor.execute("""
            INSERT INTO audit_log (user_id, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, (user_id, 'data_export_downloaded', f'Request ID: {request_id}', datetime.utcnow()))
        conn.commit()

        return json.loads(export_data)

    finally:
        conn.close()


@router.delete("/delete", response_model=DeletionResponse)
async def request_account_deletion(
    request: DeletionRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Request account deletion (GDPR Article 17 - Right to Erasure)
    Account will be scheduled for deletion after 30-day grace period.
    User can cancel within this period.
    """
    user_id = current_user["user_id"]

    # Require explicit confirmation
    if request.confirmation != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must type 'DELETE' to confirm account deletion"
        )

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if deletion is already scheduled
        cursor.execute("""
            SELECT scheduled_deletion_date, status
            FROM account_deletions
            WHERE user_id = ? AND status = 'pending'
        """, (user_id,))

        existing = cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Account deletion already scheduled for {existing[0]}"
            )

        # Schedule deletion
        scheduled_date = datetime.utcnow() + timedelta(days=DELETION_GRACE_PERIOD_DAYS)
        recovery_deadline = scheduled_date - timedelta(hours=24)

        cursor.execute("""
            INSERT INTO account_deletions (
                user_id, status, reason, feedback,
                requested_at, scheduled_deletion_date, recovery_deadline
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, 'pending', request.reason, request.feedback,
            datetime.utcnow(), scheduled_date, recovery_deadline
        ))

        # Mark user as pending deletion
        cursor.execute("""
            UPDATE users SET pending_deletion = 1, deletion_requested_at = ?
            WHERE user_id = ?
        """, (datetime.utcnow(), user_id))

        # Log the request
        cursor.execute("""
            INSERT INTO audit_log (user_id, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, (
            user_id,
            'account_deletion_requested',
            f'Scheduled for: {scheduled_date.isoformat()}',
            datetime.utcnow()
        ))

        conn.commit()

        logger.info(f"Account deletion scheduled for user {user_id} on {scheduled_date}")

        # Send confirmation email (stub)
        await send_deletion_confirmation_email(
            user_email=current_user.get("email"),
            scheduled_date=scheduled_date,
            recovery_deadline=recovery_deadline
        )

        return DeletionResponse(
            status="scheduled",
            scheduled_deletion_date=scheduled_date,
            recovery_deadline=recovery_deadline,
            message=f"Your account is scheduled for deletion on {scheduled_date.strftime('%B %d, %Y')}. "
                    f"You can cancel this request by logging in before {recovery_deadline.strftime('%B %d, %Y')}."
        )

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error scheduling account deletion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to schedule account deletion"
        )
    finally:
        conn.close()


async def send_deletion_confirmation_email(
    user_email: str,
    scheduled_date: datetime,
    recovery_deadline: datetime
):
    """Send email confirming deletion request"""
    logger.info(f"Deletion confirmation email would be sent to {user_email}")
    # TODO: Integrate with SendGrid


@router.post("/cancel-deletion", response_model=DeletionCancelResponse)
async def cancel_account_deletion(
    current_user: dict = Depends(get_current_active_user)
):
    """Cancel pending account deletion within grace period"""
    user_id = current_user["user_id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Find pending deletion
        cursor.execute("""
            SELECT id, recovery_deadline
            FROM account_deletions
            WHERE user_id = ? AND status = 'pending'
        """, (user_id,))

        result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No pending account deletion found"
            )

        deletion_id, recovery_deadline = result

        # Check if still within recovery period
        if datetime.utcnow() > recovery_deadline:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Recovery period has expired. Account deletion cannot be cancelled."
            )

        # Cancel deletion
        cursor.execute("""
            UPDATE account_deletions
            SET status = 'cancelled', cancelled_at = ?
            WHERE id = ?
        """, (datetime.utcnow(), deletion_id))

        # Remove pending deletion flag
        cursor.execute("""
            UPDATE users SET pending_deletion = 0, deletion_requested_at = NULL
            WHERE user_id = ?
        """, (user_id,))

        # Log cancellation
        cursor.execute("""
            INSERT INTO audit_log (user_id, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, (user_id, 'account_deletion_cancelled', 'User cancelled deletion request', datetime.utcnow()))

        conn.commit()

        logger.info(f"Account deletion cancelled for user {user_id}")

        return DeletionCancelResponse(
            status="cancelled",
            message="Your account deletion request has been cancelled. Your account is now active."
        )

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error cancelling account deletion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel account deletion"
        )
    finally:
        conn.close()


@router.get("/data-summary", response_model=UserDataSummary)
async def get_data_summary(
    current_user: dict = Depends(get_current_active_user)
):
    """Get summary of user's stored data"""
    user_id = current_user["user_id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get user info
        cursor.execute("""
            SELECT username, email, created_at FROM users WHERE user_id = ?
        """, (user_id,))
        user = cursor.fetchone()

        # Count flights
        cursor.execute("SELECT COUNT(*) FROM tail_numbers WHERE user_id = ?", (user_id,))
        flight_count = cursor.fetchone()[0]

        # Count alerts
        cursor.execute("SELECT COUNT(*) FROM alerts WHERE user_id = ?", (user_id,))
        alert_count = cursor.fetchone()[0]

        # Estimate data size (rough calculation)
        data_size = (flight_count * 100) + (alert_count * 200) + 1000  # bytes

        return UserDataSummary(
            user_id=user_id,
            username=user[0],
            email=user[1],
            created_at=user[2],
            flight_count=flight_count,
            alert_count=alert_count,
            data_size_bytes=data_size
        )

    finally:
        conn.close()


@router.put("/privacy-settings")
async def update_privacy_settings(
    settings: PrivacySettingsRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Update user privacy settings (CCPA opt-out support)"""
    user_id = current_user["user_id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Upsert privacy settings
        for key, value in settings.dict().items():
            cursor.execute("""
                INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value, updated_at)
                VALUES (?, ?, ?, ?)
            """, (user_id, f"privacy_{key}", str(value), datetime.utcnow()))

        # Log settings change
        cursor.execute("""
            INSERT INTO audit_log (user_id, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, (user_id, 'privacy_settings_updated', json.dumps(settings.dict()), datetime.utcnow()))

        conn.commit()

        return {"status": "updated", "settings": settings.dict()}

    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating privacy settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update privacy settings"
        )
    finally:
        conn.close()


@router.get("/privacy-settings")
async def get_privacy_settings(
    current_user: dict = Depends(get_current_active_user)
):
    """Get current privacy settings"""
    user_id = current_user["user_id"]

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT setting_key, setting_value
            FROM user_settings
            WHERE user_id = ? AND setting_key LIKE 'privacy_%'
        """, (user_id,))

        settings = {}
        for row in cursor.fetchall():
            key = row[0].replace("privacy_", "")
            settings[key] = row[1] == "True"

        # Return defaults if not set
        defaults = {
            "analytics_enabled": True,
            "marketing_emails": False,
            "third_party_sharing": False,
            "location_history": True
        }

        for key, default in defaults.items():
            if key not in settings:
                settings[key] = default

        return settings

    finally:
        conn.close()


# Background task to process scheduled deletions
async def process_scheduled_deletions():
    """
    Cron job to process accounts scheduled for deletion.
    Should be run daily.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Find accounts ready for deletion
        cursor.execute("""
            SELECT ad.user_id, u.email
            FROM account_deletions ad
            JOIN users u ON ad.user_id = u.user_id
            WHERE ad.status = 'pending'
            AND ad.scheduled_deletion_date <= datetime('now')
        """)

        accounts_to_delete = cursor.fetchall()

        for user_id, email in accounts_to_delete:
            try:
                # Permanently delete user data
                from src.core.user import delete_user_data
                delete_user_data(user_id)

                # Update deletion record
                cursor.execute("""
                    UPDATE account_deletions
                    SET status = 'completed', completed_at = ?
                    WHERE user_id = ? AND status = 'pending'
                """, (datetime.utcnow(), user_id))

                logger.info(f"Account permanently deleted: user_id={user_id}")

            except Exception as e:
                logger.error(f"Error deleting account {user_id}: {e}")
                cursor.execute("""
                    UPDATE account_deletions
                    SET status = 'failed', error_message = ?
                    WHERE user_id = ? AND status = 'pending'
                """, (str(e), user_id))

        conn.commit()

    except Exception as e:
        logger.error(f"Error processing scheduled deletions: {e}")
        conn.rollback()
    finally:
        conn.close()
