export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    tests: {}
  };

  // Test 1: OpenSky API
  try {
    const testUrl = 'https://opensky-network.org/api/states/all?lamin=40&lomin=-5&lamax=45&lomax=5';
    const response = await fetch(testUrl, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      diagnostics.tests.opensky = {
        status: 'success',
        flightCount: data.states?.length || 0,
        message: 'OpenSky API working'
      };
    } else {
      diagnostics.tests.opensky = {
        status: 'error',
        code: response.status,
        message: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    diagnostics.tests.opensky = {
      status: 'error',
      message: error.message
    };
  }

  // Test 2: Environment Variables
  diagnostics.tests.environment = {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseAnon: !!process.env.SUPABASE_ANON_KEY,
    hasSupabaseService: !!process.env.SUPABASE_SERVICE_KEY,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasOpenWeather: !!process.env.OPENWEATHER_API_KEY,
    hasAdsbExchange: !!process.env.ADSB_EXCHANGE_API_KEY,
    hasSentry: !!process.env.REACT_APP_SENTRY_DSN,
    hasMapTiler: !!process.env.REACT_APP_MAPTILER_KEY
  };

  // Test 3: Supabase Connection
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
      );
      
      // Try to query flight_history table
      const { data, error } = await supabase
        .from('flight_history')
        .select('count')
        .limit(1);
      
      if (error) {
        diagnostics.tests.supabase = {
          status: 'error',
          message: error.message,
          hint: error.hint || 'Check if tables are created'
        };
      } else {
        diagnostics.tests.supabase = {
          status: 'success',
          message: 'Connected to Supabase'
        };
      }
    } catch (error) {
      diagnostics.tests.supabase = {
        status: 'error',
        message: error.message
      };
    }
  } else {
    diagnostics.tests.supabase = {
      status: 'not_configured',
      message: 'Missing Supabase credentials'
    };
  }

  // Test 4: Main flights endpoint
  try {
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'https://flightandtrace.com';
    const flightsUrl = `${baseUrl}/api/flights?bbox=-5,40,5,45`;
    const flightsResponse = await fetch(flightsUrl, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (flightsResponse.ok) {
      const flightsData = await flightsResponse.json();
      diagnostics.tests.flightsEndpoint = {
        status: 'success',
        count: flightsData.count || 0,
        success: flightsData.success
      };
    } else {
      diagnostics.tests.flightsEndpoint = {
        status: 'error',
        code: flightsResponse.status
      };
    }
  } catch (error) {
    diagnostics.tests.flightsEndpoint = {
      status: 'error',
      message: error.message
    };
  }

  // Overall status
  const hasErrors = Object.values(diagnostics.tests).some(test => 
    test.status === 'error' || test.status === false
  );
  
  diagnostics.overall = {
    status: hasErrors ? 'issues_detected' : 'all_tests_passed',
    recommendation: hasErrors ? 
      'Check failed tests above' : 
      'All systems operational'
  };

  res.status(200).json(diagnostics);
}