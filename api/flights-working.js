// Ultra-simple working flights API
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // For now, just return mock data to ensure it works
  const mockFlights = [
    {
      id: "mock1",
      icao24: "mock1",
      callsign: "TEST001",
      position: {
        latitude: 51.5074,
        longitude: -0.1278,
        altitude: 35000,
        heading: 90,
        groundSpeed: 450,
        verticalRate: 0
      },
      origin: "United Kingdom",
      onGround: false,
      lastUpdate: Date.now() / 1000,
      status: "EN_ROUTE"
    },
    {
      id: "mock2",
      icao24: "mock2",
      callsign: "TEST002",
      position: {
        latitude: 48.8566,
        longitude: 2.3522,
        altitude: 28000,
        heading: 180,
        groundSpeed: 420,
        verticalRate: -500
      },
      origin: "France",
      onGround: false,
      lastUpdate: Date.now() / 1000,
      status: "EN_ROUTE"
    },
    {
      id: "mock3",
      icao24: "mock3",
      callsign: "TEST003",
      position: {
        latitude: 52.5200,
        longitude: 13.4050,
        altitude: 0,
        heading: 0,
        groundSpeed: 0,
        verticalRate: 0
      },
      origin: "Germany",
      onGround: true,
      lastUpdate: Date.now() / 1000,
      status: "ON_GROUND"
    }
  ];
  
  // Return successful response with mock data
  res.status(200).json({
    success: true,
    count: mockFlights.length,
    flights: mockFlights,
    timestamp: new Date().toISOString(),
    source: 'mock-working'
  });
};