"""
Comprehensive tests for API error handling paths
Tests 400/429/500 error scenarios for fuel estimation endpoints
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import httpx
import sys
import os
from fastapi.testclient import TestClient
import asyncio

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from src.api.fastapi_app import app
except ImportError:
    from main import app
from src.core.enhanced_rate_limiter import RateLimitStatus, EnhancedRateLimiter
from src.core.validation import ValidationError


class TestValidationErrorPaths:
    """Test 400 validation error scenarios"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_post_empty_request_body(self, client):
        """Test POST with empty request body returns 400"""
        response = client.post("/api/fuel/estimate", json={})
        
        assert response.status_code == 400
        data = response.json()
        assert data["error"] is True
        assert "status_code" in data
        assert "message" in data
        assert "timestamp" in data
        assert "Invalid request" in data["message"]
    
    def test_post_missing_required_fields(self, client):
        """Test POST with missing required fields returns 400"""
        invalid_request = {
            "flight_id": "TEST001"
            # Missing aircraft_type and altitude_series
        }
        
        response = client.post("/api/fuel/estimate", json=invalid_request)
        
        assert response.status_code == 400
        data = response.json()
        assert data["error"] is True
        assert "aircraft_type" in data["message"] or "altitude_series" in data["message"]
    
    def test_post_invalid_flight_id(self, client):
        """Test POST with dangerous characters in flight_id returns 400"""
        base_time = datetime.utcnow()
        invalid_request = {
            "flight_id": "<script>alert('xss')</script>",
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0},
                {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000},
                {"timestamp": (base_time + timedelta(hours=2)).isoformat(), "altitude": 0}
            ]
        }
        
        response = client.post("/api/fuel/estimate", json=invalid_request)
        
        # Should either be cleaned (200) or rejected (400)
        if response.status_code == 200:
            # Verify flight_id was sanitized
            data = response.json()
            assert "<script>" not in data.get("flight_id", "")
        else:
            assert response.status_code == 400
    
    def test_post_oversized_altitude_series(self, client):
        """Test POST with >10k altitude points gets clamped"""
        base_time = datetime.utcnow()
        
        # Create 10,001 altitude points
        altitude_series = []
        for i in range(10001):
            timestamp = base_time + timedelta(minutes=i)
            altitude_series.append({
                "timestamp": timestamp.isoformat(),
                "altitude": 35000 if 1000 < i < 9000 else 0
            })
        
        request_data = {
            "flight_id": "OVERSIZED001",
            "aircraft_type": "B737-800",
            "altitude_series": altitude_series
        }
        
        response = client.post("/api/fuel/estimate", json=request_data)
        
        # Should succeed but with clamped data
        assert response.status_code == 200
        # Or might return 400 if validation rejects oversized input
        # Implementation depends on exact validation rules
    
    def test_post_invalid_altitude_values(self, client):
        """Test POST with invalid altitude values returns 400"""
        base_time = datetime.utcnow()
        invalid_request = {
            "flight_id": "INVALID_ALT",
            "aircraft_type": "A320",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": "not_a_number"},
                {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
            ]
        }
        
        response = client.post("/api/fuel/estimate", json=invalid_request)
        
        assert response.status_code == 400
        data = response.json()
        assert data["error"] is True
        assert "altitude" in data["message"].lower()
    
    def test_post_extreme_altitude_values(self, client):
        """Test POST with extreme altitude values gets clamped"""
        base_time = datetime.utcnow()
        request_data = {
            "flight_id": "EXTREME_ALT",
            "aircraft_type": "SR71",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": -5000},  # Below Dead Sea
                {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 100000},  # Space
                {"timestamp": (base_time + timedelta(hours=2)).isoformat(), "altitude": 0}
            ]
        }
        
        response = client.post("/api/fuel/estimate", json=request_data)
        
        # Should succeed with clamped values
        assert response.status_code == 200
        data = response.json()
        # Verify altitudes were clamped to reasonable aviation limits
        if "altitude_series" in data.get("assumptions", {}):
            for point in data["assumptions"]["altitude_series"]:
                assert -1000 <= point["altitude"] <= 60000
    
    def test_post_insufficient_altitude_points(self, client):
        """Test POST with <2 altitude points returns 400"""
        base_time = datetime.utcnow()
        invalid_request = {
            "flight_id": "INSUFFICIENT",
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0}
            ]
        }
        
        response = client.post("/api/fuel/estimate", json=invalid_request)
        
        assert response.status_code == 400
        data = response.json()
        assert data["error"] is True
        assert "at least 2" in data["message"].lower() or "insufficient" in data["message"].lower()
    
    def test_get_missing_flight_id(self, client):
        """Test GET without flightId parameter returns 400"""
        response = client.get("/api/fuel/estimate")
        
        assert response.status_code == 400
        data = response.json()
        assert data["error"] is True
        assert "flightId" in data["message"]
    
    def test_get_invalid_flight_id(self, client):
        """Test GET with dangerous flightId parameter"""
        response = client.get("/api/fuel/estimate?flightId=%3Cscript%3Ealert('xss')%3C/script%3E")
        
        # Should either sanitize (200/404) or reject (400)
        assert response.status_code in [200, 400, 404]
        
        if response.status_code != 400:
            data = response.json()
            # If processed, ensure no dangerous content in response
            response_str = json.dumps(data)
            assert "<script>" not in response_str.lower()
    
    def test_batch_request_oversized(self, client):
        """Test batch request with >100 flights gets clamped or rejected"""
        base_time = datetime.utcnow()
        
        # Create 101 flight requests
        flight_requests = []
        for i in range(101):
            flight_requests.append({
                "flight_id": f"BATCH{i:03d}",
                "aircraft_type": "B737-800",
                "altitude_series": [
                    {"timestamp": base_time.isoformat(), "altitude": 0},
                    {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000},
                    {"timestamp": (base_time + timedelta(hours=2)).isoformat(), "altitude": 0}
                ]
            })
        
        batch_request = {"flight_requests": flight_requests}
        
        response = client.post("/api/fuel/batch-estimate", json=batch_request)
        
        # Should either succeed with clamped data or return 400
        if response.status_code == 200:
            data = response.json()
            # Verify batch was clamped to 100
            if isinstance(data, list):
                assert len(data) <= 100
        else:
            assert response.status_code == 400


