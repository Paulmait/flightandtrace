// Optimized flights API with Vercel KV caching for ultra-fast performance
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const startTime = Date.now();
  let flights = [];
  let dataSource = 'none';
  let cacheStatus = 'miss';
  let errorMessage = null;
  
  try {
    // Get bbox from query
    const bbox = req.query.bbox || 'global';
    const cacheKey = `flights:${bbox}`;
    
    // Try to get from cache first (if KV is configured)
    if (process.env.KV_REST_API_URL) {
      try {
        const cached = await kv.get(cacheKey);
        if (cached && cached.flights && cached.timestamp) {
          // Check if cache is still fresh (60 seconds)
          const age = Date.now() - cached.timestamp;
          if (age < 60000) {
            // Return cached data
            return res.status(200).json({
              success: true,
              count: cached.flights.length,
              flights: cached.flights,
              timestamp: new Date().toISOString(),
              source: cached.source || 'cached',
              cached: true,
              cacheAge: Math.round(age / 1000),
              responseTime: Date.now() - startTime,
              requestedBbox: bbox
            });
          }
        }
      } catch (kvError) {
        console.log('KV cache error (continuing):', kvError.message);
      }
    }
    
    // Not in cache or cache expired, fetch fresh data
    const globalUrl = 'https://opensky-network.org/api/states/all';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(globalUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FlightAndTrace/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && data.states && data.states.length > 0) {
        // Parse ALL flights globally
        let allFlights = data.states
          .filter(state => state[5] !== null && state[6] !== null && state[0])
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
        
        // Filter by bbox if provided
        if (bbox !== 'global') {
          const [lomin, lamin, lomax, lamax] = bbox.split(',').map(Number);
          
          if (![lomin, lamin, lomax, lamax].some(isNaN)) {
            allFlights = allFlights.filter(flight => {
              const lat = flight.position.latitude;
              const lon = flight.position.longitude;
              return lat >= lamin && lat <= lamax && lon >= lomin && lon <= lomax;
            });
            dataSource = 'opensky-filtered';
          } else {
            dataSource = 'opensky-global';
          }
        } else {
          // Global view - return sample of flights
          allFlights = allFlights.slice(0, 1500);
          dataSource = 'opensky-global';
        }
        
        flights = allFlights;
        
        // Cache the results if KV is available
        if (process.env.KV_REST_API_URL) {
          try {
            await kv.set(cacheKey, {
              flights: flights,
              timestamp: Date.now(),
              source: dataSource
            }, {
              ex: 60 // Expire after 60 seconds
            });
            cacheStatus = 'stored';
          } catch (kvError) {
            console.log('Failed to cache:', kvError.message);
          }
        }
      }
    } else {
      errorMessage = `OpenSky API error: ${response.status}`;
      throw new Error(errorMessage);
    }
    
  } catch (error) {
    console.error('Error fetching flights:', error.message);
    errorMessage = error.message;
    
    // Try to use stale cache if available
    if (process.env.KV_REST_API_URL) {
      try {
        const bbox = req.query.bbox || 'global';
        const cacheKey = `flights:${bbox}`;
        const stale = await kv.get(cacheKey);
        
        if (stale && stale.flights) {
          return res.status(200).json({
            success: true,
            count: stale.flights.length,
            flights: stale.flights,
            timestamp: new Date().toISOString(),
            source: 'cached-stale',
            cached: true,
            stale: true,
            error: errorMessage,
            responseTime: Date.now() - startTime,
            requestedBbox: bbox
          });
        }
      } catch (kvError) {
        console.log('Failed to get stale cache:', kvError.message);
      }
    }
    
    // Last resort: Generate demo flights
    const bbox = req.query.bbox || '-180,-90,180,90';
    const [lomin, lamin, lomax, lamax] = bbox.split(',').map(Number);
    
    const demoFlights = [];
    const airlines = ['AAL', 'UAL', 'DAL', 'SWA', 'BAW', 'DLH', 'AFR', 'KLM', 'ACA', 'RYR'];
    
    for (let i = 0; i < 100; i++) {
      const lat = lamin + Math.random() * (lamax - lamin);
      const lon = lomin + Math.random() * (lomax - lomin);
      
      demoFlights.push({
        id: `demo${i}`,
        icao24: `demo${i}`,
        callsign: `${airlines[i % airlines.length]}${Math.floor(Math.random() * 900) + 100}`,
        position: {
          latitude: lat,
          longitude: lon,
          altitude: Math.random() < 0.15 ? 0 : 15000 + Math.random() * 30000,
          heading: Math.random() * 360,
          groundSpeed: Math.random() < 0.15 ? 0 : 300 + Math.random() * 250,
          verticalRate: (Math.random() - 0.5) * 2000
        },
        origin: 'Demo',
        onGround: Math.random() < 0.15,
        lastUpdate: Date.now() / 1000,
        status: Math.random() < 0.15 ? 'ON_GROUND' : 'EN_ROUTE'
      });
    }
    
    flights = demoFlights;
    dataSource = 'demo-fallback';
  }
  
  // Return response with performance metrics
  res.status(200).json({
    success: true,
    count: flights.length,
    flights: flights,
    timestamp: new Date().toISOString(),
    source: dataSource,
    cached: cacheStatus === 'hit',
    cacheStatus: cacheStatus,
    error: errorMessage,
    responseTime: Date.now() - startTime,
    requestedBbox: req.query.bbox || 'global',
    kvEnabled: !!process.env.KV_REST_API_URL
  });
};