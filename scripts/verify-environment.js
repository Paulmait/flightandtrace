#!/usr/bin/env node
/**
 * Environment Variables Verification Script
 * Checks all required and optional variables for FlightTrace
 */

require('dotenv').config();

const requiredVariables = {
  // Your existing Vercel variables
  'FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY': 'Stripe client-side key for payments',
  'FLIGHTTRACE_STRIPE_WEBHOOK_SECRET': 'Stripe webhook signature verification',
  'STRIPE_PREMIUM_PRICE_ID': 'Plus tier monthly price ID',
  'STRIPE_PROFESSIONAL_PRICE_ID': 'Pro tier monthly price ID', 
  'OPENSKY_USERNAME': 'OpenSky API username',
  'OPENSKY_PASSWORD': 'OpenSky API password',
  'OPENWEATHER_API_KEY': 'Weather data API key',
  'PE_SECRET_KEY': 'Application security key'
};

const optionalVariables = {
  // Missing from Vercel - need to add
  'STRIPE_SECRET_KEY': 'Stripe server-side secret key',
  'STRIPE_PLUS_YEARLY': 'Plus tier yearly price ID',
  'STRIPE_PRO_YEARLY': 'Pro tier yearly price ID',
  'STRIPE_BUSINESS_MONTHLY': 'Business tier monthly price ID',
  'STRIPE_BUSINESS_YEARLY': 'Business tier yearly price ID',
  'REACT_APP_SUPABASE_URL': 'Supabase project URL',
  'REACT_APP_SUPABASE_ANON_KEY': 'Supabase anonymous key',
  'SUPABASE_SERVICE_KEY': 'Supabase service role key',
  'REACT_APP_APP_URL': 'Application base URL',
  'REACT_APP_API_URL': 'API base URL',
  'SENDGRID_API_KEY': 'Email service API key',
  'GA_MEASUREMENT_ID': 'Google Analytics measurement ID'
};

console.log('🔍 FlightTrace Environment Variables Verification');
console.log('================================================');

// Check required variables
console.log('\n✅ Required Variables (Your Existing Vercel Config):');
let requiredMissing = 0;

for (const [key, description] of Object.entries(requiredVariables)) {
  const value = process.env[key];
  if (value) {
    const displayValue = value.length > 20 ? `${value.substring(0, 20)}...` : value;
    console.log(`  ✅ ${key}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${key}: MISSING - ${description}`);
    requiredMissing++;
  }
}

// Check optional variables
console.log('\n⚠️ Optional Variables (Need to Add to Vercel):');
let optionalMissing = 0;

for (const [key, description] of Object.entries(optionalVariables)) {
  const value = process.env[key];
  if (value) {
    const displayValue = value.length > 20 ? `${value.substring(0, 20)}...` : value;
    console.log(`  ✅ ${key}: ${displayValue}`);
  } else {
    console.log(`  ⚠️ ${key}: MISSING - ${description}`);
    optionalMissing++;
  }
}

// Specific checks
console.log('\n🎯 Specific Configuration Checks:');

// Stripe configuration
const stripePublishable = process.env.FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY;
const stripePremium = process.env.STRIPE_PREMIUM_PRICE_ID;
const stripeProfessional = process.env.STRIPE_PROFESSIONAL_PRICE_ID;

if (stripePublishable && stripePublishable.startsWith('pk_')) {
  console.log('  ✅ Stripe publishable key format is correct');
} else {
  console.log('  ❌ Stripe publishable key missing or invalid format');
}

if (stripePremium && stripePremium.startsWith('price_')) {
  console.log('  ✅ Premium price ID format is correct');
} else {
  console.log('  ❌ Premium price ID missing or invalid format');
}

if (stripeProfessional && stripeProfessional.startsWith('price_')) {
  console.log('  ✅ Professional price ID format is correct');
} else {
  console.log('  ❌ Professional price ID missing or invalid format');
}

// OpenSky configuration
const openskyUsername = process.env.OPENSKY_USERNAME;
const openskyPassword = process.env.OPENSKY_PASSWORD;

if (openskyUsername === 'guampaul@gmail.com-api-client') {
  console.log('  ✅ OpenSky username is correctly configured');
} else {
  console.log('  ❌ OpenSky username not configured or incorrect');
}

if (openskyPassword) {
  console.log('  ✅ OpenSky password is configured');
} else {
  console.log('  ❌ OpenSky password is missing');
}

// Weather API
const weatherKey = process.env.OPENWEATHER_API_KEY;
if (weatherKey && weatherKey.length > 10) {
  console.log('  ✅ OpenWeather API key is configured');
} else {
  console.log('  ❌ OpenWeather API key missing or too short');
}

// Summary
console.log('\n📊 Summary:');
console.log(`  Required variables: ${Object.keys(requiredVariables).length - requiredMissing}/${Object.keys(requiredVariables).length} configured`);
console.log(`  Optional variables: ${Object.keys(optionalVariables).length - optionalMissing}/${Object.keys(optionalVariables).length} configured`);

if (requiredMissing === 0) {
  console.log('\n🎉 All required variables are configured! ');
  console.log('Your existing Vercel setup is ready for the new pricing system.');
} else {
  console.log(`\n⚠️ ${requiredMissing} required variables missing.`);
  console.log('Please check your Vercel environment variables.');
}

if (optionalMissing > 0) {
  console.log(`\n💡 Consider adding ${optionalMissing} optional variables for full functionality:`);
  
  const criticalOptional = [
    'STRIPE_SECRET_KEY',
    'REACT_APP_SUPABASE_URL', 
    'REACT_APP_SUPABASE_ANON_KEY'
  ];
  
  criticalOptional.forEach(key => {
    if (!process.env[key]) {
      console.log(`  🎯 ${key} - ${optionalVariables[key]}`);
    }
  });
}

console.log('\n🔗 Next Steps:');
console.log('1. Add missing variables to Vercel Dashboard → Settings → Environment Variables');
console.log('2. Create missing Stripe price IDs for yearly billing and business tier');
console.log('3. Set up Supabase project and add database configuration');
console.log('4. Test the complete subscription flow');

console.log('\n📚 Documentation:');
console.log('- VERCEL_ENVIRONMENT_AUDIT.md - Complete variable mapping');
console.log('- STRIPE_SUBSCRIPTION_GUIDE.md - Full setup guide');
console.log('- config/environment-mapping.js - Code configuration');

process.exit(requiredMissing > 0 ? 1 : 0);