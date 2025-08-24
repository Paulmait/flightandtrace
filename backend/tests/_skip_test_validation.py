"""
Comprehensive tests for server-side validation module
Tests input sanitization, size limits, and error handling
"""

import pytest
from datetime import datetime, timedelta
from typing import Dict, Any

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.validation import (
    ValidationError, AltitudePoint, FuelEstimateRequest, BatchFuelRequest,
    GetFuelEstimateParams, RateLimitInfo, validate_fuel_request,
    validate_get_params, sanitize_input_string, validate_array_size,
    create_error_response
)
from pydantic import ValidationError as PydanticValidationError


class TestAltitudePoint:
    """Test altitude point validation"""
    
    def test_valid_altitude_point(self):
        """Test valid altitude point creation"""
        timestamp = datetime.utcnow()
        point = AltitudePoint(timestamp=timestamp, altitude=35000)
        
        assert point.timestamp == timestamp
        assert point.altitude == 35000.0
    
    def test_altitude_range_clamping(self):
        """Test altitude gets clamped to valid aviation range"""
        timestamp = datetime.utcnow()
        
        # Below minimum
        point_low = AltitudePoint(timestamp=timestamp, altitude=-2000)
        assert point_low.altitude == -1000.0  # Clamped to Dead Sea level
        
        # Above maximum
        point_high = AltitudePoint(timestamp=timestamp, altitude=80000)
        assert point_high.altitude == 60000.0  # Clamped to service ceiling
        
        # Valid range
        point_valid = AltitudePoint(timestamp=timestamp, altitude=41000)
        assert point_valid.altitude == 41000.0
    
    def test_altitude_type_conversion(self):
        """Test altitude converts to float"""
        timestamp = datetime.utcnow()
        
        # Integer input
        point_int = AltitudePoint(timestamp=timestamp, altitude=35000)
        assert isinstance(point_int.altitude, float)
        
        # String should fail
        with pytest.raises(PydanticValidationError):
            AltitudePoint(timestamp=timestamp, altitude="not_a_number")
    
    def test_timestamp_validation(self):
        """Test timestamp validation"""
        # Valid datetime
        point = AltitudePoint(timestamp=datetime.utcnow(), altitude=0)
        assert isinstance(point.timestamp, datetime)
        
        # Invalid timestamp should fail
        with pytest.raises(PydanticValidationError):
            AltitudePoint(timestamp="not_a_datetime", altitude=0)


