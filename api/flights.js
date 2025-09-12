// Enhanced flights API with wider coverage
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  let flights = [];
  let dataSource = 'none';
  let errorMessage = null;
  
  try {
    // Parse bbox from query or use LARGE default covering Europe, North Atlantic, and parts of Africa/Asia
    let bbox = req.query.bbox;
    
    // If no bbox provided or it's too small, use a MUCH larger area
    if (!bbox) {
      // Cover entire Europe, UK, North Atlantic, Mediterranean, and parts of Middle East/Africa
      bbox = '-30,25,45,70'; // West Atlantic to Eastern Europe, North Africa to Scandinavia
    }
    
    const [lomin, lamin, lomax, lamax] = bbox.split(',').map(Number);
    
    // Validate coordinates
    if ([lomin, lamin, lomax, lamax].some(isNaN)) {
      throw new Error('Invalid bounding box coordinates');
    }
    
    // Ensure the bbox is large enough to see many flights
    const width = Math.abs(lomax - lomin);
    const height = Math.abs(lamax - lamin);
    
    // If area is too small, expand it
    if (width < 20 || height < 20) {
      // Expand the bounding box
      const centerLon = (lomin + lomax) / 2;
      const centerLat = (lamin + lamax) / 2;
      
      // Create a 40x40 degree box around the center
      bbox = `${centerLon - 20},${centerLat - 20},${centerLon + 20},${centerLat + 20}`;
      const [newLomin, newLamin, newLomax, newLamax] = bbox.split(',').map(Number);
      
      // Try OpenSky Network API with expanded area
      const url = `https://opensky-network.org/api/states/all?lamin=${newLamin}&lomin=${newLomin}&lamax=${newLamax}&lomax=${newLomax}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.states && data.states.length > 0) {
          // Parse ALL flights (no limit)
          flights = data.states
            .filter(state => state[5] && state[6] && state[0]) // Must have position and ID
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
          
          dataSource = 'opensky-expanded';
        }
      }
    } else {
      // Use the provided bbox as-is
      const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.states && data.states.length > 0) {
          // Parse ALL flights (no limit)
          flights = data.states
            .filter(state => state[5] && state[6] && state[0]) // Must have position and ID
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
          
          dataSource = 'opensky';
        }
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded - please wait a moment';
      } else {
        errorMessage = `OpenSky API error: ${response.status}`;
      }
    }
    
    // If still no flights, try fetching ALL flights globally (no bbox)
    if (flights.length === 0) {
      const globalUrl = 'https://opensky-network.org/api/states/all';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for global
      
      const response = await fetch(globalUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.states && data.states.length > 0) {
          // Take a sample of global flights (limit to 500 for performance)
          flights = data.states
            .filter(state => state[5] && state[6] && state[0])
            .slice(0, 500)
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
          
          dataSource = 'opensky-global';
        }
      }
    }
    
  } catch (error) {
    console.error('Error fetching flights:', error.message);
    errorMessage = error.message;
    
    // Generate realistic demo flights if API fails
    const demoFlights = [];
    const airlines = ['DLH', 'BAW', 'AFR', 'KLM', 'RYR', 'EZY', 'UAL', 'AAL', 'DAL', 'SWA', 'LH', 'BA', 'AF', 'KL'];
    const regions = ['United Kingdom', 'France', 'Germany', 'Netherlands', 'Spain', 'Italy', 'Poland', 'Norway'];
    
    // Generate 50 demo flights
    for (let i = 0; i < 50; i++) {
      const isOnGround = Math.random() < 0.15; // 15% on ground
      const lat = 35 + Math.random() * 35; // 35-70 degrees North
      const lon = -25 + Math.random() * 70; // -25 to 45 degrees East
      
      demoFlights.push({
        id: `demo${i}`,
        icao24: `demo${i}`,
        callsign: `${airlines[Math.floor(Math.random() * airlines.length)]}${Math.floor(Math.random() * 900) + 100}`,
        position: {
          latitude: lat,
          longitude: lon,
          altitude: isOnGround ? 0 : 15000 + Math.random() * 30000,
          heading: Math.random() * 360,
          groundSpeed: isOnGround ? 0 : 300 + Math.random() * 250,
          verticalRate: isOnGround ? 0 : (Math.random() - 0.5) * 2000
        },
        origin: regions[Math.floor(Math.random() * regions.length)],
        onGround: isOnGround,
        lastUpdate: Date.now() / 1000,
        status: isOnGround ? 'ON_GROUND' : 'EN_ROUTE'
      });
    }
    
    flights = demoFlights;
    dataSource = 'demo-enhanced';
  }
  
  // Always return success with data
  res.status(200).json({
    success: true,
    count: flights.length,
    flights: flights,
    timestamp: new Date().toISOString(),
    source: dataSource,
    error: errorMessage,
    coverage: flights.length > 0 ? {
      minLat: Math.min(...flights.map(f => f.position.latitude)),
      maxLat: Math.max(...flights.map(f => f.position.latitude)),
      minLon: Math.min(...flights.map(f => f.position.longitude)),
      maxLon: Math.max(...flights.map(f => f.position.longitude))
    } : null
  });
};