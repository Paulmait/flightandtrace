import { authenticateToken, configureCors, securityHeaders } from './middleware/auth.js';
import cacheManager, { flightCache, CacheTTL } from './lib/cache.js';

// Data source aggregator
class FlightDataAggregator {
  constructor() {
    this.sources = {
      opensky: {
        enabled: true,
        priority: 1,
        rateLimit: { free: 10, authenticated: 100 }
      },
      adsb: {
        enabled: !!process.env.ADSB_EXCHANGE_API_KEY,
        priority: 2,
        rateLimit: { free: 100, premium: 1000 }
      }
    };
  }

  // Transform OpenSky data to unified format
  transformOpenSkyData(states) {
    if (!states || !Array.isArray(states)) return [];
    
    return states.map(state => ({
      id: state[0],
      icao24: state[0],
      callsign: state[1]?.trim() || null,
      position: {
        latitude: state[6],
        longitude: state[5],
        altitude: state[13] ? state[13] * 3.28084 : state[7],
        heading: state[10] || 0,
        groundSpeed: state[9] ? state[9] * 1.94384 : 0,
        verticalRate: state[11] || 0
      },
      origin: state[2],
      onGround: state[8],
      lastUpdate: state[3] || state[4],
      status: state[8] ? 'ON_GROUND' : 'EN_ROUTE',
      source: 'opensky'
    })).filter(f => f.position.latitude && f.position.longitude);
  }

  // Fetch from OpenSky Network
  async fetchOpenSky(bbox, user) {
    const [lamin, lomin, lamax, lomax] = bbox.split(',').map(Number);
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    const headers = {};
    
    // Use authentication if available for higher rate limits
    if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
      headers['Authorization'] = 'Basic ' + Buffer.from(
        `${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`
      ).toString('base64');
    }
    
    const response = await fetch(url, { 
      headers,
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`OpenSky API error: ${response.status}`);
    }
    
    const data = await response.json();
    return this.transformOpenSkyData(data.states || []);
  }

  // Fetch from ADS-B Exchange
  async fetchADSB(bbox, user) {
    if (!process.env.ADSB_EXCHANGE_API_KEY) {
      return [];
    }
    
    const [lamin, lomin, lamax, lomax] = bbox.split(',').map(Number);
    
    // Calculate center point for radius-based query
    const lat = (lamin + lamax) / 2;
    const lon = (lomin + lomax) / 2;
    const radius = Math.max(
      Math.abs(lamax - lamin) * 111, // km per degree latitude
      Math.abs(lomax - lomin) * 111 * Math.cos(lat * Math.PI / 180)
    ) / 2;
    
    const url = `https://adsbexchange-com1.p.rapidapi.com/v2/lat/${lat}/lon/${lon}/dist/${Math.min(radius, 250)}/`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': process.env.ADSB_EXCHANGE_API_KEY,
          'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        console.error('ADS-B Exchange error:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      // Transform ADS-B data to unified format
      return (data.ac || []).map(aircraft => ({
        id: aircraft.hex,
        icao24: aircraft.hex,
        callsign: aircraft.flight?.trim() || null,
        position: {
          latitude: aircraft.lat,
          longitude: aircraft.lon,
          altitude: aircraft.alt_baro || aircraft.alt_geom,
          heading: aircraft.track || 0,
          groundSpeed: aircraft.gs || 0,
          verticalRate: aircraft.baro_rate || 0
        },
        registration: aircraft.r,
        type: aircraft.t,
        onGround: aircraft.alt_baro === 'ground',
        lastUpdate: aircraft.seen_pos,
        status: aircraft.alt_baro === 'ground' ? 'ON_GROUND' : 'EN_ROUTE',
        source: 'adsb'
      })).filter(f => f.position.latitude && f.position.longitude);
    } catch (error) {
      console.error('ADS-B fetch error:', error.message);
      return [];
    }
  }

  // Aggregate data from multiple sources
  async aggregate(bbox, user) {
    const sources = [];
    
    // Fetch from enabled sources in parallel
    if (this.sources.opensky.enabled) {
      sources.push(this.fetchOpenSky(bbox, user).catch(err => {
        console.error('OpenSky error:', err.message);
        return [];
      }));
    }
    
    if (this.sources.adsb.enabled && user?.subscription !== 'free') {
      sources.push(this.fetchADSB(bbox, user).catch(err => {
        console.error('ADS-B error:', err.message);
        return [];
      }));
    }
    
    const results = await Promise.all(sources);
    const allFlights = results.flat();
    
    // Deduplicate by ICAO24 (prefer higher priority source)
    const flightMap = new Map();
    allFlights.forEach(flight => {
      const existing = flightMap.get(flight.icao24);
      if (!existing || this.sources[flight.source].priority < this.sources[existing.source].priority) {
        flightMap.set(flight.icao24, flight);
      }
    });
    
    return Array.from(flightMap.values());
  }
}

