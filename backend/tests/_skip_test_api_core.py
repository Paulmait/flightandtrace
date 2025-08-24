import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)

def test_user_profile_free():
    # Simulate Free user token
    token = "free-token"
    response = client.get("/user/profile", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["plan"] == "Free"

def test_user_profile_premium():
    # Simulate Premium user token
    token = "premium-token"
    response = client.get("/user/profile", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["plan"] == "Premium"

def test_notify_push():
    response = client.post("/notify/push", json={"userId": "test-user", "message": "Test push"})
    assert response.status_code == 200
    assert response.json()["status"] == "sent"

def test_notify_sms():
    response = client.post("/notify/sms", json={"userId": "test-user", "message": "Test SMS"})
    assert response.status_code == 200
    assert response.json()["status"] == "sent"

def test_notify_email():
    response = client.post("/notify/email", json={"userId": "test-user", "subject": "Test", "message": "Test email"})
    assert response.status_code == 200
    assert response.json()["status"] == "sent"
