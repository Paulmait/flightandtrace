/**
 * Flight Emissions Calculator
 * Based on ICAO methodology and industry standards
 * Calculates fuel consumption and CO₂ emissions for tracked flights
 */

// Aircraft classifications with typical fuel consumption rates (kg/hr)
const AIRCRAFT_DATA = {
  // Wide-body aircraft
  'A388': { class: 'wide', cruise: 12000, climb: 15000, taxi: 1000, seats: 555 }, // A380
  'B77W': { class: 'wide', cruise: 7500, climb: 9500, taxi: 800, seats: 396 },   // B777-300ER
  'B789': { class: 'wide', cruise: 5400, climb: 7000, taxi: 600, seats: 296 },   // B787-9
  'A359': { class: 'wide', cruise: 5800, climb: 7500, taxi: 650, seats: 315 },   // A350-900
  'A333': { class: 'wide', cruise: 5100, climb: 6800, taxi: 550, seats: 277 },   // A330-300
  'B744': { class: 'wide', cruise: 10800, climb: 13500, taxi: 900, seats: 416 }, // B747-400
  'A346': { class: 'wide', cruise: 6800, climb: 8500, taxi: 700, seats: 380 },   // A340-600
  
  // Narrow-body aircraft
  'A320': { class: 'narrow', cruise: 2300, climb: 3200, taxi: 350, seats: 150 },
  'A321': { class: 'narrow', cruise: 2600, climb: 3500, taxi: 380, seats: 185 },
  'A319': { class: 'narrow', cruise: 2100, climb: 2900, taxi: 320, seats: 124 },
  'B738': { class: 'narrow', cruise: 2400, climb: 3300, taxi: 360, seats: 162 },
  'B737': { class: 'narrow', cruise: 2200, climb: 3100, taxi: 340, seats: 149 },
  'B739': { class: 'narrow', cruise: 2500, climb: 3400, taxi: 370, seats: 178 },
  'B752': { class: 'narrow', cruise: 3200, climb: 4200, taxi: 450, seats: 200 },
  
  // Regional jets
  'CRJ9': { class: 'regional', cruise: 1100, climb: 1600, taxi: 200, seats: 90 },
  'E190': { class: 'regional', cruise: 1300, climb: 1800, taxi: 250, seats: 100 },
  'DH8D': { class: 'regional', cruise: 800, climb: 1100, taxi: 180, seats: 78 },
  'AT76': { class: 'regional', cruise: 700, climb: 950, taxi: 160, seats: 74 },
  
  // Light aircraft
  'C172': { class: 'light', cruise: 35, climb: 45, taxi: 15, seats: 4 },
  'BE20': { class: 'light', cruise: 180, climb: 250, taxi: 60, seats: 13 },
  'C208': { class: 'light', cruise: 140, climb: 190, taxi: 50, seats: 14 },
  
  // Default values by class
  'DEFAULT_WIDE': { class: 'wide', cruise: 6000, climb: 8000, taxi: 700, seats: 350 },
  'DEFAULT_NARROW': { class: 'narrow', cruise: 2400, climb: 3300, taxi: 350, seats: 160 },
  'DEFAULT_REGIONAL': { class: 'regional', cruise: 1000, climb: 1400, taxi: 200, seats: 80 },
  'DEFAULT_LIGHT': { class: 'light', cruise: 150, climb: 200, taxi: 40, seats: 8 }
};

// CO₂ emission factors
const EMISSION_FACTORS = {
  JET_FUEL: 3.16,  // kg CO₂ per kg fuel (Jet A/A-1)
  AVGAS: 3.10      // kg CO₂ per kg fuel (Aviation Gasoline)
};

// Flight phase durations (typical)
const PHASE_DURATIONS = {
  TAXI: 10,      // minutes
  TAKEOFF: 5,    // minutes
  CLIMB: 15,     // minutes (varies with cruise altitude)
  DESCENT: 20,   // minutes
  APPROACH: 10   // minutes
};

/**
 * Get aircraft data by ICAO type code
 */
