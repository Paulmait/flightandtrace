// Stable flight API - minimal dependencies, maximum reliability
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Parse bounding box with safe defaults
    const bbox = req.query.bbox || '-20,35,30,65';
    const parts = bbox.split(',');
    
    if (parts.length !== 4) {
      // Return empty if invalid
      return res.status(200).json({
        success: true,
        count: 0,
        flights: [],
        timestamp: new Date().toISOString(),
        error: 'Invalid bbox'
      });
    }
    
    const [lamin, lomin, lamax, lomax] = parts.map(n => parseFloat(n));
    
    // Validate numbers
    if ([lamin, lomin, lamax, lomax].some(n => isNaN(n))) {
      return res.status(200).json({
        success: true,
        count: 0,
        flights: [],
        timestamp: new Date().toISOString(),
        error: 'Invalid coordinates'
      });
    }
    
    // Build URL
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    console.log('Fetching:', url);
    
    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('OpenSky error:', response.status);
      // Return empty instead of error
      return res.status(200).json({
        success: true,
        count: 0,
        flights: [],
        timestamp: new Date().toISOString(),
        message: 'OpenSky unavailable'
      });
    }
    
    const data = await response.json();
    
    // Process states
    const flights = [];
    if (data && data.states && Array.isArray(data.states)) {
      for (const state of data.states) {
        if (state[5] != null && state[6] != null) {
          flights.push({
            id: state[0],
            icao24: state[0],
            callsign: state[1] ? String(state[1]).trim() : null,
            position: {
              latitude: parseFloat(state[6]),
              longitude: parseFloat(state[5]),
              altitude: state[13] ? parseFloat(state[13]) * 3.28084 : (state[7] ? parseFloat(state[7]) * 3.28084 : 0),
              heading: parseFloat(state[10]) || 0,
              groundSpeed: state[9] ? parseFloat(state[9]) * 1.94384 : 0,
              verticalRate: state[11] ? parseFloat(state[11]) * 196.85 : 0
            },
            origin: state[2] || 'Unknown',
            onGround: Boolean(state[8]),
            lastUpdate: state[3] || state[4],
            status: state[8] ? 'ON_GROUND' : 'EN_ROUTE'
          });
        }
      }
    }
    
    // Success response
    return res.status(200).json({
      success: true,
      count: flights.length,
      flights: flights,
      timestamp: new Date().toISOString(),
      source: 'opensky'
    });
    
  } catch (error) {
    console.error('API Error:', error.message);
    
    // ALWAYS return 200 with empty flights to prevent frontend errors
    return res.status(200).json({
      success: true,
      count: 0,
      flights: [],
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};