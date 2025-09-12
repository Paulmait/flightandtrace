// API Status endpoint for monitoring
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Test OpenSky API connectivity
  let openskyStatus = 'unknown';
  try {
    const response = await fetch('https://opensky-network.org/api/states/all?lamin=45&lomin=-10&lamax=50&lomax=5', {
      signal: AbortSignal.timeout(5000)
    });
    openskyStatus = response.ok ? 'operational' : 'degraded';
  } catch (error) {
    openskyStatus = 'down';
  }
  
  return res.status(200).json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'operational',
      opensky: openskyStatus,
      database: process.env.SUPABASE_URL ? 'configured' : 'not configured',
      maps: process.env.REACT_APP_MAPTILER_KEY ? 'configured' : 'not configured'
    },
    version: '1.0.0'
  });
}