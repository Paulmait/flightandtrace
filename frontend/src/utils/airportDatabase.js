// Major airport database with IATA, ICAO codes, cities, and timezones
const AIRPORTS = {
  // North America
  'JFK': { icao: 'KJFK', city: 'New York', name: 'John F. Kennedy International', lat: 40.6413, lon: -73.7781, timezone: 'EST (UTC-5)' },
  'LAX': { icao: 'KLAX', city: 'Los Angeles', name: 'Los Angeles International', lat: 33.9425, lon: -118.4081, timezone: 'PST (UTC-8)' },
  'ORD': { icao: 'KORD', city: 'Chicago', name: "O'Hare International", lat: 41.9742, lon: -87.9073, timezone: 'CST (UTC-6)' },
  'ATL': { icao: 'KATL', city: 'Atlanta', name: 'Hartsfield-Jackson', lat: 33.6407, lon: -84.4277, timezone: 'EST (UTC-5)' },
  'DFW': { icao: 'KDFW', city: 'Dallas', name: 'Dallas/Fort Worth', lat: 32.8998, lon: -97.0403, timezone: 'CST (UTC-6)' },
  'DEN': { icao: 'KDEN', city: 'Denver', name: 'Denver International', lat: 39.8561, lon: -104.6737, timezone: 'MST (UTC-7)' },
  'SFO': { icao: 'KSFO', city: 'San Francisco', name: 'San Francisco International', lat: 37.6213, lon: -122.3790, timezone: 'PST (UTC-8)' },
  'SEA': { icao: 'KSEA', city: 'Seattle', name: 'Seattle-Tacoma', lat: 47.4502, lon: -122.3088, timezone: 'PST (UTC-8)' },
  'LAS': { icao: 'KLAS', city: 'Las Vegas', name: 'Harry Reid International', lat: 36.0840, lon: -115.1537, timezone: 'PST (UTC-8)' },
  'MCO': { icao: 'KMCO', city: 'Orlando', name: 'Orlando International', lat: 28.4312, lon: -81.3081, timezone: 'EST (UTC-5)' },
  'MIA': { icao: 'KMIA', city: 'Miami', name: 'Miami International', lat: 25.7959, lon: -80.2870, timezone: 'EST (UTC-5)' },
  'FLL': { icao: 'KFLL', city: 'Fort Lauderdale', name: 'Fort Lauderdale-Hollywood', lat: 26.0742, lon: -80.1506, timezone: 'EST (UTC-5)' },
  'PHX': { icao: 'KPHX', city: 'Phoenix', name: 'Phoenix Sky Harbor', lat: 33.4370, lon: -112.0078, timezone: 'MST (UTC-7)' },
  'BOS': { icao: 'KBOS', city: 'Boston', name: 'Logan International', lat: 42.3656, lon: -71.0096, timezone: 'EST (UTC-5)' },
  'EWR': { icao: 'KEWR', city: 'Newark', name: 'Newark Liberty', lat: 40.6895, lon: -74.1745, timezone: 'EST (UTC-5)' },
  'IAH': { icao: 'KIAH', city: 'Houston', name: 'George Bush Intercontinental', lat: 29.9902, lon: -95.3368, timezone: 'CST (UTC-6)' },
  'YYZ': { icao: 'CYYZ', city: 'Toronto', name: 'Toronto Pearson', lat: 43.6777, lon: -79.6248, timezone: 'EST (UTC-5)' },
  'YVR': { icao: 'CYVR', city: 'Vancouver', name: 'Vancouver International', lat: 49.1947, lon: -123.1840, timezone: 'PST (UTC-8)' },
  'MEX': { icao: 'MMMX', city: 'Mexico City', name: 'Mexico City International', lat: 19.4363, lon: -99.0721, timezone: 'CST (UTC-6)' },
  'KIN': { icao: 'MKJP', city: 'Kingston', name: 'Norman Manley International', lat: 17.9357, lon: -76.7875, timezone: 'EST (UTC-5)' },
  
  // Europe
  'LHR': { icao: 'EGLL', city: 'London', name: 'Heathrow', lat: 51.4700, lon: -0.4543, timezone: 'GMT (UTC+0)' },
  'CDG': { icao: 'LFPG', city: 'Paris', name: 'Charles de Gaulle', lat: 49.0097, lon: 2.5479, timezone: 'CET (UTC+1)' },
  'FRA': { icao: 'EDDF', city: 'Frankfurt', name: 'Frankfurt Airport', lat: 50.0379, lon: 8.5622, timezone: 'CET (UTC+1)' },
  'AMS': { icao: 'EHAM', city: 'Amsterdam', name: 'Schiphol', lat: 52.3105, lon: 4.7683, timezone: 'CET (UTC+1)' },
  'MAD': { icao: 'LEMD', city: 'Madrid', name: 'Adolfo Suárez Madrid-Barajas', lat: 40.4983, lon: -3.5676, timezone: 'CET (UTC+1)' },
  'BCN': { icao: 'LEBL', city: 'Barcelona', name: 'Barcelona-El Prat', lat: 41.2974, lon: 2.0833, timezone: 'CET (UTC+1)' },
  'FCO': { icao: 'LIRF', city: 'Rome', name: 'Leonardo da Vinci-Fiumicino', lat: 41.8003, lon: 12.2389, timezone: 'CET (UTC+1)' },
  'MUC': { icao: 'EDDM', city: 'Munich', name: 'Munich Airport', lat: 48.3538, lon: 11.7861, timezone: 'CET (UTC+1)' },
  'ZRH': { icao: 'LSZH', city: 'Zurich', name: 'Zurich Airport', lat: 47.4647, lon: 8.5492, timezone: 'CET (UTC+1)' },
  'VIE': { icao: 'LOWW', city: 'Vienna', name: 'Vienna International', lat: 48.1103, lon: 16.5697, timezone: 'CET (UTC+1)' },
  'DUB': { icao: 'EIDW', city: 'Dublin', name: 'Dublin Airport', lat: 53.4264, lon: -6.2499, timezone: 'GMT (UTC+0)' },
  'IST': { icao: 'LTFM', city: 'Istanbul', name: 'Istanbul Airport', lat: 41.2627, lon: 28.7419, timezone: 'TRT (UTC+3)' },
  
  // Asia Pacific
  'NRT': { icao: 'RJAA', city: 'Tokyo', name: 'Narita International', lat: 35.7720, lon: 140.3929, timezone: 'JST (UTC+9)' },
  'HND': { icao: 'RJTT', city: 'Tokyo', name: 'Haneda', lat: 35.5494, lon: 139.7798, timezone: 'JST (UTC+9)' },
  'PEK': { icao: 'ZBAA', city: 'Beijing', name: 'Beijing Capital', lat: 40.0799, lon: 116.6031, timezone: 'CST (UTC+8)' },
  'PVG': { icao: 'ZSPD', city: 'Shanghai', name: 'Shanghai Pudong', lat: 31.1443, lon: 121.8083, timezone: 'CST (UTC+8)' },
  'HKG': { icao: 'VHHH', city: 'Hong Kong', name: 'Hong Kong International', lat: 22.3080, lon: 113.9185, timezone: 'HKT (UTC+8)' },
  'SIN': { icao: 'WSSS', city: 'Singapore', name: 'Singapore Changi', lat: 1.3644, lon: 103.9915, timezone: 'SGT (UTC+8)' },
  'ICN': { icao: 'RKSI', city: 'Seoul', name: 'Incheon International', lat: 37.4602, lon: 126.4407, timezone: 'KST (UTC+9)' },
  'BKK': { icao: 'VTBS', city: 'Bangkok', name: 'Suvarnabhumi', lat: 13.6900, lon: 100.7501, timezone: 'ICT (UTC+7)' },
  'DEL': { icao: 'VIDP', city: 'New Delhi', name: 'Indira Gandhi International', lat: 28.5562, lon: 77.1000, timezone: 'IST (UTC+5:30)' },
  'BOM': { icao: 'VABB', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj', lat: 19.0896, lon: 72.8656, timezone: 'IST (UTC+5:30)' },
  'SYD': { icao: 'YSSY', city: 'Sydney', name: 'Sydney Kingsford Smith', lat: -33.9399, lon: 151.1753, timezone: 'AEST (UTC+10)' },
  'MEL': { icao: 'YMML', city: 'Melbourne', name: 'Melbourne Airport', lat: -37.6733, lon: 144.8433, timezone: 'AEST (UTC+10)' },
  
  // Middle East & Africa
  'DXB': { icao: 'OMDB', city: 'Dubai', name: 'Dubai International', lat: 25.2532, lon: 55.3657, timezone: 'GST (UTC+4)' },
  'DOH': { icao: 'OTHH', city: 'Doha', name: 'Hamad International', lat: 25.2619, lon: 51.6138, timezone: 'AST (UTC+3)' },
  'JNB': { icao: 'FAOR', city: 'Johannesburg', name: 'O.R. Tambo International', lat: -26.1392, lon: 28.2460, timezone: 'SAST (UTC+2)' },
  'CAI': { icao: 'HECA', city: 'Cairo', name: 'Cairo International', lat: 30.1219, lon: 31.4056, timezone: 'EET (UTC+2)' },
  
  // South America
  'GRU': { icao: 'SBGR', city: 'São Paulo', name: 'São Paulo-Guarulhos', lat: -23.4356, lon: -46.4731, timezone: 'BRT (UTC-3)' },
  'GIG': { icao: 'SBGL', city: 'Rio de Janeiro', name: 'Rio de Janeiro-Galeão', lat: -22.8099, lon: -43.2505, timezone: 'BRT (UTC-3)' },
  'EZE': { icao: 'SAEZ', city: 'Buenos Aires', name: 'Ministro Pistarini', lat: -34.8222, lon: -58.5358, timezone: 'ART (UTC-3)' },
  'SCL': { icao: 'SCEL', city: 'Santiago', name: 'Comodoro Arturo Merino Benítez', lat: -33.3930, lon: -70.7858, timezone: 'CLT (UTC-3)' },
  'BOG': { icao: 'SKBO', city: 'Bogotá', name: 'El Dorado International', lat: 4.7016, lon: -74.1469, timezone: 'COT (UTC-5)' },
  'LIM': { icao: 'SPJC', city: 'Lima', name: 'Jorge Chávez International', lat: -12.0219, lon: -77.1143, timezone: 'PET (UTC-5)' }
};

// Function to get airport info by IATA or ICAO code
export const getAirportInfo = (code) => {
  if (!code) {
    return {
      iata: 'N/A',
      icao: 'N/A',
      city: 'Unknown',
      name: 'Unknown Airport',
      lat: 0,
      lon: 0,
      timezone: 'UTC'
    };
  }
  
  // Check if it's IATA code (3 letters)
  const upperCode = code.toUpperCase();
  if (AIRPORTS[upperCode]) {
    return {
      iata: upperCode,
      ...AIRPORTS[upperCode]
    };
  }
  
  // Check if it's ICAO code (4 letters)
  const airport = Object.entries(AIRPORTS).find(([iata, data]) => data.icao === upperCode);
  if (airport) {
    return {
      iata: airport[0],
      ...airport[1]
    };
  }
  
  // Generate approximate data for unknown airports
  return {
    iata: code.length === 3 ? upperCode : 'N/A',
    icao: code.length === 4 ? upperCode : 'N/A',
    city: 'Unknown',
    name: `Airport ${upperCode}`,
    lat: 0,
    lon: 0,
    timezone: 'UTC'
  };
};

// Function to estimate origin and destination from position and heading
export const estimateRoute = (lat, lon, heading, callsign) => {
  // This is a simplified estimation - in production you'd use more sophisticated methods
  // Based on common routes and callsign patterns
  
  if (!callsign) {
    return { origin: 'UNKNOWN', destination: 'UNKNOWN' };
  }
  
  const prefix = callsign.substring(0, 3).toUpperCase();
  
  // Common route patterns based on airline and region
  const routePatterns = {
    'AAL': { // American Airlines
      atlantic: { origin: 'JFK', destination: 'LHR' },
      pacific: { origin: 'LAX', destination: 'NRT' },
      domestic: { origin: 'DFW', destination: 'ORD' }
    },
    'UAL': { // United Airlines
      atlantic: { origin: 'EWR', destination: 'FRA' },
      pacific: { origin: 'SFO', destination: 'HKG' },
      domestic: { origin: 'ORD', destination: 'DEN' }
    },
    'DAL': { // Delta
      atlantic: { origin: 'ATL', destination: 'CDG' },
      pacific: { origin: 'SEA', destination: 'ICN' },
      domestic: { origin: 'ATL', destination: 'LAX' }
    },
    'JBU': { // JetBlue
      caribbean: { origin: 'JFK', destination: 'KIN' },
      domestic: { origin: 'BOS', destination: 'FLL' }
    },
    'BAW': { // British Airways
      transatlantic: { origin: 'LHR', destination: 'JFK' }
    },
    'DLH': { // Lufthansa
      transatlantic: { origin: 'FRA', destination: 'ORD' }
    },
    'AFR': { // Air France
      transatlantic: { origin: 'CDG', destination: 'JFK' }
    },
    'UAE': { // Emirates
      longhaul: { origin: 'DXB', destination: 'JFK' }
    }
  };
  
  // Determine region based on coordinates
  let region = 'domestic';
  if (lat > 40 && lon > -30 && lon < 40) region = 'atlantic';
  if (lat > 20 && lat < 50 && lon > 100) region = 'pacific';
  if (lat > 10 && lat < 30 && lon > -90 && lon < -60) region = 'caribbean';
  
  const routes = routePatterns[prefix];
  if (routes) {
    const route = routes[region] || routes.domestic || Object.values(routes)[0];
    
    // Determine direction based on heading
    if (heading > 180) {
      return { origin: route.destination, destination: route.origin };
    }
    return route;
  }
  
  // Default fallback
  return { origin: 'UNKNOWN', destination: 'UNKNOWN' };
};

export default AIRPORTS;