class TestFuelEstimateRequest:
    """Test fuel estimation request validation"""
    
    def test_valid_request(self):
        """Test valid request creation"""
        base_time = datetime.utcnow()
        altitude_series = [
            AltitudePoint(timestamp=base_time, altitude=0),
            AltitudePoint(timestamp=base_time + timedelta(hours=1), altitude=35000),
            AltitudePoint(timestamp=base_time + timedelta(hours=2), altitude=0)
        ]
        
        request = FuelEstimateRequest(
            flight_id="UA123",
            aircraft_type="B737-800",
            altitude_series=altitude_series,
            distance_nm=500
        )
        
        assert request.flight_id == "UA123"
        assert request.aircraft_type == "B737-800"
        assert len(request.altitude_series) == 3
        assert request.distance_nm == 500
    
    def test_flight_id_sanitization(self):
        """Test flight ID sanitization removes dangerous characters"""
        base_time = datetime.utcnow()
        altitude_series = [
            AltitudePoint(timestamp=base_time, altitude=0),
            AltitudePoint(timestamp=base_time + timedelta(hours=1), altitude=35000)
        ]
        
        # Dangerous characters should be removed
        request = FuelEstimateRequest(
            flight_id="<script>alert('xss')</script>UA-123",
            aircraft_type="B737-800",
            altitude_series=altitude_series
        )
        
        # Should contain only safe characters
        assert "<script>" not in request.flight_id
        assert "alert" not in request.flight_id
        assert "UA-123" in request.flight_id or request.flight_id == "UA-123"
    
    def test_flight_id_length_clamping(self):
        """Test flight ID gets clamped to 50 characters"""
        base_time = datetime.utcnow()
        altitude_series = [
            AltitudePoint(timestamp=base_time, altitude=0),
            AltitudePoint(timestamp=base_time + timedelta(hours=1), altitude=35000)
        ]
        
        long_flight_id = "A" * 100  # 100 characters
        request = FuelEstimateRequest(
            flight_id=long_flight_id,
            aircraft_type="B737-800",
            altitude_series=altitude_series
        )
        
        assert len(request.flight_id) <= 50
    
    def test_empty_flight_id_rejection(self):
        """Test empty flight ID gets rejected"""
        base_time = datetime.utcnow()
        altitude_series = [
            AltitudePoint(timestamp=base_time, altitude=0),
            AltitudePoint(timestamp=base_time + timedelta(hours=1), altitude=35000)
        ]
        
        with pytest.raises(PydanticValidationError):
            FuelEstimateRequest(
                flight_id="",
                aircraft_type="B737-800",
                altitude_series=altitude_series
            )
        
        with pytest.raises(PydanticValidationError):
            FuelEstimateRequest(
                flight_id="   ",  # Only whitespace
                aircraft_type="B737-800",
                altitude_series=altitude_series
            )
    
    def test_aircraft_type_normalization(self):
        """Test aircraft type normalization and sanitization"""
        base_time = datetime.utcnow()
        altitude_series = [
            AltitudePoint(timestamp=base_time, altitude=0),
            AltitudePoint(timestamp=base_time + timedelta(hours=1), altitude=35000)
        ]
        
        request = FuelEstimateRequest(
            flight_id="TEST123",
            aircraft_type="boeing 737-800<script>",
            altitude_series=altitude_series
        )
        
        # Should be uppercase and sanitized
        assert request.aircraft_type.isupper()
        assert "<script>" not in request.aircraft_type
        assert "BOEING" in request.aircraft_type
        assert len(request.aircraft_type) <= 20
    
    def test_altitude_series_size_limit(self):
        """Test altitude series gets clamped to 10,000 points"""
        base_time = datetime.utcnow()
        
        # Create oversized altitude series
        altitude_series = []
        for i in range(10001):  # 10,001 points
            altitude_series.append(
                AltitudePoint(timestamp=base_time + timedelta(minutes=i), altitude=35000)
            )
        
        request = FuelEstimateRequest(
            flight_id="OVERSIZED",
            aircraft_type="B737-800",
            altitude_series=altitude_series
        )
        
        # Should be clamped to 10,000
        assert len(request.altitude_series) == 10000
    
    def test_altitude_series_minimum_points(self):
        """Test altitude series requires at least 2 points"""
        base_time = datetime.utcnow()
        
        # Single point should fail
        with pytest.raises(PydanticValidationError):
            FuelEstimateRequest(
                flight_id="SINGLE",
                aircraft_type="B737-800",
                altitude_series=[AltitudePoint(timestamp=base_time, altitude=0)]
            )
        
        # Empty series should fail
        with pytest.raises(PydanticValidationError):
            FuelEstimateRequest(
                flight_id="EMPTY",
                aircraft_type="B737-800",
                altitude_series=[]
            )
    
    def test_timestamp_sorting(self):
        """Test altitude series gets sorted by timestamp"""
        base_time = datetime.utcnow()
        
        # Create unsorted altitude series
        altitude_series = [
            AltitudePoint(timestamp=base_time + timedelta(hours=2), altitude=0),     # Last
            AltitudePoint(timestamp=base_time, altitude=0),                          # First
            AltitudePoint(timestamp=base_time + timedelta(hours=1), altitude=35000) # Middle
        ]
        
        request = FuelEstimateRequest(
            flight_id="UNSORTED",
            aircraft_type="A320",
            altitude_series=altitude_series
        )
        
        # Should be sorted by timestamp
        timestamps = [point.timestamp for point in request.altitude_series]
        assert timestamps == sorted(timestamps)
    
    def test_flight_duration_validation(self):
        """Test flight duration validation"""
        base_time = datetime.utcnow()
        
        # Too short flight (< 1 minute)
        with pytest.raises(PydanticValidationError):
            altitude_series = [
                AltitudePoint(timestamp=base_time, altitude=0),
                AltitudePoint(timestamp=base_time + timedelta(seconds=30), altitude=1000)
            ]
            FuelEstimateRequest(
                flight_id="TOO_SHORT",
                aircraft_type="B737-800",
                altitude_series=altitude_series
            )
        
        # Very long flight (> 24 hours) should work but log warning
        altitude_series = [
            AltitudePoint(timestamp=base_time, altitude=0),
            AltitudePoint(timestamp=base_time + timedelta(hours=25), altitude=0)
        ]
        request = FuelEstimateRequest(
            flight_id="VERY_LONG",
            aircraft_type="B777-300ER",
            altitude_series=altitude_series
        )
        assert len(request.altitude_series) == 2
    
    def test_distance_validation(self):
        """Test distance validation and clamping"""
        base_time = datetime.utcnow()
        altitude_series = [
            AltitudePoint(timestamp=base_time, altitude=0),
            AltitudePoint(timestamp=base_time + timedelta(hours=1), altitude=35000)
        ]
        
        # Negative distance should be clamped to 0
        request = FuelEstimateRequest(
            flight_id="NEG_DIST",
            aircraft_type="B737-800",
            altitude_series=altitude_series,
            distance_nm=-100
        )
        assert request.distance_nm == 0
        
        # Excessive distance should be clamped
        request = FuelEstimateRequest(
            flight_id="HUGE_DIST",
            aircraft_type="A380",
            altitude_series=altitude_series,
            distance_nm=20000
        )
        assert request.distance_nm == 15000


