#!/usr/bin/env python3
"""
Debug unknown aircraft fallback issue
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta

def debug_unknown_aircraft():
    """Debug why unknown aircraft returns 0 fuel"""
    from src.core.fuel_estimation_v2 import EnhancedFuelEstimator, ConfidenceLevel
    
    print("Debugging Unknown Aircraft Fuel Calculation...")
    
    estimator = EnhancedFuelEstimator()
    base_time = datetime.utcnow()
    
    # Create more detailed flight profile
    samples = []
    
    # Taxi out (5 min)
    for i in range(6):
        samples.append((base_time + timedelta(minutes=i), 0))
    
    # Climb (15 min)
    for i in range(6, 21):
        alt = (i - 5) * 2333  # Gradual climb
        samples.append((base_time + timedelta(minutes=i), min(alt, 35000)))
    
    # Cruise (60 min)
    for i in range(21, 81):
        samples.append((base_time + timedelta(minutes=i), 35000))
    
    # Descent (10 min)
    for i in range(81, 91):
        alt = 35000 - (i - 80) * 3500
        samples.append((base_time + timedelta(minutes=i), max(0, alt)))
    
    # Taxi in (5 min)
    for i in range(91, 96):
        samples.append((base_time + timedelta(minutes=i), 0))
    
    print(f"   Flight profile: {len(samples)} samples over {(samples[-1][0] - samples[0][0]).total_seconds() / 60:.1f} minutes")
    
    # Test with known aircraft first
    print("\n   Testing known aircraft (B737-800):")
    known_estimate = estimator.estimate_fuel("KNOWN_TEST", "B737-800", samples, 500)
    print(f"   -> Fuel: {known_estimate.fuel_kg:.1f} kg")
    print(f"   -> Confidence: {known_estimate.confidence.value}")
    print(f"   -> Phases: {len(known_estimate.phases)}")
    print(f"   -> Aircraft key: {known_estimate.aircraft_key}")
    
    # Test with unknown aircraft
    print("\n   Testing unknown aircraft (UNKNOWN_TYPE):")
    unknown_estimate = estimator.estimate_fuel("UNKNOWN_TEST", "UNKNOWN_TYPE", samples, 500)
    print(f"   -> Fuel: {unknown_estimate.fuel_kg:.1f} kg")
    print(f"   -> Confidence: {unknown_estimate.confidence.value}")
    print(f"   -> Phases: {len(unknown_estimate.phases)}")
    print(f"   -> Aircraft key: {unknown_estimate.aircraft_key}")
    print(f"   -> Assumptions: {unknown_estimate.assumptions}")
    
    # Debug phase detection
    if unknown_estimate.phases:
        print("\n   Phase breakdown:")
        for i, phase in enumerate(unknown_estimate.phases):
            duration_min = phase.duration_seconds / 60
            print(f"      {i+1}. {phase.phase.value}: {duration_min:.1f} min, avg alt: {phase.avg_altitude_ft:.0f} ft")
    else:
        print("\n   ⚠️  No phases detected - this might be the issue!")
    
    # Check if it's a burn rate issue
    from src.core.fuel_estimation_v2 import FuelBurnTable
    
    print(f"\n   Burn rates for {unknown_estimate.aircraft_key}:")
    if unknown_estimate.aircraft_key in FuelBurnTable.BURN_RATES:
        rates = FuelBurnTable.BURN_RATES[unknown_estimate.aircraft_key]
        for phase, rate in rates.items():
            if phase != "sourceHint":
                print(f"      {phase}: {rate} kg/hr")
    else:
        print("      ⚠️  No burn rates found!")
    
    return unknown_estimate.fuel_kg > 0

if __name__ == "__main__":
    try:
        debug_unknown_aircraft()
    except Exception as e:
        import traceback
        print(f"Debug failed: {e}")
        traceback.print_exc()