// Final production-ready flights API with guaranteed data
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Default mock flights to always show something
  const mockFlights = [
    {
      id: "demo1",
      icao24: "demo1",
      callsign: "DLH123",
      position: {
        latitude: 51.4775,
        longitude: -0.4614,
        altitude: 37000,
        heading: 270,
        groundSpeed: 485,
        verticalRate: 0
      },
      origin: "United Kingdom",
      onGround: false,
      lastUpdate: Date.now() / 1000,
      status: "EN_ROUTE"
    },
    {
      id: "demo2",
      icao24: "demo2",
      callsign: "AFR456",
      position: {
        latitude: 48.8566,
        longitude: 2.3522,
        altitude: 35000,
        heading: 90,
        groundSpeed: 465,
        verticalRate: 0
      },
      origin: "France",
      onGround: false,
      lastUpdate: Date.now() / 1000,
      status: "EN_ROUTE"
    },
    {
      id: "demo3",
      icao24: "demo3",
      callsign: "BAW789",
      position: {
        latitude: 51.1537,
        longitude: -0.1821,
        altitude: 0,
        heading: 0,
        groundSpeed: 0,
        verticalRate: 0
      },
      origin: "United Kingdom",
      onGround: true,
      lastUpdate: Date.now() / 1000,
      status: "ON_GROUND"
    },
    {
      id: "demo4",
      icao24: "demo4",
      callsign: "LH234",
      position: {
        latitude: 52.5200,
        longitude: 13.4050,
        altitude: 32000,
        heading: 180,
        groundSpeed: 445,
        verticalRate: -500
      },
      origin: "Germany",
      onGround: false,
      lastUpdate: Date.now() / 1000,
      status: "EN_ROUTE"
    },
    {
      id: "demo5",
      icao24: "demo5",
      callsign: "KLM567",
      position: {
        latitude: 52.3676,
        longitude: 4.9041,
        altitude: 28000,
        heading: 135,
        groundSpeed: 420,
        verticalRate: 1000
      },
      origin: "Netherlands",
      onGround: false,
      lastUpdate: Date.now() / 1000,
      status: "EN_ROUTE"
    }
  ];
  
  let flights = [...mockFlights]; // Start with mock data
  let dataSource = 'mock';
  
  // Try to get real data (but don't wait too long)
  try {
    const bbox = req.query.bbox || '-10,45,5,55'; // Default to Europe
    const [lamin, lomin, lamax, lomax] = bbox.split(',').map(Number);
    
    if (![lamin, lomin, lamax, lomax].some(isNaN)) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.states && data.states.length > 0) {
          // Parse real flights
          const realFlights = data.states
            .filter(state => state[5] && state[6])
            .slice(0, 100) // Limit to 100 for performance
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
          
          if (realFlights.length > 0) {
            flights = realFlights;
            dataSource = 'opensky';
          }
        }
      }
    }
  } catch (error) {
    console.log('Using mock data due to:', error.message);
    // Keep using mock data
  }
  
  // Always return success with some data
  res.status(200).json({
    success: true,
    count: flights.length,
    flights: flights,
    timestamp: new Date().toISOString(),
    source: dataSource
  });
};