class TestBatchFuelRequest:
    """Test batch fuel request validation"""
    
    def test_valid_batch(self):
        """Test valid batch request"""
        base_time = datetime.utcnow()
        altitude_series = [
            AltitudePoint(timestamp=base_time, altitude=0),
            AltitudePoint(timestamp=base_time + timedelta(hours=1), altitude=35000)
        ]
        
        flight_requests = [
            FuelEstimateRequest(
                flight_id="BATCH_001",
                aircraft_type="B737-800",
                altitude_series=altitude_series
            ),
            FuelEstimateRequest(
                flight_id="BATCH_002",
                aircraft_type="A320",
                altitude_series=altitude_series
            )
        ]
        
        batch = BatchFuelRequest(flight_requests=flight_requests)
        assert len(batch.flight_requests) == 2
    
    def test_batch_size_limit(self):
        """Test batch size gets clamped to 100 flights"""
        base_time = datetime.utcnow()
        altitude_series = [
            AltitudePoint(timestamp=base_time, altitude=0),
            AltitudePoint(timestamp=base_time + timedelta(hours=1), altitude=35000)
        ]
        
        # Create 101 flight requests
        flight_requests = []
        for i in range(101):
            flight_requests.append(
                FuelEstimateRequest(
                    flight_id=f"BATCH_{i:03d}",
                    aircraft_type="B737-800",
                    altitude_series=altitude_series
                )
            )
        
        batch = BatchFuelRequest(flight_requests=flight_requests)
        assert len(batch.flight_requests) == 100  # Clamped
    
    def test_empty_batch_rejection(self):
        """Test empty batch gets rejected"""
        with pytest.raises(PydanticValidationError):
            BatchFuelRequest(flight_requests=[])


class TestGetFuelEstimateParams:
    """Test GET parameter validation"""
    
    def test_valid_params(self):
        """Test valid GET parameters"""
        params = GetFuelEstimateParams(flightId="UA123", aircraftType="B737-800")
        
        assert params.flightId == "UA123"
        assert params.aircraftType == "B737-800"
    
    def test_flight_id_sanitization(self):
        """Test flightId parameter sanitization"""
        params = GetFuelEstimateParams(
            flightId="<script>alert('xss')</script>UA123",
            aircraftType="B737-800"
        )
        
        assert "<script>" not in params.flightId
        assert "alert" not in params.flightId
    
    def test_aircraft_type_default(self):
        """Test aircraftType defaults to B738"""
        params = GetFuelEstimateParams(flightId="TEST123")
        
        assert params.aircraftType == "B738"
    
    def test_aircraft_type_sanitization(self):
        """Test aircraftType sanitization"""
        params = GetFuelEstimateParams(
            flightId="TEST123",
            aircraftType="boeing<script>737"
        )
        
        assert "<script>" not in params.aircraftType
        assert params.aircraftType.isupper()
        assert len(params.aircraftType) <= 20


