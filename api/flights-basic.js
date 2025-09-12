// Basic flight API with CommonJS exports for Vercel
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Simple mock response
  res.status(200).json({
    success: true,
    count: 2,
    flights: [
      {
        id: "test1",
        icao24: "test1",
        callsign: "MOCK001",
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
        lastUpdate: Math.floor(Date.now() / 1000),
        status: "EN_ROUTE"
      },
      {
        id: "test2",
        icao24: "test2",
        callsign: "MOCK002",
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
        lastUpdate: Math.floor(Date.now() / 1000),
        status: "EN_ROUTE"
      }
    ],
    timestamp: new Date().toISOString(),
    source: 'mock-basic'
  });
};