function getAircraftData(icaoType) {
  if (!icaoType) return AIRCRAFT_DATA.DEFAULT_NARROW;
  
  // Try exact match first
  if (AIRCRAFT_DATA[icaoType]) {
    return AIRCRAFT_DATA[icaoType];
  }
  
  // Try to determine class from ICAO code patterns
  const code = icaoType.toUpperCase();
  
  // Wide-body patterns
  if (code.startsWith('A38') || code.startsWith('A34') || code.startsWith('A35') ||
      code.startsWith('A33') || code.startsWith('B74') || code.startsWith('B77') ||
      code.startsWith('B78')) {
    return AIRCRAFT_DATA.DEFAULT_WIDE;
  }
  
  // Narrow-body patterns
  if (code.startsWith('A32') || code.startsWith('A31') || code.startsWith('B73') ||
      code.startsWith('B75')) {
    return AIRCRAFT_DATA.DEFAULT_NARROW;
  }
  
  // Regional patterns
  if (code.startsWith('CRJ') || code.startsWith('E1') || code.startsWith('E2') ||
      code.startsWith('DH8') || code.startsWith('AT')) {
    return AIRCRAFT_DATA.DEFAULT_REGIONAL;
  }
  
  // Light aircraft patterns
  if (code.startsWith('C1') || code.startsWith('C2') || code.startsWith('BE') ||
      code.startsWith('PA')) {
    return AIRCRAFT_DATA.DEFAULT_LIGHT;
  }
  
  // Default to narrow-body
  return AIRCRAFT_DATA.DEFAULT_NARROW;
}

/**
 * Calculate great circle distance between two points
 * Currently unused but kept for future route calculations
 */
// eslint-disable-next-line no-unused-vars
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Estimate flight duration based on distance and aircraft type
 */
function estimateFlightDuration(distance, aircraftClass) {
  // Average cruise speeds by class (km/h)
  const cruiseSpeeds = {
    wide: 900,
    narrow: 850,
    regional: 700,
    light: 350
  };
  
  const cruiseSpeed = cruiseSpeeds[aircraftClass] || 800;
  const cruiseTime = (distance / cruiseSpeed) * 60; // minutes
  
  // Add taxi, climb, descent times
  const totalTime = cruiseTime + PHASE_DURATIONS.TAXI + PHASE_DURATIONS.TAKEOFF +
                   PHASE_DURATIONS.CLIMB + PHASE_DURATIONS.DESCENT + PHASE_DURATIONS.APPROACH;
  
  return {
    total: totalTime,
    cruise: cruiseTime,
    taxi: PHASE_DURATIONS.TAXI,
    climb: PHASE_DURATIONS.CLIMB,
    descent: PHASE_DURATIONS.DESCENT + PHASE_DURATIONS.APPROACH
  };
}

/**
 * Calculate fuel consumption for a flight
 */
export function calculateFuelConsumption(flight) {
  if (!flight || !flight.position) return null;
  
  // Get aircraft data
  const aircraft = getAircraftData(flight.icao24?.substring(0, 4));
  
  // Estimate flight parameters
  const altitude = flight.position.altitude || 0;
  const speed = flight.position.groundSpeed || 0;
  const onGround = flight.onGround || altitude < 1000;
  
  // Calculate instantaneous fuel flow based on phase
  let fuelFlow = 0; // kg/hr
  
  if (onGround) {
    fuelFlow = aircraft.taxi;
  } else if (altitude < 10000) {
    // Climbing or descending
    const climbRate = flight.position.verticalRate || 0;
    if (climbRate > 100) {
      fuelFlow = aircraft.climb;
    } else if (climbRate < -100) {
      fuelFlow = aircraft.cruise * 0.5; // Descent uses less fuel
    } else {
      fuelFlow = aircraft.cruise * 0.8; // Low altitude cruise
    }
  } else {
    // Cruise
    fuelFlow = aircraft.cruise;
    
    // Altitude correction (higher = more efficient)
    if (altitude > 35000) {
      fuelFlow *= 0.95;
    } else if (altitude > 40000) {
      fuelFlow *= 0.92;
    }
    
    // Speed-based correction (optimal cruise speed varies by aircraft)
    const optimalSpeed = aircraft.class === 'wide' ? 480 : 
                        aircraft.class === 'narrow' ? 450 : 
                        aircraft.class === 'regional' ? 380 : 280;
    
    if (speed > 0) {
      const speedRatio = speed / optimalSpeed;
      if (speedRatio < 0.8) {
        // Too slow - less efficient
        fuelFlow *= 1.15;
      } else if (speedRatio > 1.2) {
        // Too fast - much less efficient (drag increases with square of speed)
        fuelFlow *= 1.25;
      } else if (speedRatio > 1.1) {
        // Slightly fast
        fuelFlow *= 1.1;
      }
      // Optimal speed range (0.8-1.1) uses baseline fuel flow
    }
  }
  
  // Weight correction (estimate based on typical load factor)
  const loadFactor = 0.82; // Industry average
  fuelFlow *= (0.7 + 0.3 * loadFactor);
  
  return {
    instantaneous: fuelFlow, // kg/hr
    perMinute: fuelFlow / 60,
    aircraft: aircraft.class,
    phase: onGround ? 'ground' : altitude < 10000 ? 'climb/descent' : 'cruise'
  };
}

