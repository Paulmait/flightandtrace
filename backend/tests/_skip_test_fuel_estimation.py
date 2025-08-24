"""
Unit tests for fuel estimation module
Tests phase detection, burn rate calculations, and confidence levels
"""

import pytest
from datetime import datetime, timedelta
from src.core.fuel_estimation import (
    FuelEstimator, PhaseDetector, AircraftBurnRates,
    FlightPhase, ConfidenceLevel, FuelEstimate
)

class TestPhaseDetection:
    """Test flight phase detection algorithm"""
    
    def test_phase_detection_complete_flight(self):
        """Test phase detection for a complete flight profile"""
        detector = PhaseDetector()
        
        # Create altitude profile for 2-hour flight
        base_time = datetime.utcnow()
        altitude_series = [
            (base_time, 0),                                    # Ground
            (base_time + timedelta(minutes=5), 0),             # Taxi out
            (base_time + timedelta(minutes=7), 2000),          # Takeoff
            (base_time + timedelta(minutes=15), 10000),        # Climb
            (base_time + timedelta(minutes=25), 25000),        # Climb
            (base_time + timedelta(minutes=35), 35000),        # Cruise
            (base_time + timedelta(minutes=90), 35000),        # Cruise
            (base_time + timedelta(minutes=100), 25000),       # Descent
            (base_time + timedelta(minutes=110), 10000),       # Descent
            (base_time + timedelta(minutes=115), 5000),        # Approach
            (base_time + timedelta(minutes=120), 0),           # Landing
            (base_time + timedelta(minutes=125), 0),           # Taxi in
        ]
        
        phases = detector.detect_phases(altitude_series)
        
        # Verify we detected multiple phases
        assert len(phases) > 0
        
        # Check phase types detected
        phase_types = [phase.phase for phase in phases]
        assert FlightPhase.TAXI_OUT in phase_types or FlightPhase.GROUND in phase_types
        assert FlightPhase.CLIMB in phase_types
        assert FlightPhase.CRUISE in phase_types
        assert FlightPhase.DESCENT in phase_types
        
        # Verify phase durations are positive
        for phase in phases:
            assert phase.duration_minutes > 0
            assert phase.average_altitude_ft >= 0
    
    def test_phase_detection_boundaries(self):
        """Test edge cases in phase detection"""
        detector = PhaseDetector()
        
        # Test with minimal data
        base_time = datetime.utcnow()
        minimal_series = [
            (base_time, 0),
            (base_time + timedelta(minutes=1), 500),
        ]
        
        phases = detector.detect_phases(minimal_series)
        assert len(phases) >= 1
        
        # Test with single altitude (parked aircraft)
        static_series = [
            (base_time, 0),
            (base_time + timedelta(minutes=30), 0),
        ]
        
        phases = detector.detect_phases(static_series)
        assert len(phases) == 1
        assert phases[0].phase in [FlightPhase.GROUND, FlightPhase.TAXI_OUT, FlightPhase.TAXI_IN]
    
    def test_phase_detection_climb_descent_rates(self):
        """Test climb and descent rate thresholds"""
        detector = PhaseDetector()
        base_time = datetime.utcnow()
        
        # Test climb detection (>500 fpm)
        climb_series = [
            (base_time, 5000),
            (base_time + timedelta(minutes=1), 5600),  # 600 fpm climb
        ]
        phases = detector.detect_phases(climb_series)
        assert any(p.phase == FlightPhase.CLIMB for p in phases)
        
        # Test descent detection (<-500 fpm)
        descent_series = [
            (base_time, 30000),
            (base_time + timedelta(minutes=1), 29400),  # -600 fpm descent
        ]
        phases = detector.detect_phases(descent_series)
        assert any(p.phase == FlightPhase.DESCENT for p in phases)
        
        # Test level flight (between -500 and 500 fpm)
        level_series = [
            (base_time, 35000),
            (base_time + timedelta(minutes=1), 35200),  # 200 fpm
            (base_time + timedelta(minutes=2), 35100),  # -100 fpm
        ]
        phases = detector.detect_phases(level_series)
        assert any(p.phase == FlightPhase.CRUISE for p in phases)


