"""
Aviation-specific utilities and validations for FlightTrace
Includes tail number validation, squawk code detection, and aviation calculations
"""

import re
from typing import Optional, Dict, List, Tuple
from enum import Enum
import math

class EmergencyType(Enum):
    """Aviation emergency types based on squawk codes"""
    HIJACKING = "7500"
    RADIO_FAILURE = "7600"
    GENERAL_EMERGENCY = "7700"

class AircraftCategory(Enum):
    """Aircraft categories for fuel estimation"""
    NARROW_BODY = "narrow_body"
    WIDE_BODY = "wide_body"
    REGIONAL_JET = "regional_jet"
    TURBOPROP = "turboprop"
    GENERAL_AVIATION = "general_aviation"
    HELICOPTER = "helicopter"

def validate_tail_number_enhanced(tail_number: str) -> Tuple[bool, Optional[str]]:
    """
    Enhanced aviation-compliant tail number validation
    Returns: (is_valid, country_code)
    """
    if not tail_number:
        return False, None
    
    tail_upper = tail_number.upper().strip()
    
    # Define patterns with country codes
    patterns = [
        (r'^N[0-9]{1,5}[A-Z]{0,2}$', 'US'),           # US FAA
        (r'^C-[FG][A-Z]{3}$', 'CA'),                  # Canada
        (r'^VH-[A-Z]{3}$', 'AU'),                     # Australia
        (r'^G-[A-Z]{4}$', 'GB'),                      # United Kingdom
        (r'^F-[A-Z]{4}$', 'FR'),                      # France
        (r'^D-[A-Z]{4}$', 'DE'),                      # Germany
        (r'^JA[0-9]{4}[A-Z]?$', 'JP'),                # Japan
        (r'^B-[0-9]{4}$', 'CN'),                      # China
        (r'^VT-[A-Z]{3}$', 'IN'),                     # India
        (r'^PP-[A-Z]{3}$|^PT-[A-Z]{3}$|^PR-[A-Z]{3}$|^PS-[A-Z]{3}$|^PU-[A-Z]{3}$', 'BR'),  # Brazil
        (r'^XA-[A-Z]{3}$|^XB-[A-Z]{3}$|^XC-[A-Z]{3}$', 'MX'),  # Mexico
        (r'^9V-[A-Z]{3}$', 'SG'),                     # Singapore
        (r'^A7-[A-Z]{3}$', 'QA'),                     # Qatar
        (r'^HS-[A-Z]{3}$', 'TH'),                     # Thailand
        (r'^ZK-[A-Z]{3}$', 'NZ'),                     # New Zealand
        (r'^HB-[A-Z]{3}$', 'CH'),                     # Switzerland
        (r'^OO-[A-Z]{3}$', 'BE'),                     # Belgium
        (r'^PH-[A-Z]{3}$', 'NL'),                     # Netherlands
        (r'^LN-[A-Z]{3}$', 'NO'),                     # Norway
        (r'^SE-[A-Z]{3}$', 'SE'),                     # Sweden
        (r'^OH-[A-Z]{3}$', 'FI'),                     # Finland
        (r'^SP-[A-Z]{3}$', 'PL'),                     # Poland
        (r'^OK-[A-Z]{3}$', 'CZ'),                     # Czech Republic
        (r'^HA-[A-Z]{3}$', 'HU'),                     # Hungary
        (r'^YR-[A-Z]{3}$', 'RO'),                     # Romania
        (r'^TC-[A-Z]{3}$', 'TR'),                     # Turkey
        (r'^A6-[A-Z]{3}$', 'AE'),                     # UAE
        (r'^HZ-[A-Z]{3}$', 'SA'),                     # Saudi Arabia
        (r'^EC-[A-Z]{3}$', 'ES'),                     # Spain
        (r'^I-[A-Z]{4}$', 'IT'),                      # Italy
        (r'^RA-[0-9]{5}$', 'RU'),                     # Russia
    ]
    
    for pattern, country in patterns:
        if re.match(pattern, tail_upper):
            return True, country
    
    # Check for military format (simplified)
    if re.match(r'^[0-9]{2}-[0-9]{4,5}$', tail_upper):
        return True, 'MILITARY'
    
    return False, None

