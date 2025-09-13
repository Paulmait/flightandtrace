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
    console.log('Fetching fresh data from OpenSky...');
    const globalUrl = 'https://opensky-network.org/api/states/all';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
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
          // Global view - return reasonable amount for performance
          allFlights = allFlights.slice(0, 3000); // Limit to 3000 for browser performance
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
    
    // Try alternative data sources
    try {
      // First try ADS-B Exchange (free tier)
      console.log('Trying ADS-B Exchange as backup...');
      const adsbResponse = await fetch('https://globe.adsbexchange.com/data/globe_0000.json', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FlightAndTrace/1.0'
        }
      });
      
      if (adsbResponse.ok) {
        const adsbData = await adsbResponse.json();
        if (adsbData && adsbData.aircraft && adsbData.aircraft.length > 0) {
          flights = adsbData.aircraft
            .filter(a => a.lat && a.lon)
            .slice(0, 1000) // Limit to 1000 flights
            .map(a => ({
              id: a.hex || Math.random().toString(36),
              icao24: a.hex || 'unknown',
              callsign: a.flight ? a.flight.trim() : null,
              position: {
                latitude: a.lat,
                longitude: a.lon,
                altitude: (a.alt_baro || a.alt_geom || 0) * 3.28084,
                heading: a.track || 0,
                groundSpeed: (a.gs || 0) * 1.94384,
                verticalRate: (a.baro_rate || 0) * 196.85
              },
              origin: null,
              onGround: a.alt_baro === 'ground',
              lastUpdate: a.seen_pos || Date.now() / 1000,
              status: a.alt_baro === 'ground' ? 'ON_GROUND' : 'EN_ROUTE',
              aircraft_type: a.t || null
            }));
          dataSource = 'adsb-exchange';
          console.log(`ADS-B Exchange: ${flights.length} flights`);
          flights = flights; // Use ADS-B data
        }
      }
      
      // If ADS-B fails, try OpenSky without filters
      if (flights.length === 0) {
        console.log('Attempting fallback fetch from OpenSky...');
        const fallbackResponse = await fetch('https://opensky-network.org/api/states/all', {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FlightAndTrace/1.0'
          }
        });
      
        if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.states && fallbackData.states.length > 0) {
          flights = fallbackData.states
            .filter(state => state[5] !== null && state[6] !== null)
            .slice(0, 500) // Limit fallback to 500 flights
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
              origin: state[2] || null,
              onGround: state[8] || false,
              lastUpdate: state[3] || state[4],
              status: state[8] ? 'ON_GROUND' : 'EN_ROUTE'
            }));
          dataSource = 'opensky-fallback';
          console.log(`Fallback successful: ${flights.length} flights`);
        } else {
          flights = [];
          dataSource = 'no-data';
        }
        } else {
          flights = [];
          dataSource = 'no-data';
        }
      }
    } catch (fallbackError) {
      console.error('Fallback fetch also failed:', fallbackError.message);
      flights = [];
      dataSource = 'no-data';
    }
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