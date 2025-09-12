// Import cache manager with fallback
let cacheManager;
try {
  const cache = await import('./lib/cache.js');
  cacheManager = cache.default;
} catch (e) {
  // Cache not available, will work without it
  cacheManager = null;
}

// Import OpenSky OAuth2 authentication
import { fetchWithAuth } from './lib/opensky-auth.js';

// Helper function to transform OpenSky data
function transformFlights(states) {
  if (!states || !Array.isArray(states)) return [];
  
  return states.map(state => ({
    id: state[0], // icao24
    callsign: state[1]?.trim() || null,
    icao24: state[0],
    position: {
      latitude: state[6],
      longitude: state[5],
      altitude: state[13] ? state[13] * 3.28084 : state[7], // Convert meters to feet
      heading: state[10] || 0,
      groundSpeed: state[9] ? state[9] * 1.94384 : 0, // m/s to knots
      verticalRate: state[11] || 0
    },
    origin: state[2],
    onGround: state[8],
    lastUpdate: state[3] || state[4],
    status: state[8] ? 'ON_GROUND' : 'EN_ROUTE'
  })).filter(f => f.position.latitude && f.position.longitude);
}

export default async function handler(req, res) {
  // Enable CORS - keep backward compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse query parameters
    let lamin, lomin, lamax, lomax;
    
    if (req.query.lat && req.query.lon && req.query.radius) {
      // Convert lat/lon/radius to bounding box
      const lat = parseFloat(req.query.lat);
      const lon = parseFloat(req.query.lon);
      const radius = parseFloat(req.query.radius) || 50;
      
      // Rough conversion: 1 degree latitude = ~111km
      const latDelta = radius / 111;
      const lonDelta = radius / (111 * Math.cos(lat * Math.PI / 180));
      
      lamin = lat - latDelta;
      lamax = lat + latDelta;
      lomin = lon - lonDelta;
      lomax = lon + lonDelta;
    } else if (req.query.bbox) {
      // Use provided bbox - handle both formats
      const bboxParts = req.query.bbox.split(',').map(Number);
      if (bboxParts.length === 4) {
        // Check if it's lon,lat,lon,lat format (common in mapping libraries)
        // by checking if the first and third values are similar (longitudes)
        // and second and fourth are similar (latitudes)
        const [a, b, c, d] = bboxParts;
        
        // If looks like minLon,minLat,maxLon,maxLat format
        if (Math.abs(a - c) > Math.abs(b - d)) {
          // Frontend format: minLon,minLat,maxLon,maxLat
          lomin = a;
          lamin = b;
          lomax = c;
          lamax = d;
        } else {
          // OpenSky format: lamin,lomin,lamax,lomax
          lamin = a;
          lomin = b;
          lamax = c;
          lomax = d;
        }
      }
    } else {
      // Default to Europe
      [lamin, lomin, lamax, lomax] = [-10, 40, 10, 60];
    }
    
    // Try cache first if available
    let cachedData = null;
    const cacheKey = `flights:${lamin},${lomin},${lamax},${lomax}`;
    
    if (cacheManager) {
      try {
        cachedData = await cacheManager.get(cacheKey);
        if (cachedData && cachedData.flights) {
          return res.status(200).json({
            ...cachedData,
            cached: true,
            timestamp: new Date().toISOString()
          });
        }
      } catch (e) {
        // Cache error, continue without cache
      }
    }
    
    // OpenSky Network API endpoint
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    // Use OAuth2 authentication or fall back to anonymous access
    const response = await fetchWithAuth(url);

    if (!response.ok) {
      throw new Error(`OpenSky API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform OpenSky data to our format
    const flights = transformFlights(data.states || []);
    
    const result = {
      success: true,
      count: flights.length,
      flights,
      timestamp: new Date().toISOString(),
      note: process.env.OPENSKY_CLIENT_ID ? 'Using OAuth2 authentication' : 'Using anonymous access'
    };
    
    // Cache result if available
    if (cacheManager && flights.length > 0) {
      try {
        await cacheManager.set(cacheKey, result, 30);
      } catch (e) {
        // Cache error, continue
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Flight API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      flights: []
    });
  }
}