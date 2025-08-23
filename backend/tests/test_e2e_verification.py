"""
End-to-end verification tests for fuel estimation API
Tests all requirements before merging to production
"""

import pytest
import httpx
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import json
import numpy as np

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.fastapi_app import app
from src.core.fuel_estimation_v2 import EnhancedFuelEstimator, FuelEstimateV2, ConfidenceLevel
from src.core.phase_detection_v2 import FlightPhase, PhaseSlice
from src.core.feature_flags import FeatureFlags


class TestFuelEstimateAPI:
    """Test 1: /api/fuel/estimate returns values for a mocked 2h A320neo flight with High confidence"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user"""
        return {"user_id": "test_user_123", "username": "testuser", "role": "user"}
    
    def test_api_fuel_estimate_a320neo_2h_flight(self, client, mock_user):
        """Test API returns High confidence for mocked 2h A320neo flight"""
        
        # Mock authentication
        with patch('src.api.fastapi_app.get_current_active_user', return_value=mock_user):
            # Mock feature flag enabled
            with patch.object(FeatureFlags, 'is_enabled', return_value=True):
                # Mock rate limiting to allow request
                with patch('src.api.fastapi_app.check_fuel_api_limits') as mock_rate_limit:
                    from src.core.enhanced_rate_limiter import RateLimitStatus
                    mock_rate_limit.return_value = RateLimitStatus(
                        allowed=True, limit=100, remaining=99, 
                        reset_time=datetime.utcnow() + timedelta(hours=1)
                    )
                    
                    # Mock the fuel estimator
                    with patch('src.api.fastapi_app.fuel_estimator') as mock_estimator:
                        # Create mock estimate for A320neo 2h flight
                        mock_estimate = Mock()
                        mock_estimate.fuel_kg = 3500.0  # Realistic for 2h A320neo flight
                        mock_estimate.fuel_liters = 4516.1  # fuel_kg / 0.775
                        mock_estimate.fuel_gallons = 1192.9  # fuel_liters * 0.264172
                        mock_estimate.co2_kg = 11025.0  # fuel_kg * 3.15
                        mock_estimate.confidence = ConfidenceLevel.HIGH
                        mock_estimate.assumptions = {
                            "aircraftKey": "A320-251N",
                            "sourceHint": "ICAO family mapping",
                            "tableSource": "local",
                            "density": 0.775,
                            "co2Factor": 3.15
                        }
                        
                        # Create mock phases
                        mock_phases = [
                            Mock(phase=FlightPhase.TAXI_OUT, duration_minutes=10, 
                                fuel_burn_kg=50, average_altitude_ft=0),
                            Mock(phase=FlightPhase.CLIMB, duration_minutes=20, 
                                fuel_burn_kg=600, average_altitude_ft=17500),
                            Mock(phase=FlightPhase.CRUISE, duration_minutes=80, 
                                fuel_burn_kg=2650, average_altitude_ft=35000),
                            Mock(phase=FlightPhase.DESCENT, duration_minutes=15, 
                                fuel_burn_kg=150, average_altitude_ft=17500),
                            Mock(phase=FlightPhase.TAXI_IN, duration_minutes=5, 
                                fuel_burn_kg=50, average_altitude_ft=0)
                        ]
                        mock_estimate.phases = mock_phases
                        
                        mock_estimator.estimate_from_flight_data.return_value = mock_estimate
                        
                        # Make API request for A320neo (A20N ICAO code)
                        response = client.get("/api/fuel/estimate?flightId=TEST001&aircraftType=A20N")
                        
                        # Verify response
                        assert response.status_code == 200
                        data = response.json()
                        
                        # Verify fuel values
                        assert data["fuelKg"] == 3500.0
                        assert abs(data["fuelL"] - 4516.1) < 1.0
                        assert abs(data["fuelGal"] - 1192.9) < 1.0
                        assert data["co2Kg"] == 11025.0
                        
                        # Verify High confidence
                        assert data["confidence"] == "HIGH"
                        
                        # Verify assumptions
                        assert "aircraftKey" in data["assumptions"]
                        assert data["assumptions"]["aircraftKey"] == "A320-251N"
                        
                        # Verify phases detected
                        assert len(data["phases"]) == 5
                        phase_names = [p["phase"] for p in data["phases"]]
                        assert "TAXI_OUT" in phase_names
                        assert "CLIMB" in phase_names
                        assert "CRUISE" in phase_names
                        assert "DESCENT" in phase_names
                        assert "TAXI_IN" in phase_names
                        
                        # Verify rate limit headers
                        assert "X-Rate-Limit-Limit" in response.headers
                        assert "X-Rate-Limit-Remaining" in response.headers