/**
 * Calculate CO₂ emissions from fuel consumption
 */
export function calculateEmissions(fuelKg, aircraftClass = 'narrow') {
  // Use jet fuel factor for jets, avgas for light aircraft
  const emissionFactor = aircraftClass === 'light' ? 
    EMISSION_FACTORS.AVGAS : EMISSION_FACTORS.JET_FUEL;
  
  const co2Kg = fuelKg * emissionFactor;
  
  return {
    co2Kg: Math.round(co2Kg),
    co2Tons: (co2Kg / 1000).toFixed(2),
    co2Pounds: Math.round(co2Kg * 2.20462),
    treesNeeded: Math.round(co2Kg / 21), // One tree absorbs ~21kg CO₂/year
    carEquivalent: (co2Kg / 0.12).toFixed(0) // Average car emits 0.12kg CO₂/km
  };
}

/**
 * Estimate total trip emissions
 */
export function estimateTripEmissions(origin, destination, aircraftType) {
  if (!origin || !destination) return null;
  
  // Calculate distance (would need actual coordinates)
  // For now, use a placeholder
  const distance = 1000; // km
  
  const aircraft = getAircraftData(aircraftType);
  const duration = estimateFlightDuration(distance, aircraft.class);
  
  // Calculate fuel for each phase
  const fuelConsumption = {
    taxi: (aircraft.taxi * duration.taxi) / 60,
    climb: (aircraft.climb * duration.climb) / 60,
    cruise: (aircraft.cruise * duration.cruise) / 60,
    descent: (aircraft.cruise * 0.5 * duration.descent) / 60
  };
  
  const totalFuel = Object.values(fuelConsumption).reduce((a, b) => a + b, 0);
  const emissions = calculateEmissions(totalFuel, aircraft.class);
  
  // Per passenger calculations
  const perPassenger = {
    fuelKg: (totalFuel / aircraft.seats).toFixed(1),
    co2Kg: (emissions.co2Kg / aircraft.seats).toFixed(1)
  };
  
  return {
    distance,
    duration: duration.total,
    fuel: {
      total: Math.round(totalFuel),
      breakdown: fuelConsumption
    },
    emissions,
    perPassenger,
    aircraft: {
      type: aircraftType,
      class: aircraft.class,
      seats: aircraft.seats
    }
  };
}

/**
 * Format emissions for display
 */
export function formatEmissions(emissions) {
  if (!emissions) return 'N/A';
  
  if (emissions.co2Tons >= 1) {
    return `${emissions.co2Tons} tons CO₂`;
  } else {
    return `${emissions.co2Kg} kg CO₂`;
  }
}

/**
 * Get emissions context (comparisons)
 */
export function getEmissionsContext(co2Kg) {
  return {
    trees: `${Math.round(co2Kg / 21)} trees needed to offset (1 year)`,
    car: `Equal to driving ${(co2Kg / 0.12).toFixed(0)} km by car`,
    home: `${(co2Kg / 20).toFixed(1)} days of home energy use`,
    smartphones: `Charging ${Math.round(co2Kg / 0.008)} smartphones`
  };
}

/**
 * Calculate real-time emission rate
 */
export function getEmissionRate(flight) {
  const fuel = calculateFuelConsumption(flight);
  if (!fuel) return null;
  
  const co2PerHour = fuel.instantaneous * EMISSION_FACTORS.JET_FUEL;
  const co2PerMinute = co2PerHour / 60;
  const co2PerSecond = co2PerMinute / 60;
  
  return {
    perHour: co2PerHour.toFixed(0),
    perMinute: co2PerMinute.toFixed(1),
    perSecond: co2PerSecond.toFixed(2),
    phase: fuel.phase,
    aircraftClass: fuel.aircraft
  };
}

// Export default object
const emissionsCalculator = {
  calculateFuelConsumption,
  calculateEmissions,
  estimateTripEmissions,
  formatEmissions,
  getEmissionsContext,
  getEmissionRate
};

export default emissionsCalculator;