class TestAircraftBurnRates:
    """Test aircraft burn rate lookups and confidence levels"""
    
    def test_specific_aircraft_high_confidence(self):
        """Test burn rate for specific aircraft types"""
        # Test B737-800 (exact match)
        rate, confidence = AircraftBurnRates.get_burn_rate("B737-800", FlightPhase.CRUISE)
        assert rate == 2500  # Specific rate for B737-800 cruise
        assert confidence == ConfidenceLevel.HIGH
        
        # Test A320neo
        rate, confidence = AircraftBurnRates.get_burn_rate("A320neo", FlightPhase.TAKEOFF)
        assert rate == 7800  # Specific rate for A320neo takeoff
        assert confidence == ConfidenceLevel.HIGH
    
    def test_icao_mapping_medium_confidence(self):
        """Test ICAO code mapping to specific types"""
        # Test B738 -> B737-800
        rate, confidence = AircraftBurnRates.get_burn_rate("B738", FlightPhase.CRUISE)
        assert rate == 2500  # Should map to B737-800
        assert confidence == ConfidenceLevel.MEDIUM
        
        # Test A20N -> A320neo
        rate, confidence = AircraftBurnRates.get_burn_rate("A20N", FlightPhase.CLIMB)
        assert rate == 4300  # Should map to A320neo
        assert confidence == ConfidenceLevel.MEDIUM
    
    def test_fallback_low_confidence(self):
        """Test fallback to category defaults"""
        # Unknown narrow body
        rate, confidence = AircraftBurnRates.get_burn_rate("B733", FlightPhase.CRUISE)
        assert rate == 2400  # Default narrow body cruise
        assert confidence == ConfidenceLevel.LOW
        
        # Unknown wide body
        rate, confidence = AircraftBurnRates.get_burn_rate("A388", FlightPhase.CRUISE)
        assert confidence == ConfidenceLevel.LOW
    
    def test_all_phases_have_rates(self):
        """Ensure all phases have burn rates defined"""
        for phase in FlightPhase:
            rate, _ = AircraftBurnRates.get_burn_rate("B738", phase)
            assert rate >= 0, f"No burn rate for phase {phase}"


class TestFuelEstimator:
    """Test complete fuel estimation workflow"""
    
    @pytest.fixture
    def estimator(self):
        """Create fuel estimator instance"""
        return FuelEstimator()
    
    def test_fuel_calculation_constants(self, estimator):
        """Test core calculation constants"""
        from src.core.fuel_estimation import JET_A_DENSITY_KG_PER_L, CO2_PER_KG_FUEL, GALLONS_PER_LITER
        
        assert JET_A_DENSITY_KG_PER_L == 0.8
        assert CO2_PER_KG_FUEL == 3.16
        assert abs(GALLONS_PER_LITER - 0.264172) < 0.000001
    
    def test_complete_flight_estimation(self, estimator):
        """Test fuel estimation for a complete flight"""
        base_time = datetime.utcnow()
        
        # 2-hour flight profile
        altitude_series = [
            (base_time, 0),
            (base_time + timedelta(minutes=10), 5000),
            (base_time + timedelta(minutes=30), 35000),
            (base_time + timedelta(minutes=90), 35000),
            (base_time + timedelta(minutes=110), 5000),
            (base_time + timedelta(minutes=120), 0),
        ]
        
        estimate = estimator.estimate_fuel(
            flight_id="TEST123",
            aircraft_type="B738",
            altitude_series=altitude_series,
            distance_nm=500
        )
        
        # Verify estimate structure
        assert isinstance(estimate, FuelEstimate)
        assert estimate.flight_id == "TEST123"
        assert estimate.aircraft_type == "B738"
        
        # Verify fuel calculations
        assert estimate.fuel_kg > 0
        assert estimate.fuel_liters == pytest.approx(estimate.fuel_kg / 0.8, rel=0.01)
        assert estimate.fuel_gallons == pytest.approx(estimate.fuel_liters * 0.264172, rel=0.01)
        
        # Verify CO2 calculation
        assert estimate.co2_kg == pytest.approx(estimate.fuel_kg * 3.16, rel=0.01)
        
        # Verify confidence
        assert estimate.confidence in [ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW]
        
        # Verify phases detected
        assert len(estimate.phases) > 0
        
        # Verify assumptions
        assert "aircraft_type" in estimate.assumptions
        assert estimate.assumptions["aircraft_type"] == "B738"
    
    def test_phase_fuel_allocation(self, estimator):
        """Test that fuel is allocated to each phase"""
        base_time = datetime.utcnow()
        
        altitude_series = [
            (base_time, 0),
            (base_time + timedelta(minutes=30), 35000),
            (base_time + timedelta(minutes=90), 35000),
            (base_time + timedelta(minutes=120), 0),
        ]
        
        estimate = estimator.estimate_fuel(
            flight_id="TEST456",
            aircraft_type="A320",
            altitude_series=altitude_series
        )
        
        # Check each phase has fuel burn
        total_phase_fuel = 0
        for phase in estimate.phases:
            assert phase.fuel_burn_kg >= 0
            total_phase_fuel += phase.fuel_burn_kg
        
        # Total should match estimate (within rounding)
        assert abs(total_phase_fuel - estimate.fuel_kg) < 1
    
    def test_empty_flight_handling(self, estimator):
        """Test handling of empty or invalid flight data"""
        # Empty altitude series
        estimate = estimator.estimate_fuel(
            flight_id="EMPTY",
            aircraft_type="B738",
            altitude_series=[]
        )
        
        assert estimate.fuel_kg == 0
        assert estimate.co2_kg == 0
        assert estimate.confidence == ConfidenceLevel.LOW
        assert "error" in estimate.assumptions
    
    def test_distance_based_validation(self, estimator):
        """Test distance-based fuel consumption validation"""
        base_time = datetime.utcnow()
        
        altitude_series = [
            (base_time, 0),
            (base_time + timedelta(hours=2), 35000),
            (base_time + timedelta(hours=4), 0),
        ]
        
        estimate = estimator.estimate_fuel(
            flight_id="DIST123",
            aircraft_type="B777-300ER",
            altitude_series=altitude_series,
            distance_nm=1500
        )
        
        # Check distance is included in assumptions
        assert "distance_nm" in estimate.assumptions
        assert estimate.assumptions["distance_nm"] == 1500
        
        # Check fuel per nautical mile is calculated
        assert "fuel_per_nm" in estimate.assumptions
        if estimate.fuel_kg > 0:
            expected_per_nm = estimate.fuel_kg / 1500
            assert abs(estimate.assumptions["fuel_per_nm"] - expected_per_nm) < 0.01


