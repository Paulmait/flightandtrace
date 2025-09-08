# Fuel Consumption and CO₂ Emissions Methodology

## Overview

FlightTrace estimates fuel consumption and CO₂ emissions for tracked flights using established aviation industry methodologies. Our calculations are based on ICAO (International Civil Aviation Organization) standards, aircraft performance data, and operational parameters derived from flight tracking data.

## Methodology Framework

### Data Sources and Standards

Our methodology is built upon:

1. **ICAO Carbon Emissions Calculator**: We reference the ICAO methodology as our baseline standard¹
2. **EUROCONTROL BADA (Base of Aircraft Data)**: Aircraft performance parameters²
3. **EASA Aircraft Type Database**: Aircraft specifications and engine data³
4. **Manufacturer Performance Data**: OEM fuel flow specifications where available

### Calculation Approach

#### 1. Aircraft Classification

Aircraft are classified into categories based on:
- **Maximum Takeoff Weight (MTOW)**
- **Engine Type** (turbofan, turboprop, piston)
- **Seating Configuration** (narrow-body, wide-body, regional)

**Classification Tiers:**
- **Light**: MTOW ≤ 5.7 tons
- **Regional**: 5.7 < MTOW ≤ 50 tons  
- **Narrow-body**: 50 < MTOW ≤ 140 tons
- **Wide-body**: MTOW > 140 tons

#### 2. Flight Phase Analysis

Fuel consumption is calculated separately for distinct flight phases:

**Ground Phase:**
- Auxiliary Power Unit (APU) usage
- Taxi fuel consumption
- Ground idle periods

**Takeoff Phase (0-3,000 ft):**
- Maximum power setting
- High fuel flow rates
- Duration: Typically 5-15 minutes

**Climb Phase (3,000 ft to cruise altitude):**
- Variable thrust settings
- Decreasing fuel flow with altitude
- Duration: Based on climb rate and target altitude

**Cruise Phase:**
- Steady-state fuel consumption
- Altitude and weight-dependent efficiency
- Majority of flight time

**Descent Phase (cruise to 3,000 ft):**
- Reduced thrust settings
- Lower fuel consumption
- Descent rate dependent

**Approach/Landing Phase (3,000 ft to ground):**
- Variable power settings
- Landing configuration drag
- Duration: Typically 10-20 minutes

#### 3. Baseline Fuel Consumption Rates

**Fuel Flow Baselines by Aircraft Class:**

| Aircraft Class | Cruise (kg/hr) | Climb (kg/hr) | Taxi (kg/hr) |
|----------------|----------------|---------------|--------------|
| Light          | 150-400        | 200-500       | 50-150       |
| Regional       | 400-800        | 600-1,200     | 100-300      |
| Narrow-body    | 800-2,000      | 1,200-3,000   | 200-600      |
| Wide-body      | 2,000-4,500    | 3,000-6,000   | 400-1,200    |

*Note: Ranges reflect variations in aircraft size, engine efficiency, and operational conditions*

#### 4. Operational Corrections

**Weight Corrections:**
- Fuel consumption scales with aircraft weight
- Passenger load factor estimation
- Cargo weight assumptions

**Environmental Corrections:**
- Wind speed and direction impact
- Temperature deviations from ISA
- Airport elevation corrections

**Operational Corrections:**
- Air Traffic Control delays
- Non-optimal routing
- Airport congestion factors

### CO₂ Emissions Calculation

#### Conversion Factors

**Jet Fuel (Jet A/A-1):**
- CO₂ emission factor: **3.16 kg CO₂/kg fuel**⁴
- Energy content: 43.15 MJ/kg
- Density: ~0.8 kg/L (temperature dependent)

**Aviation Gasoline (AvGas):**
- CO₂ emission factor: **3.10 kg CO₂/kg fuel**
- Used for light piston aircraft
- Energy content: 43.5 MJ/kg

#### Total Emissions Formula

```
Total CO₂ (kg) = Fuel Consumption (kg) × Emission Factor (kg CO₂/kg fuel)

Where:
Fuel Consumption = Σ(Phase Duration × Phase Fuel Flow × Correction Factors)
```

## Implementation Details

### Data Requirements

**Minimum Required Data:**
- Aircraft type (ICAO designation)
- Flight path coordinates
- Altitude profile
- Flight duration by phase
- Airport codes (origin/destination)

**Enhanced Data (when available):**
- Actual aircraft registration
- Weather conditions
- Air traffic control data
- Passenger/cargo loading

### Aircraft-Specific Parameters

**High-Confidence Aircraft (Tier 1):**
Aircraft with detailed performance data available
- Boeing 737 family
- Airbus A320 family
- Boeing 777/787
- Airbus A330/A350
- Regional jets (CRJ, ERJ families)

**Standard Model Aircraft (Tier 2):**
Aircraft using generic class-based parameters
- Less common commercial aircraft
- Military aircraft (where declassified)
- Older aircraft types

