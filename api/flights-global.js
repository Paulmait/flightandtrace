// Global flights API that properly handles all regions
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
    // Get bbox from query
    const bbox = req.query.bbox || '';
    
    // First, try to fetch ALL flights globally (no bbox restriction)
    const globalUrl = 'https://opensky-network.org/api/states/all';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
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
        // Parse ALL flights globally
        let allFlights = data.states
          .filter(state => state[5] !== null && state[6] !== null && state[0]) // Must have position and ID
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
        
        // If bbox is provided, filter flights to that region
        if (bbox) {
          const [lomin, lamin, lomax, lamax] = bbox.split(',').map(Number);
          
          if (![lomin, lamin, lomax, lamax].some(isNaN)) {
            // Filter flights within the bounding box
            allFlights = allFlights.filter(flight => {
              const lat = flight.position.latitude;
              const lon = flight.position.longitude;
              return lat >= lamin && lat <= lamax && lon >= lomin && lon <= lomax;
            });
            
            dataSource = 'opensky-filtered';
            
            // If no flights in region, expand search area
            if (allFlights.length < 10) {
              // Expand bbox by 10 degrees in each direction
              const expandedFlights = data.states
                .filter(state => state[5] !== null && state[6] !== null)
                .filter(state => {
                  const lat = state[6];
                  const lon = state[5];
                  return lat >= (lamin - 10) && lat <= (lamax + 10) && 
                         lon >= (lomin - 10) && lon <= (lomax + 10);
                })
                .slice(0, 200)
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
              
              if (expandedFlights.length > allFlights.length) {
                allFlights = expandedFlights;
                dataSource = 'opensky-expanded';
              }
            }
          } else {
            // Invalid bbox, use all global flights
            allFlights = allFlights.slice(0, 1000); // Limit to 1000 for performance
            dataSource = 'opensky-global';
          }
        } else {
          // No bbox, return a good sample of global flights
          allFlights = allFlights.slice(0, 1000);
          dataSource = 'opensky-global';
        }
        
        flights = allFlights;
        
        // Log what we're returning
        console.log(`Returning ${flights.length} flights from ${dataSource} for bbox: ${bbox || 'global'}`);
      }
    } else if (response.status === 429) {
      errorMessage = 'Rate limit exceeded - please wait a moment';
      throw new Error(errorMessage);
    } else {
      errorMessage = `OpenSky API error: ${response.status}`;
      throw new Error(errorMessage);
    }
    
  } catch (error) {
    console.error('Error fetching flights:', error.message);
    errorMessage = error.message;
    
    // Generate region-appropriate demo flights based on bbox
    const bbox = req.query.bbox || '-180,-90,180,90';
    const [lomin, lamin, lomax, lamax] = bbox.split(',').map(Number);
    
    const demoFlights = [];
    const airlines = ['AAL', 'UAL', 'DAL', 'SWA', 'JBU', 'BAW', 'DLH', 'AFR', 'KLM', 'ACA'];
    const regions = ['United States', 'Canada', 'United Kingdom', 'France', 'Germany', 'Mexico'];
    
    // Generate demo flights for the requested region
    for (let i = 0; i < 100; i++) {
      const isOnGround = Math.random() < 0.15;
      // Generate coordinates within the requested bbox
      const lat = lamin + Math.random() * (lamax - lamin);
      const lon = lomin + Math.random() * (lomax - lomin);
      
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
    dataSource = 'demo-regional';
  }
  
  // Always return success with data
  res.status(200).json({
    success: true,
    count: flights.length,
    flights: flights,
    timestamp: new Date().toISOString(),
    source: dataSource,
    error: errorMessage,
    requestedBbox: req.query.bbox || 'none',
    coverage: flights.length > 0 ? {
      minLat: Math.min(...flights.map(f => f.position.latitude)),
      maxLat: Math.max(...flights.map(f => f.position.latitude)),
      minLon: Math.min(...flights.map(f => f.position.longitude)),
      maxLon: Math.max(...flights.map(f => f.position.longitude))
    } : null
  });
};