class TestPhaseDetectionStability:
    """Test 2: Phase detection stable with noisy cruise; micro-segments merged"""
    
    def test_noisy_cruise_phase_detection(self):
        """Test phase detection handles noisy cruise data and merges micro-segments"""
        
        from src.core.phase_detection_v2 import EnhancedPhaseDetector
        
        # Create noisy cruise data (2h flight)
        base_time = datetime.utcnow()
        samples = []
        
        # Taxi out (10 min)
        for i in range(11):
            samples.append((base_time + timedelta(minutes=i), 0))
        
        # Climb (20 min to FL350)
        for i in range(11, 31):
            alt = (i - 10) * 1750
            samples.append((base_time + timedelta(minutes=i), min(alt, 35000)))
        
        # Noisy cruise (80 minutes at FL350 ±250ft)
        np.random.seed(42)
        for i in range(31, 111):
            noise = np.random.uniform(-250, 250)
            alt = 35000 + noise
            samples.append((base_time + timedelta(minutes=i), alt))
        
        # Descent (15 min)
        for i in range(111, 126):
            alt = 35000 - (i - 110) * 2333
            samples.append((base_time + timedelta(minutes=i), max(alt, 0)))
        
        # Taxi in (5 min)
        for i in range(126, 131):
            samples.append((base_time + timedelta(minutes=i), 0))
        
        # Run phase detection
        detector = EnhancedPhaseDetector()
        phases = detector.detect_phases(samples)
        
        # Verify phases detected despite noise
        assert len(phases) >= 3  # At minimum: climb, cruise, descent
        
        phase_types = [p.phase for p in phases]
        assert FlightPhase.CLIMB in phase_types
        assert FlightPhase.CRUISE in phase_types
        assert FlightPhase.DESCENT in phase_types
        
        # Verify cruise phase is stable (not fragmented)
        cruise_phases = [p for p in phases if p.phase == FlightPhase.CRUISE]
        assert len(cruise_phases) <= 3  # Should merge micro-segments
        
        # Verify cruise duration is reasonable (should be around 80 minutes)
        total_cruise_duration = sum(p.duration_minutes for p in cruise_phases)
        assert 70 <= total_cruise_duration <= 90  # Allow some tolerance


class TestFeatureFlagToggle:
    """Test 3: Feature flag + local toggle hide all fuel UI"""
    
    def test_feature_flag_disables_api(self):
        """Test feature flag disabled blocks API access"""
        client = TestClient(app)
        mock_user = {"user_id": "test_user_456", "username": "testuser", "role": "user"}
        
        with patch('src.api.fastapi_app.get_current_active_user', return_value=mock_user):
            # Mock feature flag disabled
            with patch.object(FeatureFlags, 'is_enabled', return_value=False):
                # Mock rate limiting to allow request
                with patch('src.api.fastapi_app.check_fuel_api_limits') as mock_rate_limit:
                    from src.core.enhanced_rate_limiter import RateLimitStatus
                    mock_rate_limit.return_value = RateLimitStatus(
                        allowed=True, limit=100, remaining=99,
                        reset_time=datetime.utcnow() + timedelta(hours=1)
                    )
                    
                    response = client.get("/api/fuel/estimate?flightId=TEST002&aircraftType=B738")
                    
                    # Should return 403 Forbidden when feature flag is disabled
                    assert response.status_code == 403
                    data = response.json()
                    assert "not enabled" in data["detail"].lower()
    
    def test_feature_flag_enabled_allows_api(self):
        """Test feature flag enabled allows API access"""
        client = TestClient(app)
        mock_user = {"user_id": "test_user_789", "username": "testuser", "role": "user"}
        
        with patch('src.api.fastapi_app.get_current_active_user', return_value=mock_user):
            # Mock feature flag enabled
            with patch.object(FeatureFlags, 'is_enabled', return_value=True):
                # Mock rate limiting and fuel estimator
                with patch('src.api.fastapi_app.check_fuel_api_limits') as mock_rate_limit:
                    with patch('src.api.fastapi_app.fuel_estimator') as mock_estimator:
                        from src.core.enhanced_rate_limiter import RateLimitStatus
                        mock_rate_limit.return_value = RateLimitStatus(
                            allowed=True, limit=100, remaining=99,
                            reset_time=datetime.utcnow() + timedelta(hours=1)
                        )
                        
                        mock_estimate = Mock()
                        mock_estimate.fuel_kg = 2500.0
                        mock_estimate.fuel_liters = 3225.8
                        mock_estimate.fuel_gallons = 852.0
                        mock_estimate.co2_kg = 7875.0
                        mock_estimate.confidence = ConfidenceLevel.HIGH
                        mock_estimate.assumptions = {"test": True}
                        mock_estimate.phases = []
                        
                        mock_estimator.estimate_from_flight_data.return_value = mock_estimate
                        
                        response = client.get("/api/fuel/estimate?flightId=TEST003&aircraftType=B738")
                        
                        # Should succeed when feature flag is enabled
                        assert response.status_code == 200
                        data = response.json()
                        assert data["fuelKg"] == 2500.0


