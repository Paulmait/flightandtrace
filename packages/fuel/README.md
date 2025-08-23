# FlightTrace Fuel Estimation Module

Accurate fuel and CO₂ emission calculations for commercial aviation using phase-based burn rates and robust phase detection.

## Overview

The fuel estimation module provides:
- **Phase Detection**: Robust altitude-based flight phase identification with noise filtering
- **Aircraft-Specific Rates**: Conservative burn rates for 30+ aircraft types
- **Confidence Scoring**: High/Medium/Low confidence based on aircraft match quality
- **Unit Conversions**: kg/L/gal fuel, CO₂ emissions, efficiency metrics

## Core Formulas

### Fuel Calculations
```
fuel_kg = Σ(burn_rate_kg_hr × phase_duration_hr)
fuel_liters = fuel_kg / JET_A_DENSITY_KG_PER_L (0.8)
fuel_gallons = fuel_liters × GALLONS_PER_LITER (0.264172)
```

### Emissions
```
co2_kg = fuel_kg × CO2_PER_KG_FUEL (3.16)
```

### Efficiency
```
fuel_per_nm = fuel_kg / distance_nm
efficiency_mpg = (distance_nm × 1.15078) / fuel_gallons
```

## Confidence Levels

| Level | Description | Example |
|-------|-------------|---------|
| **HIGH** | Exact aircraft subtype matched | B737-800 → B737-800 rates |
| **MEDIUM** | ICAO family matched | B738 → B737-800 rates |
| **LOW** | Generic fallback used | Unknown → narrowbody rates |

## Phase Detection Algorithm

### Smoothing
- **Rolling Median**: 30-60s window to filter noise
- **Micro-leveling**: Allow ±250ft deviations in cruise
- **Merge Threshold**: Combine phases < 2 minutes

### Phase Classification
```
TAXI: altitude < 500 ft
CLIMB: vertical_speed > 300 fpm
CRUISE: altitude > 18,000 ft, |vs| < 300 fpm  
DESCENT: vertical_speed < -300 fpm
```

### Fallback Rules
- Missing taxi → start from climb
- Missing descent → end at cruise
- Gaps → fill with cruise/previous phase

## Aircraft Burn Rates

### Rate Structure (kg/hour)
```json
{
  "B737-800": {
    "taxi": 600,
    "climb": 4600,
    "cruise": 2450,
    "descent": 1200,
    "sourceHint": "public spec midpoint"
  }
}
```

### Fallback Multipliers
When phase data missing:
- **Climb**: cruise × 1.8
- **Descent**: cruise × 0.5  
- **Taxi**: min(cruise × 0.25, category_limit)

### Category Limits
- **Narrowbody**: 600 kg/hr taxi limit
- **Widebody**: 1000 kg/hr taxi limit
- **Regional**: 350 kg/hr taxi limit
- **Turboprop**: 200 kg/hr taxi limit

## Remote Override JSON Schema

```json
{
  "rates": {
    "AIRCRAFT-TYPE": {
      "taxi": number,
      "climb": number,
      "cruise": number,
      "descent": number,
      "sourceHint": "string"
    }
  },
  "families": {
    "ICAO_CODE": "AIRCRAFT-TYPE"
  }
}
```

### Override Sources
1. **Local File**: `FUEL_RATES_OVERRIDE` environment variable
2. **Remote URL**: Set `FUEL_RATES_OVERRIDE` to https:// URL
3. **Constructor**: Pass path/URL to `EnhancedFuelEstimator()`

## API Usage

### Basic Estimation
```python
from src.core.fuel_estimation_v2 import EnhancedFuelEstimator

estimator = EnhancedFuelEstimator()

# Altitude samples: (timestamp, altitude_ft)
samples = [
    (datetime(2024, 1, 1, 10, 0), 0),
    (datetime(2024, 1, 1, 10, 30), 35000),
    (datetime(2024, 1, 1, 12, 0), 35000),
    (datetime(2024, 1, 1, 12, 30), 0)
]

estimate = estimator.estimate_fuel(
    flight_id="FL123",
    aircraft_type="B737-800",
    altitude_samples=samples,
    distance_nm=500
)

print(f"Fuel: {estimate.fuel_kg:.1f} kg")
print(f"CO₂: {estimate.co2_kg:.1f} kg")
print(f"Confidence: {estimate.confidence.value}")
```

### With Remote Override
```python
estimator = EnhancedFuelEstimator(
    override_table="https://api.example.com/burn-rates.json"
)
```

## REST API Endpoints

### GET `/api/fuel/estimate`
Query parameter based estimation:
```
GET /api/fuel/estimate?flightId=FL123&aircraftType=B738
```

### POST `/api/fuel/estimate`
Body parameter based estimation:
```json
{
  "flight_id": "FL123",
  "aircraft_type": "B737-800",
  "altitude_series": [
    {"timestamp": "2024-01-01T10:00:00Z", "altitude": 0},
    {"timestamp": "2024-01-01T10:30:00Z", "altitude": 35000}
  ],
  "distance_nm": 500
}
```

### Response Format
```json
{
  "fuelKg": 2450.5,
  "fuelL": 3063.1,
  "fuelGal": 809.0,
  "co2Kg": 7743.6,
  "confidence": "high",
  "assumptions": {
    "aircraftKey": "B737-800",
    "density": 0.8,
    "co2Factor": 3.16,
    "tableSource": "local",
    "phaseDurations": {
      "cruise": 5400,
      "climb": 1200,
      "descent": 900
    },
    "ratesUsed": {
      "cruise": 2450,
      "climb": 4600,
      "descent": 1200
    },
    "sourceHint": "public spec midpoint"
  }
}
```

