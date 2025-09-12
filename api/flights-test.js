// Simplest possible Vercel function - no dependencies
module.exports = (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Return hardcoded response
  res.status(200).json({
    success: true,
    count: 1,
    flights: [
      {
        id: "simple1",
        icao24: "simple1",
        callsign: "TEST123",
        position: {
          latitude: 51.5,
          longitude: -0.1,
          altitude: 30000,
          heading: 90,
          groundSpeed: 400,
          verticalRate: 0
        },
        origin: "Test",
        onGround: false,
        lastUpdate: 1234567890,
        status: "EN_ROUTE"
      }
    ],
    timestamp: new Date().toISOString(),
    source: "test"
  });
};