// Main handler
export default async function handler(req, res) {
  // Apply middleware
  configureCors(req, res, () => {});
  securityHeaders(req, res, () => {});
  
  // Authenticate user (optional for this endpoint)
  await new Promise((resolve) => authenticateToken(req, res, resolve));
  
  // Apply rate limiting based on user tier
  if (req.rateLimit) {
    const rateLimitResult = await new Promise((resolve) => 
      req.rateLimit(req, res, () => resolve(true))
    );
    if (!rateLimitResult) return; // Rate limit exceeded
  }
  
  try {
    // Validate request
    const { bbox = '-10,40,10,60', nocache } = req.query;
    
    // Validate bbox format
    const bboxParts = bbox.split(',').map(Number);
    if (bboxParts.length !== 4 || bboxParts.some(isNaN)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounding box format. Use: lamin,lomin,lamax,lomax'
      });
    }
    
    // Check bbox size limits
    const [lamin, lomin, lamax, lomax] = bboxParts;
    const latRange = lamax - lamin;
    const lonRange = lomax - lomin;
    
    // Limit bbox size based on user tier
    const maxRange = req.user?.subscription === 'enterprise' ? 50 : 
                    req.user?.subscription === 'pro' ? 30 : 20;
    
    if (latRange > maxRange || lonRange > maxRange) {
      return res.status(400).json({
        success: false,
        error: `Bounding box too large. Maximum range: ${maxRange} degrees`,
        upgradeUrl: !req.user || req.user.subscription === 'free' ? '/pricing' : undefined
      });
    }
    
    // Use cache unless explicitly disabled or user is premium
    const useCache = nocache !== 'true' && req.user?.subscription !== 'enterprise';
    
    let flights;
    let cached = false;
    
    if (useCache) {
      // Try cache first
      const cachedData = await flightCache.get(bbox);
      if (cachedData) {
        flights = cachedData.flights;
        cached = true;
      }
    }
    
    if (!flights) {
      // Fetch fresh data
      const aggregator = new FlightDataAggregator();
      flights = await aggregator.aggregate(bbox, req.user);
      
      // Cache the result
      if (useCache && flights.length > 0) {
        await flightCache.set(bbox, { 
          flights, 
          timestamp: new Date().toISOString() 
        });
      }
    }
    
    // Build response
    const response = {
      success: true,
      count: flights.length,
      flights,
      timestamp: new Date().toISOString(),
      cached,
      user: req.user ? {
        subscription: req.user.subscription,
        rateLimit: {
          remaining: req.headers['x-ratelimit-remaining'],
          reset: req.headers['x-ratelimit-reset']
        }
      } : undefined,
      performance: {
        sources: req.user?.subscription !== 'free' ? ['opensky', 'adsb'] : ['opensky'],
        cacheEnabled: useCache,
        cacheTTL: CacheTTL.FLIGHTS
      }
    };
    
    // Add cache headers
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
    } else {
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', `public, max-age=${CacheTTL.FLIGHTS}`);
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Flight API error:', error);
    
    // Don't expose internal errors in production
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'An error occurred while fetching flight data'
      : error.message;
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      flights: [],
      timestamp: new Date().toISOString()
    });
  }
}

// Export for testing
export { FlightDataAggregator };