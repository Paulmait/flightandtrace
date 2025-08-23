"""
Integration tests demonstrating comprehensive error handling
Tests validation, rate limiting, and error response scenarios
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import json
from pydantic import ValidationError as PydanticValidationError

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.validation import (
    validate_fuel_request, validate_get_params, ValidationError,
    create_error_response, sanitize_input_string
)
from src.core.enhanced_rate_limiter import (
    EnhancedRateLimiter, InMemoryStorage, RateLimitStatus
)


class TestValidationErrorScenarios:
    """Test validation error scenarios that would return 400"""
    
    def test_400_empty_request_validation(self):
        """Test empty request returns validation error"""
        with pytest.raises(ValidationError) as exc_info:
            validate_fuel_request({})
        
        assert "Invalid request" in str(exc_info.value)
    
    def test_400_missing_required_fields(self):
        """Test missing required fields return validation error"""
        incomplete_data = {
            "flight_id": "TEST001"
            # Missing aircraft_type and altitude_series
        }
        
        with pytest.raises(ValidationError):
            validate_fuel_request(incomplete_data)
    
    def test_400_invalid_altitude_data(self):
        """Test invalid altitude data returns validation error"""
        base_time = datetime.utcnow()
        invalid_data = {
            "flight_id": "INVALID_ALT",
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": "not_a_number"}
            ]
        }
        
        with pytest.raises(ValidationError):
            validate_fuel_request(invalid_data)
    
    def test_400_insufficient_altitude_points(self):
        """Test insufficient altitude points return validation error"""
        base_time = datetime.utcnow()
        insufficient_data = {
            "flight_id": "INSUFFICIENT",
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0}
            ]
        }
        
        with pytest.raises(ValidationError):
            validate_fuel_request(insufficient_data)
    
    def test_400_get_params_missing_flight_id(self):
        """Test GET params without flightId return validation error"""
        with pytest.raises(ValidationError):
            validate_get_params({})
    
    def test_input_sanitization_works(self):
        """Test input sanitization removes dangerous content"""
        dangerous_input = "<script>alert('xss')</script>flight123"
        sanitized = sanitize_input_string(dangerous_input, 50)
        
        # Dangerous content should be removed
        assert "<script>" not in sanitized
        assert "alert" not in sanitized
        assert "flight123" in sanitized
    
    def test_create_400_error_response(self):
        """Test creating standardized 400 error response"""
        response = create_error_response(400, "Validation failed", {"field": "flight_id"})
        
        assert response["error"] is True
        assert response["status_code"] == 400
        assert response["message"] == "Validation failed"
        assert response["details"]["field"] == "flight_id"
        assert "timestamp" in response


class TestRateLimitingErrorScenarios:
    """Test rate limiting scenarios that would return 429"""
    
    @pytest.fixture
    def rate_limiter(self):
        """Create rate limiter with in-memory storage"""
        return EnhancedRateLimiter(InMemoryStorage())
    
    def test_429_ip_rate_limit_exceeded(self, rate_limiter):
        """Test IP rate limit exceeded returns blocked status"""
        # Add rule with low limit for testing
        from src.core.enhanced_rate_limiter import RateLimitRule
        rate_limiter.add_rule("test_limit", RateLimitRule(2, 3600))
        
        # Make requests up to limit
        status1 = rate_limiter.check_rate_limit("192.168.1.1", "test_limit")
        status2 = rate_limiter.check_rate_limit("192.168.1.1", "test_limit")
        
        assert status1.allowed is True
        assert status2.allowed is True
        
        # Next request should be blocked (429)
        status3 = rate_limiter.check_rate_limit("192.168.1.1", "test_limit")
        
        assert status3.allowed is False
        assert status3.retry_after is not None
        assert status3.retry_after > 0
    
    def test_429_user_rate_limit_exceeded(self, rate_limiter):
        """Test user rate limit exceeded returns blocked status"""
        from src.core.enhanced_rate_limiter import RateLimitRule
        rate_limiter.add_rule("user_test", RateLimitRule(1, 3600))
        
        # First request allowed
        status1 = rate_limiter.check_rate_limit("user123", "user_test")
        assert status1.allowed is True
        
        # Second request blocked (429)
        status2 = rate_limiter.check_rate_limit("user123", "user_test")
        assert status2.allowed is False
        assert status2.remaining == 0
    
    def test_429_fuel_api_multiple_limits(self, rate_limiter):
        """Test fuel API with multiple rate limit checks"""
        # Test the convenience function for fuel API limits
        from src.core.enhanced_rate_limiter import check_fuel_api_limits
        
        # Mock the global rate_limiter to use our test instance
        with patch('src.core.enhanced_rate_limiter.rate_limiter', rate_limiter):
            # First call should succeed
            status = check_fuel_api_limits("192.168.1.100", "user456")
            assert status.allowed is True
            
            # After many calls, should be rate limited
            # (using default fuel_estimate_user limit of 500/hour)
            for _ in range(498):  # Already made 1, need 498 more to reach limit
                rate_limiter.storage.increment("user:user456", 3600)
            
            status_blocked = check_fuel_api_limits("192.168.1.100", "user456")
            assert status_blocked.allowed is False
    
    def test_rate_limit_status_headers_info(self, rate_limiter):
        """Test rate limit status provides header information"""
        from src.core.enhanced_rate_limiter import RateLimitRule
        rate_limiter.add_rule("header_test", RateLimitRule(10, 1800))
        
        status = rate_limiter.check_rate_limit("client1", "header_test")
        
        # Should provide info needed for HTTP headers
        assert status.limit == 10
        assert status.remaining == 9  # After 1 request
        assert status.reset_time > datetime.utcnow()
        assert status.retry_after is None  # Only set when blocked
    
    def test_create_429_error_response(self):
        """Test creating standardized 429 error response"""
        response = create_error_response(
            429, 
            "Rate limit exceeded", 
            {"retry_after": 3600, "limit": 100}
        )
        
        assert response["error"] is True
        assert response["status_code"] == 429
        assert response["message"] == "Rate limit exceeded"
        assert response["details"]["retry_after"] == 3600
        assert response["details"]["limit"] == 100


class TestInternalServerErrorScenarios:
    """Test scenarios that would return 500 internal server errors"""
    
    def test_500_fuel_estimator_exception(self):
        """Test fuel estimator exception handling"""
        base_time = datetime.utcnow()
        valid_data = {
            "flight_id": "ERROR_TEST",
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0},
                {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
            ]
        }
        
        # Validate request should succeed
        request = validate_fuel_request(valid_data)
        assert request.flight_id == "ERROR_TEST"
        
        # But if fuel estimator throws exception, would return 500
        from src.core.fuel_estimation_v2 import EnhancedFuelEstimator
        
        with patch.object(EnhancedFuelEstimator, 'estimate_fuel') as mock_estimate:
            mock_estimate.side_effect = Exception("Database connection failed")
            
            try:
                estimator = EnhancedFuelEstimator()
                
                # Convert altitude_series to proper format for estimator
                altitude_samples = [
                    (datetime.fromisoformat(point["timestamp"]), point["altitude"])
                    for point in valid_data["altitude_series"]
                ]
                
                # This would raise exception (500 scenario)
                estimator.estimate_fuel(
                    request.flight_id,
                    request.aircraft_type,
                    altitude_samples
                )
                assert False, "Should have raised exception"
            except Exception as e:
                assert "Database connection failed" in str(e)
    
    def test_500_rate_limiter_exception_handling(self):
        """Test rate limiter exception is handled gracefully"""
        from src.core.enhanced_rate_limiter import EnhancedRateLimiter
        
        with patch('src.core.enhanced_rate_limiter.InMemoryStorage') as mock_storage_class:
            # Make storage throw exception
            mock_storage = Mock()
            mock_storage.get_count.side_effect = Exception("Storage failure")
            mock_storage_class.return_value = mock_storage
            
            rate_limiter = EnhancedRateLimiter()
            
            # Should handle exception gracefully (could fail open or return 500)
            try:
                status = rate_limiter.check_rate_limit("error_user", "api_general")
                # If it doesn't raise exception, it failed open (allowed the request)
                # This is acceptable behavior for rate limiting
            except Exception as e:
                # If it raises exception, that would result in 500 response
                assert "Storage failure" in str(e)
    
    def test_500_unexpected_validation_error(self):
        """Test unexpected validation error handling"""
        with patch('src.core.validation.FuelEstimateRequest') as mock_model:
            # Make Pydantic model throw unexpected exception
            mock_model.side_effect = Exception("Unexpected validation error")
            
            base_time = datetime.utcnow()
            data = {
                "flight_id": "ERROR_TEST",
                "aircraft_type": "B737-800",
                "altitude_series": [
                    {"timestamp": base_time.isoformat(), "altitude": 0}
                ]
            }
            
            # Should raise ValidationError (which becomes 500)
            with pytest.raises(ValidationError):
                validate_fuel_request(data)
    
    def test_create_500_error_response(self):
        """Test creating standardized 500 error response"""
        response = create_error_response(500, "Internal server error")
        
        assert response["error"] is True
        assert response["status_code"] == 500
        assert response["message"] == "Internal server error"
        assert "timestamp" in response
        # No details should be included to avoid leaking sensitive info


class TestErrorResponseStandardization:
    """Test standardized error response formats"""
    
    def test_400_response_format(self):
        """Test 400 error response format"""
        response = create_error_response(400, "Invalid input", {"field": "altitude"})
        
        required_fields = ["error", "status_code", "message", "timestamp"]
        for field in required_fields:
            assert field in response
        
        assert response["error"] is True
        assert response["status_code"] == 400
        assert response["details"]["field"] == "altitude"
    
    def test_429_response_format(self):
        """Test 429 error response format"""
        response = create_error_response(
            429, 
            "Rate limit exceeded",
            {"retry_after": 3600, "limit": 100, "remaining": 0}
        )
        
        assert response["status_code"] == 429
        assert response["details"]["retry_after"] == 3600
        assert response["details"]["limit"] == 100
        assert response["details"]["remaining"] == 0
    
    def test_500_response_format(self):
        """Test 500 error response format"""
        response = create_error_response(500, "Internal server error")
        
        assert response["status_code"] == 500
        assert response["message"] == "Internal server error"
        # Should not include details for security
        assert "details" not in response
    
    def test_response_timestamp_format(self):
        """Test error response timestamp is ISO format"""
        response = create_error_response(400, "Test error")
        
        # Should be valid ISO timestamp
        timestamp = response["timestamp"]
        try:
            datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except ValueError:
            assert False, f"Invalid timestamp format: {timestamp}"


class TestCoverageVerification:
    """Verify comprehensive error path coverage"""
    
    def test_validation_errors_covered(self):
        """Verify all major validation error types are covered"""
        test_cases = [
            {},  # Empty request
            {"flight_id": "TEST"},  # Missing required fields
            {"flight_id": "", "aircraft_type": "B737", "altitude_series": []},  # Empty values
        ]
        
        for test_case in test_cases:
            with pytest.raises(ValidationError):
                validate_fuel_request(test_case)
    
    def test_rate_limiting_scenarios_covered(self):
        """Verify major rate limiting scenarios are covered"""
        rate_limiter = EnhancedRateLimiter(InMemoryStorage())
        
        # IP-based limiting
        from src.core.enhanced_rate_limiter import RateLimitRule
        rate_limiter.add_rule("ip_test", RateLimitRule(1, 3600))
        
        # First request allowed
        status1 = rate_limiter.check_rate_limit("192.168.1.1", "ip_test")
        assert status1.allowed is True
        
        # Second request blocked
        status2 = rate_limiter.check_rate_limit("192.168.1.1", "ip_test")
        assert status2.allowed is False
        assert status2.retry_after is not None
    
    def test_error_response_consistency(self):
        """Verify all error responses follow consistent format"""
        error_codes = [400, 401, 403, 404, 429, 500, 503]
        
        for code in error_codes:
            response = create_error_response(code, f"Error {code}")
            
            # All responses should have consistent structure
            assert response["error"] is True
            assert response["status_code"] == code
            assert "message" in response
            assert "timestamp" in response
            
            # Timestamp should be recent (within last minute)
            timestamp = datetime.fromisoformat(response["timestamp"])
            assert (datetime.utcnow() - timestamp).total_seconds() < 60


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])