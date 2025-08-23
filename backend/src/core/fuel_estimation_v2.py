"""
Enhanced Fuel Estimation Module with Conservative Burn Rates
Implements robust fuel calculations with proper fallbacks and confidence scoring
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import json
import logging
import os
from pathlib import Path

from .phase_detection_v2 import RobustPhaseDetector, FlightPhase, PhaseSlice

logger = logging.getLogger(__name__)

# Core constants
JET_A_DENSITY_KG_PER_L = 0.8
CO2_PER_KG_FUEL = 3.16
GALLONS_PER_LITER = 0.264172

class ConfidenceLevel(Enum):
    """Confidence level for fuel estimates"""
    HIGH = "high"      # Exact aircraft subtype matched
    MEDIUM = "medium"  # Family/ICAO code matched
    LOW = "low"        # Generic fallback used

@dataclass
class FuelEstimateV2:
    """Enhanced fuel estimate with detailed breakdown"""
    flight_id: str
    aircraft_type: str
    aircraft_key: str  # Normalized aircraft identifier
    fuel_kg: float
    fuel_liters: float
    fuel_gallons: float
    co2_kg: float
    confidence: ConfidenceLevel
    phases: List[PhaseSlice]
    phase_fuel: Dict[FlightPhase, float]  # Fuel per phase
    assumptions: Dict[str, Any]
    calculation_timestamp: datetime = field(default_factory=datetime.utcnow)

class FuelBurnTable:
    """
    Conservative fuel burn rates for various aircraft types
    All rates in kg/hour
    """
    
    # Conservative midpoint burn rates based on public specifications
    BURN_RATES = {
        # Narrowbody aircraft
        "B737-700": {
            "taxi": 550,
            "climb": 4200,
            "cruise": 2250,
            "descent": 1100,
            "sourceHint": "public spec midpoint"
        },
        "B737-800": {
            "taxi": 600,
            "climb": 4600,
            "cruise": 2450,
            "descent": 1200,
            "sourceHint": "public spec midpoint"
        },
        "B737-8": {  # MAX 8
            "taxi": 580,
            "climb": 4400,
            "cruise": 2200,
            "descent": 1100,
            "sourceHint": "public spec midpoint - 15% improvement"
        },
        "B737-MAX-8": {  # Alias
            "taxi": 580,
            "climb": 4400,
            "cruise": 2200,
            "descent": 1100,
            "sourceHint": "public spec midpoint - 15% improvement"
        },
        "A319": {
            "taxi": 550,
            "climb": 4000,
            "cruise": 2100,
            "descent": 1050,
            "sourceHint": "public spec midpoint"
        },
        "A320-214": {  # CEO version
            "taxi": 600,
            "climb": 4400,
            "cruise": 2400,
            "descent": 1200,
            "sourceHint": "public spec midpoint"
        },
        "A320-251N": {  # A320neo
            "taxi": 560,
            "climb": 4100,
            "cruise": 2100,
            "descent": 1050,
            "sourceHint": "public spec midpoint - 15% improvement"
        },
        "A320neo": {  # Alias
            "taxi": 560,
            "climb": 4100,
            "cruise": 2100,
            "descent": 1050,
            "sourceHint": "public spec midpoint - 15% improvement"
        },
        "A321": {
            "taxi": 680,
            "climb": 5000,
            "cruise": 2650,
            "descent": 1320,
            "sourceHint": "public spec midpoint"
        },
        "E170": {
            "taxi": 350,
            "climb": 2200,
            "cruise": 1180,
            "descent": 590,
            "sourceHint": "public spec midpoint"
        },
        "E190": {
            "taxi": 400,
            "climb": 2600,
            "cruise": 1400,
            "descent": 700,
            "sourceHint": "public spec midpoint"
        },
        "CRJ-700": {
            "taxi": 330,
            "climb": 2100,
            "cruise": 1120,
            "descent": 560,
            "sourceHint": "public spec midpoint"
        },
        "CRJ-900": {
            "taxi": 380,
            "climb": 2400,
            "cruise": 1280,
            "descent": 640,
            "sourceHint": "public spec midpoint"
        },
        
        # Widebody aircraft
        "B767-300ER": {
            "taxi": 900,
            "climb": 7200,
            "cruise": 3850,
            "descent": 1920,
            "sourceHint": "public spec midpoint"
        },
        "B777-200ER": {
            "taxi": 1050,
            "climb": 8200,
            "cruise": 6100,
            "descent": 3050,
            "sourceHint": "public spec midpoint"
        },
        "B777-300ER": {
            "taxi": 1150,
            "climb": 9000,
            "cruise": 6700,
            "descent": 3350,
            "sourceHint": "public spec midpoint"
        },
        "B787-8": {
            "taxi": 880,
            "climb": 6800,
            "cruise": 4600,
            "descent": 2300,
            "sourceHint": "public spec midpoint - 20% improvement"
        },
        "B787-9": {
            "taxi": 920,
            "climb": 7200,
            "cruise": 4900,
            "descent": 2450,
            "sourceHint": "public spec midpoint - 20% improvement"
        },
        "B787-10": {
            "taxi": 980,
            "climb": 7600,
            "cruise": 5200,
            "descent": 2600,
            "sourceHint": "public spec midpoint - 20% improvement"
        },
        "A330-200": {
            "taxi": 1000,
            "climb": 7800,
            "cruise": 5400,
            "descent": 2700,
            "sourceHint": "public spec midpoint"
        },
        "A330-300": {
            "taxi": 1080,
            "climb": 8400,
            "cruise": 5700,
            "descent": 2850,
            "sourceHint": "public spec midpoint"
        },
        "A350-900": {
            "taxi": 950,
            "climb": 7600,
            "cruise": 5100,
            "descent": 2550,
            "sourceHint": "public spec midpoint - 25% improvement"
        },
        "A350-1000": {
            "taxi": 1050,
            "climb": 8400,
            "cruise": 5600,
            "descent": 2800,
            "sourceHint": "public spec midpoint - 25% improvement"
        },
        
        # Regional turboprops
        "ATR-72-600": {
            "taxi": 170,
            "climb": 850,
            "cruise": 520,
            "descent": 260,
            "sourceHint": "public spec midpoint"
        },
        "Q400": {  # Dash 8-400
            "taxi": 210,
            "climb": 1050,
            "cruise": 620,
            "descent": 310,
            "sourceHint": "public spec midpoint"
        },
        
        # Generic fallbacks
        "narrowbody": {
            "taxi": 600,
            "climb": 4500,
            "cruise": 2400,
            "descent": 1200,
            "sourceHint": "conservative average"
        },
        "widebody": {
            "taxi": 1000,
            "climb": 8000,
            "cruise": 5500,
            "descent": 2750,
            "sourceHint": "conservative average"
        },
        "regional": {
            "taxi": 350,
            "climb": 2300,
            "cruise": 1250,
            "descent": 625,
            "sourceHint": "conservative average"
        },
        "turboprop": {
            "taxi": 190,
            "climb": 950,
            "cruise": 570,
            "descent": 285,
            "sourceHint": "conservative average"
        }
    }
    
    # Family mappings (ICAO codes to specific types)
    FAMILY_FALLBACKS = {
        # Boeing narrowbody
        "B737": "B737-800",
        "B738": "B737-800",
        "B37M": "B737-MAX-8",
        "B38M": "B737-MAX-8",
        "B739": "B737-800",  # Use -800 as conservative for -900
        
        # Airbus narrowbody
        "A319": "A319",
        "A320": "A320-214",
        "A20N": "A320-251N",
        "A321": "A321",
        "A21N": "A321",  # Use regular A321 as conservative
        
        # Embraer
        "E170": "E170",
        "E75S": "E170",  # E175 short range
        "E75L": "E170",  # E175 long range
        "E190": "E190",
        "E90": "E190",
        "E195": "E190",  # Use E190 as conservative
        
        # Bombardier
        "CRJ7": "CRJ-700",
        "CRJ9": "CRJ-900",
        "CR7": "CRJ-700",
        "CR9": "CRJ-900",
        
        # Boeing widebody
        "B763": "B767-300ER",
        "B772": "B777-200ER",
        "B77W": "B777-300ER",
        "B773": "B777-300ER",
        "B788": "B787-8",
        "B789": "B787-9",
        "B78X": "B787-10",
        
        # Airbus widebody
        "A332": "A330-200",
        "A333": "A330-300",
        "A339": "A330-300",  # A330-900neo, use -300 as conservative
        "A359": "A350-900",
        "A35K": "A350-1000",
        
        # Turboprops
        "AT72": "ATR-72-600",
        "AT76": "ATR-72-600",
        "DH8D": "Q400",
        "DH8": "Q400"
    }
    
    @classmethod
    def normalize_aircraft(cls, aircraft_type: str) -> Tuple[str, ConfidenceLevel]:
        """
        Normalize aircraft type and determine confidence level
        Returns: (normalized_key, confidence)
        """
        aircraft_upper = aircraft_type.upper().strip()
        
        # Direct match - HIGH confidence
        if aircraft_upper in cls.BURN_RATES:
            return aircraft_upper, ConfidenceLevel.HIGH
        
        # Check aliases
        for key in cls.BURN_RATES:
            if key.upper() == aircraft_upper:
                return key, ConfidenceLevel.HIGH
        
        # Family fallback - MEDIUM confidence
        if aircraft_upper in cls.FAMILY_FALLBACKS:
            return cls.FAMILY_FALLBACKS[aircraft_upper], ConfidenceLevel.MEDIUM
        
        # Category fallback - LOW confidence
        # Simple heuristics based on type patterns
        if any(x in aircraft_upper for x in ['737', '320', 'A32', 'B73']):
            return "narrowbody", ConfidenceLevel.LOW
        elif any(x in aircraft_upper for x in ['777', '787', '330', '350', '767', 'A33', 'A35', 'B77', 'B78']):
            return "widebody", ConfidenceLevel.LOW
        elif any(x in aircraft_upper for x in ['CRJ', 'ERJ', 'E17', 'E19', 'CR']):
            return "regional", ConfidenceLevel.LOW
        elif any(x in aircraft_upper for x in ['ATR', 'Q4', 'DH8', 'AT']):
            return "turboprop", ConfidenceLevel.LOW
        
        # Default to narrowbody
        return "narrowbody", ConfidenceLevel.LOW
    
    @classmethod
    def get_burn_rate(cls, aircraft_key: str, phase: FlightPhase) -> float:
        """
        Get burn rate for specific aircraft and phase
        Falls back to cruise × multipliers if phase missing
        """
        if aircraft_key not in cls.BURN_RATES:
            aircraft_key = "narrowbody"  # Safe fallback
        
        rates = cls.BURN_RATES[aircraft_key]
        cruise_rate = rates.get("cruise", 2400)
        
        # Map flight phases to burn rate keys
        phase_map = {
            FlightPhase.TAXI_OUT: "taxi",
            FlightPhase.TAXI_IN: "taxi",
            FlightPhase.CLIMB: "climb",
            FlightPhase.CRUISE: "cruise",
            FlightPhase.DESCENT: "descent"
        }
        
        rate_key = phase_map.get(phase, "cruise")
        
        if rate_key in rates:
            return rates[rate_key]
        
        # Fallback multipliers based on phase
        if phase == FlightPhase.CLIMB:
            return cruise_rate * 1.8  # Climb = cruise × 1.8
        elif phase == FlightPhase.DESCENT:
            return cruise_rate * 0.5  # Descent = cruise × 0.5
        elif phase in [FlightPhase.TAXI_OUT, FlightPhase.TAXI_IN]:
            # Taxi = min(0.5 × cruise, category limit)
            category_limits = {
                "narrowbody": 600,
                "widebody": 1000,
                "regional": 350,
                "turboprop": 200
            }
            
            # Determine category
            if "narrow" in aircraft_key.lower():
                limit = category_limits["narrowbody"]
            elif "wide" in aircraft_key.lower():
                limit = category_limits["widebody"]
            elif "regional" in aircraft_key.lower():
                limit = category_limits["regional"]
            elif "turbo" in aircraft_key.lower():
                limit = category_limits["turboprop"]
            else:
                limit = 600  # Default narrowbody limit
            
            return min(cruise_rate * 0.25, limit)
        
        return cruise_rate
    
    @classmethod
    def load_remote_override(cls, url_or_path: str) -> bool:
        """
        Load and merge remote override table
        Returns True if successful
        """
        try:
            if url_or_path.startswith(('http://', 'https://')):
                import requests
                response = requests.get(url_or_path, timeout=5)
                override_data = response.json()
            else:
                with open(url_or_path, 'r') as f:
                    override_data = json.load(f)
            
            # Merge rates
            if "rates" in override_data:
                cls.BURN_RATES.update(override_data["rates"])
            
            # Merge family mappings
            if "families" in override_data:
                cls.FAMILY_FALLBACKS.update(override_data["families"])
            
            logger.info(f"Loaded burn rate overrides from {url_or_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load burn rate overrides: {e}")
            return False


class EnhancedFuelEstimator:
    """
    Robust fuel estimation with improved math and confidence scoring
    """
    
    def __init__(self, override_table: Optional[str] = None):
        """
        Initialize estimator with optional override table
        
        Args:
            override_table: URL or path to override burn rates JSON
        """
        self.phase_detector = RobustPhaseDetector()
        self.burn_table = FuelBurnTable()
        
        # Load override table if provided
        if override_table:
            self.burn_table.load_remote_override(override_table)
        elif os.getenv('FUEL_RATES_OVERRIDE'):
            self.burn_table.load_remote_override(os.getenv('FUEL_RATES_OVERRIDE'))
    
    def estimate_fuel(self,
                     flight_id: str,
                     aircraft_type: str,
                     altitude_samples: List[Tuple[datetime, float]],
                     distance_nm: Optional[float] = None) -> FuelEstimateV2:
        """
        Estimate fuel consumption using robust phase detection
        
        Args:
            flight_id: Unique flight identifier
            aircraft_type: Aircraft type (e.g., B738, A320)
            altitude_samples: List of (timestamp, altitude_ft) tuples
            distance_nm: Optional flight distance in nautical miles
            
        Returns:
            FuelEstimateV2 with detailed breakdown
        """
        # Normalize aircraft type and get confidence
        aircraft_key, confidence = self.burn_table.normalize_aircraft(aircraft_type)
        
        # Detect phases with smoothing
        phases = self.phase_detector.detect_phases(altitude_samples, smooth=True)
        
        if not phases:
            return self._empty_estimate(flight_id, aircraft_type, aircraft_key, confidence)
        
        # Calculate fuel for each phase
        phase_fuel = {}
        total_fuel_kg = 0
        rates_used = {}
        phase_durations = {}
        
        for phase in phases:
            # Get burn rate for this phase
            burn_rate_kg_hr = self.burn_table.get_burn_rate(aircraft_key, phase.phase)
            
            # Calculate fuel for this phase
            fuel_kg = (burn_rate_kg_hr * phase.duration_seconds) / 3600.0
            
            # Accumulate by phase type
            if phase.phase not in phase_fuel:
                phase_fuel[phase.phase] = 0
                phase_durations[phase.phase] = 0
                rates_used[phase.phase] = burn_rate_kg_hr
            
            phase_fuel[phase.phase] += fuel_kg
            phase_durations[phase.phase] += phase.duration_seconds
            total_fuel_kg += fuel_kg
        
        # Convert units
        fuel_liters = total_fuel_kg / JET_A_DENSITY_KG_PER_L
        fuel_gallons = fuel_liters * GALLONS_PER_LITER
        co2_kg = total_fuel_kg * CO2_PER_KG_FUEL
        
        # Build assumptions object
        table_source = "remote" if os.getenv('FUEL_RATES_OVERRIDE') else "local"
        
        assumptions = {
            "aircraftKey": aircraft_key,
            "density": JET_A_DENSITY_KG_PER_L,
            "co2Factor": CO2_PER_KG_FUEL,
            "tableSource": table_source,
            "phaseDurations": {
                phase.value: duration 
                for phase, duration in phase_durations.items()
            },
            "ratesUsed": {
                phase.value: rate 
                for phase, rate in rates_used.items()
            },
            "sourceHint": self.burn_table.BURN_RATES.get(aircraft_key, {}).get("sourceHint", "unknown"),
            "phaseDetection": {
                "smoothingApplied": True,
                "smoothingWindow": self.phase_detector.smoothing_window,
                "mergeThreshold": self.phase_detector.MERGE_THRESHOLD
            }
        }
        
        # Add distance metrics if provided
        if distance_nm and distance_nm > 0:
            assumptions["distance_nm"] = distance_nm
            assumptions["fuel_per_nm"] = total_fuel_kg / distance_nm if total_fuel_kg > 0 else 0
            assumptions["efficiency_mpg"] = (distance_nm * 1.15078) / fuel_gallons if fuel_gallons > 0 else 0
        
        return FuelEstimateV2(
            flight_id=flight_id,
            aircraft_type=aircraft_type,
            aircraft_key=aircraft_key,
            fuel_kg=round(total_fuel_kg, 2),
            fuel_liters=round(fuel_liters, 2),
            fuel_gallons=round(fuel_gallons, 2),
            co2_kg=round(co2_kg, 2),
            confidence=confidence,
            phases=phases,
            phase_fuel=phase_fuel,
            assumptions=assumptions
        )
    
    def _empty_estimate(self, 
                       flight_id: str, 
                       aircraft_type: str,
                       aircraft_key: str,
                       confidence: ConfidenceLevel) -> FuelEstimateV2:
        """Create empty estimate when no valid phases detected"""
        return FuelEstimateV2(
            flight_id=flight_id,
            aircraft_type=aircraft_type,
            aircraft_key=aircraft_key,
            fuel_kg=0,
            fuel_liters=0,
            fuel_gallons=0,
            co2_kg=0,
            confidence=confidence,
            phases=[],
            phase_fuel={},
            assumptions={
                "error": "No valid flight phases detected",
                "aircraftKey": aircraft_key,
                "density": JET_A_DENSITY_KG_PER_L,
                "co2Factor": CO2_PER_KG_FUEL,
                "tableSource": "local"
            }
        )