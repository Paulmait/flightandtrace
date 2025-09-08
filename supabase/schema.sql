-- Supabase Migration: Initial Schema for FlightTrace
-- Based on production FlightTrace database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =======================
-- User Management Tables
-- =======================

-- User profiles (extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    company TEXT,
    avatar_url TEXT,
    website TEXT,
    
    -- Subscription Management
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'plus', 'pro', 'business')),
    subscription_status TEXT CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
    subscription_id TEXT, -- Stripe subscription ID
    stripe_customer_id TEXT UNIQUE,
    
    -- Billing Information
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancellation_date TIMESTAMPTZ,
    
    -- Payment Tracking
    last_payment_date TIMESTAMPTZ,
    last_payment_amount DECIMAL(10,2),
    payment_failed_at TIMESTAMPTZ,
    payment_attempt_count INTEGER DEFAULT 0,
    
    -- Trial Information
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Usage Tracking
    api_calls_today INTEGER DEFAULT 0,
    api_calls_reset_date DATE DEFAULT CURRENT_DATE,
    alerts_count INTEGER DEFAULT 0,
    saved_flights_count INTEGER DEFAULT 0,
    
    -- Preferences
    timezone TEXT DEFAULT 'UTC',
    units TEXT DEFAULT 'metric', -- metric, imperial
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Stripe integration
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    
    -- Subscription details
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'pro', 'business')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
    
    -- Billing
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Trial
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- Flight Data Tables  
-- =======================

-- Flight tracks (aggregated flight information)
CREATE TABLE public.flight_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flight_id TEXT UNIQUE NOT NULL,
    callsign TEXT,
    registration TEXT,
    icao24 TEXT NOT NULL,
    
    -- Aircraft information
    aircraft_type TEXT,
    operator TEXT,
    
    -- Route information
    origin_airport TEXT, -- ICAO code
    destination_airport TEXT, -- ICAO code
    
    -- Time bounds
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    
    -- Statistics (pre-computed for performance)
    total_distance DECIMAL(10,2), -- nautical miles
    total_duration INTEGER, -- seconds
    max_altitude INTEGER, -- feet
    min_altitude INTEGER, -- feet
    max_ground_speed INTEGER, -- knots
    avg_ground_speed DECIMAL(5,1), -- knots
    position_count INTEGER DEFAULT 0,
    
    -- Data quality
    data_gaps JSONB DEFAULT '[]',
    primary_source TEXT,
    quality_score DECIMAL(3,2), -- 0.00-1.00
    
    -- Spatial bounds (stored as JSON for simplicity)
    bounding_box JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flight positions (time-series data)
