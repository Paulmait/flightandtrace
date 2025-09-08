#!/usr/bin/env node
/**
 * Configuration Synchronization Script
 * Syncs environment variables and configuration between development and production
 */

const fs = require('fs');
const path = require('path');

const CONFIG_SOURCES = {
  productionEnv: 'C:\\Users\\maito\\flighttrace\\.env.example',
  productionFirebase: 'C:\\Users\\maito\\flighttrace\\public\\firebase-config.js',
  productionVercel: 'C:\\Users\\maito\\flighttrace\\vercel.json',
  productionSupabase: 'C:\\Users\\maito\\flighttrace\\lib\\supabase.js'
};

const CONFIG_TARGETS = {
  currentEnv: path.join(__dirname, '..', 'frontend', '.env'),
  currentVercel: path.join(__dirname, '..', 'vercel.json'),
  currentSupabase: path.join(__dirname, '..', 'frontend', 'src', 'lib', 'supabase.js')
};

console.log('🔄 FlightTrace Configuration Sync Tool');
console.log('=====================================');

// Check if source files exist
function validateSources() {
  const missing = [];
  
  for (const [name, path] of Object.entries(CONFIG_SOURCES)) {
    if (!fs.existsSync(path)) {
      missing.push(`${name}: ${path}`);
    }
  }
  
  if (missing.length > 0) {
    console.log('⚠️  Missing source files:');
    missing.forEach(file => console.log(`   ${file}`));
    return false;
  }
  
  return true;
}

// Extract environment variables from .env.example
function extractEnvVars() {
  try {
    const envContent = fs.readFileSync(CONFIG_SOURCES.productionEnv, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        envVars[key] = valueParts.join('=');
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('❌ Error reading environment file:', error.message);
    return null;
  }
}

// Generate environment configuration summary
function generateEnvSummary() {
  console.log('📋 Environment Variables Summary');
  console.log('--------------------------------');
  
  const envVars = extractEnvVars();
  if (!envVars) return;
  
  const categories = {
    'Critical APIs': ['OPENSKY_', 'SUPABASE_', 'FIREBASE_'],
    'Payment': ['STRIPE_'],
    'Communication': ['SENDGRID_'],
    'Analytics': ['GA_'],
    'Weather': ['OPENWEATHER_'],
    'Application': ['NODE_ENV', 'REACT_APP_']
  };
  
  for (const [category, prefixes] of Object.entries(categories)) {
    console.log(`\n${category}:`);
    Object.keys(envVars).forEach(key => {
      if (prefixes.some(prefix => key.startsWith(prefix))) {
        const value = envVars[key];
        const displayValue = value.length > 20 ? `${value.substring(0, 20)}...` : value;
        console.log(`  ${key}: ${displayValue}`);
      }
    });
  }
}

// Validate Firebase configuration
function validateFirebaseConfig() {
  try {
    const firebaseContent = fs.readFileSync(CONFIG_SOURCES.productionFirebase, 'utf8');
    
    // Extract API key from the JavaScript file
    const apiKeyMatch = firebaseContent.match(/apiKey:\s*"([^"]+)"/);
    const projectIdMatch = firebaseContent.match(/projectId:\s*"([^"]+)"/);
    
    if (apiKeyMatch && projectIdMatch) {
      console.log('\n🔥 Firebase Configuration:');
      console.log(`   API Key: ${apiKeyMatch[1].substring(0, 20)}...`);
      console.log(`   Project: ${projectIdMatch[1]}`);
      console.log('   ✅ Configuration looks valid');
      return true;
    } else {
      console.log('   ❌ Invalid Firebase configuration format');
      return false;
    }
  } catch (error) {
    console.error('❌ Error reading Firebase config:', error.message);
    return false;
  }
}

// Check Vercel configuration
function checkVercelConfig() {
  try {
    const vercelContent = fs.readFileSync(CONFIG_SOURCES.productionVercel, 'utf8');
    const vercelConfig = JSON.parse(vercelContent);
    
    console.log('\n⚡ Vercel Configuration:');
    console.log(`   Framework: ${vercelConfig.framework || 'null'}`);
    console.log(`   Builds: ${vercelConfig.builds?.length || 0} defined`);
    console.log(`   Routes: ${vercelConfig.routes?.length || 0} defined`);
    console.log(`   Regions: ${vercelConfig.regions?.join(', ') || 'default'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error reading Vercel config:', error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔍 Validating configuration sources...');
  
  if (!validateSources()) {
    console.log('\n❌ Configuration sync failed - missing source files');
    process.exit(1);
  }
  
  console.log('✅ All source files found\n');
  
  // Generate summaries
  generateEnvSummary();
  validateFirebaseConfig();
  checkVercelConfig();
  
  console.log('\n🎯 Configuration Analysis Complete');
  console.log('=====================================');
  console.log('Next steps:');
  console.log('1. Review the configuration above');
  console.log('2. Set actual API keys in Vercel Dashboard');
  console.log('3. Update .env files with real values');
  console.log('4. Test deployment with `vercel --prod`');
  console.log('\nFor detailed deployment guide, see: VERCEL_DEPLOYMENT_GUIDE.md');
}

if (require.main === module) {
  main();
}

module.exports = {
  extractEnvVars,
  validateFirebaseConfig,
  checkVercelConfig
};