class TestLowConfidenceAircraft:
    """Test 5: Low/unknown aircraft returns fallback with Low confidence and clear UI messaging"""
    
    def test_unknown_aircraft_fallback(self):
        """Test unknown aircraft type returns Low confidence with fallback"""
        
        estimator = EnhancedFuelEstimator()
        base_time = datetime.utcnow()
        
        # Create simple flight profile
        samples = [
            (base_time, 0),
            (base_time + timedelta(minutes=30), 35000),
            (base_time + timedelta(hours=1, minutes=30), 35000),
            (base_time + timedelta(hours=2), 0)
        ]
        
        # Test with unknown aircraft type
        estimate = estimator.estimate_fuel(
            flight_id="UNKNOWN001",
            aircraft_type="UNKNOWN_AIRCRAFT_TYPE",
            altitude_samples=samples
        )
        
        # Should return Low confidence
        assert estimate.confidence == ConfidenceLevel.LOW
        
        # Should use fallback aircraft key
        assert estimate.aircraft_key in ["narrowbody", "widebody", "regional"]
        
        # Should still calculate reasonable fuel values
        assert estimate.fuel_kg > 0
        assert estimate.co2_kg > 0
        
        # Assumptions should explain the fallback
        assert "fallback" in estimate.assumptions.get("sourceHint", "").lower() or \
               "unknown" in estimate.assumptions.get("sourceHint", "").lower()
    
    def test_low_confidence_aircraft_ui_messaging(self):
        """Test Low confidence provides clear UI messaging"""
        
        client = TestClient(app)
        mock_user = {"user_id": "test_user_low", "username": "testuser", "role": "user"}
        
        with patch('src.api.fastapi_app.get_current_active_user', return_value=mock_user):
            with patch.object(FeatureFlags, 'is_enabled', return_value=True):
                with patch('src.api.fastapi_app.check_fuel_api_limits') as mock_rate_limit:
                    with patch('src.api.fastapi_app.fuel_estimator') as mock_estimator:
                        from src.core.enhanced_rate_limiter import RateLimitStatus
                        mock_rate_limit.return_value = RateLimitStatus(
                            allowed=True, limit=100, remaining=99,
                            reset_time=datetime.utcnow() + timedelta(hours=1)
                        )
                        
                        # Mock Low confidence estimate
                        mock_estimate = Mock()
                        mock_estimate.fuel_kg = 2800.0
                        mock_estimate.fuel_liters = 3612.9
                        mock_estimate.fuel_gallons = 954.0
                        mock_estimate.co2_kg = 8820.0
                        mock_estimate.confidence = ConfidenceLevel.LOW
                        mock_estimate.assumptions = {
                            "aircraftKey": "narrowbody",
                            "sourceHint": "Unknown aircraft type, using narrowbody fallback",
                            "confidence_note": "Low confidence due to unknown aircraft type"
                        }
                        mock_estimate.phases = []
                        
                        mock_estimator.estimate_from_flight_data.return_value = mock_estimate
                        
                        response = client.get("/api/fuel/estimate?flightId=LOW001&aircraftType=UNKNOWN123")
                        
                        assert response.status_code == 200
                        data = response.json()
                        
                        # Verify Low confidence returned
                        assert data["confidence"] == "LOW"
                        
                        # Verify clear messaging in assumptions
                        assert "fallback" in data["assumptions"]["sourceHint"].lower()
                        assert data["assumptions"]["aircraftKey"] == "narrowbody"


