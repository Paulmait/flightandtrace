"""
Fuel and CO2 Estimation Module for FlightTrace
Calculates fuel burn and emissions based on flight phases and aircraft type
"""

from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Core constants
JET_A_DENSITY_KG_PER_L = 0.8
CO2_PER_KG_FUEL = 3.16
GALLONS_PER_LITER = 0.264172

class FlightPhase(Enum):
    """Flight phases for fuel calculation"""
    TAXI_OUT = "taxi_out"
    TAKEOFF = "takeoff"
    CLIMB = "climb"
    CRUISE = "cruise"
    DESCENT = "descent"
    APPROACH = "approach"
    TAXI_IN = "taxi_in"
    GROUND = "ground"

class ConfidenceLevel(Enum):
    """Confidence level for fuel estimates"""
    HIGH = "high"      # Exact aircraft subtype matched
    MEDIUM = "medium"  # ICAO family matched
    LOW = "low"        # Generic fallback used

@dataclass
class PhaseData:
    """Data for a specific flight phase"""
    phase: FlightPhase
    start_time: datetime
    end_time: datetime
    duration_minutes: float
    average_altitude_ft: float
    distance_nm: Optional[float] = None
    fuel_burn_kg: Optional[float] = None

@dataclass
class FuelEstimate:
    """Complete fuel estimate for a flight"""
    flight_id: str
    aircraft_type: str
    fuel_kg: float
    fuel_liters: float
    fuel_gallons: float
    co2_kg: float
    confidence: ConfidenceLevel
    phases: List[PhaseData]
    assumptions: Dict[str, Any]
    calculation_timestamp: datetime = field(default_factory=datetime.utcnow)