class TestValidationFunctions:
    """Test standalone validation functions"""
    
    def test_validate_fuel_request_success(self):
        """Test successful fuel request validation"""
        base_time = datetime.utcnow()
        data = {
            "flight_id": "TEST123",
            "aircraft_type": "B737-800",
            "altitude_series": [
                {"timestamp": base_time.isoformat(), "altitude": 0},
                {"timestamp": (base_time + timedelta(hours=1)).isoformat(), "altitude": 35000}
            ]
        }
        
        request = validate_fuel_request(data)
        
        assert isinstance(request, FuelEstimateRequest)
        assert request.flight_id == "TEST123"
    
    def test_validate_fuel_request_failure(self):
        """Test fuel request validation failure"""
        invalid_data = {
            "flight_id": "TEST123",
            "aircraft_type": "B737-800"
            # Missing altitude_series
        }
        
        with pytest.raises(ValidationError):
            validate_fuel_request(invalid_data)
    
    def test_validate_get_params_success(self):
        """Test successful GET parameter validation"""
        params = {"flightId": "UA123", "aircraftType": "B737-800"}
        
        validated = validate_get_params(params)
        
        assert isinstance(validated, GetFuelEstimateParams)
        assert validated.flightId == "UA123"
    
    def test_validate_get_params_failure(self):
        """Test GET parameter validation failure"""
        invalid_params = {}  # Missing flightId
        
        with pytest.raises(ValidationError):
            validate_get_params(invalid_params)
    
    def test_sanitize_input_string(self):
        """Test input string sanitization"""
        # Basic sanitization
        result = sanitize_input_string("Hello World!", 50)
        assert result == "Hello World"
        
        # Remove dangerous characters
        result = sanitize_input_string("<script>alert('xss')</script>", 50)
        assert "<script>" not in result
        assert "alert" not in result
        
        # Length clamping
        result = sanitize_input_string("A" * 100, 10)
        assert len(result) == 10
        
        # Empty input
        result = sanitize_input_string("", 50)
        assert result == ""
        
        # None input
        result = sanitize_input_string(None, 50)
        assert result == ""
        
        # Custom allowed characters
        result = sanitize_input_string("ABC123!@#", 50, r'\w')
        assert result == "ABC123"
    
    def test_validate_array_size(self):
        """Test array size validation"""
        # Normal array
        array = [1, 2, 3, 4, 5]
        result = validate_array_size(array, 10, "test_array")
        assert result == array
        
        # Oversized array gets clamped
        array = list(range(100))
        result = validate_array_size(array, 50, "large_array")
        assert len(result) == 50
        assert result == array[:50]
        
        # Empty array
        result = validate_array_size([], 10, "empty_array")
        assert result == []
        
        # None array
        result = validate_array_size(None, 10, "none_array")
        assert result is None
    
    def test_create_error_response(self):
        """Test error response creation"""
        # Basic error response
        response = create_error_response(400, "Bad request")
        
        assert response["error"] is True
        assert response["status_code"] == 400
        assert response["message"] == "Bad request"
        assert "timestamp" in response
        assert "details" not in response
        
        # Error response with details
        details = {"field": "flight_id", "issue": "missing"}
        response = create_error_response(422, "Validation failed", details)
        
        assert response["details"] == details
        assert response["status_code"] == 422
    
    def test_rate_limit_info_model(self):
        """Test rate limit info model"""
        reset_time = datetime.utcnow() + timedelta(hours=1)
        
        info = RateLimitInfo(
            limit=100,
            remaining=75,
            reset_time=reset_time,
            retry_after=3600
        )
        
        assert info.limit == 100
        assert info.remaining == 75
        assert info.reset_time == reset_time
        assert info.retry_after == 3600


class TestEdgeCases:
    """Test edge cases and boundary conditions"""
    
    def test_unicode_handling(self):
        """Test unicode character handling"""
        # Unicode in flight_id
        sanitized = sanitize_input_string("Flight✈️123", 50)
        # Should remove emoji but keep alphanumeric
        assert "Flight" in sanitized
        assert "123" in sanitized
        assert "✈️" not in sanitized
    
    def test_extreme_timestamps(self):
        """Test extreme timestamp values"""
        # Very old timestamp
        old_time = datetime(1970, 1, 1)
        point = AltitudePoint(timestamp=old_time, altitude=0)
        assert point.timestamp == old_time
        
        # Very future timestamp
        future_time = datetime(2050, 12, 31)
        point = AltitudePoint(timestamp=future_time, altitude=35000)
        assert point.timestamp == future_time
    
    def test_float_precision_altitudes(self):
        """Test floating point precision in altitudes"""
        timestamp = datetime.utcnow()
        
        # High precision altitude
        point = AltitudePoint(timestamp=timestamp, altitude=35000.123456789)
        assert isinstance(point.altitude, float)
        assert point.altitude == 35000.123456789
    
    def test_validation_error_types(self):
        """Test different types of validation errors"""
        # Type error
        with pytest.raises(PydanticValidationError) as exc_info:
            AltitudePoint(timestamp="not_a_datetime", altitude=35000)
        
        assert "timestamp" in str(exc_info.value).lower()
        
        # Range error
        with pytest.raises(PydanticValidationError) as exc_info:
            base_time = datetime.utcnow()
            altitude_series = [AltitudePoint(timestamp=base_time, altitude=0)]  # Too few points
            FuelEstimateRequest(
                flight_id="TEST",
                aircraft_type="B737",
                altitude_series=altitude_series
            )
        
        assert "at least" in str(exc_info.value).lower() or "minimum" in str(exc_info.value).lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=src.core.validation", "--cov-report=term-missing"])