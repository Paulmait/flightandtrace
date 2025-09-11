import cacheManager from './lib/cache.js';

// Aircraft database with registration, model, operator information
class AircraftDatabase {
  constructor() {
    // Initialize with sample data - in production, this would connect to a real database
    this.database = new Map();
    this.initializeSampleData();
  }

  initializeSampleData() {
    // Sample aircraft data
    const sampleAircraft = [
      {
        icao24: '4b1805',
        registration: 'HB-JCO',
        manufacturer: 'Bombardier',
        model: 'CS300',
        typecode: 'BCS3',
        operator: 'Swiss International Air Lines',
        operatorIcao: 'SWR',
        built: 2016,
        engines: 'Pratt & Whitney PW1524G',
        imageUrl: 'https://cdn.jetphotos.com/400/6/12345_1234567890.jpg'
      },
      {
        icao24: '3c6444',
        registration: 'D-AIUO',
        manufacturer: 'Airbus',
        model: 'A320-214',
        typecode: 'A320',
        operator: 'Lufthansa',
        operatorIcao: 'DLH',
        built: 2014,
        engines: 'CFM56-5B4/3',
        imageUrl: 'https://cdn.jetphotos.com/400/6/23456_2345678901.jpg'
      },
      {
        icao24: 'a00001',
        registration: 'N100AN',
        manufacturer: 'Boeing',
        model: '737-823',
        typecode: 'B738',
        operator: 'American Airlines',
        operatorIcao: 'AAL',
        built: 2009,
        engines: 'CFM56-7B27',
        imageUrl: 'https://cdn.jetphotos.com/400/6/34567_3456789012.jpg'
      }
    ];

    sampleAircraft.forEach(aircraft => {
      this.database.set(aircraft.icao24, aircraft);
    });
  }

  async getAircraftByIcao24(icao24) {
    // Check cache first
    const cacheKey = `aircraft:${icao24}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check local database
    let aircraft = this.database.get(icao24.toLowerCase());
    
    if (!aircraft) {
      // Try to fetch from external API (OpenSky, etc.)
      aircraft = await this.fetchFromExternalAPI(icao24);
    }

    if (aircraft) {
      // Cache for 24 hours
      await cacheManager.set(cacheKey, aircraft, 86400);
    }

    return aircraft;
  }

  async fetchFromExternalAPI(icao24) {
    try {
      // Try OpenSky Network metadata endpoint
      const response = await fetch(
        `https://opensky-network.org/api/metadata/aircraft/icao/${icao24}`,
        {
          headers: process.env.OPENSKY_USERNAME ? {
            'Authorization': 'Basic ' + Buffer.from(
              `${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`
            ).toString('base64')
          } : {}
        }
      );

      if (response.ok) {
        const data = await response.json();
        return this.transformOpenSkyMetadata(data);
      }
    } catch (error) {
      console.error('Error fetching aircraft metadata:', error);
    }

    // Return basic info if external fetch fails
    return {
      icao24,
      registration: 'Unknown',
      manufacturer: 'Unknown',
      model: 'Unknown',
      typecode: 'Unknown',
      operator: 'Unknown'
    };
  }

  transformOpenSkyMetadata(data) {
    return {
      icao24: data.icao24,
      registration: data.registration || 'Unknown',
      manufacturer: data.manufacturername || 'Unknown',
      model: data.model || 'Unknown',
      typecode: data.typecode || 'Unknown',
      operator: data.owner || 'Unknown',
      operatorIcao: data.operatoricao,
      built: data.built,
      engines: data.engines,
      serialNumber: data.serialnumber,
      lineNumber: data.linenumber,
      firstFlightDate: data.firstflightdate,
      registrationDate: data.reguntil,
      country: data.country
    };
  }

  async searchByRegistration(registration) {
    const results = [];
    
    // Search in local database
    for (const [icao24, aircraft] of this.database) {
      if (aircraft.registration.toLowerCase().includes(registration.toLowerCase())) {
        results.push(aircraft);
      }
    }

    return results;
  }

  async searchByOperator(operator) {
    const results = [];
    
    // Search in local database
    for (const [icao24, aircraft] of this.database) {
      if (aircraft.operator.toLowerCase().includes(operator.toLowerCase())) {
        results.push(aircraft);
      }
    }

    return results;
  }

  async getAircraftImage(icao24) {
    const aircraft = await this.getAircraftByIcao24(icao24);
    
    if (aircraft && aircraft.imageUrl) {
      return aircraft.imageUrl;
    }

    // Try to fetch from planespotters.net or other sources
    try {
      const registration = aircraft?.registration;
      if (registration && registration !== 'Unknown') {
        // This would need proper API integration
        return `https://cdn.planespotters.net/photo/${registration}_400.jpg`;
      }
    } catch (error) {
      console.error('Error fetching aircraft image:', error);
    }

    // Return placeholder image
    return '/images/aircraft-placeholder.png';
  }

  getAircraftStatistics() {
    const stats = {
      totalAircraft: this.database.size,
      byManufacturer: {},
      byOperator: {},
      byType: {}
    };

    for (const aircraft of this.database.values()) {
      // By manufacturer
      stats.byManufacturer[aircraft.manufacturer] = 
        (stats.byManufacturer[aircraft.manufacturer] || 0) + 1;
      
      // By operator
      stats.byOperator[aircraft.operator] = 
        (stats.byOperator[aircraft.operator] || 0) + 1;
      
      // By type
      stats.byType[aircraft.typecode] = 
        (stats.byType[aircraft.typecode] || 0) + 1;
    }

    return stats;
  }
}

// Create singleton instance
const aircraftDB = new AircraftDatabase();

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
    const { icao24, registration, operator, action = 'get' } = req.query;

    switch (action) {
      case 'get':
        if (!icao24) {
          return res.status(400).json({
            success: false,
            error: 'ICAO24 required'
          });
        }
        
        const aircraft = await aircraftDB.getAircraftByIcao24(icao24);
        
        if (!aircraft) {
          return res.status(404).json({
            success: false,
            error: 'Aircraft not found'
          });
        }
        
        return res.status(200).json({
          success: true,
          aircraft,
          cached: res.getHeader('X-Cache') === 'HIT'
        });

      case 'search':
        let results = [];
        
        if (registration) {
          results = await aircraftDB.searchByRegistration(registration);
        } else if (operator) {
          results = await aircraftDB.searchByOperator(operator);
        } else {
          return res.status(400).json({
            success: false,
            error: 'Search parameter required (registration or operator)'
          });
        }
        
        return res.status(200).json({
          success: true,
          results,
          count: results.length
        });

      case 'image':
        if (!icao24) {
          return res.status(400).json({
            success: false,
            error: 'ICAO24 required'
          });
        }
        
        const imageUrl = await aircraftDB.getAircraftImage(icao24);
        
        return res.status(200).json({
          success: true,
          imageUrl
        });

      case 'stats':
        const stats = aircraftDB.getAircraftStatistics();
        
        return res.status(200).json({
          success: true,
          statistics: stats
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }
  } catch (error) {
    console.error('Aircraft database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Export for use in other modules
export { aircraftDB };