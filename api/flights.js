export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { bbox = '-10,40,10,60' } = req.query; // Default to Europe
    const [lamin, lomin, lamax, lomax] = bbox.split(',').map(Number);
    
    // OpenSky Network API endpoint
    const username = process.env.OPENSKY_USERNAME;
    const password = process.env.OPENSKY_PASSWORD;
    
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
      }
    });

    if (!response.ok) {
      throw new Error(`OpenSky API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform OpenSky data to our format
    const flights = (data.states || []).map(state => ({
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

    res.status(200).json({
      success: true,
      count: flights.length,
      flights,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Flight API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      flights: []
    });
  }
}