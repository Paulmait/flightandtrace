# Real-time alerting integration (PagerDuty, Slack)
import requests
from fastapi import APIRouter, HTTPException
from src.core.config import settings

router = APIRouter(tags=["alerting"])

@router.post("/alert/pagerduty")
def send_pagerduty_alert(summary: str, severity: str = "info"):
    """Send alert to PagerDuty"""
    try:
        url = "https://events.pagerduty.com/v2/enqueue"
        payload = {
            "routing_key": settings.PAGERDUTY_SERVICE_KEY,
            "event_action": "trigger",
            "payload": {
                "summary": summary,
                "severity": severity,
                "source": "flighttrace-backend",
                "component": "aviation-data"
            }
        }
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        return {"status": "sent"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"PagerDuty alert error: {e}")

@router.post("/alert/slack")
def send_slack_alert(message: str):
    """Send alert to Slack webhook"""
    try:
        url = settings.SLACK_WEBHOOK_URL
        payload = {"text": message}
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        return {"status": "sent"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Slack alert error: {e}")
