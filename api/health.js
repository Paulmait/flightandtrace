export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const services = {
    opensky: {
      enabled: !!process.env.OPENSKY_USERNAME,
      hasCredentials: !!(process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD)
    },
    adsb: {
      enabled: !!process.env.ADSB_EXCHANGE_API_KEY,
      configured: true
    },
    weather: {
      enabled: !!process.env.OPENWEATHER_API_KEY,
      configured: true
    },
    sentry: {
      enabled: !!process.env.REACT_APP_SENTRY_DSN,
      configured: true
    },
    maptiler: {
      enabled: !!process.env.REACT_APP_MAPTILER_KEY,
      configured: true
    },
    firebase: {
      enabled: !!process.env.REACT_APP_FIREBASE_API_KEY,
      configured: true
    },
    supabase: {
      enabled: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY
    }
  };

  // Test OpenSky connection
  let openskyStatus = 'not configured';
  if (services.opensky.enabled) {
    try {
      const testUrl = 'https://opensky-network.org/api/states/all?lamin=45&lomin=-10&lamax=50&lomax=5';
      const response = await fetch(testUrl, { 
        timeout: 5000,
        headers: services.opensky.hasCredentials ? {
          'Authorization': 'Basic ' + Buffer.from(`${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`).toString('base64')
        } : {}
      });
      openskyStatus = response.ok ? 'connected' : `error: ${response.status}`;
    } catch (error) {
      openskyStatus = `error: ${error.message}`;
    }
  }

  // Test ADS-B Exchange
  let adsbStatus = 'not configured';
  if (services.adsb.enabled) {
    try {
      const testUrl = 'https://adsbexchange-com1.p.rapidapi.com/v2/lat/40/lon/-74/dist/10/';
      const response = await fetch(testUrl, {
        timeout: 5000,
        headers: {
          'X-RapidAPI-Key': process.env.ADSB_EXCHANGE_API_KEY,
          'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com'
        }
      });
      adsbStatus = response.ok ? 'connected' : `error: ${response.status}`;
    } catch (error) {
      adsbStatus = `error: ${error.message}`;
    }
  }

  // Test OpenWeather
  let weatherStatus = 'not configured';
  if (services.weather.enabled) {
    try {
      const testUrl = `https://api.openweathermap.org/data/2.5/weather?lat=40&lon=-74&appid=${process.env.OPENWEATHER_API_KEY}`;
      const response = await fetch(testUrl, { timeout: 5000 });
      weatherStatus = response.ok ? 'connected' : `error: ${response.status}`;
    } catch (error) {
      weatherStatus = `error: ${error.message}`;
    }
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    services,
    connections: {
      opensky: openskyStatus,
      adsb: adsbStatus,
      weather: weatherStatus
    },
    version: '2.0.0',
    app: 'Flight and Trace'
  });
}