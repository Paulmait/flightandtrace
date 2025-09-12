-- Supabase Setup Script for Flight and Trace
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create flight_history table
CREATE TABLE IF NOT EXISTS flight_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- Create user_saved_flights table
CREATE TABLE IF NOT EXISTS user_saved_flights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  flight_id VARCHAR(50),
  callsign VARCHAR(20),
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, flight_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_flights_user ON user_saved_flights(user_id);

-- Create flight_alerts table
CREATE TABLE IF NOT EXISTS flight_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  alert_type VARCHAR(50),
  criteria JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON flight_alerts(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE flight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_alerts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access to flight history
CREATE POLICY "Allow public read access on flight_history" ON flight_history
  FOR SELECT USING (true);

-- Allow service role to insert flight history
CREATE POLICY "Allow service insert on flight_history" ON flight_history
  FOR INSERT WITH CHECK (true);

-- User saved flights policies (authenticated users only)
CREATE POLICY "Users can view own saved flights" ON user_saved_flights
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own saved flights" ON user_saved_flights
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own saved flights" ON user_saved_flights
  FOR DELETE USING (auth.uid()::text = user_id);

-- Flight alerts policies (authenticated users only)
CREATE POLICY "Users can view own alerts" ON flight_alerts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own alerts" ON flight_alerts
  FOR ALL USING (auth.uid()::text = user_id);

-- Create a function to clean old flight history (keep 30 days)
CREATE OR REPLACE FUNCTION clean_old_flight_history()
RETURNS void AS $$
BEGIN
  DELETE FROM flight_history
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Set up a cron job to clean old data daily
-- (Requires pg_cron extension - enable in Supabase dashboard)
-- SELECT cron.schedule('clean-flight-history', '0 2 * * *', 'SELECT clean_old_flight_history();');