**Limited Data Aircraft (Tier 3):**
Aircraft using broad category estimates
- General aviation
- Experimental aircraft
- Aircraft without public performance data

### Calculation Example

**Sample Flight: Boeing 737-800 (ICAO: B738)**

**Flight Parameters:**
- Route: LAX to SFO (347 nm)
- Flight time: 1.25 hours
- Cruise altitude: 36,000 ft
- Aircraft weight: 70,000 kg (estimated)

**Phase Breakdown:**
- Taxi: 10 minutes @ 250 kg/hr = 42 kg
- Takeoff/Climb: 15 minutes @ 2,800 kg/hr = 700 kg
- Cruise: 50 minutes @ 1,600 kg/hr = 1,333 kg
- Descent/Land: 10 minutes @ 800 kg/hr = 133 kg

**Total Fuel Consumption:** 2,208 kg
**Total CO₂ Emissions:** 2,208 × 3.16 = **6,977 kg CO₂**

## Accuracy and Limitations

### Error Bounds and Confidence Intervals

**High-Confidence Estimates (±15-25%):**
- Common commercial aircraft
- Complete flight data available
- Optimal weather conditions

**Standard Estimates (±25-40%):**
- Generic aircraft parameters
- Limited operational data
- Standard weather assumptions

**Low-Confidence Estimates (±40-60%):**
- Rare aircraft types
- Incomplete flight tracking
- Adverse weather conditions

### Known Limitations

1. **Missing Operational Data**
   - Actual passenger/cargo weights
   - Real-time weather impact
   - ATC routing inefficiencies

2. **Aircraft Variability**
   - Engine variant differences
   - Aircraft age and maintenance status
   - Operator-specific configurations

3. **Flight Planning Assumptions**
   - Optimal flight paths assumed
   - Standard operating procedures
   - Ideal weather conditions

4. **Data Quality Dependencies**
   - ADS-B coverage gaps
   - Position reporting frequency
   - Altitude accuracy variations

### Validation and Benchmarking

**Industry Benchmarking:**
Our calculations are regularly compared against:
- ICAO Carbon Emissions Calculator results¹
- Airline sustainability reports
- Academic research publications
- Government emissions inventories

**Typical Variance from Industry Tools:**
- ICAO Calculator: ±20%
- Airline reported values: ±30%
- Other flight tracking services: ±25%

## Continuous Improvement

### Model Updates

**Quarterly Reviews:**
- Aircraft performance data updates
- New aircraft type additions
- Methodology refinements

**Annual Calibrations:**
- Industry data validation
- Academic research integration
- Regulatory standard updates

### Future Enhancements

**Planned Improvements:**
- Real-time weather integration
- Enhanced aircraft weight modeling
- Sustainable Aviation Fuel (SAF) tracking
- Contrail and non-CO₂ climate effects

## Usage in FlightTrace

### API Integration

Fuel and emissions data are available through:
- Flight details API endpoints
- Historical data queries
- Bulk export functions (Pro+ tiers)
- Analytics dashboard

### Data Presentation

**Emission Metrics Provided:**
- Total fuel consumption (kg)
- CO₂ emissions (kg and tons)
- Emissions per passenger (when load factor known)
- Emissions per nautical mile
- Phase-by-phase breakdown

**Comparative Context:**
- Average emissions for route
- Aircraft type efficiency ranking
- Industry benchmarks
- Environmental impact indicators

## References and Sources

1. **ICAO Carbon Emissions Calculator Methodology** (Version 11.2, 2023)  
   Available: [icao.int/environmental-protection](https://www.icao.int/environmental-protection/Carbonoffset/Pages/default.aspx)

2. **EUROCONTROL BADA Aircraft Performance Database** (Revision 3.15)  
   Available: [eurocontrol.int/publication/bada](https://www.eurocontrol.int/model/bada)

3. **EASA Aircraft Type Certificate Data Sheets**  
   Available: [easa.europa.eu/domains/aircraft/aircraft-certification](https://www.easa.europa.eu/domains/aircraft/aircraft-certification)

4. **IPCC Guidelines for National Greenhouse Gas Inventories** (2006, Volume 2, Chapter 3)  
   Available: [ipcc-nggip.iges.or.jp](https://www.ipcc-nggip.iges.or.jp/)

5. **FAA Aviation Environmental Design Tool (AEDT)** Technical Manual  
   Available: [faa.gov/about/office_org/headquarters_offices/apl/research](https://www.faa.gov/about/office_org/headquarters_offices/apl/research/)

6. **IEEE Standards for Aviation Environmental Metrics** (IEEE 2020.1)  
   Available: [ieee.org](https://standards.ieee.org/)

---

**Last Updated:** September 2025  
**Next Review:** December 2025  
**Methodology Version:** 2.1  

For technical questions about our emissions methodology, please contact: [emissions@flighttrace.com](mailto:emissions@flighttrace.com)

For general inquiries about environmental features, see our [FAQ](../faq.md#environmental-impact-calculations).