## Testing

### Unit Tests
```bash
pytest backend/tests/test_fuel_estimation_v2.py -v
```

Coverage requirements: ≥85%

### Test Categories
- **Perfect Profiles**: Textbook flights with ideal phase transitions
- **Noisy Data**: Real-world altitude variations and micro-leveling
- **Edge Cases**: Short hops, unknown aircraft, partial data
- **Property Tests**: Monotonic behavior, conservation laws
- **Performance**: O(n) complexity verification

### Key Test Scenarios
```python
# Textbook flight: taxi 10m, climb 20m, cruise 1h, descent 15m
# Noisy cruise: ±250 ft wiggles should remain cruise
# Short hop: no clear cruise phase
# Unknown aircraft: narrowbody fallback, LOW confidence
# Remote override: custom rates merge correctly
```

## Performance Requirements

- **Complexity**: O(n) over altitude samples
- **Memory**: < 10MB for 10,000 samples  
- **Speed**: < 100ms for 1000 altitude points
- **Precomputation**: Rolling medians avoid allocation in loops

## Production Considerations

### Environment Variables
```bash
# Optional remote burn rates
FUEL_RATES_OVERRIDE=https://config.example.com/rates.json

# Feature flag control
FUEL_ESTIMATES_ENABLED=true
```

### Monitoring Metrics
- Estimation request rate
- Confidence level distribution
- Phase detection accuracy
- API response times
- Override table load status

### Error Handling
- Graceful fallbacks for missing data
- Conservative estimates when uncertain
- Detailed logging for debugging
- Telemetry for production monitoring

## Aircraft Coverage

### Narrowbody (13 types)
B737-700, B737-800, B737-MAX-8, A319, A320-214, A320-251N, A321, E170, E190, CRJ-700, CRJ-900

### Widebody (10 types)  
B767-300ER, B777-200ER, B777-300ER, B787-8, B787-9, B787-10, A330-200, A330-300, A350-900, A350-1000

### Regional Turboprops (2 types)
ATR-72-600, Q400 (Dash 8-400)

### ICAO Mappings (20+ codes)
B738→B737-800, A20N→A320-251N, B789→B787-9, etc.

Total coverage: **25+ specific aircraft + 20+ ICAO mappings + 4 fallback categories**

## Validation

All burn rates sourced from publicly available specifications with conservative midpoint values. Each aircraft entry includes `sourceHint` for traceability.

**Note**: For navigation use, this system provides estimates only. Actual fuel consumption varies based on weather, weight, routing, and operational factors not modeled here.
## Environment Setup

### Development Environment
```bash
# Install dependencies
npm install

# Run tests with coverage
npm test

# Run tests in watch mode
npm run test:watch
```

### Production Environment Variables
```bash
# Enable fuel estimation feature
FUEL_ESTIMATES_ENABLED=true

# Optional remote burn rates override
FUEL_RATES_OVERRIDE=https://config.example.com/rates.json

# API rate limiting (requests per minute)
API_RATE_LIMIT=60

# Database connection
DATABASE_URL=postgresql://user:pass@localhost/flighttrace

# Redis for rate limiting (optional)
REDIS_URL=redis://localhost:6379
```

### Docker Production Setup
```dockerfile
# Add to Dockerfile
ENV FUEL_ESTIMATES_ENABLED=true
ENV API_RATE_LIMIT=100
ENV REDIS_URL=redis://redis-service:6379
```

### Security Configuration
```bash
# Production logging level
LOG_LEVEL=INFO

# Enable DDoS protection
DDOS_PROTECTION_ENABLED=true

# Rate limit per IP/user
RATE_LIMIT_PER_IP=50
RATE_LIMIT_PER_USER=100
```

## Quick Start

### Basic Usage
```typescript
import { EnhancedFuelEstimator } from './fuel-estimator';

const estimator = new EnhancedFuelEstimator();

const estimate = await estimator.estimateFuel({
  flightId: 'FL123',
  aircraftType: 'B737-800',
  altitudeSamples: [
    { timestamp: '2024-01-01T10:00:00Z', altitude: 0 },
    { timestamp: '2024-01-01T10:30:00Z', altitude: 35000 },
    { timestamp: '2024-01-01T12:00:00Z', altitude: 35000 },
    { timestamp: '2024-01-01T12:30:00Z', altitude: 0 }
  ],
  distanceNm: 500
});

console.log(`Fuel: ${estimate.fuelKg} kg`);
console.log(`CO₂: ${estimate.co2Kg} kg`);
console.log(`Confidence: ${estimate.confidence}`);
```

### API Integration
```bash
# Test endpoint
curl -X GET 'http://localhost:8000/api/fuel/estimate?flightId=FL123&aircraftType=B738'

# Expected response
{
  "fuelKg": 2450.5,
  "fuelL": 3063.1,
  "fuelGal": 809.0,
  "co2Kg": 7743.6,
  "confidence": "medium"
}
```

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test fuel-estimator.test.ts
```

### Integration Tests
```bash
# Test API endpoints
python backend/test_api_simple.py

# Test phase detection
python backend/test_phase_stability.py

# Test fallback behavior
python backend/test_aircraft_fallback.py
```

### E2E Tests
```bash
# Run end-to-end tests
npm run test:e2e

# Run accessibility checks
npm run test:a11y
```