class AircraftBurnRates:
    """Aircraft-specific fuel burn rates (kg/hour)"""
    
    # Default burn rates by phase (kg/hour)
    DEFAULT_RATES = {
        "narrow_body": {
            FlightPhase.TAXI_OUT: 600,
            FlightPhase.TAKEOFF: 8000,
            FlightPhase.CLIMB: 4500,
            FlightPhase.CRUISE: 2400,
            FlightPhase.DESCENT: 1200,
            FlightPhase.APPROACH: 1800,
            FlightPhase.TAXI_IN: 600,
            FlightPhase.GROUND: 300,
        },
        "wide_body": {
            FlightPhase.TAXI_OUT: 1000,
            FlightPhase.TAKEOFF: 15000,
            FlightPhase.CLIMB: 8000,
            FlightPhase.CRUISE: 5500,
            FlightPhase.DESCENT: 2000,
            FlightPhase.APPROACH: 3000,
            FlightPhase.TAXI_IN: 1000,
            FlightPhase.GROUND: 500,
        },
        "regional_jet": {
            FlightPhase.TAXI_OUT: 400,
            FlightPhase.TAKEOFF: 4000,
            FlightPhase.CLIMB: 2500,
            FlightPhase.CRUISE: 1400,
            FlightPhase.DESCENT: 800,
            FlightPhase.APPROACH: 1200,
            FlightPhase.TAXI_IN: 400,
            FlightPhase.GROUND: 200,
        },
        "turboprop": {
            FlightPhase.TAXI_OUT: 200,
            FlightPhase.TAKEOFF: 1500,
            FlightPhase.CLIMB: 1000,
            FlightPhase.CRUISE: 600,
            FlightPhase.DESCENT: 400,
            FlightPhase.APPROACH: 500,
            FlightPhase.TAXI_IN: 200,
            FlightPhase.GROUND: 100,
        }
    }
    
    # Specific aircraft burn rates (kg/hour)
    SPECIFIC_RATES = {
        # Boeing narrow-body
        "B737-800": {
            FlightPhase.TAXI_OUT: 650,
            FlightPhase.TAKEOFF: 8500,
            FlightPhase.CLIMB: 4800,
            FlightPhase.CRUISE: 2500,
            FlightPhase.DESCENT: 1300,
            FlightPhase.APPROACH: 1900,
            FlightPhase.TAXI_IN: 650,
            FlightPhase.GROUND: 350,
        },
        "B737-900": {
            FlightPhase.TAXI_OUT: 680,
            FlightPhase.TAKEOFF: 8800,
            FlightPhase.CLIMB: 5000,
            FlightPhase.CRUISE: 2600,
            FlightPhase.DESCENT: 1350,
            FlightPhase.APPROACH: 2000,
            FlightPhase.TAXI_IN: 680,
            FlightPhase.GROUND: 380,
        },
        "B737-MAX8": {
            FlightPhase.TAXI_OUT: 600,
            FlightPhase.TAKEOFF: 8000,
            FlightPhase.CLIMB: 4500,
            FlightPhase.CRUISE: 2200,
            FlightPhase.DESCENT: 1200,
            FlightPhase.APPROACH: 1800,
            FlightPhase.TAXI_IN: 600,
            FlightPhase.GROUND: 320,
        },
        
        # Airbus narrow-body
        "A320": {
            FlightPhase.TAXI_OUT: 620,
            FlightPhase.TAKEOFF: 8200,
            FlightPhase.CLIMB: 4600,
            FlightPhase.CRUISE: 2450,
            FlightPhase.DESCENT: 1250,
            FlightPhase.APPROACH: 1850,
            FlightPhase.TAXI_IN: 620,
            FlightPhase.GROUND: 340,
        },
        "A321": {
            FlightPhase.TAXI_OUT: 700,
            FlightPhase.TAKEOFF: 9000,
            FlightPhase.CLIMB: 5200,
            FlightPhase.CRUISE: 2700,
            FlightPhase.DESCENT: 1400,
            FlightPhase.APPROACH: 2100,
            FlightPhase.TAXI_IN: 700,
            FlightPhase.GROUND: 400,
        },
        "A320neo": {
            FlightPhase.TAXI_OUT: 580,
            FlightPhase.TAKEOFF: 7800,
            FlightPhase.CLIMB: 4300,
            FlightPhase.CRUISE: 2150,
            FlightPhase.DESCENT: 1150,
            FlightPhase.APPROACH: 1750,
            FlightPhase.TAXI_IN: 580,
            FlightPhase.GROUND: 300,
        },
        
        # Boeing wide-body
        "B777-300ER": {
            FlightPhase.TAXI_OUT: 1200,
            FlightPhase.TAKEOFF: 18000,
            FlightPhase.CLIMB: 9500,
            FlightPhase.CRUISE: 6800,
            FlightPhase.DESCENT: 2500,
            FlightPhase.APPROACH: 3500,
            FlightPhase.TAXI_IN: 1200,
            FlightPhase.GROUND: 600,
        },
        "B787-9": {
            FlightPhase.TAXI_OUT: 950,
            FlightPhase.TAKEOFF: 14000,
            FlightPhase.CLIMB: 7500,
            FlightPhase.CRUISE: 5000,
            FlightPhase.DESCENT: 1900,
            FlightPhase.APPROACH: 2800,
            FlightPhase.TAXI_IN: 950,
            FlightPhase.GROUND: 480,
        },
        
        # Airbus wide-body
        "A350-900": {
            FlightPhase.TAXI_OUT: 1000,
            FlightPhase.TAKEOFF: 15000,
            FlightPhase.CLIMB: 8000,
            FlightPhase.CRUISE: 5200,
            FlightPhase.DESCENT: 2000,
            FlightPhase.APPROACH: 3000,
            FlightPhase.TAXI_IN: 1000,
            FlightPhase.GROUND: 500,
        },
        "A330-300": {
            FlightPhase.TAXI_OUT: 1100,
            FlightPhase.TAKEOFF: 16000,
            FlightPhase.CLIMB: 8500,
            FlightPhase.CRUISE: 5800,
            FlightPhase.DESCENT: 2200,
            FlightPhase.APPROACH: 3200,
            FlightPhase.TAXI_IN: 1100,
            FlightPhase.GROUND: 550,
        },
    }
    
    # ICAO to specific type mapping
    ICAO_MAPPING = {
        "B738": "B737-800",
        "B739": "B737-900",
        "B38M": "B737-MAX8",
        "A320": "A320",
        "A321": "A321",
        "A20N": "A320neo",
        "B77W": "B777-300ER",
        "B789": "B787-9",
        "A359": "A350-900",
        "A333": "A330-300",
    }
    
    @classmethod
    def get_burn_rate(cls, aircraft_type: str, phase: FlightPhase) -> Tuple[float, ConfidenceLevel]:
        """
        Get burn rate for specific aircraft and phase
        Returns: (burn_rate_kg_per_hour, confidence_level)
        """
        # Try exact match
        if aircraft_type in cls.SPECIFIC_RATES:
            return cls.SPECIFIC_RATES[aircraft_type].get(phase, 0), ConfidenceLevel.HIGH
        
        # Try ICAO mapping
        icao_type = aircraft_type.upper()
        if icao_type in cls.ICAO_MAPPING:
            specific_type = cls.ICAO_MAPPING[icao_type]
            if specific_type in cls.SPECIFIC_RATES:
                return cls.SPECIFIC_RATES[specific_type].get(phase, 0), ConfidenceLevel.MEDIUM
        
        # Fallback to category
        from .aviation_utils import classify_aircraft_by_icao, AircraftCategory
        
        category = classify_aircraft_by_icao(aircraft_type)
        category_map = {
            AircraftCategory.NARROW_BODY: "narrow_body",
            AircraftCategory.WIDE_BODY: "wide_body",
            AircraftCategory.REGIONAL_JET: "regional_jet",
            AircraftCategory.TURBOPROP: "turboprop",
        }
        
        category_key = category_map.get(category, "narrow_body")
        return cls.DEFAULT_RATES[category_key].get(phase, 0), ConfidenceLevel.LOW
    
    @classmethod
    def load_custom_rates(cls, config_path: Optional[str] = None) -> bool:
        """Load custom burn rates from configuration file"""
        if not config_path:
            config_path = os.getenv('FUEL_RATES_CONFIG', 'fuel_rates.json')
        
        try:
            path = Path(config_path)
            if path.exists():
                with open(path, 'r') as f:
                    custom_rates = json.load(f)
                    
                # Update specific rates with custom values
                for aircraft, phases in custom_rates.get('specific', {}).items():
                    if aircraft not in cls.SPECIFIC_RATES:
                        cls.SPECIFIC_RATES[aircraft] = {}
                    
                    for phase_name, rate in phases.items():
                        try:
                            phase = FlightPhase[phase_name.upper()]
                            cls.SPECIFIC_RATES[aircraft][phase] = float(rate)
                        except (KeyError, ValueError) as e:
                            logger.warning(f"Invalid custom rate: {aircraft} {phase_name} - {e}")
                
                # Update ICAO mappings
                custom_mappings = custom_rates.get('icao_mapping', {})
                cls.ICAO_MAPPING.update(custom_mappings)
                
                logger.info(f"Loaded custom fuel rates from {config_path}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to load custom fuel rates: {e}")
        
        return False

