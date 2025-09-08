/**
 * Environment Variable Mapping for FlightTrace
 * Maps Vercel environment variables to application configuration
 */

const environmentConfig = {
  // Stripe Configuration - Using your existing Vercel variables
  stripe: {
    publishableKey: process.env.FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.FLIGHTTRACE_STRIPE_WEBHOOK_SECRET,
    
    // Price IDs from your Vercel config
    prices: {
      premium: process.env.STRIPE_PREMIUM_PRICE_ID, // Maps to Plus tier
      professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID, // Maps to Pro tier
      
      // Additional price IDs (add to Vercel when created)
      plusMonthly: process.env.STRIPE_PLUS_MONTHLY,
      plusYearly: process.env.STRIPE_PLUS_YEARLY,
      proMonthly: process.env.STRIPE_PRO_MONTHLY,
      proYearly: process.env.STRIPE_PRO_YEARLY,
      businessMonthly: process.env.STRIPE_BUSINESS_MONTHLY,
      businessYearly: process.env.STRIPE_BUSINESS_YEARLY
    }
  },

  // Flight Data APIs - Using your existing Vercel variables
  apis: {
    opensky: {
      username: process.env.OPENSKY_USERNAME,
      password: process.env.OPENSKY_PASSWORD
    },
    openweather: {
      apiKey: process.env.OPENWEATHER_API_KEY
    }
  },

  // Security
  security: {
    peSecretKey: process.env.PE_SECRET_KEY
  },

  // Application URLs
  app: {
    url: process.env.REACT_APP_APP_URL || 'https://flightandtrace.com',
    apiUrl: process.env.REACT_APP_API_URL || 'https://flightandtrace.com/api'
  },

  // Email (add to Vercel if needed)
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@flightandtrace.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'FlightTrace'
  },

  // Analytics
  analytics: {
    gaId: process.env.GA_MEASUREMENT_ID
  },

  // Firebase (existing configuration)
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDMJkPbOjp4oQNxb-EVK-Yh1pVSrOuDJgQ',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'flighttrace-749f1.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'flighttrace-749f1',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'flighttrace-749f1.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '994719406353',
    appId: process.env.FIREBASE_APP_ID || '1:994719406353:web:01523b9811eeefad5094b0',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-HS9H3GM0V1'
  },

  // Supabase
  supabase: {
    url: process.env.REACT_APP_SUPABASE_URL,
    anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  }
};

/**
 * Validation function to check required environment variables
 */
function validateEnvironment() {
  const required = [
    'FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'FLIGHTTRACE_STRIPE_WEBHOOK_SECRET',
    'STRIPE_PREMIUM_PRICE_ID',
    'STRIPE_PROFESSIONAL_PRICE_ID',
    'OPENSKY_USERNAME',
    'OPENSKY_PASSWORD',
    'OPENWEATHER_API_KEY',
    'PE_SECRET_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing.join(', '));
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  console.log('✅ Environment variables validation passed');
}

/**
 * Get configuration for specific service
 */
function getConfig(service) {
  if (!environmentConfig[service]) {
    throw new Error(`Unknown service: ${service}`);
  }
  return environmentConfig[service];
}

/**
 * Get all configuration
 */
function getAllConfig() {
  return environmentConfig;
}

module.exports = {
  environmentConfig,
  validateEnvironment,
  getConfig,
  getAllConfig
};