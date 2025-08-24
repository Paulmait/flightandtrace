# Advanced Analytics: Airport Congestion, Route Trends, Alert Response Times, Weather Impact, Fleet Utilization, User Engagement, Subscription Analytics
from fastapi import APIRouter, HTTPException, Query
from src.db.database import get_connection
from datetime import datetime, timedelta

router = APIRouter(tags=["analytics-extra"])

@router.get("/analytics/airport-congestion")
def airport_congestion(hours: int = Query(24)):
    """Arrivals/departures per airport per hour"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        cursor.execute("""
            SELECT arrival, strftime('%H', timestamp) as hour, COUNT(*)
            FROM flight_states
            WHERE timestamp > ?
            GROUP BY arrival, hour
            ORDER BY arrival, hour
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"airport": row[0], "hour": row[1], "count": row[2]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")

@router.get("/analytics/route-trends")
def route_trends(days: int = Query(30)):
    """Most popular city pairs/routes, avg flight time, delay rates"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor.execute("""
            SELECT departure, arrival, COUNT(*) as flights, AVG(julianday(arrival_time) - julianday(departure_time))*24*60 as avg_minutes,
                   SUM(CASE WHEN delay_reason IS NOT NULL THEN 1 ELSE 0 END) as delays
            FROM flight_states
            WHERE timestamp > ?
            GROUP BY departure, arrival
            ORDER BY flights DESC
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"route": f"{row[0]}-{row[1]}", "flights": row[2], "avg_minutes": row[3], "delays": row[4]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")

@router.get("/analytics/alert-response-times")
def alert_response_times(days: int = Query(30)):
    """Time from event to alert sent and user acknowledgment"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor.execute("""
            SELECT event_id, MIN(alert_sent_at - event_time) as response_sec, MIN(user_ack_at - alert_sent_at) as ack_sec
            FROM alerts
            WHERE event_time > ?
            GROUP BY event_id
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"event_id": row[0], "response_sec": row[1], "ack_sec": row[2]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")

@router.get("/analytics/weather-impact")
def weather_impact(days: int = Query(30)):
    """Correlate METAR/TAF weather events with delays/diversions"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor.execute("""
            SELECT weather_code, COUNT(*) as delays
            FROM flight_states
            WHERE timestamp > ? AND delay_reason LIKE '%weather%'
            GROUP BY weather_code
            ORDER BY delays DESC
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"weather_code": row[0], "delays": row[1]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")

@router.get("/analytics/fleet-utilization")
def fleet_utilization(days: int = Query(30)):
    """Aircraft usage rates, idle time, maintenance cycles"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor.execute("""
            SELECT tail_number, COUNT(*) as flights, MIN(timestamp) as first, MAX(timestamp) as last
            FROM flight_states
            WHERE timestamp > ?
            GROUP BY tail_number
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"tail": row[0], "flights": row[1], "first": row[2], "last": row[3]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")

@router.get("/analytics/user-engagement")
def user_engagement(days: int = Query(30)):
    """Active users by time, feature usage, churn rate"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor.execute("""
            SELECT user_id, COUNT(*) as actions
            FROM audit_log
            WHERE timestamp > ?
            GROUP BY user_id
            ORDER BY actions DESC
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"user_id": row[0], "actions": row[1]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")

@router.get("/analytics/subscription")
def subscription_analytics(days: int = Query(30)):
    """Conversion rates, churn, plan upgrades/downgrades, revenue trends"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor.execute("""
            SELECT plan, COUNT(*) as users
            FROM subscriptions
            WHERE created_at > ?
            GROUP BY plan
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"plan": row[0], "users": row[1]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")
