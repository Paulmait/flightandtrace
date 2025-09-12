// Import flight data aggregator with multiple sources
import flightAggregator from './lib/flight-aggregator.js';


export default async function handler(req, res) {
  // Enable CORS - keep backward compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse query parameters
    let lamin, lomin, lamax, lomax;
    
    if (req.query.lat && req.query.lon && req.query.radius) {
      // Convert lat/lon/radius to bounding box
      const lat = parseFloat(req.query.lat);
      const lon = parseFloat(req.query.lon);
      const radius = parseFloat(req.query.radius) || 50;
      
      // Rough conversion: 1 degree latitude = ~111km
      const latDelta = radius / 111;
      const lonDelta = radius / (111 * Math.cos(lat * Math.PI / 180));
      
      lamin = lat - latDelta;
      lamax = lat + latDelta;
      lomin = lon - lonDelta;
      lomax = lon + lonDelta;
    } else if (req.query.bbox) {
      // Use provided bbox - handle both formats
      const bboxParts = req.query.bbox.split(',').map(Number);
      if (bboxParts.length === 4) {
        // Check if it's lon,lat,lon,lat format (common in mapping libraries)
        // by checking if the first and third values are similar (longitudes)
        // and second and fourth are similar (latitudes)
        const [a, b, c, d] = bboxParts;
        
        // If looks like minLon,minLat,maxLon,maxLat format
        if (Math.abs(a - c) > Math.abs(b - d)) {
          // Frontend format: minLon,minLat,maxLon,maxLat
          lomin = a;
          lamin = b;
          lomax = c;
          lamax = d;
        } else {
          // OpenSky format: lamin,lomin,lamax,lomax
          lamin = a;
          lomin = b;
          lamax = c;
          lomax = d;
        }
      }
    } else {
      // Default to Europe
      [lamin, lomin, lamax, lomax] = [-10, 40, 10, 60];
    }
    
    // Use the flight aggregator to get data from multiple sources
    const result = await flightAggregator.aggregateFlightData(lamin, lomin, lamax, lomax);
    
    // Add system health information
    if (req.query.includeHealth === 'true') {
      result.health = flightAggregator.getSystemHealth();
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Flight API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      flights: []
    });
  }
}