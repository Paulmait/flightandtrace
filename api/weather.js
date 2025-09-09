export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { lat, lon, layer = 'precipitation_new' } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }
    
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    // Get current weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();
    
    // Get weather tile URL for overlay
    const tileUrl = `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${apiKey}`;
    
    res.status(200).json({
      success: true,
      weather: {
        temp: weatherData.main?.temp,
        humidity: weatherData.main?.humidity,
        windSpeed: weatherData.wind?.speed,
        windDirection: weatherData.wind?.deg,
        visibility: weatherData.visibility,
        description: weatherData.weather?.[0]?.description,
        icon: weatherData.weather?.[0]?.icon
      },
      tileUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}