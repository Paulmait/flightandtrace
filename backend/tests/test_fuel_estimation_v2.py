"""
Comprehensive unit tests for enhanced fuel estimation
Tests burn rates, confidence levels, and fallback mechanisms
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import json
import tempfile
import os

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.fuel_estimation_v2 import (
    EnhancedFuelEstimator, FuelBurnTable, ConfidenceLevel, FuelEstimateV2,
    JET_A_DENSITY_KG_PER_L, CO2_PER_KG_FUEL, GALLONS_PER_LITER
)
from src.core.phase_detection_v2 import FlightPhase, PhaseSlice


class TestFuelBurnTable:
    """Test burn rate table and aircraft normalization"""
    
    def test_direct_match_high_confidence(self):
        """Test exact aircraft type match returns HIGH confidence"""
        aircraft_key, confidence = FuelBurnTable.normalize_aircraft("B737-800")
        assert aircraft_key == "B737-800"
        assert confidence == ConfidenceLevel.HIGH
        
        aircraft_key, confidence = FuelBurnTable.normalize_aircraft("A320-214")
        assert aircraft_key == "A320-214"
        assert confidence == ConfidenceLevel.HIGH
    
    def test_family_fallback_medium_confidence(self):
        """Test ICAO code mapping returns MEDIUM confidence"""
        aircraft_key, confidence = FuelBurnTable.normalize_aircraft("B738")
        assert aircraft_key == "B737-800"
        assert confidence == ConfidenceLevel.MEDIUM
        
        aircraft_key, confidence = FuelBurnTable.normalize_aircraft("A20N")
        assert aircraft_key == "A320-251N"
        assert confidence == ConfidenceLevel.MEDIUM
        
        aircraft_key, confidence = FuelBurnTable.normalize_aircraft("B789")
        assert aircraft_key == "B787-9"
        assert confidence == ConfidenceLevel.MEDIUM
    
    def test_unknown_type_low_confidence(self):
        """Test unknown aircraft returns LOW confidence with category fallback"""
        aircraft_key, confidence = FuelBurnTable.normalize_aircraft("UNKNOWN")
        assert aircraft_key == "narrowbody"  # Default fallback
        assert confidence == ConfidenceLevel.LOW
        
        # Test pattern-based categorization
        aircraft_key, confidence = FuelBurnTable.normalize_aircraft("B737-MAX-10")
        assert aircraft_key == "narrowbody"
        assert confidence == ConfidenceLevel.LOW
        
        aircraft_key, confidence = FuelBurnTable.normalize_aircraft("A380-900")
        assert aircraft_key == "widebody"
        assert confidence == ConfidenceLevel.LOW
    
    def test_burn_rate_retrieval(self):
        """Test burn rate retrieval for different phases"""
        # Test specific aircraft
        rate = FuelBurnTable.get_burn_rate("B737-800", FlightPhase.CRUISE)
        assert rate == 2450  # Specific cruise rate
        
        rate = FuelBurnTable.get_burn_rate("B737-800", FlightPhase.CLIMB)
        assert rate == 4600  # Specific climb rate
        
        # Test fallback category
        rate = FuelBurnTable.get_burn_rate("narrowbody", FlightPhase.CRUISE)
        assert rate == 2400  # Generic narrowbody cruise
    
    def test_phase_fallback_multipliers(self):
        """Test fallback multipliers when phase data missing"""
        # Create a partial aircraft entry
        FuelBurnTable.BURN_RATES["TEST_PARTIAL"] = {
            "cruise": 3000,
            "sourceHint": "test"
        }
        
        # Climb should use cruise × 1.8
        rate = FuelBurnTable.get_burn_rate("TEST_PARTIAL", FlightPhase.CLIMB)
        assert rate == 3000 * 1.8
        
        # Descent should use cruise × 0.5
        rate = FuelBurnTable.get_burn_rate("TEST_PARTIAL", FlightPhase.DESCENT)
        assert rate == 3000 * 0.5
        
        # Taxi should use min(cruise × 0.25, limit)
        rate = FuelBurnTable.get_burn_rate("TEST_PARTIAL", FlightPhase.TAXI_OUT)
        assert rate == min(3000 * 0.25, 600)  # 600 is narrowbody taxi limit
        
        # Clean up
        del FuelBurnTable.BURN_RATES["TEST_PARTIAL"]
    
    def test_all_aircraft_have_rates(self):
        """Verify all defined aircraft have complete burn rates"""
        required_phases = ["taxi", "climb", "cruise", "descent"]
        
        for aircraft, rates in FuelBurnTable.BURN_RATES.items():
            if aircraft in ["narrowbody", "widebody", "regional", "turboprop"]:
                continue  # Skip generic categories
            
            for phase in required_phases:
                assert phase in rates, f"{aircraft} missing {phase} rate"
                assert rates[phase] > 0, f"{aircraft} has zero {phase} rate"
            
            assert "sourceHint" in rates, f"{aircraft} missing sourceHint"


class TestEnhancedFuelEstimator:
    """Test enhanced fuel estimation with real flight profiles"""
    
    @pytest.fixture
    def estimator(self):
        """Create estimator instance"""
        return EnhancedFuelEstimator()
    
    def test_textbook_profile(self, estimator):
        """Test perfect textbook flight profile"""
        base_time = datetime.utcnow()
        samples = []
        
        # Taxi out (10 minutes)
        for i in range(11):
            samples.append((base_time + timedelta(minutes=i), 0))
        
        # Climb (20 minutes to FL350)
        for i in range(11, 31):
            alt = (i - 10) * 1750
            samples.append((base_time + timedelta(minutes=i), min(alt, 35000)))
        
        # Cruise (60 minutes at FL350)
        for i in range(31, 91):
            samples.append((base_time + timedelta(minutes=i), 35000))
        
        # Descent (15 minutes)
        for i in range(91, 106):
            alt = 35000 - (i - 90) * 2333
            samples.append((base_time + timedelta(minutes=i), max(alt, 0)))
        
        # Taxi in (5 minutes)
        for i in range(106, 111):
            samples.append((base_time + timedelta(minutes=i), 0))
        
        estimate = estimator.estimate_fuel(
            flight_id="TEST001",
            aircraft_type="B737-800",
            altitude_samples=samples,
            distance_nm=500
        )
        
        # Verify structure
        assert isinstance(estimate, FuelEstimateV2)
        assert estimate.flight_id == "TEST001"
        assert estimate.aircraft_type == "B737-800"
        assert estimate.aircraft_key == "B737-800"
        assert estimate.confidence == ConfidenceLevel.HIGH
        
        # Verify fuel calculations
        assert estimate.fuel_kg > 0
        assert estimate.fuel_kg < 10000  # Reasonable for 2-hour flight
        
        # Verify unit conversions
        expected_liters = estimate.fuel_kg / JET_A_DENSITY_KG_PER_L
        assert abs(estimate.fuel_liters - expected_liters) < 0.1
        
        expected_gallons = expected_liters * GALLONS_PER_LITER
        assert abs(estimate.fuel_gallons - expected_gallons) < 0.1
        
        # Verify CO2 calculation
        expected_co2 = estimate.fuel_kg * CO2_PER_KG_FUEL
        assert abs(estimate.co2_kg - expected_co2) < 0.1
        
        # Verify phases detected
        assert len(estimate.phases) > 0
        phase_types = [p.phase for p in estimate.phases]
        assert FlightPhase.CLIMB in phase_types
        assert FlightPhase.CRUISE in phase_types
        assert FlightPhase.DESCENT in phase_types
        
        # Verify assumptions
        assert estimate.assumptions["aircraftKey"] == "B737-800"
        assert estimate.assumptions["density"] == JET_A_DENSITY_KG_PER_L
        assert estimate.assumptions["co2Factor"] == CO2_PER_KG_FUEL
        assert estimate.assumptions["tableSource"] == "local"
        assert "phaseDurations" in estimate.assumptions
        assert "ratesUsed" in estimate.assumptions
    
    def test_noisy_cruise_detection(self, estimator):
        """Test cruise detection with ±250 ft altitude variations"""
        base_time = datetime.utcnow()
        np.random.seed(42)
        samples = []
        
        # Climb
        for i in range(20):
            alt = i * 1750
            samples.append((base_time + timedelta(minutes=i), min(alt, 35000)))
        
        # Noisy cruise (40 minutes)
        for i in range(20, 60):
            noise = np.random.uniform(-250, 250)
            alt = 35000 + noise
            samples.append((base_time + timedelta(minutes=i), alt))
        
        # Descent
        for i in range(60, 75):
            alt = 35000 - (i - 59) * 2333
            samples.append((base_time + timedelta(minutes=i), max(alt, 0)))
        
        estimate = estimator.estimate_fuel(
            flight_id="NOISY001",
            aircraft_type="A320",
            altitude_samples=samples
        )
        
        # Should still detect cruise phase
        cruise_phases = [p for p in estimate.phases if p.phase == FlightPhase.CRUISE]
        assert len(cruise_phases) > 0
        
        # Cruise fuel should be significant portion
        if FlightPhase.CRUISE in estimate.phase_fuel:
            cruise_fuel = estimate.phase_fuel[FlightPhase.CRUISE]
            assert cruise_fuel > estimate.fuel_kg * 0.3  # At least 30% in cruise
    
    def test_short_hop_no_cruise(self, estimator):
        """Test short flight with climb and descent only"""
        base_time = datetime.utcnow()
        samples = []
        
        # Quick climb to 15000 ft (10 minutes)
        for i in range(11):
            alt = i * 1500
            samples.append((base_time + timedelta(minutes=i), min(alt, 15000)))
        
        # Immediate descent (10 minutes)
        for i in range(11, 21):
            alt = 15000 - (i - 10) * 1500
            samples.append((base_time + timedelta(minutes=i), max(alt, 0)))
        
        estimate = estimator.estimate_fuel(
            flight_id="SHORT001",
            aircraft_type="CRJ-900",
            altitude_samples=samples,
            distance_nm=150
        )
        
        # Should have lower fuel consumption
        assert estimate.fuel_kg < 1000  # Short regional flight
        
        # Check efficiency metrics
        assert "fuel_per_nm" in estimate.assumptions
        assert estimate.assumptions["fuel_per_nm"] < 10  # kg per nm
    
    def test_unknown_aircraft_fallback(self, estimator):
        """Test unknown aircraft type uses fallback with LOW confidence"""
        base_time = datetime.utcnow()
        samples = [
            (base_time, 0),
            (base_time + timedelta(minutes=30), 35000),
            (base_time + timedelta(minutes=90), 35000),
            (base_time + timedelta(minutes=120), 0)
        ]
        
        estimate = estimator.estimate_fuel(
            flight_id="UNK001",
            aircraft_type="UNKNOWN-TYPE",
            altitude_samples=samples
        )
        
        assert estimate.confidence == ConfidenceLevel.LOW
        assert estimate.aircraft_key == "narrowbody"  # Default fallback
        assert estimate.fuel_kg > 0  # Should still calculate fuel
    
    def test_remote_override_loading(self):
        """Test loading remote override burn rates"""
        # Create temporary override file
        override_data = {
            "rates": {
                "TEST-AIRCRAFT": {
                    "taxi": 1000,
                    "climb": 5000,
                    "cruise": 3000,
                    "descent": 1500,
                    "sourceHint": "test override"
                }
            },
            "families": {
                "TEST": "TEST-AIRCRAFT"
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(override_data, f)
            override_path = f.name
        
        try:
            # Create estimator with override
            estimator = EnhancedFuelEstimator(override_table=override_path)
            
            # Test that override is loaded
            base_time = datetime.utcnow()
            samples = [
                (base_time, 0),
                (base_time + timedelta(hours=1), 35000),
                (base_time + timedelta(hours=2), 0)
            ]
            
            estimate = estimator.estimate_fuel(
                flight_id="OVERRIDE001",
                aircraft_type="TEST-AIRCRAFT",
                altitude_samples=samples
            )
            
            assert estimate.aircraft_key == "TEST-AIRCRAFT"
            assert estimate.confidence == ConfidenceLevel.HIGH
            assert estimate.assumptions["sourceHint"] == "test override"
            
            # Test family mapping
            estimate2 = estimator.estimate_fuel(
                flight_id="OVERRIDE002",
                aircraft_type="TEST",
                altitude_samples=samples
            )
            
            assert estimate2.aircraft_key == "TEST-AIRCRAFT"
            assert estimate2.confidence == ConfidenceLevel.MEDIUM
            
        finally:
            os.unlink(override_path)


class TestPropertyBasedFuel:
    """Property-based tests for fuel estimation"""
    
    def test_monotonic_fuel_consumption(self):
        """Longer flights should consume more fuel"""
        estimator = EnhancedFuelEstimator()
        base_time = datetime.utcnow()
        
        # Create two flights with same profile but different durations
        samples_short = [
            (base_time, 0),
            (base_time + timedelta(hours=1), 35000),
            (base_time + timedelta(hours=2), 0)
        ]
        
        samples_long = [
            (base_time, 0),
            (base_time + timedelta(hours=1), 35000),
            (base_time + timedelta(hours=4), 35000),  # Longer cruise
            (base_time + timedelta(hours=5), 0)
        ]
        
        estimate_short = estimator.estimate_fuel(
            "SHORT", "B737-800", samples_short
        )
        
        estimate_long = estimator.estimate_fuel(
            "LONG", "B737-800", samples_long
        )
        
        assert estimate_long.fuel_kg > estimate_short.fuel_kg
    
    def test_phase_fuel_sum(self):
        """Sum of phase fuel should equal total fuel"""
        estimator = EnhancedFuelEstimator()
        base_time = datetime.utcnow()
        
        samples = []
        for i in range(121):
            if i < 30:
                alt = i * 1166  # Climb
            elif i < 90:
                alt = 35000  # Cruise
            else:
                alt = 35000 - (i - 90) * 1166  # Descent
            samples.append((base_time + timedelta(minutes=i), max(0, alt)))
        
        estimate = estimator.estimate_fuel(
            "SUM001", "A320", samples
        )
        
        if estimate.phase_fuel:
            phase_sum = sum(estimate.phase_fuel.values())
            # Allow small rounding difference
            assert abs(phase_sum - estimate.fuel_kg) < 1.0


class TestCoverageRequirements:
    """Test coverage requirements (≥85%)"""
    
    def test_empty_samples(self):
        """Test with no altitude samples"""
        estimator = EnhancedFuelEstimator()
        estimate = estimator.estimate_fuel(
            "EMPTY", "B737-800", []
        )
        
        assert estimate.fuel_kg == 0
        assert estimate.co2_kg == 0
        assert len(estimate.phases) == 0
        assert "error" in estimate.assumptions
    
    def test_single_sample(self):
        """Test with single altitude sample"""
        estimator = EnhancedFuelEstimator()
        samples = [(datetime.utcnow(), 35000)]
        
        estimate = estimator.estimate_fuel(
            "SINGLE", "A320", samples
        )
        
        assert estimate.fuel_kg == 0
        assert len(estimate.phases) == 0
    
    def test_all_burn_table_aircraft(self):
        """Test that all aircraft in burn table work"""
        estimator = EnhancedFuelEstimator()
        base_time = datetime.utcnow()
        
        # Simple flight profile
        samples = [
            (base_time, 0),
            (base_time + timedelta(hours=1), 35000),
            (base_time + timedelta(hours=2), 0)
        ]
        
        tested = 0
        for aircraft in FuelBurnTable.BURN_RATES.keys():
            if aircraft in ["narrowbody", "widebody", "regional", "turboprop"]:
                continue  # Skip categories
            
            estimate = estimator.estimate_fuel(
                f"TEST_{aircraft}", aircraft, samples
            )
            
            assert estimate.fuel_kg > 0
            assert estimate.confidence == ConfidenceLevel.HIGH
            tested += 1
        
        assert tested >= 20  # Should test at least 20 aircraft types
    
    def test_distance_metrics(self):
        """Test distance-based efficiency metrics"""
        estimator = EnhancedFuelEstimator()
        base_time = datetime.utcnow()
        
        samples = [
            (base_time, 0),
            (base_time + timedelta(hours=2), 35000),
            (base_time + timedelta(hours=4), 0)
        ]
        
        estimate = estimator.estimate_fuel(
            "DIST001", "B787-9", samples, distance_nm=2000
        )
        
        assert "distance_nm" in estimate.assumptions
        assert "fuel_per_nm" in estimate.assumptions
        assert "efficiency_mpg" in estimate.assumptions
        
        # Verify calculations
        expected_per_nm = estimate.fuel_kg / 2000
        assert abs(estimate.assumptions["fuel_per_nm"] - expected_per_nm) < 0.01


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=src.core.fuel_estimation_v2", "--cov-report=term-missing"])