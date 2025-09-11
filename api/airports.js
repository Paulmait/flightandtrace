import cacheManager from './lib/cache.js';

// Airport database with comprehensive information
class AirportDatabase {
  constructor() {
    this.airports = new Map();
    this.initializeAirports();
  }

  initializeAirports() {
    // Major airports data
    const airports = [
      {
        icao: 'KJFK',
        iata: 'JFK',
        name: 'John F. Kennedy International Airport',
        city: 'New York',
        country: 'United States',
        latitude: 40.6413,
        longitude: -73.7781,
        elevation: 13,
        timezone: 'America/New_York',
        runways: [
          { id: '04L/22R', length: 11351, surface: 'Asphalt' },
          { id: '04R/22L', length: 8400, surface: 'Asphalt' },
          { id: '13L/31R', length: 10000, surface: 'Asphalt' },
          { id: '13R/31L', length: 14511, surface: 'Concrete' }
        ],
        type: 'large_airport'
      },
      {
        icao: 'EGLL',
        iata: 'LHR',
        name: 'London Heathrow Airport',
        city: 'London',
        country: 'United Kingdom',
        latitude: 51.4700,
        longitude: -0.4543,
        elevation: 83,
        timezone: 'Europe/London',
        runways: [
          { id: '09L/27R', length: 12802, surface: 'Asphalt' },
          { id: '09R/27L', length: 12008, surface: 'Asphalt' }
        ],
        type: 'large_airport'
      },
      {
        icao: 'LFPG',
        iata: 'CDG',
        name: 'Charles de Gaulle Airport',
        city: 'Paris',
        country: 'France',
        latitude: 49.0097,
        longitude: 2.5479,
        elevation: 392,
        timezone: 'Europe/Paris',
        runways: [
          { id: '08L/26R', length: 13829, surface: 'Asphalt' },
          { id: '08R/26L', length: 8858, surface: 'Concrete' },
          { id: '09L/27R', length: 8858, surface: 'Asphalt' },
          { id: '09R/27L', length: 14745, surface: 'Concrete' }
        ],
        type: 'large_airport'
      },
      {
        icao: 'EDDF',
        iata: 'FRA',
        name: 'Frankfurt Airport',
        city: 'Frankfurt',
        country: 'Germany',
        latitude: 50.0333,
        longitude: 8.5706,
        elevation: 364,
        timezone: 'Europe/Berlin',
        runways: [
          { id: '07C/25C', length: 13123, surface: 'Asphalt' },
          { id: '07L/25R', length: 13123, surface: 'Concrete' },
          { id: '07R/25L', length: 9842, surface: 'Asphalt' },
          { id: '18', length: 13123, surface: 'Concrete' }
        ],
        type: 'large_airport'
      },
      {
        icao: 'ZBAA',
        iata: 'PEK',
        name: 'Beijing Capital International Airport',
        city: 'Beijing',
        country: 'China',
        latitude: 40.0801,
        longitude: 116.5844,
        elevation: 116,
        timezone: 'Asia/Shanghai',
        runways: [
          { id: '01/19', length: 12467, surface: 'Asphalt' },
          { id: '18L/36R', length: 12467, surface: 'Concrete' },
          { id: '18R/36L', length: 10499, surface: 'Asphalt' }
        ],
        type: 'large_airport'
      }
    ];

    airports.forEach(airport => {
      this.airports.set(airport.icao, airport);
      this.airports.set(airport.iata, airport); // Also index by IATA
    });
  }