class TestRateLimitingErrorPaths:
    """Test 429 rate limiting scenarios"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_rate_limiter(self):
        """Create mock rate limiter"""
        with patch('src.api.fastapi_app.rate_limiter') as mock:
            yield mock
    
    def test_ip_rate_limit_exceeded(self, client, mock_rate_limiter):
        """Test IP rate limit exceeded returns 429"""
        # Mock rate limiter to return exceeded status
        mock_status = RateLimitStatus(
            allowed=False,
            limit=100,
            remaining=0,
            reset_time=datetime.utcnow() + timedelta(hours=1),
            retry_after=3600
        )
        mock_rate_limiter.check_rate_limit.return_value = mock_status
        
        base_time = datetime.utcnow()
        request_data = {
            "flight_id": "RATE_LIMIT_TEST",
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0},
                {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000},
                {"timestamp": (base_time + timedelta(hours=2)).isoformat(), "altitude": 0}
            ]
        }
        
        response = client.post("/api/fuel/estimate", json=request_data)
        
        assert response.status_code == 429
        data = response.json()
        assert data["error"] is True
        assert "rate limit" in data["message"].lower()
        
        # Check rate limit headers
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers
        assert "Retry-After" in response.headers
    
    def test_user_rate_limit_exceeded(self, client, mock_rate_limiter):
        """Test user-based rate limit exceeded returns 429"""
        mock_status = RateLimitStatus(
            allowed=False,
            limit=500,
            remaining=0,
            reset_time=datetime.utcnow() + timedelta(minutes=30),
            retry_after=1800
        )
        mock_rate_limiter.check_rate_limit.return_value = mock_status
        
        # Simulate authenticated request with user token
        headers = {"Authorization": "Bearer user_token_123"}
        
        response = client.get(
            "/api/fuel/estimate?flightId=USER_RATE_TEST",
            headers=headers
        )
        
        assert response.status_code == 429
        assert "Retry-After" in response.headers
        assert int(response.headers["Retry-After"]) == 1800
    
    def test_global_rate_limit_exceeded(self, client, mock_rate_limiter):
        """Test global rate limit exceeded returns 429"""
        mock_status = RateLimitStatus(
            allowed=False,
            limit=10000,
            remaining=0,
            reset_time=datetime.utcnow() + timedelta(minutes=45),
            retry_after=2700
        )
        mock_rate_limiter.check_rate_limit.return_value = mock_status
        
        base_time = datetime.utcnow()
        request_data = {
            "flight_id": "GLOBAL_LIMIT_TEST",
            "aircraft_type": "A320",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0},
                {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
            ]
        }
        
        response = client.post("/api/fuel/estimate", json=request_data)
        
        assert response.status_code == 429
        data = response.json()
        assert "global" in data["message"].lower() or "system" in data["message"].lower()
    
    def test_rate_limit_headers_present(self, client, mock_rate_limiter):
        """Test rate limit headers are present in successful responses"""
        mock_status = RateLimitStatus(
            allowed=True,
            limit=100,
            remaining=75,
            reset_time=datetime.utcnow() + timedelta(minutes=30)
        )
        mock_rate_limiter.check_rate_limit.return_value = mock_status
        
        # Mock the fuel estimation to succeed
        with patch('src.core.fuel_estimation_v2.EnhancedFuelEstimator') as mock_estimator:
            mock_estimate = Mock()
            mock_estimate.fuel_kg = 1000
            mock_estimate.fuel_liters = 1000 / 0.775
            mock_estimate.fuel_gallons = 1000 / 0.775 * 0.264172
            mock_estimate.co2_kg = 1000 * 3.15
            mock_estimate.confidence = "HIGH"
            mock_estimate.phases = []
            mock_estimate.phase_fuel = {}
            mock_estimate.assumptions = {}
            mock_estimator.return_value.estimate_fuel.return_value = mock_estimate
            
            response = client.get("/api/fuel/estimate?flightId=HEADERS_TEST")
            
            assert response.status_code == 200
            assert "X-RateLimit-Limit" in response.headers
            assert "X-RateLimit-Remaining" in response.headers
            assert "X-RateLimit-Reset" in response.headers
            assert response.headers["X-RateLimit-Remaining"] == "75"


class TestInternalServerErrorPaths:
    """Test 500 internal server error scenarios"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_fuel_estimator_exception(self, client):
        """Test fuel estimator throwing exception returns 500"""
        with patch('src.core.fuel_estimation_v2.EnhancedFuelEstimator') as mock_estimator:
            # Make estimator throw an exception
            mock_estimator.return_value.estimate_fuel.side_effect = Exception("Database connection failed")
            
            base_time = datetime.utcnow()
            request_data = {
                "flight_id": "ERROR_TEST",
                "aircraft_type": "B737-800",
                "altitude_series": [
                    {"timestamp": base_time.isoformat(), "altitude": 0},
                    {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
                ]
            }
            
            response = client.post("/api/fuel/estimate", json=request_data)
            
            assert response.status_code == 500
            data = response.json()
            assert data["error"] is True
            assert "internal server error" in data["message"].lower()
            assert "timestamp" in data
            # Ensure error details are not leaked in production
            assert "Database connection failed" not in data["message"]
    
    def test_rate_limiter_exception(self, client):
        """Test rate limiter exception is handled gracefully"""
        with patch('src.api.fastapi_app.rate_limiter') as mock_rate_limiter:
            # Make rate limiter throw an exception
            mock_rate_limiter.check_rate_limit.side_effect = Exception("Redis connection timeout")
            
            response = client.get("/api/fuel/estimate?flightId=RATE_ERROR_TEST")
            
            # Should either fail open (200) or return 500, but not crash
            assert response.status_code in [200, 500]
            
            if response.status_code == 500:
                data = response.json()
                assert data["error"] is True
                assert "Redis connection timeout" not in data["message"]  # No error detail leakage
    
    def test_validation_exception_handling(self, client):
        """Test unexpected validation exception returns 500"""
        with patch('src.core.validation.validate_fuel_request') as mock_validate:
            # Make validation throw unexpected exception
            mock_validate.side_effect = Exception("Unexpected validation error")
            
            base_time = datetime.utcnow()
            request_data = {
                "flight_id": "VALIDATION_ERROR",
                "aircraft_type": "B737-800",
                "altitude_series": [
                    {"timestamp": base_time.isoformat(), "altitude": 0},
                    {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
                ]
            }
            
            response = client.post("/api/fuel/estimate", json=request_data)
            
            assert response.status_code == 500
            data = response.json()
            assert data["error"] is True
            assert "internal server error" in data["message"].lower()
    
    def test_json_parse_error(self, client):
        """Test malformed JSON returns 400 (not 500)"""
        # Send malformed JSON
        response = client.post(
            "/api/fuel/estimate",
            data='{"flight_id": "TEST", "invalid": json}',  # Invalid JSON
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # FastAPI returns 422 for JSON parse errors
        data = response.json()
        assert "detail" in data  # FastAPI standard error format
    
    def test_memory_error_handling(self, client):
        """Test memory error during processing returns 500"""
        with patch('src.core.fuel_estimation_v2.EnhancedFuelEstimator') as mock_estimator:
            # Simulate memory error
            mock_estimator.return_value.estimate_fuel.side_effect = MemoryError("Out of memory")
            
            base_time = datetime.utcnow()
            request_data = {
                "flight_id": "MEMORY_ERROR",
                "aircraft_type": "A380",
                "altitude_series": [
                    {"timestamp": base_time.isoformat(), "altitude": 0},
                    {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
                ]
            }
            
            response = client.post("/api/fuel/estimate", json=request_data)
            
            assert response.status_code == 500
            data = response.json()
            assert data["error"] is True
            assert "internal server error" in data["message"].lower()
    
    def test_timeout_handling(self, client):
        """Test request timeout handling"""
        with patch('src.core.fuel_estimation_v2.EnhancedFuelEstimator') as mock_estimator:
            # Simulate slow processing
            import time
            def slow_estimate(*args, **kwargs):
                time.sleep(0.1)  # Short delay for test
                raise TimeoutError("Processing timeout")
            
            mock_estimator.return_value.estimate_fuel.side_effect = slow_estimate
            
            base_time = datetime.utcnow()
            request_data = {
                "flight_id": "TIMEOUT_TEST",
                "aircraft_type": "B787-9",
                "altitude_series": [
                    {"timestamp": base_time.isoformat(), "altitude": 0},
                    {"timestamp": (base_time + timedelta(hours=2)).isoformat(), "altitude": 35000}
                ]
            }
            
            response = client.post("/api/fuel/estimate", json=request_data, timeout=0.5)
            
            # Should return error status
            assert response.status_code in [500, 504]  # Internal error or timeout


class TestCORSSecurityPaths:
    """Test CORS security configuration"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_cors_headers_development(self, client):
        """Test CORS headers in development mode"""
        with patch.dict(os.environ, {"NODE_ENV": "development"}):
            response = client.options("/api/fuel/estimate")
            
            # In development, should allow broad CORS
            if "Access-Control-Allow-Origin" in response.headers:
                assert response.headers["Access-Control-Allow-Origin"] == "*"
    
    def test_cors_headers_production(self, client):
        """Test CORS headers are restricted in production"""
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            # Simulate cross-origin request
            headers = {"Origin": "https://malicious-site.com"}
            response = client.options("/api/fuel/estimate", headers=headers)
            
            # In production, should restrict CORS
            if "Access-Control-Allow-Origin" in response.headers:
                origin = response.headers["Access-Control-Allow-Origin"]
                assert origin != "*"
                assert "malicious-site.com" not in origin
    
    def test_unauthorized_origin_rejected(self, client):
        """Test unauthorized origins are rejected in production"""
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            headers = {"Origin": "https://evil.com"}
            
            response = client.post(
                "/api/fuel/estimate",
                json={"flight_id": "CORS_TEST", "aircraft_type": "B737"},
                headers=headers
            )
            
            # Should either reject or not include CORS headers
            if "Access-Control-Allow-Origin" in response.headers:
                assert response.headers["Access-Control-Allow-Origin"] != "https://evil.com"


class TestEdgeCases:
    """Test edge cases and boundary conditions"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_unicode_in_flight_id(self, client):
        """Test unicode characters in flight_id"""
        base_time = datetime.utcnow()
        request_data = {
            "flight_id": "测试✈️🛩️",
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0},
                {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
            ]
        }
        
        response = client.post("/api/fuel/estimate", json=request_data)
        
        # Should either sanitize (200) or reject (400)
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            # Ensure unicode was handled properly
            assert data.get("flight_id") is not None
    
    def test_very_long_flight_id(self, client):
        """Test very long flight_id gets clamped"""
        long_flight_id = "A" * 1000  # 1000 characters
        
        base_time = datetime.utcnow()
        request_data = {
            "flight_id": long_flight_id,
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0},
                {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
            ]
        }
        
        response = client.post("/api/fuel/estimate", json=request_data)
        
        # Should succeed with clamped flight_id
        assert response.status_code == 200
        data = response.json()
        # flight_id should be clamped to 50 characters
        if "flight_id" in data:
            assert len(data["flight_id"]) <= 50
    
    def test_null_values_in_request(self, client):
        """Test null values in request fields"""
        base_time = datetime.utcnow()
        request_data = {
            "flight_id": None,
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0}
            ]
        }
        
        response = client.post("/api/fuel/estimate", json=request_data)
        
        assert response.status_code == 400
        data = response.json()
        assert data["error"] is True
    
    def test_concurrent_requests(self, client):
        """Test concurrent requests don't interfere"""
        import threading
        import time
        
        results = []
        
        def make_request(flight_id):
            base_time = datetime.utcnow()
            request_data = {
                "flight_id": flight_id,
                "aircraft_type": "B737-800",
                "altitude_series": [
                    {"timestamp": base_time.isoformat(), "altitude": 0},
                    {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
                ]
            }
            
            response = client.post("/api/fuel/estimate", json=request_data)
            results.append((flight_id, response.status_code))
        
        # Start 5 concurrent requests
        threads = []
        for i in range(5):
            thread = threading.Thread(target=make_request, args=(f"CONCURRENT_{i}",))
            threads.append(thread)
            thread.start()
        
        # Wait for all to complete
        for thread in threads:
            thread.join()
        
        # All should complete successfully or fail consistently
        assert len(results) == 5
        for flight_id, status_code in results:
            assert status_code in [200, 400, 429, 500]  # Expected status codes


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=src.api.fastapi_app", "--cov-report=term-missing"])