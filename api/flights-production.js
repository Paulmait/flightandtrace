// Production-ready flight API with proper error handling
export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  try {
    // Parse bounding box with defaults for Europe/US view
    const { bbox = '-20,35,30,65' } = req.query;
    const [lamin, lomin, lamax, lomax] = bbox.split(',').map(Number);
    
    // Validate bounding box
    if ([lamin, lomin, lamax, lomax].some(isNaN)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounding box format',
        flights: []
      });
    }
    
    // Build OpenSky API URL
    const params = new URLSearchParams({
      lamin: lamin.toString(),
      lomin: lomin.toString(),
      lamax: lamax.toString(),
      lomax: lomax.toString()
    });
    
    const apiUrl = `https://opensky-network.org/api/states/all?${params.toString()}`;
    
    console.log('Fetching from OpenSky:', apiUrl);
    
    // Use native fetch (available in Node.js 18+)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FlightTrace/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        console.error('OpenSky API error:', response.status, response.statusText);
        
        // Return empty flights array instead of error to keep app functional
        return res.status(200).json({
          success: true,
          count: 0,
          flights: [],
          timestamp: new Date().toISOString(),
          message: 'Flight data temporarily unavailable'
        });
      }
      
      const data = await response.json();
      
      // Handle empty or invalid response
      if (!data || !data.states) {
        return res.status(200).json({
          success: true,
          count: 0,
          flights: [],
          timestamp: new Date().toISOString()
        });
      }
      
      // Transform OpenSky data to our format
      const flights = data.states
        .map(state => {
          // OpenSky state vector format
          const [
            icao24,        // 0: ICAO24 address
            callsign,      // 1: Callsign
            origin,        // 2: Origin country
            timePosition,  // 3: Time of position update
            lastContact,   // 4: Time of last contact
            longitude,     // 5: Longitude
            latitude,      // 6: Latitude
            baroAltitude,  // 7: Barometric altitude (meters)
            onGround,      // 8: On ground
            velocity,      // 9: Velocity (m/s)
            trueTrack,     // 10: True track (degrees)
            verticalRate,  // 11: Vertical rate (m/s)
            sensors,       // 12: Sensor IDs
            geoAltitude,   // 13: Geometric altitude (meters)
            squawk,        // 14: Squawk code
            spi,           // 15: Special position indicator
            positionSource // 16: Position source
          ] = state;
          
          // Skip if no valid position
          if (!latitude || !longitude) {
            return null;
          }
          
          return {
            id: icao24,
            icao24: icao24,
            callsign: callsign ? callsign.trim() : null,
            position: {
              latitude: latitude,
              longitude: longitude,
              // Convert altitude from meters to feet
              altitude: geoAltitude ? geoAltitude * 3.28084 : (baroAltitude ? baroAltitude * 3.28084 : 0),
              heading: trueTrack || 0,
              // Convert speed from m/s to knots
              groundSpeed: velocity ? velocity * 1.94384 : 0,
              // Convert vertical rate from m/s to ft/min
              verticalRate: verticalRate ? verticalRate * 196.85 : 0
            },
            origin: origin || 'Unknown',
            onGround: onGround || false,
            lastUpdate: timePosition || lastContact,
            status: onGround ? 'ON_GROUND' : 'EN_ROUTE',
            squawk: squawk || null
          };
        })
        .filter(flight => flight !== null); // Remove invalid entries
      
      // Send successful response
      return res.status(200).json({
        success: true,
        count: flights.length,
        flights: flights,
        timestamp: new Date().toISOString(),
        source: 'opensky'
      });
      
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout');
        return res.status(504).json({
          success: false,
          error: 'Request timeout',
          flights: []
        });
      }
      throw fetchError;
    }
    
  } catch (error) {
    console.error('Flight API error:', error.message);
    console.error('Stack:', error.stack);
    
    // Return error response
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch flight data',
      flights: [],
      timestamp: new Date().toISOString()
    });
  }
}