  async getAirport(code) {
    // Check cache first
    const cacheKey = `airport:${code}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check local database
    let airport = this.airports.get(code.toUpperCase());
    
    if (!airport) {
      // Try to fetch from external API
      airport = await this.fetchFromExternalAPI(code);
    }

    if (airport) {
      // Add live data
      airport = await this.enrichWithLiveData(airport);
      
      // Cache for 5 minutes (live data changes frequently)
      await cacheManager.set(cacheKey, airport, 300);
    }

    return airport;
  }

  async fetchFromExternalAPI(code) {
    // In production, this would fetch from aviation data APIs
    // For now, return null if not in database
    return null;
  }

  async enrichWithLiveData(airport) {
    try {
      // Add weather data
      const weather = await this.getAirportWeather(airport.icao);
      
      // Add delay information
      const delays = await this.getAirportDelays(airport.icao);
      
      // Add current traffic
      const traffic = await this.getAirportTraffic(airport.icao);
      
      return {
        ...airport,
        weather,
        delays,
        traffic,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error enriching airport data:', error);
      return airport;
    }
  }

  async getAirportWeather(icao) {
    try {
      // Get METAR data
      const metarResponse = await fetch(
        `https://api.checkwx.com/metar/${icao}/decoded`,
        {
          headers: {
            'X-API-Key': process.env.CHECKWX_API_KEY || 'demo'
          }
        }
      );

      if (metarResponse.ok) {
        const data = await metarResponse.json();
        const metar = data.data?.[0];
        
        if (metar) {
          return {
            temperature: metar.temperature?.celsius,
            dewpoint: metar.dewpoint?.celsius,
            humidity: metar.humidity?.percent,
            pressure: metar.barometer?.mb,
            visibility: metar.visibility?.meters,
            wind: {
              speed: metar.wind?.speed_kts,
              direction: metar.wind?.degrees,
              gust: metar.wind?.gust_kts
            },
            clouds: metar.clouds,
            conditions: metar.conditions,
            flightCategory: metar.flight_category,
            raw: metar.raw_text,
            observed: metar.observed
          };
        }
      }
    } catch (error) {
      console.error('Error fetching airport weather:', error);
    }

    // Return mock weather data for demo
    return {
      temperature: 15 + Math.random() * 10,
      dewpoint: 10 + Math.random() * 5,
      humidity: 60 + Math.random() * 30,
      pressure: 1013 + Math.random() * 20,
      visibility: 5000 + Math.random() * 5000,
      wind: {
        speed: Math.random() * 20,
        direction: Math.random() * 360,
        gust: Math.random() * 10
      },
      clouds: [{ type: 'SCT', altitude: 3000 }],
      conditions: ['Clear'],
      flightCategory: 'VFR',
      observed: new Date().toISOString()
    };
  }

  async getAirportDelays(icao) {
    // In production, fetch from FAA or Eurocontrol APIs
    // Mock data for demonstration
    const hasDelay = Math.random() > 0.7;
    
    return {
      departure: {
        average: hasDelay ? Math.floor(15 + Math.random() * 45) : 0,
        reason: hasDelay ? ['Weather', 'Traffic', 'Staff'][Math.floor(Math.random() * 3)] : null
      },
      arrival: {
        average: hasDelay ? Math.floor(10 + Math.random() * 30) : 0,
        reason: hasDelay ? ['Weather', 'Traffic', 'Gate availability'][Math.floor(Math.random() * 3)] : null
      },
      groundStop: false,
      groundDelay: hasDelay && Math.random() > 0.9
    };
  }

  async getAirportTraffic(icao) {
    // Calculate traffic based on airport location
    const airport = this.airports.get(icao);
    if (!airport) return null;

    // Fetch flights near airport
    const bbox = `${airport.latitude - 0.5},${airport.longitude - 0.5},${airport.latitude + 0.5},${airport.longitude + 0.5}`;
    
    try {
      const response = await fetch(`/api/flights?bbox=${bbox}`);
      if (response.ok) {
        const data = await response.json();
        
        // Categorize flights
        const departures = [];
        const arrivals = [];
        const overflights = [];
        
        data.flights?.forEach(flight => {
          const distance = this.calculateDistance(
            airport.latitude, 
            airport.longitude,
            flight.position.latitude,
            flight.position.longitude
          );
          
          if (distance < 10 && flight.position.altitude < 5000) {
            if (flight.position.verticalRate > 100) {
              departures.push(flight);
            } else if (flight.position.verticalRate < -100) {
              arrivals.push(flight);
            }
          } else if (distance < 50) {
            overflights.push(flight);
          }
        });
        
        return {
          departures: departures.length,
          arrivals: arrivals.length,
          overflights: overflights.length,
          total: data.flights?.length || 0,
          movements: departures.length + arrivals.length
        };
      }
    } catch (error) {
      console.error('Error fetching airport traffic:', error);
    }

    // Return mock data
    return {
      departures: Math.floor(Math.random() * 20),
      arrivals: Math.floor(Math.random() * 20),
      overflights: Math.floor(Math.random() * 50),
      total: Math.floor(Math.random() * 100),
      movements: Math.floor(Math.random() * 40)
    };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async searchAirports(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    for (const [code, airport] of this.airports) {
      // Skip duplicates (IATA entries)
      if (code.length === 3) continue;
      
      if (airport.name.toLowerCase().includes(searchTerm) ||
          airport.city.toLowerCase().includes(searchTerm) ||
          airport.country.toLowerCase().includes(searchTerm) ||
          airport.icao.toLowerCase().includes(searchTerm) ||
          airport.iata.toLowerCase().includes(searchTerm)) {
        results.push(airport);
      }
    }
    
    return results;
  }

  async getNearbyAirports(lat, lon, radius = 100) {
    const results = [];
    
    for (const [code, airport] of this.airports) {
      // Skip duplicates (IATA entries)
      if (code.length === 3) continue;
      
      const distance = this.calculateDistance(lat, lon, airport.latitude, airport.longitude);
      
      if (distance <= radius) {
        results.push({
          ...airport,
          distance: Math.round(distance)
        });
      }
    }
    
    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);
    
    return results;
  }
}

