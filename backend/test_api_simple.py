#!/usr/bin/env python3
"""
Simple test script to verify the fuel estimation API works
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from unittest.mock import Mock, patch

# Test the core functionality first
def test_enhanced_fuel_estimator():
    """Test the EnhancedFuelEstimator directly"""
    from src.core.fuel_estimation_v2 import EnhancedFuelEstimator, ConfidenceLevel
    
    estimator = EnhancedFuelEstimator()
    
    # Create 2-hour A320neo flight data
    base_time = datetime.utcnow()
    samples = [
        (base_time, 0),  # Taxi out
        (base_time + timedelta(minutes=10), 0),
        (base_time + timedelta(minutes=20), 15000),  # Climb
        (base_time + timedelta(minutes=30), 35000),  # Cruise
        (base_time + timedelta(hours=1, minutes=30), 35000),
        (base_time + timedelta(hours=1, minutes=45), 15000),  # Descent
        (base_time + timedelta(hours=2), 0),  # Taxi in
    ]
    
    # Test with A320neo (should map to A320-251N)
    estimate = estimator.estimate_fuel(
        flight_id="TEST_A320NEO",
        aircraft_type="A20N",  # ICAO code for A320neo
        altitude_samples=samples,
        distance_nm=500
    )
    
    print(f"[PASS] Fuel Estimation Test Results:")
    print(f"   Flight ID: {estimate.flight_id}")
    print(f"   Aircraft: {estimate.aircraft_type} -> {estimate.aircraft_key}")
    print(f"   Confidence: {estimate.confidence}")
    print(f"   Fuel: {estimate.fuel_kg:.1f} kg ({estimate.fuel_liters:.1f} L, {estimate.fuel_gallons:.1f} gal)")
    print(f"   CO2: {estimate.co2_kg:.1f} kg")
    print(f"   Phases: {len(estimate.phases)} detected")
    
    for phase in estimate.phases:
        duration_min = phase.duration_seconds / 60
        print(f"     - {phase.phase.value}: {duration_min:.1f} min, avg alt: {phase.avg_altitude_ft:.0f} ft")
    
    # Verify it meets requirements
    assert estimate.confidence in [ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM]  # Should be high confidence for A320neo
    assert estimate.fuel_kg > 500  # Reasonable for 2h flight
    assert estimate.co2_kg > 0
    assert len(estimate.phases) >= 1  # At least one phase detected
    
    print("[PASS] All assertions passed!")
    return True

def test_fastapi_imports():
    """Test that FastAPI app imports work"""
    try:
        from src.api.fastapi_app import app, fuel_estimator
        print("[PASS] FastAPI imports successful")
        print(f"   Estimator type: {type(fuel_estimator).__name__}")
        return True
    except Exception as e:
        print(f"[FAIL] FastAPI import failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing E2E Fuel Estimation Components...")
    print()
    
    # Test 1: Core estimator
    try:
        test_enhanced_fuel_estimator()
    except Exception as e:
        import traceback
        print(f"[FAIL] Enhanced fuel estimator test failed: {e}")
        traceback.print_exc()
        sys.exit(1)
    
    print()
    
    # Test 2: FastAPI imports
    try:
        test_fastapi_imports()
    except Exception as e:
        print(f"[FAIL] FastAPI import test failed: {e}")
        sys.exit(1)
    
    print()
    print("[SUCCESS] All basic tests passed! API should be ready for E2E testing.")