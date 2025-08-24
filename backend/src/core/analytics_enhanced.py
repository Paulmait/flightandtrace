# analytics_enhanced.py
# Cohort retention, churn prediction, real-time activity, premium adoption, alert effectiveness, anomaly detection
from fastapi import APIRouter, HTTPException, Query
from src.db.database import get_connection
from datetime import datetime, timedelta

router = APIRouter(tags=["analytics-enhanced"])

@router.get("/analytics/cohort-retention")
def cohort_retention(weeks: int = Query(12)):
    """User retention by signup cohort (weekly)"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(weeks=weeks)).isoformat()
        cursor.execute("""
            SELECT strftime('%Y-%W', signup_date) as cohort, strftime('%Y-%W', last_active) as active_week, COUNT(*)
            FROM users
            WHERE signup_date > ?
            GROUP BY cohort, active_week
            ORDER BY cohort, active_week
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"cohort": row[0], "active_week": row[1], "count": row[2]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cohort retention error: {e}")

@router.get("/analytics/churn-prediction")
def churn_prediction():
    """Predicted churn risk by user segment (dummy logic)"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT plan, COUNT(*) as users, AVG(last_active < date('now', '-30 day')) as churn_risk
            FROM users
            GROUP BY plan
        """)
        data = cursor.fetchall()
        conn.close()
        return [{"plan": row[0], "users": row[1], "churn_risk": float(row[2])} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Churn prediction error: {e}")

@router.get("/analytics/real-time-activity")
def real_time_activity():
    """Current active users and flights (last 5 min)"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
        cursor.execute("SELECT COUNT(DISTINCT user_id) FROM audit_log WHERE timestamp > ?", (since,))
        users = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM flight_states WHERE timestamp > ?", (since,))
        flights = cursor.fetchone()[0]
        conn.close()
        return {"active_users": users, "active_flights": flights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Real-time activity error: {e}")

@router.get("/analytics/premium-adoption")
def premium_adoption():
    """Premium feature usage by plan"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT plan, feature, COUNT(*) as uses
            FROM feature_usage JOIN users ON feature_usage.user_id = users.id
            WHERE feature IN ('premium1', 'premium2', 'premium3')
            GROUP BY plan, feature
        """)
        data = cursor.fetchall()
        conn.close()
        return [{"plan": row[0], "feature": row[1], "uses": row[2]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Premium adoption error: {e}")

@router.get("/analytics/alert-effectiveness")
def alert_effectiveness():
    """Notification open/click rates, alert response times by type"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT type, COUNT(*) as sent, SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened, SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked
            FROM alerts
            GROUP BY type
        """)
        data = cursor.fetchall()
        conn.close()
        return [{"type": row[0], "sent": row[1], "opened": row[2], "clicked": row[3]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alert effectiveness error: {e}")

@router.get("/analytics/anomaly-days")
def anomaly_days(days: int = Query(30)):
    """Highlight outlier days for delays, logins, churn"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        # Example: delays
        cursor.execute("""
            SELECT strftime('%Y-%m-%d', timestamp) as day, COUNT(*) as delays
            FROM flight_states
            WHERE delay_reason IS NOT NULL AND timestamp > ?
            GROUP BY day
            HAVING delays > (SELECT AVG(cnt) + 2*STDDEV(cnt) FROM (SELECT COUNT(*) as cnt FROM flight_states WHERE delay_reason IS NOT NULL AND timestamp > ? GROUP BY strftime('%Y-%m-%d', timestamp)))
            ORDER BY day
        """, (since, since))
        delays = cursor.fetchall()
        conn.close()
        return [{"day": row[0], "delays": row[1]} for row in delays]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection error: {e}")