// Create singleton instance
const airportDB = new AirportDatabase();

// API Handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { code, query, lat, lon, radius, action = 'get' } = req.query;

    switch (action) {
      case 'get':
        if (!code) {
          return res.status(400).json({
            success: false,
            error: 'Airport code required (ICAO or IATA)'
          });
        }
        
        const airport = await airportDB.getAirport(code);
        
        if (!airport) {
          return res.status(404).json({
            success: false,
            error: 'Airport not found'
          });
        }
        
        return res.status(200).json({
          success: true,
          airport
        });

      case 'search':
        if (!query || query.length < 2) {
          return res.status(400).json({
            success: false,
            error: 'Search query must be at least 2 characters'
          });
        }
        
        const searchResults = await airportDB.searchAirports(query);
        
        return res.status(200).json({
          success: true,
          results: searchResults.slice(0, 20),
          count: searchResults.length
        });

      case 'nearby':
        if (!lat || !lon) {
          return res.status(400).json({
            success: false,
            error: 'Latitude and longitude required'
          });
        }
        
        const nearbyAirports = await airportDB.getNearbyAirports(
          parseFloat(lat),
          parseFloat(lon),
          parseFloat(radius) || 100
        );
        
        return res.status(200).json({
          success: true,
          airports: nearbyAirports,
          count: nearbyAirports.length
        });

      case 'weather':
        if (!code) {
          return res.status(400).json({
            success: false,
            error: 'Airport code required'
          });
        }
        
        const weather = await airportDB.getAirportWeather(code);
        
        return res.status(200).json({
          success: true,
          weather
        });

      case 'traffic':
        if (!code) {
          return res.status(400).json({
            success: false,
            error: 'Airport code required'
          });
        }
        
        const airport_data = await airportDB.getAirport(code);
        if (!airport_data) {
          return res.status(404).json({
            success: false,
            error: 'Airport not found'
          });
        }
        
        const traffic = await airportDB.getAirportTraffic(code);
        
        return res.status(200).json({
          success: true,
          traffic
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }
  } catch (error) {
    console.error('Airport API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Export for use in other modules
export { airportDB };