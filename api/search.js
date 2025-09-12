// Advanced Flight Search API
import flightAggregator from './lib/flight-aggregator.js';

// Airport database (sample - in production, use a proper database)
const AIRPORTS = {
  'JFK': { name: 'John F Kennedy Intl', lat: 40.6413, lon: -73.7781, iata: 'JFK', icao: 'KJFK' },
  'LAX': { name: 'Los Angeles Intl', lat: 33.9425, lon: -118.4081, iata: 'LAX', icao: 'KLAX' },
  'LHR': { name: 'London Heathrow', lat: 51.4700, lon: -0.4543, iata: 'LHR', icao: 'EGLL' },
  'CDG': { name: 'Charles de Gaulle', lat: 49.0097, lon: 2.5479, iata: 'CDG', icao: 'LFPG' },
  'DXB': { name: 'Dubai Intl', lat: 25.2532, lon: 55.3657, iata: 'DXB', icao: 'OMDB' },
  'SIN': { name: 'Singapore Changi', lat: 1.3644, lon: 103.9915, iata: 'SIN', icao: 'WSSS' },
  'HND': { name: 'Tokyo Haneda', lat: 35.5494, lon: 139.7798, iata: 'HND', icao: 'RJTT' },
  'SYD': { name: 'Sydney Kingsford Smith', lat: -33.9399, lon: 151.1753, iata: 'SYD', icao: 'YSSY' },
  'FRA': { name: 'Frankfurt', lat: 50.0379, lon: 8.5622, iata: 'FRA', icao: 'EDDF' },
  'AMS': { name: 'Amsterdam Schiphol', lat: 52.3105, lon: 4.7683, iata: 'AMS', icao: 'EHAM' }
};

