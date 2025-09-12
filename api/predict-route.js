// Route Prediction API using Machine Learning-like algorithms
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { 
      icao24,
      currentLat,
      currentLon,
      altitude,
      heading,
      speed,
      callsign
    } = req.query;
    
    if (!currentLat || !currentLon) {
      return res.status(400).json({
        success: false,
        error: 'Current position (lat, lon) is required'
      });
    }
    
    const lat = parseFloat(currentLat);
    const lon = parseFloat(currentLon);
    const alt = parseFloat(altitude) || 35000;
    const hdg = parseFloat(heading) || 0;
    const spd = parseFloat(speed) || 450;
    
    // Predict route based on current trajectory and common flight patterns
    const prediction = await predictRoute({
      lat, lon, alt, hdg, spd, callsign, icao24
    });
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      prediction
    });
    
  } catch (error) {
    console.error('Route prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Main route prediction function
async function predictRoute({ lat, lon, alt, hdg, spd, callsign, icao24 }) {
  // Major airports database (simplified)
  const airports = [
    { code: 'JFK', lat: 40.6413, lon: -73.7781, name: 'New York JFK' },
    { code: 'LAX', lat: 33.9425, lon: -118.4081, name: 'Los Angeles' },
    { code: 'LHR', lat: 51.4700, lon: -0.4543, name: 'London Heathrow' },
    { code: 'CDG', lat: 49.0097, lon: 2.5479, name: 'Paris CDG' },
    { code: 'FRA', lat: 50.0379, lon: 8.5622, name: 'Frankfurt' },
    { code: 'AMS', lat: 52.3105, lon: 4.7683, name: 'Amsterdam' },
    { code: 'DXB', lat: 25.2532, lon: 55.3657, name: 'Dubai' },
    { code: 'SIN', lat: 1.3644, lon: 103.9915, name: 'Singapore' },
    { code: 'HND', lat: 35.5494, lon: 139.7798, name: 'Tokyo Haneda' },
    { code: 'SYD', lat: -33.9399, lon: 151.1753, name: 'Sydney' },
    { code: 'ORD', lat: 41.9742, lon: -87.9073, name: 'Chicago' },
    { code: 'ATL', lat: 33.6407, lon: -84.4277, name: 'Atlanta' },
    { code: 'DFW', lat: 32.8998, lon: -97.0403, name: 'Dallas' },
    { code: 'MAD', lat: 40.4983, lon: -3.5676, name: 'Madrid' },
    { code: 'BCN', lat: 41.2974, lon: 2.0833, name: 'Barcelona' },
    { code: 'MUC', lat: 48.3537, lon: 11.7750, name: 'Munich' },
    { code: 'FCO', lat: 41.8003, lon: 12.2389, name: 'Rome' },
    { code: 'IST', lat: 41.2753, lon: 28.7519, name: 'Istanbul' }
  ];
  
  // Flight phase detection
  const flightPhase = detectFlightPhase(alt, spd);
  
  // Predict destination based on heading and great circle routes
  const possibleDestinations = airports.map(airport => {
    const distance = calculateDistance(lat, lon, airport.lat, airport.lon);
    const bearing = calculateBearing(lat, lon, airport.lat, airport.lon);
    const headingDiff = Math.abs(normalizeAngle(hdg - bearing));
    
    // Score based on heading alignment and distance
    let score = 0;
    
    // Heading alignment (most important)
    if (headingDiff < 10) score += 100;
    else if (headingDiff < 20) score += 80;
    else if (headingDiff < 30) score += 60;
    else if (headingDiff < 45) score += 40;
    else if (headingDiff < 60) score += 20;
    
    // Distance factor (prefer reasonable distances)
    if (distance > 500 && distance < 5000) {
      score += 50 * (1 - Math.abs(distance - 2000) / 3000);
    }
    
    // Phase alignment
    if (flightPhase === 'cruise' && distance > 1000) score += 30;
    if (flightPhase === 'descent' && distance < 500) score += 50;
    if (flightPhase === 'climb' && distance > 2000) score += 30;
    
    return {
      airport,
      distance,
      bearing,
      headingDiff,
      score,
      estimatedTimeMinutes: Math.round(distance / (spd / 60))
    };
  }).filter(d => d.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  
  // Generate predicted path
  const primaryDestination = possibleDestinations[0];
  let predictedPath = [];
  let remainingRoute = [];
  
  if (primaryDestination) {
    // Generate waypoints along great circle route
    const numWaypoints = Math.min(10, Math.floor(primaryDestination.distance / 100));
    predictedPath = generateGreatCirclePath(
      lat, lon, 
      primaryDestination.airport.lat, 
      primaryDestination.airport.lon, 
      numWaypoints
    );
    
    // Calculate remaining route
    remainingRoute = predictedPath.map((point, index) => ({
      ...point,
      estimatedTime: new Date(Date.now() + (index + 1) * 5 * 60000).toISOString(),
      altitude: calculateAltitudeProfile(
        alt, 
        flightPhase, 
        index / numWaypoints,
        primaryDestination.distance
      )
    }));
  }
  
  // Historical pattern analysis (simplified)
  const commonRoutes = analyzeCommonRoutes(callsign, lat, lon);
  
  return {
    currentPosition: { lat, lon, altitude: alt },
    flightPhase,
    heading: hdg,
    speed: spd,
    possibleDestinations: possibleDestinations.map(d => ({
      airport: d.airport.code,
      name: d.airport.name,
      coordinates: { lat: d.airport.lat, lon: d.airport.lon },
      distance: Math.round(d.distance),
      estimatedTime: d.estimatedTimeMinutes,
      probability: Math.round(d.score) + '%',
      bearing: Math.round(d.bearing)
    })),
    predictedPath,
    remainingRoute,
    confidence: possibleDestinations[0] ? Math.min(95, Math.round(possibleDestinations[0].score)) : 0,
    commonRoutes,
    analysis: {
      method: 'trajectory-based',
      factors: [
        'Current heading alignment',
        'Great circle route calculation',
        'Flight phase detection',
        'Historical patterns',
        'Distance optimization'
      ]
    }
  };
}

// Helper functions
function detectFlightPhase(altitude, speed) {
  if (altitude < 10000) {
    return speed < 250 ? 'approach' : 'climb';
  } else if (altitude < 28000) {
    return 'climb';
  } else if (altitude > 28000) {
    return 'cruise';
  } else if (speed < 300) {
    return 'descent';
  }
  return 'cruise';
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

function normalizeAngle(angle) {
  angle = angle % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return Math.abs(angle);
}

function generateGreatCirclePath(lat1, lon1, lat2, lon2, numPoints) {
  const points = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    
    // Convert to radians
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const λ1 = lon1 * Math.PI / 180;
    const λ2 = lon2 * Math.PI / 180;
    
    // Calculate intermediate point
    const d = Math.acos(Math.sin(φ1) * Math.sin(φ2) + 
              Math.cos(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1));
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    
    const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λi = Math.atan2(y, x);
    
    points.push({
      lat: φi * 180 / Math.PI,
      lon: λi * 180 / Math.PI,
      progress: f
    });
  }
  
  return points;
}

function calculateAltitudeProfile(currentAlt, phase, progress, distance) {
  if (phase === 'cruise') {
    return currentAlt;
  } else if (phase === 'climb') {
    return Math.min(38000, currentAlt + (progress * 10000));
  } else if (phase === 'descent' || (distance < 200 && progress > 0.7)) {
    return Math.max(0, currentAlt * (1 - progress * 0.8));
  }
  return currentAlt;
}

function analyzeCommonRoutes(callsign, lat, lon) {
  // Simplified pattern matching based on airline codes
  if (!callsign) return [];
  
  const airline = callsign.substring(0, 3);
  const commonPatterns = {
    'BAW': ['LHR-JFK', 'LHR-LAX', 'LHR-ORD'], // British Airways
    'AAL': ['DFW-LHR', 'JFK-LAX', 'ORD-DFW'], // American Airlines
    'UAL': ['ORD-LHR', 'SFO-HND', 'LAX-SYD'], // United Airlines
    'DLH': ['FRA-JFK', 'MUC-ORD', 'FRA-LAX'], // Lufthansa
    'AFR': ['CDG-JFK', 'CDG-LAX', 'CDG-ATL'], // Air France
    'EZY': ['LHR-BCN', 'LHR-MAD', 'LHR-FCO'], // easyJet
    'RYR': ['STN-BCN', 'STN-MAD', 'DUB-FCO']  // Ryanair
  };
  
  return commonPatterns[airline] || [];
}