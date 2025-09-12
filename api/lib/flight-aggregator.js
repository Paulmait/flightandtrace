// Advanced Flight Data Aggregator with Multiple Sources
import { fetchWithAuth } from './opensky-auth.js';

class FlightDataAggregator {
  constructor() {
    this.sources = {
      opensky: {
        name: 'OpenSky Network',
        priority: 1,
        enabled: true,
        rateLimit: { authenticated: 100, anonymous: 10 },
        lastError: null,
        successCount: 0,
        failureCount: 0
      },
      adsb: {
        name: 'ADS-B Exchange',
        priority: 2,
        enabled: true,
        rateLimit: { free: 100, premium: 1000 },
        lastError: null,
        successCount: 0,
        failureCount: 0
      },
      flightaware: {
        name: 'FlightAware',
        priority: 3,
        enabled: false, // Requires paid API
        rateLimit: { tier1: 60, tier2: 600 },
        lastError: null,
        successCount: 0,
        failureCount: 0
      }
    };
    
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
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
        verticalRate: state[11] || 0,
        barometricAltitude: state[7],
        geometricAltitude: state[13] ? state[13] * 3.28084 : null
      },
      origin: state[2],
      onGround: state[8],
      lastUpdate: state[3] || state[4],
      status: state[8] ? 'ON_GROUND' : 'EN_ROUTE',
      squawk: state[14] || null,
      spi: state[15] || false,
      source: 'opensky',
      reliability: 'high'
    })).filter(f => f.position.latitude && f.position.longitude);
  }

  // Transform ADS-B Exchange data to unified format
  transformADSBData(aircraft) {
    if (!aircraft || !Array.isArray(aircraft)) return [];
    
    return aircraft.map(ac => ({
      id: ac.hex,
      icao24: ac.hex,
      callsign: ac.flight?.trim() || null,
      registration: ac.r || null,
      position: {
        latitude: ac.lat,
        longitude: ac.lon,
        altitude: ac.alt_baro !== 'ground' ? ac.alt_baro : 0,
        heading: ac.track || 0,
        groundSpeed: ac.gs || 0,
        verticalRate: ac.baro_rate || 0,
        barometricAltitude: ac.alt_baro,
        geometricAltitude: ac.alt_geom || null
      },
      origin: ac.flag || 'Unknown',
      onGround: ac.alt_baro === 'ground',
      lastUpdate: ac.seen_pos ? Date.now() - (ac.seen_pos * 1000) : Date.now(),
      status: ac.alt_baro === 'ground' ? 'ON_GROUND' : 'EN_ROUTE',
      squawk: ac.squawk || null,
      emergency: ac.emergency || null,
      category: ac.category || null,
      source: 'adsb',
      reliability: ac.mlat ? 'medium' : 'high',
      aircraft: {
        type: ac.t || null,
        manufacturer: ac.mfr || null,
        model: ac.mdl || null,
        operator: ac.op || null
      }
    })).filter(f => f.position.latitude && f.position.longitude);
  }

  // Fetch from OpenSky Network
  async fetchOpenSky(lamin, lomin, lamax, lomax) {
    try {
      const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
      
      // Use OAuth2 authentication or fall back to anonymous
      const response = await fetchWithAuth(url);
      
      if (!response.ok) {
        throw new Error(`OpenSky API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.sources.opensky.successCount++;
      this.sources.opensky.lastError = null;
      
      return this.transformOpenSkyData(data.states || []);
    } catch (error) {
      this.sources.opensky.failureCount++;
      this.sources.opensky.lastError = error.message;
      console.error('OpenSky fetch failed:', error);
      return [];
    }
  }

  // Fetch from ADS-B Exchange (using RapidAPI)
  async fetchADSB(lamin, lomin, lamax, lomax) {
    if (!process.env.ADSB_EXCHANGE_API_KEY) {
      return [];
    }
    
    try {
      // Calculate center point and radius
      const lat = (lamin + lamax) / 2;
      const lon = (lomin + lomax) / 2;
      const latDist = Math.abs(lamax - lamin) * 111; // km per degree
      const lonDist = Math.abs(lomax - lomin) * 111 * Math.cos(lat * Math.PI / 180);
      const radius = Math.max(latDist, lonDist) / 2;
      
      // ADS-B Exchange API via RapidAPI
      const url = `https://adsbexchange-com1.p.rapidapi.com/v2/lat/${lat}/lon/${lon}/dist/${Math.min(radius, 250)}/`;
      
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': process.env.ADSB_EXCHANGE_API_KEY,
          'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com'
        },
        signal: AbortSignal.timeout(8000)
      });
      
      if (!response.ok) {
        throw new Error(`ADS-B Exchange API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.sources.adsb.successCount++;
      this.sources.adsb.lastError = null;
      
      return this.transformADSBData(data.ac || []);
    } catch (error) {
      this.sources.adsb.failureCount++;
      this.sources.adsb.lastError = error.message;
      console.error('ADS-B Exchange fetch failed:', error);
      return [];
    }
  }

  // Merge flight data from multiple sources
  mergeFlight(existingFlight, newFlight) {
    // Use the most recent data
    if (!existingFlight || newFlight.lastUpdate > existingFlight.lastUpdate) {
      return newFlight;
    }
    
    // Merge additional data if available
    return {
      ...existingFlight,
      // Add registration if not present
      registration: existingFlight.registration || newFlight.registration,
      // Add aircraft details if not present
      aircraft: existingFlight.aircraft || newFlight.aircraft,
      // Update position if newer
      position: newFlight.lastUpdate > existingFlight.lastUpdate 
        ? newFlight.position 
        : existingFlight.position,
      // Keep the most reliable source
      source: existingFlight.reliability === 'high' 
        ? existingFlight.source 
        : newFlight.source,
      // Combine data sources
      dataSources: [...new Set([
        ...(existingFlight.dataSources || [existingFlight.source]),
        newFlight.source
      ])]
    };
  }

  // Aggregate data from all sources
  async aggregateFlightData(lamin, lomin, lamax, lomax) {
    const cacheKey = `${lamin},${lomin},${lamax},${lomax}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { ...cached.data, cached: true };
    }
    
    // Fetch from all enabled sources in parallel
    const promises = [];
    
    if (this.sources.opensky.enabled) {
      promises.push(this.fetchOpenSky(lamin, lomin, lamax, lomax));
    }
    
    if (this.sources.adsb.enabled) {
      promises.push(this.fetchADSB(lamin, lomin, lamax, lomax));
    }
    
    const results = await Promise.allSettled(promises);
    
    // Combine all successful results
    const flightMap = new Map();
    let totalSources = 0;
    let successfulSources = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        totalSources++;
        const sourceName = index === 0 ? 'opensky' : 'adsb';
        successfulSources.push(sourceName);
        
        result.value.forEach(flight => {
          const existing = flightMap.get(flight.icao24);
          flightMap.set(flight.icao24, this.mergeFlight(existing, flight));
        });
      }
    });
    
    const flights = Array.from(flightMap.values());
    
    // Calculate data quality score
    const qualityScore = this.calculateQualityScore(flights, successfulSources);
    
    const responseData = {
      success: true,
      count: flights.length,
      flights,
      timestamp: new Date().toISOString(),
      sources: {
        available: successfulSources,
        total: totalSources,
        status: {
          opensky: {
            enabled: this.sources.opensky.enabled,
            lastError: this.sources.opensky.lastError,
            successRate: this.sources.opensky.successCount / 
              (this.sources.opensky.successCount + this.sources.opensky.failureCount) || 0
          },
          adsb: {
            enabled: this.sources.adsb.enabled,
            lastError: this.sources.adsb.lastError,
            successRate: this.sources.adsb.successCount / 
              (this.sources.adsb.successCount + this.sources.adsb.failureCount) || 0
          }
        }
      },
      quality: qualityScore,
      coverage: {
        area: { lamin, lomin, lamax, lomax },
        estimatedCoverage: qualityScore.coverage
      }
    };
    
    // Cache the result
    this.cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    return responseData;
  }

  // Calculate data quality score
  calculateQualityScore(flights, sources) {
    const totalFlights = flights.length;
    const multiSourceFlights = flights.filter(f => f.dataSources && f.dataSources.length > 1).length;
    const highReliabilityFlights = flights.filter(f => f.reliability === 'high').length;
    
    return {
      score: Math.round((sources.length / 3) * 100), // Percentage of available sources
      coverage: sources.length > 1 ? 'excellent' : sources.length > 0 ? 'good' : 'poor',
      reliability: (highReliabilityFlights / totalFlights) || 0,
      multiSource: (multiSourceFlights / totalFlights) || 0,
      details: {
        totalFlights,
        multiSourceFlights,
        highReliabilityFlights,
        sources: sources.length
      }
    };
  }

  // Get system health status
  getSystemHealth() {
    const sources = Object.entries(this.sources).map(([key, source]) => ({
      name: source.name,
      enabled: source.enabled,
      healthy: source.failureCount < 5 && !source.lastError,
      successRate: source.successCount / (source.successCount + source.failureCount) || 0,
      lastError: source.lastError
    }));
    
    const healthyCount = sources.filter(s => s.healthy && s.enabled).length;
    const totalEnabled = sources.filter(s => s.enabled).length;
    
    return {
      status: healthyCount === totalEnabled ? 'healthy' : healthyCount > 0 ? 'degraded' : 'critical',
      sources,
      recommendation: healthyCount === 0 
        ? 'All data sources are failing. Check API credentials and network connectivity.'
        : healthyCount < totalEnabled 
        ? 'Some data sources are experiencing issues. Service is operating with reduced redundancy.'
        : 'All systems operational.'
    };
  }
}

export default new FlightDataAggregator();