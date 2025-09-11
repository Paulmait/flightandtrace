// Import cache manager with fallback
let cacheManager;
try {
  const cache = await import('./lib/cache.js');
  cacheManager = cache.default;
} catch (e) {
  // Cache not available, will work without it
  cacheManager = null;
}

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
    const { bbox = '-10,40,10,60' } = req.query; // Default to Europe
    
    // Try cache first if available
    let cachedData = null;
    const cacheKey = `flights:${bbox}`;
    
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
    
    const [lamin, lomin, lamax, lomax] = bbox.split(',').map(Number);
    
    // OpenSky Network API endpoint
    const username = process.env.OPENSKY_USERNAME;
    const password = process.env.OPENSKY_PASSWORD;
    
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    // Use authentication if credentials are provided and valid
    const headers = {};
    let authUsed = false;
    
    if (username && password && username !== 'your_username' && !username.includes('your_')) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
      authUsed = true;
    }
    
    const response = await fetch(url, { headers });

    if (!response.ok) {
      // If auth failed, try without auth
      if (response.status === 401 && authUsed) {
        const anonResponse = await fetch(url);
        if (anonResponse.ok) {
          const data = await anonResponse.json();
          const result = {
            success: true,
            count: data.states ? data.states.length : 0,
            flights: transformFlights(data.states || []),
            timestamp: new Date().toISOString(),
            note: 'Using anonymous access'
          };
          
          // Cache result if available
          if (cacheManager) {
            try {
              await cacheManager.set(cacheKey, result, 30);
            } catch (e) {
              // Cache error, continue
            }
          }
          
          return res.status(200).json(result);
        }
      }
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
      authenticated: authUsed
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