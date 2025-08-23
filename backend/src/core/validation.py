"""
Server-side input validation and sanitization for fuel estimation endpoints
Uses Pydantic for validation with custom validators and size limits
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator, ValidationError
from enum import Enum
import re
import logging

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom validation error"""
    pass

class AltitudePoint(BaseModel):
    """Single altitude data point with timestamp"""
    timestamp: datetime = Field(..., description="ISO timestamp of the measurement")
    altitude: float = Field(..., ge=-1000, le=60000, description="Altitude in feet (-1000 to 60000)")
    
    @validator('altitude')
    def validate_altitude(cls, v):
        """Validate altitude is reasonable"""
        if not isinstance(v, (int, float)):
            raise ValueError("Altitude must be a number")
        
        # Clamp to reasonable aviation limits
        if v < -1000:  # Below Dead Sea level
            return -1000
        if v > 60000:   # Above service ceiling
            return 60000
        
        return float(v)
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class FuelEstimateRequest(BaseModel):
    """Validated request for fuel estimation"""
    flight_id: str = Field(..., min_length=1, max_length=50, description="Flight identifier")
    aircraft_type: str = Field(..., min_length=1, max_length=20, description="ICAO aircraft type")
    altitude_series: List[AltitudePoint] = Field(..., min_items=2, max_items=10000, description="Altitude time series")
    distance_nm: Optional[float] = Field(None, ge=0, le=15000, description="Distance in nautical miles")
    
    @validator('flight_id')
    def validate_flight_id(cls, v):
        """Sanitize and validate flight ID"""
        if not v or not v.strip():
            raise ValueError("Flight ID cannot be empty")
        
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[^\w\-_.]', '', v.strip())
        if len(sanitized) == 0:
            raise ValueError("Flight ID contains only invalid characters")
        
        return sanitized[:50]  # Clamp length
    
    @validator('aircraft_type')
    def validate_aircraft_type(cls, v):
        """Validate and normalize aircraft type"""
        if not v or not v.strip():
            raise ValueError("Aircraft type cannot be empty")
        
        # Allow alphanumeric, hyphens, and spaces only
        sanitized = re.sub(r'[^\w\-\s]', '', v.strip().upper())
        if len(sanitized) == 0:
            raise ValueError("Aircraft type contains only invalid characters")
        
        return sanitized[:20]  # Clamp length
    
    @validator('altitude_series')
    def validate_altitude_series(cls, v):
        """Validate altitude series"""
        if not v:
            raise ValueError("Altitude series cannot be empty")
        
        # Enforce size limits
        if len(v) > 10000:
            logger.warning(f"Altitude series truncated from {len(v)} to 10000 points")
            v = v[:10000]
        
        if len(v) < 2:
            raise ValueError("Need at least 2 altitude points for estimation")
        
        # Validate timestamps are monotonic
        timestamps = [point.timestamp for point in v]
        if not all(timestamps[i] <= timestamps[i+1] for i in range(len(timestamps)-1)):
            # Sort by timestamp if not already sorted
            v = sorted(v, key=lambda x: x.timestamp)
        
        # Check for reasonable time span
        time_span = (timestamps[-1] - timestamps[0]).total_seconds()
        if time_span < 60:  # Less than 1 minute
            raise ValueError("Flight must span at least 1 minute")
        
        if time_span > 86400:  # More than 24 hours
            logger.warning("Flight duration exceeds 24 hours, may be invalid")
        
        return v
    
    @validator('distance_nm')
    def validate_distance(cls, v):
        """Validate distance if provided"""
        if v is not None:
            if v < 0:
                return 0
            if v > 15000:  # Reasonable max flight distance
                return 15000
        return v

class BatchFuelRequest(BaseModel):
    """Request for multiple fuel estimates"""
    flight_requests: List[FuelEstimateRequest] = Field(..., min_items=1, max_items=100, description="List of flight requests")
    
    @validator('flight_requests')
    def validate_batch_size(cls, v):
        """Enforce batch size limits"""
        if len(v) > 100:
            logger.warning(f"Batch request truncated from {len(v)} to 100 flights")
            return v[:100]
        
        return v

class GetFuelEstimateParams(BaseModel):
    """Validated parameters for GET fuel estimate endpoint"""
    flightId: str = Field(..., alias='flightId', min_length=1, max_length=50)
    aircraftType: Optional[str] = Field('B738', alias='aircraftType', max_length=20)
    
    @validator('flightId')
    def validate_flight_id(cls, v):
        """Sanitize flight ID"""
        return re.sub(r'[^\w\-_.]', '', v.strip())[:50]
    
    @validator('aircraftType')
    def validate_aircraft_type(cls, v):
        """Sanitize aircraft type"""
        if not v:
            return 'B738'
        return re.sub(r'[^\w\-\s]', '', v.strip().upper())[:20]

class RateLimitInfo(BaseModel):
    """Rate limiting information"""
    limit: int
    remaining: int
    reset_time: datetime
    retry_after: Optional[int] = None

def validate_fuel_request(data: Dict[str, Any]) -> FuelEstimateRequest:
    """
    Validate and sanitize fuel estimation request
    
    Args:
        data: Raw request data
        
    Returns:
        Validated FuelEstimateRequest
        
    Raises:
        ValidationError: If validation fails
    """
    try:
        return FuelEstimateRequest(**data)
    except ValidationError as e:
        logger.warning(f"Fuel request validation failed: {e}")
        raise ValidationError(f"Invalid request: {e}")
    except Exception as e:
        logger.error(f"Unexpected validation error: {e}")
        raise ValidationError("Request validation failed")

def validate_get_params(params: Dict[str, str]) -> GetFuelEstimateParams:
    """
    Validate GET parameters for fuel estimate endpoint
    
    Args:
        params: Query parameters
        
    Returns:
        Validated parameters
        
    Raises:
        ValidationError: If validation fails
    """
    try:
        return GetFuelEstimateParams(**params)
    except ValidationError as e:
        logger.warning(f"GET params validation failed: {e}")
        raise ValidationError(f"Invalid parameters: {e}")
    except Exception as e:
        logger.error(f"Unexpected validation error: {e}")
        raise ValidationError("Parameter validation failed")

def sanitize_input_string(value: str, max_length: int = 1000, allow_chars: str = r'\w\s\-_\.') -> str:
    """
    Sanitize string input by removing dangerous characters
    
    Args:
        value: Input string
        max_length: Maximum allowed length
        allow_chars: Regex character class for allowed characters
        
    Returns:
        Sanitized string
    """
    if not value:
        return ""
    
    # Remove dangerous characters
    pattern = f'[^{allow_chars}]'
    sanitized = re.sub(pattern, '', str(value).strip())
    
    # Clamp length
    return sanitized[:max_length]

def validate_array_size(array: List, max_size: int, name: str = "array") -> List:
    """
    Validate and clamp array size
    
    Args:
        array: Input array
        max_size: Maximum allowed size
        name: Array name for logging
        
    Returns:
        Clamped array
    """
    if not array:
        return array
    
    if len(array) > max_size:
        logger.warning(f"{name} size clamped from {len(array)} to {max_size}")
        return array[:max_size]
    
    return array

def create_error_response(status_code: int, message: str, details: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Create standardized error response
    
    Args:
        status_code: HTTP status code
        message: Error message
        details: Optional error details
        
    Returns:
        Error response dictionary
    """
    response = {
        "error": True,
        "status_code": status_code,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if details:
        response["details"] = details
    
    return response