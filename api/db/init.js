// Initialize Supabase database tables
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function initDatabase() {
  try {
    // Create flight_history table if it doesn't exist
    const { error: createError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS flight_history (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          icao24 VARCHAR(10),
          callsign VARCHAR(20),
          registration VARCHAR(20),
          aircraft_type VARCHAR(50),
          origin VARCHAR(10),
          destination VARCHAR(10),
          position JSONB,
          altitude FLOAT,
          speed FLOAT,
          heading FLOAT,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_flight_history_icao24 ON flight_history(icao24);
        CREATE INDEX IF NOT EXISTS idx_flight_history_timestamp ON flight_history(timestamp);
        CREATE INDEX IF NOT EXISTS idx_flight_history_callsign ON flight_history(callsign);
      `
    });

    if (createError) {
      console.error('Error creating tables:', createError);
      return false;
    }

    // Create user_saved_flights table
    await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS user_saved_flights (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          flight_id VARCHAR(50),
          callsign VARCHAR(20),
          saved_at TIMESTAMPTZ DEFAULT NOW(),
          notes TEXT,
          UNIQUE(user_id, flight_id)
        );

        CREATE INDEX IF NOT EXISTS idx_saved_flights_user ON user_saved_flights(user_id);
      `
    });

    // Create flight_alerts table
    await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS flight_alerts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          alert_type VARCHAR(50),
          criteria JSONB,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_alerts_user ON flight_alerts(user_id);
      `
    });

    console.log('✅ Supabase database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

// Store flight history
export async function storeFlightHistory(flights) {
  try {
    const records = flights.map(flight => ({
      icao24: flight.icao24,
      callsign: flight.callsign,
      registration: flight.registration,
      aircraft_type: flight.aircraftType,
      origin: flight.origin,
      destination: flight.destination,
      position: {
        latitude: flight.position?.latitude,
        longitude: flight.position?.longitude
      },
      altitude: flight.altitude,
      speed: flight.speed,
      heading: flight.heading,
      timestamp: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('flight_history')
      .insert(records);

    if (error) {
      console.error('Error storing flight history:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to store flight history:', error);
    return false;
  }
}

// Get flight history
export async function getFlightHistory(icao24, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('flight_history')
      .select('*')
      .eq('icao24', icao24)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching flight history:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch flight history:', error);
    return [];
  }
}