class PhaseDetector:
    """Detect flight phases from altitude and time series data"""
    
    # Phase detection thresholds
    GROUND_ALTITUDE_FT = 500          # Below this is ground
    CLIMB_RATE_FPM = 500              # Minimum climb rate
    DESCENT_RATE_FPM = -500           # Maximum descent rate (negative)
    CRUISE_ALTITUDE_FT = 20000        # Minimum cruise altitude
    TAKEOFF_DURATION_MIN = 2          # Maximum takeoff duration
    APPROACH_ALTITUDE_FT = 10000      # Below this in descent is approach
    
    @classmethod
    def detect_phases(cls, altitude_series: List[Tuple[datetime, float]]) -> List[PhaseData]:
        """
        Detect flight phases from altitude time series
        Input: List of (timestamp, altitude_ft) tuples
        Returns: List of PhaseData objects
        """
        if not altitude_series or len(altitude_series) < 2:
            return []
        
        phases = []
        current_phase = None
        phase_start = altitude_series[0][0]
        phase_altitudes = []
        
        # Sort by timestamp
        altitude_series.sort(key=lambda x: x[0])
        
        for i in range(len(altitude_series)):
            timestamp, altitude = altitude_series[i]
            phase_altitudes.append(altitude)
            
            # Calculate vertical speed if not first point
            if i > 0:
                time_diff = (timestamp - altitude_series[i-1][0]).total_seconds() / 60  # minutes
                if time_diff > 0:
                    altitude_diff = altitude - altitude_series[i-1][1]
                    vertical_speed_fpm = altitude_diff / time_diff
                else:
                    vertical_speed_fpm = 0
            else:
                vertical_speed_fpm = 0
            
            # Determine phase
            new_phase = cls._determine_phase(
                altitude, 
                vertical_speed_fpm,
                current_phase,
                (timestamp - phase_start).total_seconds() / 60 if current_phase else 0
            )
            
            # Phase change detected
            if new_phase != current_phase and current_phase is not None:
                # Save previous phase
                duration_min = (timestamp - phase_start).total_seconds() / 60
                avg_altitude = sum(phase_altitudes[:-1]) / len(phase_altitudes[:-1]) if len(phase_altitudes) > 1 else phase_altitudes[0]
                
                phases.append(PhaseData(
                    phase=current_phase,
                    start_time=phase_start,
                    end_time=timestamp,
                    duration_minutes=duration_min,
                    average_altitude_ft=avg_altitude
                ))
                
                # Start new phase
                phase_start = timestamp
                phase_altitudes = [altitude]
            
            current_phase = new_phase
        
        # Add final phase
        if current_phase and len(phase_altitudes) > 0:
            duration_min = (altitude_series[-1][0] - phase_start).total_seconds() / 60
            avg_altitude = sum(phase_altitudes) / len(phase_altitudes)
            
            phases.append(PhaseData(
                phase=current_phase,
                start_time=phase_start,
                end_time=altitude_series[-1][0],
                duration_minutes=duration_min,
                average_altitude_ft=avg_altitude
            ))
        
        return cls._refine_phases(phases)
    
    @classmethod
    def _determine_phase(cls, altitude: float, vertical_speed: float, 
                        current_phase: Optional[FlightPhase], 
                        current_duration: float) -> FlightPhase:
        """Determine flight phase based on altitude and vertical speed"""
        
        # Ground operations
        if altitude < cls.GROUND_ALTITUDE_FT:
            if current_phase in [None, FlightPhase.GROUND]:
                return FlightPhase.TAXI_OUT
            elif current_phase in [FlightPhase.DESCENT, FlightPhase.APPROACH]:
                return FlightPhase.TAXI_IN
            else:
                return FlightPhase.GROUND
        
        # Takeoff (short duration, high climb rate from ground)
        if (current_phase in [FlightPhase.TAXI_OUT, FlightPhase.GROUND] and 
            vertical_speed > cls.CLIMB_RATE_FPM * 2 and
            altitude < 5000):
            return FlightPhase.TAKEOFF
        
        # Climb
        if vertical_speed > cls.CLIMB_RATE_FPM:
            if altitude < cls.CRUISE_ALTITUDE_FT:
                return FlightPhase.CLIMB
            else:
                # Climbing at cruise altitude - still cruise
                return FlightPhase.CRUISE
        
        # Descent
        if vertical_speed < cls.DESCENT_RATE_FPM:
            if altitude < cls.APPROACH_ALTITUDE_FT:
                return FlightPhase.APPROACH
            else:
                return FlightPhase.DESCENT
        
        # Cruise (level flight at altitude)
        if altitude > cls.CRUISE_ALTITUDE_FT:
            return FlightPhase.CRUISE
        
        # Default based on altitude
        if altitude > cls.APPROACH_ALTITUDE_FT:
            return FlightPhase.CRUISE
        elif altitude > cls.GROUND_ALTITUDE_FT:
            # Low altitude level flight
            if current_phase in [FlightPhase.CLIMB, FlightPhase.TAKEOFF]:
                return FlightPhase.CLIMB
            elif current_phase in [FlightPhase.DESCENT, FlightPhase.APPROACH]:
                return FlightPhase.APPROACH
            else:
                return FlightPhase.CRUISE
        
        return FlightPhase.GROUND
    
    @classmethod
    def _refine_phases(cls, phases: List[PhaseData]) -> List[PhaseData]:
        """Refine phase detection to handle edge cases"""
        if not phases:
            return phases
        
        refined = []
        
        for i, phase in enumerate(phases):
            # Merge very short phases (< 1 minute) with adjacent phases
            if phase.duration_minutes < 1 and i > 0 and i < len(phases) - 1:
                # Skip this phase, it will be merged
                continue
            
            # Convert TAKEOFF to CLIMB if too long
            if phase.phase == FlightPhase.TAKEOFF and phase.duration_minutes > cls.TAKEOFF_DURATION_MIN:
                phase.phase = FlightPhase.CLIMB
            
            refined.append(phase)
        
        return refined