def detect_emergency_squawk(squawk_code: str) -> Optional[Dict[str, str]]:
    """
    Detect aviation emergency squawk codes
    Returns emergency information if detected
    """
    if not squawk_code or not re.match(r'^[0-7]{4}$', squawk_code):
        return None
    
    emergencies = {
        '7500': {
            'type': 'HIJACKING',
            'priority': 'CRITICAL',
            'description': 'Aircraft hijacking in progress',
            'action': 'Alert law enforcement and ATC immediately'
        },
        '7600': {
            'type': 'RADIO_FAILURE',
            'priority': 'HIGH',
            'description': 'Two-way radio communication failure',
            'action': 'Monitor aircraft visually, prepare for light signals'
        },
        '7700': {
            'type': 'GENERAL_EMERGENCY',
            'priority': 'CRITICAL',
            'description': 'General emergency declared',
            'action': 'Alert emergency services, clear airspace'
        }
    }
    
    return emergencies.get(squawk_code)

def validate_icao_code(icao_code: str) -> bool:
    """
    Validate ICAO airport or aircraft type code
    ICAO airport codes: 4 letters (e.g., KJFK, EGLL)
    ICAO aircraft codes: 3-4 characters (e.g., B738, A320)
    """
    if not icao_code:
        return False
    
    icao_upper = icao_code.upper().strip()
    
    # Airport code: 4 letters
    if re.match(r'^[A-Z]{4}$', icao_upper):
        return True
    
    # Aircraft type: letter(s) followed by numbers (B738, A320, CRJ9)
    if re.match(r'^[A-Z]{1,2}[0-9]{2,3}[A-Z]?$', icao_upper):
        return True
    
    return False

def validate_iata_code(iata_code: str) -> bool:
    """
    Validate IATA airport or airline code
    IATA airport codes: 3 letters (e.g., JFK, LHR)
    IATA airline codes: 2 letters or letter+number (e.g., AA, DL, 9W)
    """
    if not iata_code:
        return False
    
    iata_upper = iata_code.upper().strip()
    
    # Airport code: 3 letters
    if re.match(r'^[A-Z]{3}$', iata_upper):
        return True
    
    # Airline code: 2 characters (letters or letter+number)
    if re.match(r'^[A-Z0-9]{2}$', iata_upper):
        return True
    
    return False

def validate_flight_number(flight_number: str) -> Tuple[bool, Optional[Dict[str, str]]]:
    """
    Validate and parse flight number (e.g., AA1234, DL123, BA001)
    Returns: (is_valid, parsed_info)
    """
    if not flight_number:
        return False, None
    
    flight_upper = flight_number.upper().strip()
    
    # Standard format: 2-3 letter airline code + 1-4 digit number
    match = re.match(r'^([A-Z]{2,3})([0-9]{1,4})([A-Z]?)$', flight_upper)
    if match:
        return True, {
            'airline': match.group(1),
            'number': match.group(2),
            'suffix': match.group(3) if match.group(3) else None,
            'formatted': flight_upper
        }
    
    # Alternative format with space
    match = re.match(r'^([A-Z]{2,3})\s+([0-9]{1,4})([A-Z]?)$', flight_upper)
    if match:
        formatted = f"{match.group(1)}{match.group(2)}{match.group(3) if match.group(3) else ''}"
        return True, {
            'airline': match.group(1),
            'number': match.group(2),
            'suffix': match.group(3) if match.group(3) else None,
            'formatted': formatted
        }
    
    return False, None