CREATE TABLE public.flight_positions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flight_tracks(flight_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Position data
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    altitude INTEGER, -- feet
    ground_speed INTEGER, -- knots
    vertical_rate INTEGER, -- feet per minute
    heading INTEGER, -- degrees (0-359)
    
    -- Data quality
    source TEXT NOT NULL DEFAULT 'ADS-B', -- ADS-B, MLAT, RADAR, ESTIMATED
    quality TEXT NOT NULL DEFAULT 'HIGH', -- HIGH, MEDIUM, LOW, INTERPOLATED
    interpolated BOOLEAN DEFAULT FALSE,
    signal_strength SMALLINT, -- 0-100
    
    -- Additional data (flexible JSON storage)
    telemetry JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- Alert System Tables
-- =======================

-- Alert rules
CREATE TABLE public.alert_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Rule configuration
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL, -- status_change, takeoff_landing, etc.
    conditions JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    
    -- Notification settings
    notification_channels JSONB DEFAULT '["in_app"]', -- email, sms, push, webhook, in_app
    notification_settings JSONB DEFAULT '{}',
    
    -- Rate limiting
    cooldown_minutes INTEGER DEFAULT 0,
    max_triggers_per_day INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert instances (triggered alerts)
CREATE TABLE public.alert_instances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alert_rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Trigger information
    flight_id TEXT NOT NULL,
    trigger_data JSONB NOT NULL DEFAULT '{}',
    message TEXT NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'triggered' CHECK (status IN ('triggered', 'delivered', 'failed', 'dismissed')),
    delivered_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert notifications (delivery tracking)
CREATE TABLE public.alert_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alert_instance_id UUID REFERENCES alert_instances(id) ON DELETE CASCADE NOT NULL,
    
    -- Delivery details
    channel TEXT NOT NULL, -- email, sms, push, webhook, in_app
    recipient TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    
    -- Delivery tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    
    -- External tracking
    external_id TEXT, -- provider-specific ID
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- Export System Tables
-- =======================

-- Export jobs
CREATE TABLE public.export_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Export configuration
    query_params JSONB NOT NULL DEFAULT '{}',
    export_format TEXT NOT NULL CHECK (export_format IN ('CSV', 'JSON', 'GEOJSON', 'KML', 'GPX')),
    include_metadata BOOLEAN DEFAULT FALSE,
    compression BOOLEAN DEFAULT TRUE,
    filename TEXT,
    
    -- Job status
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Results
    result_url TEXT,
    result_size_mb DECIMAL(10,2),
    record_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Playback sessions
CREATE TABLE public.playback_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    flight_id TEXT NOT NULL,
    
    -- Playback configuration
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    playback_speed DECIMAL(4,2) DEFAULT 1.0 CHECK (playback_speed > 0 AND playback_speed <= 100),
    current_position INTEGER DEFAULT 0,
    
    -- Status and settings
    status TEXT DEFAULT 'STOPPED' CHECK (status IN ('PLAYING', 'PAUSED', 'STOPPED', 'COMPLETED')),
    settings JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- User export quotas (for rate limiting)
CREATE TABLE public.user_export_quotas (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    tier TEXT NOT NULL DEFAULT 'free',
    
    -- Daily quotas
    daily_exports_used INTEGER DEFAULT 0,
    daily_quota_reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
    
    -- Lifetime stats
    total_exports_lifetime INTEGER DEFAULT 0,
    last_export_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- System Configuration Tables
-- =======================

-- Retention policies
CREATE TABLE public.retention_policies (
    tier TEXT PRIMARY KEY,
    retention_days INTEGER NOT NULL,
    max_exports_per_day INTEGER NOT NULL,
    max_export_size_mb INTEGER NOT NULL,
    export_formats TEXT[] NOT NULL,
    playback_enabled BOOLEAN DEFAULT TRUE,
    historical_search_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO public.retention_policies (tier, retention_days, max_exports_per_day, max_export_size_mb, export_formats) VALUES
('free', 2, 0, 0, '{}'),
('premium', 30, 5, 50, '{CSV,JSON}'),
('pro', 365, 25, 250, '{CSV,JSON,GEOJSON,KML}'),
('business', 1095, 100, 1000, '{CSV,JSON,GEOJSON,KML,GPX}');

-- =======================
-- Indexes for Performance
-- =======================

-- User management indexes
CREATE INDEX idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions (stripe_customer_id);

-- Flight data indexes
CREATE INDEX idx_flight_tracks_callsign ON public.flight_tracks (callsign);
CREATE INDEX idx_flight_tracks_icao24 ON public.flight_tracks (icao24);
CREATE INDEX idx_flight_tracks_start_time ON public.flight_tracks (start_time DESC);
CREATE INDEX idx_flight_tracks_route ON public.flight_tracks (origin_airport, destination_airport);

CREATE INDEX idx_flight_positions_flight_id ON public.flight_positions (flight_id, timestamp DESC);
CREATE INDEX idx_flight_positions_timestamp ON public.flight_positions (timestamp DESC);
CREATE INDEX idx_flight_positions_location ON public.flight_positions (latitude, longitude);
CREATE INDEX idx_flight_positions_source ON public.flight_positions (source);

-- Alert system indexes
CREATE INDEX idx_alert_rules_user_id ON public.alert_rules (user_id, enabled);
CREATE INDEX idx_alert_rules_type ON public.alert_rules (rule_type, enabled);
CREATE INDEX idx_alert_instances_user_id ON public.alert_instances (user_id, created_at DESC);
CREATE INDEX idx_alert_instances_rule_id ON public.alert_instances (alert_rule_id, created_at DESC);
CREATE INDEX idx_alert_notifications_instance_id ON public.alert_notifications (alert_instance_id);
CREATE INDEX idx_alert_notifications_status ON public.alert_notifications (status, created_at DESC);

-- Export system indexes
CREATE INDEX idx_export_jobs_user_id ON public.export_jobs (user_id, created_at DESC);
CREATE INDEX idx_export_jobs_status ON public.export_jobs (status, created_at DESC);
CREATE INDEX idx_playback_sessions_user_id ON public.playback_sessions (user_id, updated_at DESC);

-- =======================
-- Row Level Security (RLS)
-- =======================

-- Enable RLS on all user tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_export_quotas ENABLE ROW LEVEL SECURITY;

-- Flight data is readable by all authenticated users, but not editable
ALTER TABLE public.flight_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for alert rules
CREATE POLICY "Users can manage own alert rules" ON public.alert_rules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alert rules" ON public.alert_rules FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for alert instances
CREATE POLICY "Users can view own alert instances" ON public.alert_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own alert instances" ON public.alert_instances FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for export jobs
CREATE POLICY "Users can manage own export jobs" ON public.export_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own export jobs" ON public.export_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for playback sessions
CREATE POLICY "Users can manage own playback sessions" ON public.playback_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own playback sessions" ON public.playback_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user export quotas
CREATE POLICY "Users can view own export quotas" ON public.user_export_quotas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own export quotas" ON public.user_export_quotas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own export quotas" ON public.user_export_quotas FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for flight data (read-only for authenticated users)
CREATE POLICY "Authenticated users can read flight tracks" ON public.flight_tracks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read flight positions" ON public.flight_positions FOR SELECT USING (auth.role() = 'authenticated');

-- System tables are read-only for authenticated users
CREATE POLICY "Authenticated users can read retention policies" ON public.retention_policies FOR SELECT USING (auth.role() = 'authenticated');

-- =======================
-- Functions and Triggers
-- =======================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Initialize user export quota
    INSERT INTO public.user_export_quotas (user_id, tier)
    VALUES (NEW.id, 'free');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.alert_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.flight_tracks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.playback_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_export_quotas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =======================
-- Storage Buckets
-- =======================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
('exports', 'exports', false),
('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Users can upload own exports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own exports" ON storage.objects FOR SELECT USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own exports" ON storage.objects FOR DELETE USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);