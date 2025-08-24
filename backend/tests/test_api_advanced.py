import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)

@pytest.fixture
def premium_token():
    return "premium-token"

@pytest.fixture
def free_token():
    return "free-token"

@pytest.fixture
def test_user():
    return "test-user"

def test_user_profile_switch(free_token, premium_token):
    # Free user
    resp = client.get("/user/profile", headers={"Authorization": f"Bearer {free_token}"})
    assert resp.status_code == 200
    assert resp.json()["plan"] == "Free"
    # Premium user
    resp = client.get("/user/profile", headers={"Authorization": f"Bearer {premium_token}"})
    assert resp.status_code == 200
    assert resp.json()["plan"] == "Premium"

def test_notify_push_sms_email(test_user):
    # Push
    resp = client.post("/notify/push", json={"userId": test_user, "message": "Push"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "sent"
    # SMS
    resp = client.post("/notify/sms", json={"userId": test_user, "message": "SMS"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "sent"
    # Email
    resp = client.post("/notify/email", json={"userId": test_user, "subject": "Subject", "message": "Email"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "sent"

def test_gating_for_free_user(free_token):
    # Simulate API endpoint for premium feature
    resp = client.get("/flights/history", headers={"Authorization": f"Bearer {free_token}"})
    assert resp.status_code == 403 or resp.json().get("error")

def test_gating_for_premium_user(premium_token):
    resp = client.get("/flights/history", headers={"Authorization": f"Bearer {premium_token}"})
    assert resp.status_code == 200
    assert "flights" in resp.json()

# FastAPI mock example
from fastapi import Depends
from backend.main import get_current_user
from unittest.mock import patch

def test_mocked_user_plan():
    with patch("backend.main.get_current_user", return_value={"plan": "Premium", "id": "mock-user"}):
        resp = client.get("/user/profile", headers={"Authorization": "Bearer any-token"})
        assert resp.status_code == 200
        assert resp.json()["plan"] == "Premium"
