-- Supabase Migration: Initial Schema for FlightTrace

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flights table
CREATE TABLE public.flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_number TEXT NOT NULL,
    aircraft_type TEXT,
    aircraft_icao TEXT,
    tail_number TEXT,
    departure_airport TEXT,
    arrival_airport TEXT,
    departure_time TIMESTAMPTZ,
    arrival_time TIMESTAMPTZ,
    status TEXT CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flight tracking data
CREATE TABLE public.flight_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_id UUID REFERENCES public.flights(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude_ft INTEGER,
    speed_knots INTEGER,
    heading INTEGER,
    vertical_speed_fpm INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fuel estimates table
CREATE TABLE public.fuel_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_id UUID REFERENCES public.flights(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    fuel_kg DOUBLE PRECISION NOT NULL,
    fuel_l DOUBLE PRECISION NOT NULL,
    fuel_gal DOUBLE PRECISION NOT NULL,
    co2_kg DOUBLE PRECISION NOT NULL,
    confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    phases JSONB,
    assumptions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User flight tracking
CREATE TABLE public.user_flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    flight_id UUID REFERENCES public.flights(id) ON DELETE CASCADE,
    is_favorite BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, flight_id)
);

-- Feature flags
CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    user_overrides JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_flight_positions_flight_id ON public.flight_positions(flight_id);
CREATE INDEX idx_flight_positions_timestamp ON public.flight_positions(timestamp);
CREATE INDEX idx_fuel_estimates_flight_id ON public.fuel_estimates(flight_id);
CREATE INDEX idx_user_flights_user_id ON public.user_flights(user_id);
CREATE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flights ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policies for flights (public read)
CREATE POLICY "Flights are viewable by everyone" ON public.flights
    FOR SELECT USING (true);

-- Policies for flight positions (public read)
CREATE POLICY "Flight positions are viewable by everyone" ON public.flight_positions
    FOR SELECT USING (true);

-- Policies for fuel estimates
CREATE POLICY "Users can view their own estimates" ON public.fuel_estimates
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create estimates" ON public.fuel_estimates
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policies for user flights
CREATE POLICY "Users can manage their own tracked flights" ON public.user_flights
    FOR ALL USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Insert default feature flags
INSERT INTO public.feature_flags (name, enabled, rollout_percentage) VALUES
    ('fuel_estimates', true, 100),
    ('weather_overlay', false, 0),
    ('premium_features', false, 0),
    ('real_time_updates', true, 100);