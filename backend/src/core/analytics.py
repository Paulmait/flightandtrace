# Advanced Analytics Endpoints for Admin/Enterprise
from fastapi import APIRouter, HTTPException, Query
from src.db.database import get_connection
from datetime import datetime, timedelta

router = APIRouter(tags=["analytics"])

@router.get("/analytics/flight-frequency")
def flight_frequency(days: int = Query(30)):
    """Return flight frequency per tail number for the last N days"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor.execute("""
            SELECT tail_number, COUNT(*) as count
            FROM flight_states
            WHERE timestamp > ?
            GROUP BY tail_number
            ORDER BY count DESC
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"tail": row[0], "count": row[1]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")

@router.get("/analytics/delays")
def delay_stats(days: int = Query(30)):
    """Return delay counts per tail number for the last N days"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor.execute("""
            SELECT tail_number, COUNT(*) as delays
            FROM flight_states
            WHERE timestamp > ? AND delay_reason IS NOT NULL
            GROUP BY tail_number
            ORDER BY delays DESC
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        return [{"tail": row[0], "delays": row[1]} for row in data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")

@router.get("/analytics/patterns")
def flight_patterns(days: int = Query(30)):
    """Return flight patterns (e.g., time of day, day of week) per tail number"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor.execute("""
            SELECT tail_number, strftime('%w', timestamp) as weekday, COUNT(*)
            FROM flight_states
            WHERE timestamp > ?
            GROUP BY tail_number, weekday
        """, (since,))
        data = cursor.fetchall()
        conn.close()
        # Aggregate by tail and weekday
        patterns = {}
        for tail, weekday, count in data:
            if tail not in patterns:
                patterns[tail] = {}
            patterns[tail][weekday] = count
        return patterns
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")