class TestConfidenceLevels:
    """Test confidence level determination"""
    
    def test_confidence_hierarchy(self):
        """Test that confidence levels are properly ordered"""
        estimator = FuelEstimator()
        base_time = datetime.utcnow()
        
        altitude_series = [
            (base_time, 0),
            (base_time + timedelta(hours=1), 35000),
            (base_time + timedelta(hours=2), 0),
        ]
        
        # High confidence (exact match)
        estimate_high = estimator.estimate_fuel(
            "HIGH", "B737-800", altitude_series
        )
        
        # Medium confidence (ICAO mapping)
        estimate_medium = estimator.estimate_fuel(
            "MEDIUM", "B738", altitude_series
        )
        
        # Low confidence (unknown type)
        estimate_low = estimator.estimate_fuel(
            "LOW", "UNKNOWN", altitude_series
        )
        
        # Verify confidence levels
        assert estimate_high.confidence in [ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM]
        assert estimate_medium.confidence in [ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW]
        assert estimate_low.confidence == ConfidenceLevel.LOW


class TestEdgeCases:
    """Test edge cases and error conditions"""
    
    def test_very_short_flight(self):
        """Test estimation for very short flights"""
        estimator = FuelEstimator()
        base_time = datetime.utcnow()
        
        # 10-minute hop
        altitude_series = [
            (base_time, 0),
            (base_time + timedelta(minutes=2), 3000),
            (base_time + timedelta(minutes=8), 3000),
            (base_time + timedelta(minutes=10), 0),
        ]
        
        estimate = estimator.estimate_fuel(
            "SHORT", "CRJ9", altitude_series, distance_nm=50
        )
        
        assert estimate.fuel_kg > 0
        assert estimate.fuel_kg < 500  # Reasonable for short flight
    
    def test_very_long_flight(self):
        """Test estimation for ultra-long haul flights"""
        estimator = FuelEstimator()
        base_time = datetime.utcnow()
        
        # 14-hour flight
        altitude_series = []
        for hour in range(15):
            if hour == 0:
                altitude_series.append((base_time + timedelta(hours=hour), 0))
            elif hour < 2:
                altitude_series.append((base_time + timedelta(hours=hour), 20000))
            elif hour < 13:
                altitude_series.append((base_time + timedelta(hours=hour), 40000))
            elif hour < 14:
                altitude_series.append((base_time + timedelta(hours=hour), 20000))
            else:
                altitude_series.append((base_time + timedelta(hours=hour), 0))
        
        estimate = estimator.estimate_fuel(
            "LONG", "A350-900", altitude_series, distance_nm=7000
        )
        
        assert estimate.fuel_kg > 10000  # Reasonable for ultra-long haul
        assert estimate.co2_kg > estimate.fuel_kg * 3  # CO2 multiplier check
    
    def test_negative_altitude_handling(self):
        """Test handling of negative altitudes (below sea level)"""
        estimator = FuelEstimator()
        base_time = datetime.utcnow()
        
        altitude_series = [
            (base_time, -100),  # Below sea level (Death Valley airport)
            (base_time + timedelta(minutes=30), 10000),
            (base_time + timedelta(minutes=60), -50),
        ]
        
        estimate = estimator.estimate_fuel(
            "NEGATIVE", "B738", altitude_series
        )
        
        # Should still produce valid estimate
        assert estimate.fuel_kg >= 0
        assert len(estimate.phases) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])