def calculate_great_circle_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great circle distance between two points on Earth
    Returns distance in nautical miles
    """
    # Earth radius in nautical miles
    R = 3440.065
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def convert_altitude_units(altitude: float, from_unit: str, to_unit: str) -> float:
    """
    Convert between altitude units (feet, meters, flight levels)
    """
    conversions = {
        ('feet', 'meters'): lambda x: x * 0.3048,
        ('meters', 'feet'): lambda x: x / 0.3048,
        ('feet', 'fl'): lambda x: x / 100,  # Flight Level
        ('fl', 'feet'): lambda x: x * 100,
        ('meters', 'fl'): lambda x: (x / 0.3048) / 100,
        ('fl', 'meters'): lambda x: (x * 100) * 0.3048,
    }
    
    key = (from_unit.lower(), to_unit.lower())
    if key in conversions:
        return conversions[key](altitude)
    elif from_unit.lower() == to_unit.lower():
        return altitude
    else:
        raise ValueError(f"Unsupported conversion: {from_unit} to {to_unit}")

def classify_aircraft_by_icao(icao_type: str) -> Optional[AircraftCategory]:
    """
    Classify aircraft by ICAO type code
    """
    icao_upper = icao_type.upper()
    
    # Wide body aircraft
    wide_body = ['A330', 'A340', 'A350', 'A380', 'B747', 'B767', 'B777', 'B787', 'MD11', 'DC10', 'L101']
    if any(icao_upper.startswith(wb) for wb in wide_body):
        return AircraftCategory.WIDE_BODY
    
    # Narrow body aircraft
    narrow_body = ['A318', 'A319', 'A320', 'A321', 'B737', 'B727', 'B757', 'MD80', 'MD90', 'DC9']
    if any(icao_upper.startswith(nb) for nb in narrow_body):
        return AircraftCategory.NARROW_BODY
    
    # Regional jets
    regional = ['CRJ', 'ERJ', 'E145', 'E170', 'E175', 'E190', 'E195', 'ARJ', 'SU95']
    if any(icao_upper.startswith(rj) for rj in regional):
        return AircraftCategory.REGIONAL_JET
    
    # Turboprops
    turboprop = ['AT43', 'AT45', 'AT72', 'AT76', 'DH8', 'SF34', 'SW4', 'JS41']
    if any(icao_upper.startswith(tp) for tp in turboprop):
        return AircraftCategory.TURBOPROP
    
    # Helicopters
    if icao_upper.startswith(('H', 'R', 'S')) and len(icao_upper) <= 4:
        return AircraftCategory.HELICOPTER
    
    # Default to general aviation for unrecognized types
    return AircraftCategory.GENERAL_AVIATION

def validate_runway_designator(runway: str) -> bool:
    """
    Validate runway designator (e.g., 09L, 27R, 18, 36C)
    """
    if not runway:
        return False
    
    runway_upper = runway.upper().strip()
    
    # Runway number (01-36) optionally followed by L, R, or C
    return bool(re.match(r'^(0[1-9]|[12][0-9]|3[0-6])[LRC]?$', runway_upper))

def parse_metar(metar: str) -> Optional[Dict[str, any]]:
    """
    Basic METAR parser for weather information
    """
    if not metar:
        return None
    
    # This is a simplified parser - real METAR parsing is complex
    result = {
        'raw': metar,
        'station': None,
        'time': None,
        'wind': None,
        'visibility': None,
        'weather': [],
        'temperature': None,
        'dewpoint': None,
        'altimeter': None
    }
    
    parts = metar.split()
    if len(parts) < 3:
        return None
    
    # Station identifier (4 letters)
    if re.match(r'^[A-Z]{4}$', parts[0]):
        result['station'] = parts[0]
    
    # Time (ddhhmmZ)
    if len(parts) > 1 and parts[1].endswith('Z'):
        result['time'] = parts[1]
    
    # Wind (dddssKT or dddssGggKT)
    for part in parts:
        if part.endswith('KT'):
            result['wind'] = part
            break
    
    # Temperature/Dewpoint (M?dd/M?dd)
    for part in parts:
        if '/' in part and re.match(r'^M?\d{2}/M?\d{2}$', part):
            temps = part.split('/')
            result['temperature'] = temps[0]
            result['dewpoint'] = temps[1]
            break
    
    # Altimeter (A\d{4} or Q\d{4})
    for part in parts:
        if re.match(r'^[AQ]\d{4}$', part):
            result['altimeter'] = part
            break
    
    return result