// Airline database (sample)
const AIRLINES = {
  'AA': 'American Airlines',
  'DL': 'Delta Air Lines',
  'UA': 'United Airlines',
  'BA': 'British Airways',
  'LH': 'Lufthansa',
  'AF': 'Air France',
  'EK': 'Emirates',
  'SQ': 'Singapore Airlines',
  'QF': 'Qantas',
  'NH': 'All Nippon Airways',
  'RYR': 'Ryanair',
  'EZY': 'easyJet',
  'SWA': 'Southwest Airlines',
  'JBU': 'JetBlue',
  'AAL': 'American Airlines',
  'UAL': 'United Airlines',
  'DAL': 'Delta Air Lines',
  'BAW': 'British Airways',
  'DLH': 'Lufthansa',
  'AFR': 'Air France'
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { 
      query,      // Search query (flight number, callsign, registration, etc.)
      type,       // Search type: 'flight', 'route', 'airport', 'aircraft'
      origin,     // Origin airport (IATA/ICAO)
      destination,// Destination airport (IATA/ICAO)
      airline,    // Airline code
      aircraft,   // Aircraft type
      registration, // Aircraft registration
      lat,        // Center latitude for area search
      lon,        // Center longitude for area search
      radius      // Search radius in km
    } = req.query;
    
    // Validate search parameters
    if (!query && !origin && !destination && !airline && !aircraft && !registration && !lat) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one search parameter'
      });
    }
    
    let results = {
      flights: [],
      routes: [],
      airports: [],
      aircraft: []
    };
    
    // Search by flight number or callsign
    if (query) {
      const upperQuery = query.toUpperCase().trim();
      
      // Check if it's an airport code
      const airport = findAirport(upperQuery);
      if (airport) {
        results.airports.push(airport);
        // Get flights around this airport
        const nearbyFlights = await searchFlightsNearAirport(airport);
        results.flights.push(...nearbyFlights);
      }
      
      // Check if it's an airline code
      const airlineName = AIRLINES[upperQuery];
      if (airlineName) {
        const airlineFlights = await searchFlightsByAirline(upperQuery);
        results.flights.push(...airlineFlights);
      }
      
      // Search for specific flight
      if (upperQuery.match(/^[A-Z]{2,3}\d{1,4}$/)) {
        const flight = await searchFlightByNumber(upperQuery);
        if (flight) {
          results.flights.push(flight);
        }
      }
      
      // Search by registration
      if (upperQuery.match(/^[A-Z]-/)) {
        const regFlights = await searchByRegistration(upperQuery);
        results.flights.push(...regFlights);
      }
    }
    
    // Search by route
    if (origin && destination) {
      const routeFlights = await searchRoute(origin, destination);
      results.routes.push({
        origin: findAirport(origin),
        destination: findAirport(destination),
        flights: routeFlights,
        distance: calculateDistance(
          findAirport(origin),
          findAirport(destination)
        )
      });
      results.flights.push(...routeFlights);
    }
    
    // Search by area
    if (lat && lon) {
      const areaFlights = await searchFlightsByArea(
        parseFloat(lat),
        parseFloat(lon),
        parseFloat(radius) || 100
      );
      results.flights.push(...areaFlights);
    }
    
    // Remove duplicates
    results.flights = removeDuplicateFlights(results.flights);
    
    // Sort results by relevance
    results.flights = sortByRelevance(results.flights, query);
    
    res.status(200).json({
      success: true,
      query: req.query,
      timestamp: new Date().toISOString(),
      count: {
        flights: results.flights.length,
        routes: results.routes.length,
        airports: results.airports.length,
        aircraft: results.aircraft.length
      },
      results
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Helper functions
function findAirport(code) {
  const upper = code.toUpperCase();
  const airport = AIRPORTS[upper];
  if (airport) return airport;
  
  // Search by ICAO code
  return Object.values(AIRPORTS).find(a => a.icao === upper);
}

async function searchFlightsNearAirport(airport) {
  if (!airport) return [];
  
  // Search within 50km of airport
  const radiusKm = 50;
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(airport.lat * Math.PI / 180));
  
  const result = await flightAggregator.aggregateFlightData(
    airport.lat - latDelta,
    airport.lon - lonDelta,
    airport.lat + latDelta,
    airport.lon + lonDelta
  );
  
  return result.flights || [];
}

async function searchFlightsByAirline(airlineCode) {
  // Get all flights and filter by airline code
  const result = await flightAggregator.aggregateFlightData(-90, -180, 90, 180);
  
  return (result.flights || []).filter(flight => {
    const callsign = flight.callsign || '';
    return callsign.startsWith(airlineCode);
  });
}

async function searchFlightByNumber(flightNumber) {
  // Get all flights and find specific flight
  const result = await flightAggregator.aggregateFlightData(-90, -180, 90, 180);
  
  return (result.flights || []).find(flight => {
    const callsign = (flight.callsign || '').replace(/\s/g, '');
    return callsign === flightNumber;
  });
}

async function searchByRegistration(registration) {
  const result = await flightAggregator.aggregateFlightData(-90, -180, 90, 180);
  
  return (result.flights || []).filter(flight => {
    return flight.registration === registration;
  });
}

async function searchRoute(originCode, destCode) {
  const origin = findAirport(originCode);
  const dest = findAirport(destCode);
  
  if (!origin || !dest) return [];
  
  // Get flights between two airports
  // This is a simplified version - in production, use actual route data
  const allFlights = await searchFlightsNearAirport(origin);
  
  // Filter flights that appear to be heading toward destination
  return allFlights.filter(flight => {
    const bearing = calculateBearing(
      flight.position.latitude,
      flight.position.longitude,
      dest.lat,
      dest.lon
    );
    
    const headingDiff = Math.abs(flight.position.heading - bearing);
    return headingDiff < 45 || headingDiff > 315; // Within 45 degrees
  });
}

async function searchFlightsByArea(lat, lon, radius) {
  const latDelta = radius / 111;
  const lonDelta = radius / (111 * Math.cos(lat * Math.PI / 180));
  
  const result = await flightAggregator.aggregateFlightData(
    lat - latDelta,
    lon - lonDelta,
    lat + latDelta,
    lon + lonDelta
  );
  
  return result.flights || [];
}

function removeDuplicateFlights(flights) {
  const seen = new Set();
  return flights.filter(flight => {
    const key = flight.icao24 || flight.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByRelevance(flights, query) {
  if (!query) return flights;
  
  const upperQuery = query.toUpperCase();
  
  return flights.sort((a, b) => {
    // Exact match gets highest priority
    const aExact = (a.callsign || '').includes(upperQuery) ? 1 : 0;
    const bExact = (b.callsign || '').includes(upperQuery) ? 1 : 0;
    
    if (aExact !== bExact) return bExact - aExact;
    
    // Then sort by altitude (higher flights typically more interesting)
    return (b.position?.altitude || 0) - (a.position?.altitude || 0);
  });
}

function calculateDistance(airport1, airport2) {
  if (!airport1 || !airport2) return 0;
  
  const R = 6371; // Earth radius in km
  const dLat = (airport2.lat - airport1.lat) * Math.PI / 180;
  const dLon = (airport2.lon - airport1.lon) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(airport1.lat * Math.PI / 180) * Math.cos(airport2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}