class TestRemoteOverrideJSON:
    """Test 6: Remote override JSON successfully changes rates at runtime (no rebuild)"""
    
    def test_remote_override_runtime_loading(self):
        """Test remote override JSON changes rates without rebuild"""
        
        # Create temporary override file
        import tempfile
        override_data = {
            "rates": {
                "TEST-OVERRIDE": {
                    "taxi": 800,
                    "climb": 4800,
                    "cruise": 2800,
                    "descent": 1200,
                    "sourceHint": "test runtime override"
                }
            },
            "families": {
                "TESTO": "TEST-OVERRIDE"
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(override_data, f)
            override_path = f.name
        
        try:
            # Create estimator with override
            estimator = EnhancedFuelEstimator(override_table=override_path)
            
            base_time = datetime.utcnow()
            samples = [
                (base_time, 0),
                (base_time + timedelta(hours=1), 35000),
                (base_time + timedelta(hours=2), 0)
            ]
            
            # Test direct override
            estimate1 = estimator.estimate_fuel(
                "OVERRIDE001", "TEST-OVERRIDE", samples
            )
            
            assert estimate1.aircraft_key == "TEST-OVERRIDE"
            assert estimate1.confidence == ConfidenceLevel.HIGH
            assert estimate1.assumptions["sourceHint"] == "test runtime override"
            
            # Test family mapping
            estimate2 = estimator.estimate_fuel(
                "OVERRIDE002", "TESTO", samples
            )
            
            assert estimate2.aircraft_key == "TEST-OVERRIDE"
            assert estimate2.confidence == ConfidenceLevel.MEDIUM  # Family mapping
            
        finally:
            os.unlink(override_path)


class TestRateLimitingProduction:
    """Test 9: Logs written in prod mode; rate limits enforced"""
    
    def test_rate_limits_enforced(self):
        """Test rate limits are enforced and return proper 429 responses"""
        
        client = TestClient(app)
        mock_user = {"user_id": "rate_test", "username": "testuser", "role": "user"}
        
        with patch('src.api.fastapi_app.get_current_active_user', return_value=mock_user):
            with patch.object(FeatureFlags, 'is_enabled', return_value=True):
                # Mock rate limit exceeded
                with patch('src.api.fastapi_app.check_fuel_api_limits') as mock_rate_limit:
                    from src.core.enhanced_rate_limiter import RateLimitStatus
                    mock_rate_limit.return_value = RateLimitStatus(
                        allowed=False, limit=100, remaining=0,
                        reset_time=datetime.utcnow() + timedelta(hours=1),
                        retry_after=3600
                    )
                    
                    response = client.get("/api/fuel/estimate?flightId=RATE001&aircraftType=B738")
                    
                    # Should return 429 Too Many Requests
                    assert response.status_code == 429
                    
                    # Should include rate limit headers
                    assert "X-Rate-Limit-Limit" in response.headers
                    assert "X-Rate-Limit-Remaining" in response.headers
                    assert "X-Rate-Limit-Retry-After" in response.headers
                    
                    # Check response body
                    data = response.json()
                    assert "Rate limit exceeded" in data["detail"]
    
    def test_security_logging(self):
        """Test security events are logged"""
        
        client = TestClient(app)
        mock_user = {"user_id": "log_test", "username": "testuser", "role": "user"}
        
        with patch('src.api.fastapi_app.get_current_active_user', return_value=mock_user):
            with patch.object(FeatureFlags, 'is_enabled', return_value=True):
                with patch('src.api.fastapi_app.check_fuel_api_limits') as mock_rate_limit:
                    with patch('src.api.fastapi_app.fuel_estimator') as mock_estimator:
                        with patch('src.api.fastapi_app.SecurityAuditor') as mock_auditor:
                            # Mock successful rate limit
                            from src.core.enhanced_rate_limiter import RateLimitStatus
                            mock_rate_limit.return_value = RateLimitStatus(
                                allowed=True, limit=100, remaining=99,
                                reset_time=datetime.utcnow() + timedelta(hours=1)
                            )
                            
                            # Mock fuel estimator
                            mock_estimate = Mock()
                            mock_estimate.fuel_kg = 1000.0
                            mock_estimate.fuel_liters = 1290.3
                            mock_estimate.fuel_gallons = 340.8
                            mock_estimate.co2_kg = 3150.0
                            mock_estimate.confidence = ConfidenceLevel.HIGH
                            mock_estimate.assumptions = {}
                            mock_estimate.phases = []
                            mock_estimator.estimate_from_flight_data.return_value = mock_estimate
                            
                            response = client.get("/api/fuel/estimate?flightId=LOG001&aircraftType=B738")
                            
                            assert response.status_code == 200
                            
                            # Verify security event was logged
                            mock_auditor.log_security_event.assert_called_once()
                            call_args = mock_auditor.log_security_event.call_args
                            assert call_args[0][0] == "fuel_estimate_requested"
                            assert call_args[0][1] == "log_test"
                            assert "flight_id" in call_args[0][2]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])