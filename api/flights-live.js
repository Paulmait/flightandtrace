// Production flight API with OpenSky Network
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Get bounding box from query params
    const { bbox = '-20,35,30,65' } = req.query;
    const [lamin, lomin, lamax, lomax] = bbox.split(',').map(Number);
    
    // Validate bbox
    if ([lamin, lomin, lamax, lomax].some(isNaN)) {
      res.status(400).json({
        success: false,
        error: 'Invalid bounding box',
        flights: []
      });
      return;
    }
    
    // Fetch from OpenSky
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Transform data
    const flights = (data.states || [])
      .filter(state => state[5] && state[6]) // Must have lat/lon
      .map(state => ({
        id: state[0],
        icao24: state[0],
        callsign: state[1] ? state[1].trim() : null,
        position: {
          latitude: state[6],
          longitude: state[5],
          altitude: state[13] ? state[13] * 3.28084 : (state[7] ? state[7] * 3.28084 : 0),
          heading: state[10] || 0,
          groundSpeed: state[9] ? state[9] * 1.94384 : 0,
          verticalRate: state[11] ? state[11] * 196.85 : 0
        },
        origin: state[2] || 'Unknown',
        onGround: state[8] || false,
        lastUpdate: state[3] || state[4],
        status: state[8] ? 'ON_GROUND' : 'EN_ROUTE'
      }));
    
    res.status(200).json({
      success: true,
      count: flights.length,
      flights: flights,
      timestamp: new Date().toISOString(),
      source: 'opensky'
    });
    
  } catch (error) {
    console.error('Error:', error);
    
    // Return empty flights on error
    res.status(200).json({
      success: true,
      count: 0,
      flights: [],
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};