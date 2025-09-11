export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Return test response
  res.status(200).json({
    success: true,
    message: '✅ API is working correctly!',
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      hasOpenSkyConfig: !!(process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD),
      hasJWTSecret: !!process.env.JWT_SECRET,
      hasRedis: !!process.env.REDIS_URL,
      hasSupabase: !!process.env.REACT_APP_SUPABASE_URL
    },
    endpoints: {
      flights: '/api/flights',
      airports: '/api/airports',
      aircraft: '/api/aircraft-database',
      weather: '/api/weather',
      websocket: '/api/websocket'
    },
    status: 'READY'
  });
}