class FuelEstimator:
    """Main fuel estimation service"""
    
    def __init__(self, custom_rates_path: Optional[str] = None):
        """Initialize fuel estimator with optional custom rates"""
        self.burn_rates = AircraftBurnRates()
        if custom_rates_path:
            self.burn_rates.load_custom_rates(custom_rates_path)
        
        self.phase_detector = PhaseDetector()
    
    def estimate_fuel(self, 
                     flight_id: str,
                     aircraft_type: str,
                     altitude_series: List[Tuple[datetime, float]],
                     distance_nm: Optional[float] = None) -> FuelEstimate:
        """
        Estimate fuel consumption for a flight
        
        Args:
            flight_id: Unique flight identifier
            aircraft_type: ICAO aircraft type code (e.g., B738, A320)
            altitude_series: List of (timestamp, altitude_ft) tuples
            distance_nm: Optional total distance in nautical miles
        
        Returns:
            FuelEstimate object with detailed breakdown
        """
        # Detect flight phases
        phases = self.phase_detector.detect_phases(altitude_series)
        
        if not phases:
            # No valid phases detected
            return self._create_empty_estimate(flight_id, aircraft_type)
        
        # Calculate fuel for each phase
        total_fuel_kg = 0
        confidence_levels = []
        assumptions = {
            "aircraft_type": aircraft_type,
            "phases_detected": len(phases),
            "phase_detection_method": "altitude_based",
            "burn_rate_source": "default"
        }
        
        for phase_data in phases:
            burn_rate_kg_hr, confidence = self.burn_rates.get_burn_rate(
                aircraft_type, phase_data.phase
            )
            
            # Calculate fuel for this phase
            phase_fuel_kg = (burn_rate_kg_hr * phase_data.duration_minutes) / 60
            phase_data.fuel_burn_kg = phase_fuel_kg
            total_fuel_kg += phase_fuel_kg
            
            confidence_levels.append(confidence)
            
            # Add to assumptions
            phase_key = f"phase_{phase_data.phase.value}"
            if phase_key not in assumptions:
                assumptions[phase_key] = {
                    "burn_rate_kg_hr": burn_rate_kg_hr,
                    "total_minutes": 0,
                    "total_fuel_kg": 0
                }
            assumptions[phase_key]["total_minutes"] += phase_data.duration_minutes
            assumptions[phase_key]["total_fuel_kg"] += phase_fuel_kg
        
        # Determine overall confidence (worst case)
        if ConfidenceLevel.LOW in confidence_levels:
            overall_confidence = ConfidenceLevel.LOW
        elif ConfidenceLevel.MEDIUM in confidence_levels:
            overall_confidence = ConfidenceLevel.MEDIUM
        else:
            overall_confidence = ConfidenceLevel.HIGH
        
        # Add distance-based cross-check if available
        if distance_nm and distance_nm > 0:
            assumptions["distance_nm"] = distance_nm
            assumptions["fuel_per_nm"] = total_fuel_kg / distance_nm if total_fuel_kg > 0 else 0
        
        # Convert units
        fuel_liters = total_fuel_kg / JET_A_DENSITY_KG_PER_L
        fuel_gallons = fuel_liters * GALLONS_PER_LITER
        co2_kg = total_fuel_kg * CO2_PER_KG_FUEL
        
        # Add conversion factors to assumptions
        assumptions["conversion_factors"] = {
            "jet_a_density_kg_per_l": JET_A_DENSITY_KG_PER_L,
            "co2_per_kg_fuel": CO2_PER_KG_FUEL,
            "gallons_per_liter": GALLONS_PER_LITER
        }
        
        return FuelEstimate(
            flight_id=flight_id,
            aircraft_type=aircraft_type,
            fuel_kg=round(total_fuel_kg, 2),
            fuel_liters=round(fuel_liters, 2),
            fuel_gallons=round(fuel_gallons, 2),
            co2_kg=round(co2_kg, 2),
            confidence=overall_confidence,
            phases=phases,
            assumptions=assumptions
        )
    
    def _create_empty_estimate(self, flight_id: str, aircraft_type: str) -> FuelEstimate:
        """Create empty estimate when no data available"""
        return FuelEstimate(
            flight_id=flight_id,
            aircraft_type=aircraft_type,
            fuel_kg=0,
            fuel_liters=0,
            fuel_gallons=0,
            co2_kg=0,
            confidence=ConfidenceLevel.LOW,
            phases=[],
            assumptions={
                "error": "No valid flight phases detected",
                "aircraft_type": aircraft_type
            }
        )
    
    def estimate_from_flight_data(self, flight_data: Dict[str, Any]) -> FuelEstimate:
        """
        Estimate fuel from structured flight data
        Expects flight_data with keys: flight_id, aircraft_type, altitude_series, distance_nm
        """
        flight_id = flight_data.get('flight_id', 'unknown')
        aircraft_type = flight_data.get('aircraft_type', 'B738')  # Default to common type
        
        # Parse altitude series
        altitude_series = []
        for point in flight_data.get('altitude_series', []):
            if isinstance(point, dict):
                timestamp = datetime.fromisoformat(point['timestamp'])
                altitude = float(point['altitude'])
            else:
                timestamp = datetime.fromisoformat(point[0])
                altitude = float(point[1])
            altitude_series.append((timestamp, altitude))
        
        distance_nm = flight_data.get('distance_nm')
        
        return self.estimate_fuel(flight_id, aircraft_type, altitude_series, distance_nm)