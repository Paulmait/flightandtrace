#!/usr/bin/env node

/**
 * Backend API Test Suite
 * Run this to verify all backend APIs are working correctly
 * Usage: node test-backend.js [baseUrl]
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

// Use native fetch if available (Node 18+) or fall back to https
const fetch = globalThis.fetch || (async (url, options = {}) => {
  const { request } = await import('https');
  const { URL } = await import('url');
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: {
            get: (name) => res.headers[name.toLowerCase()]
          },
          json: async () => JSON.parse(data)
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
});

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results
let passed = 0;
let failed = 0;
let warnings = 0;

async function test(name, fn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    const result = await fn();
    if (result.warning) {
      console.log(`${colors.yellow}⚠ WARNING${colors.reset}: ${result.message}`);
      warnings++;
    } else {
      console.log(`${colors.green}✓ PASSED${colors.reset}`);
      passed++;
    }
    return result;
  } catch (error) {
    console.log(`${colors.red}✗ FAILED${colors.reset}: ${error.message}`);
    failed++;
    return null;
  }
}

async function runTests() {
  console.log('=====================================');
  console.log('🧪 Flight Tracker Backend Test Suite');
  console.log('=====================================');
  console.log(`Base URL: ${baseUrl}`);
  console.log('');

  // Test 1: Basic Flight API
  await test('Flight API (Basic)', async () => {
    const response = await fetch(`${baseUrl}/api/flights?bbox=-10,40,10,60`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`);
    }
    
    if (!data.success) {
      throw new Error('API returned success: false');
    }
    
    if (!Array.isArray(data.flights)) {
      throw new Error('Flights is not an array');
    }
    
    console.log(`  → Found ${data.flights.length} flights`);
    
    if (data.flights.length === 0) {
      return { warning: true, message: 'No flights returned (API might be rate limited)' };
    }
    
    // Verify flight structure
    const flight = data.flights[0];
    if (!flight.icao24 || !flight.position) {
      throw new Error('Invalid flight structure');
    }
    
    return { success: true, count: data.flights.length };
  });

  // Test 2: Aircraft Database
  await test('Aircraft Database API', async () => {
    const response = await fetch(`${baseUrl}/api/aircraft-database?icao24=4b1805&action=get`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    if (!data.success) {
      throw new Error('API returned success: false');
    }
    
    if (!data.aircraft) {
      throw new Error('No aircraft data returned');
    }
    
    console.log(`  → Aircraft: ${data.aircraft.registration || 'Unknown'} - ${data.aircraft.model || 'Unknown'}`);
    
    return { success: true, aircraft: data.aircraft };
  });

  // Test 3: Airport Information
  await test('Airport Information API', async () => {
    const response = await fetch(`${baseUrl}/api/airports?code=KJFK&action=get`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    if (!data.success) {
      throw new Error('API returned success: false');
    }
    
    if (!data.airport) {
      throw new Error('No airport data returned');
    }
    
    console.log(`  → Airport: ${data.airport.name} (${data.airport.iata}/${data.airport.icao})`);
    
    if (data.airport.weather) {
      console.log(`  → Weather: ${data.airport.weather.temperature}°C, Wind: ${data.airport.weather.wind?.speed}kts`);
    }
    
    return { success: true, airport: data.airport };
  });

  // Test 4: Weather API
  await test('Weather API', async () => {
    const response = await fetch(`${baseUrl}/api/weather?lat=40.6413&lon=-73.7781`);
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 401) {
        return { warning: true, message: 'OpenWeather API key not configured' };
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    if (!data.success) {
      return { warning: true, message: 'Weather API not configured' };
    }
    
    console.log(`  → Weather: ${data.weather?.description}, ${data.weather?.temp}°C`);
    
    return { success: true, weather: data.weather };
  });

  // Test 5: Cache Headers
  await test('Cache Implementation', async () => {
    // Make two identical requests
    const response1 = await fetch(`${baseUrl}/api/flights?bbox=0,50,1,51`);
    const data1 = await response1.json();
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    
    const response2 = await fetch(`${baseUrl}/api/flights?bbox=0,50,1,51`);
    const data2 = await response2.json();
    
    const cacheHeader = response2.headers.get('x-cache');
    
    if (data2.cached || cacheHeader === 'HIT') {
      console.log(`  → Cache is working (X-Cache: ${cacheHeader || 'HIT'})`);
      return { success: true, cached: true };
    } else {
      return { warning: true, message: 'Cache not detected (Redis might not be configured)' };
    }
  });

  // Test 6: CORS Headers
  await test('CORS Headers', async () => {
    const response = await fetch(`${baseUrl}/api/flights`, {
      method: 'OPTIONS'
    });
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    const methodsHeader = response.headers.get('access-control-allow-methods');
    
    if (!corsHeader) {
      throw new Error('No CORS headers found');
    }
    
    console.log(`  → CORS Origin: ${corsHeader}`);
    console.log(`  → Allowed Methods: ${methodsHeader}`);
    
    return { success: true, cors: corsHeader };
  });

  // Test 7: Security Headers
  await test('Security Headers', async () => {
    const response = await fetch(`${baseUrl}/api/flights`);
    
    const headers = {
      'x-content-type-options': response.headers.get('x-content-type-options'),
      'x-frame-options': response.headers.get('x-frame-options'),
      'x-xss-protection': response.headers.get('x-xss-protection')
    };
    
    let hasSecurityHeaders = false;
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        hasSecurityHeaders = true;
        console.log(`  → ${key}: ${value}`);
      }
    }
    
    if (!hasSecurityHeaders) {
      return { warning: true, message: 'Security headers not configured (check vercel.json)' };
    }
    
    return { success: true, headers };
  });

  // Test 8: API Rate Limiting
  await test('Rate Limiting', async () => {
    const requests = [];
    
    // Try to make 5 rapid requests
    for (let i = 0; i < 5; i++) {
      requests.push(fetch(`${baseUrl}/api/flights?bbox=0,0,1,1`));
    }
    
    const responses = await Promise.all(requests);
    const rateLimitHeaders = responses.map(r => ({
      limit: r.headers.get('x-ratelimit-limit'),
      remaining: r.headers.get('x-ratelimit-remaining')
    }));
    
    const hasRateLimiting = rateLimitHeaders.some(h => h.limit || h.remaining);
    
    if (hasRateLimiting) {
      console.log(`  → Rate limiting active`);
      return { success: true, rateLimiting: true };
    } else {
      return { warning: true, message: 'Rate limiting headers not detected' };
    }
  });

  // Test 9: Database Connection (if configured)
  await test('Database Connection', async () => {
    // This would test Supabase connection if configured
    // For now, we'll just check if the API is ready for database
    return { warning: true, message: 'Database tests require Supabase configuration' };
  });

  // Test 10: WebSocket Endpoint
  await test('WebSocket Info Endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/websocket`);
    
    if (!response.ok) {
      return { warning: true, message: 'WebSocket endpoint not available' };
    }
    
    const data = await response.json();
    console.log(`  → WebSocket connections: ${data.connections || 0}`);
    
    return { success: true, websocket: data };
  });

  // Summary
  console.log('');
  console.log('=====================================');
  console.log('📊 Test Results Summary');
  console.log('=====================================');
  console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Warnings: ${warnings}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);
  console.log('');

  if (failed === 0) {
    console.log(`${colors.green}🎉 All critical tests passed!${colors.reset}`);
    
    if (warnings > 0) {
      console.log(`${colors.yellow}⚠️  Some optional features need configuration:${colors.reset}`);
      console.log('   - Add Redis URL for caching');
      console.log('   - Add OpenWeather API key for weather data');
      console.log('   - Configure Supabase for database features');
    }
  } else {
    console.log(`${colors.red}❌ Some tests failed. Check the errors above.${colors.reset}`);
    console.log('');
    console.log('Common fixes:');
    console.log('1. Add OPENSKY_USERNAME and OPENSKY_PASSWORD to environment variables');
    console.log('2. Check that all API files are deployed correctly');
    console.log('3. Verify CORS configuration in vercel.json');
  }
  
  console.log('');
  console.log('=====================================');
  console.log(`Deployment URL: ${baseUrl}`);
  console.log('=====================================');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});