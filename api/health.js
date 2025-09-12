// System Health Monitoring Endpoint
import flightAggregator from './lib/flight-aggregator.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Get flight aggregator health
    const flightHealth = flightAggregator.getSystemHealth();
    
    // Check environment variables
    const envHealth = {
      opensky: {
        oauth2: !!(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET),
        legacy: !!(process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD)
      },
      adsb: !!process.env.ADSB_EXCHANGE_API_KEY,
      weather: !!process.env.OPENWEATHER_API_KEY,
      stripe: !!process.env.FLIGHTTRACE_STRIPE_SECRET_KEY,
      firebase: !!process.env.FIREBASE_PROJECT_ID,
      sendgrid: !!process.env.SENDGRID_API_KEY
    };
    
    // Calculate overall health score
    const configuredServices = Object.values(envHealth).flat().filter(v => v === true).length;
    const totalServices = Object.values(envHealth).flat().length;
    const configScore = (configuredServices / totalServices) * 100;
    
    // Memory usage
    const memUsage = process.memoryUsage();
    
    // Uptime
    const uptime = process.uptime();
    
    // Overall status
    let overallStatus = 'healthy';
    if (flightHealth.status === 'critical' || configScore < 30) {
      overallStatus = 'critical';
    } else if (flightHealth.status === 'degraded' || configScore < 70) {
      overallStatus = 'degraded';
    }
    
    res.status(200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      dataSources: flightHealth,
      services: {
        configured: configuredServices,
        total: totalServices,
        score: Math.round(configScore),
        details: envHealth
      },
      performance: {
        responseTime: Date.now() - req.startTime || 0,
        unit: 'ms'
      },
      recommendations: getRecommendations(envHealth, flightHealth, configScore)
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '< 1m';
}

function getRecommendations(envHealth, flightHealth, configScore) {
  const recommendations = [];
  
  // Data source recommendations
  if (!envHealth.adsb) {
    recommendations.push({
      priority: 'high',
      category: 'reliability',
      message: 'Add ADS-B Exchange API key for redundant data source',
      impact: 'Prevents service outage if OpenSky fails'
    });
  }
  
  if (!envHealth.opensky.oauth2 && envHealth.opensky.legacy) {
    recommendations.push({
      priority: 'medium',
      category: 'security',
      message: 'Migrate from OpenSky basic auth to OAuth2',
      impact: 'Basic auth will be deprecated soon'
    });
  }
  
  // Service recommendations
  if (!envHealth.weather) {
    recommendations.push({
      priority: 'low',
      category: 'features',
      message: 'Add OpenWeather API key for weather overlays',
      impact: 'Enables premium weather features'
    });
  }
  
  if (!envHealth.sendgrid) {
    recommendations.push({
      priority: 'medium',
      category: 'functionality',
      message: 'Configure SendGrid for email notifications',
      impact: 'Required for flight alerts and user notifications'
    });
  }
  
  // Health-based recommendations
  if (flightHealth.status === 'degraded') {
    recommendations.push({
      priority: 'high',
      category: 'reliability',
      message: flightHealth.recommendation,
      impact: 'Service operating with reduced redundancy'
    });
  }
  
  if (configScore < 50) {
    recommendations.push({
      priority: 'high',
      category: 'configuration',
      message: 'Multiple critical services not configured',
      impact: 'Limited functionality and reliability'
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}