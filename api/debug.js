export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Check which environment variables are actually set
  const envCheck = {
    // OpenSky OAuth2 (new)
    OPENSKY_CLIENT_ID: !!process.env.OPENSKY_CLIENT_ID,
    OPENSKY_CLIENT_SECRET: !!process.env.OPENSKY_CLIENT_SECRET,
    
    // OpenSky Basic Auth (deprecated)
    OPENSKY_USERNAME: !!process.env.OPENSKY_USERNAME,
    OPENSKY_PASSWORD: !!process.env.OPENSKY_PASSWORD,
    
    // JWT/Auth
    JWT_SECRET: !!process.env.JWT_SECRET,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    INTERNAL_API_KEY: !!process.env.INTERNAL_API_KEY,
    
    // Stripe (checking both patterns)
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    FLIGHTTRACE_STRIPE_SECRET_KEY: !!process.env.FLIGHTTRACE_STRIPE_SECRET_KEY,
    FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY: !!process.env.FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY,
    
    // Weather
    OPENWEATHER_API_KEY: !!process.env.OPENWEATHER_API_KEY,
    
    // Firebase
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    REACT_APP_FIREBASE_API_KEY: !!process.env.REACT_APP_FIREBASE_API_KEY,
    
    // Cesium
    REACT_APP_CESIUM_TOKEN: !!process.env.REACT_APP_CESIUM_TOKEN,
    
    // Redis
    REDIS_URL: !!process.env.REDIS_URL,
    
    // SendGrid
    SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
  };
  
  // Count how many are set
  const totalVars = Object.keys(envCheck).length;
  const setVars = Object.values(envCheck).filter(v => v).length;
  
  // Get first few characters of critical vars (for debugging)
  const preview = {};
  if (process.env.OPENSKY_CLIENT_ID) {
    preview.OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID.substring(0, 4) + '***';
  }
  if (process.env.OPENSKY_USERNAME) {
    preview.OPENSKY_USERNAME = process.env.OPENSKY_USERNAME.substring(0, 4) + '***';
  }
  if (process.env.JWT_SECRET) {
    preview.JWT_SECRET = process.env.JWT_SECRET.substring(0, 4) + '***';
  }
  
  res.status(200).json({
    success: true,
    message: 'Environment variable debug info',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    variables: {
      total: totalVars,
      configured: setVars,
      missing: totalVars - setVars,
      details: envCheck
    },
    preview,
    recommendation: setVars === 0 
      ? '⚠️ No environment variables detected. You may need to redeploy or check Vercel settings.'
      : setVars < 5
      ? '⚠️ Some critical environment variables are missing.'
      : '✅ Environment variables are configured.'
  });
}