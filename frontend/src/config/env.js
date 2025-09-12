// Environment variable configuration
// Maps Vercel environment variables to app requirements

const env = {
  // Supabase - using your Vercel variable names
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  
  // Firebase - already configured in Vercel
  FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
  
  // Map provider
  MAPTILER_KEY: process.env.REACT_APP_MAPTILER_KEY,
  
  // Stripe
  STRIPE_PUBLISHABLE_KEY: process.env.FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY,
  
  // API URLs
  API_URL: process.env.REACT_APP_API_URL || '/api',
  APP_URL: process.env.REACT_APP_APP_URL || window.location.origin,
  WS_URL: process.env.REACT_APP_WS_URL || 'wss://flightandtrace.com',
  
  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production'
};

export default env;