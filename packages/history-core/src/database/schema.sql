-- Flight History Database Schema
-- Optimized for time-series data with partitioning

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- Flight positions table (main time-series data)
-- Partitioned by day for optimal performance and retention management
CREATE TABLE flight_positions (
    id UUID DEFAULT uuid_generate_v4(),
    flight_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Geospatial data (PostGIS)
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    altitude INTEGER, -- feet
    ground_speed INTEGER, -- knots  
    vertical_rate INTEGER, -- feet per minute
    heading INTEGER, -- degrees (0-359)
    
    -- Data quality and source
    source VARCHAR(32) NOT NULL, -- ADS-B, MLAT, RADAR, etc.
    quality VARCHAR(16) NOT NULL, -- HIGH, MEDIUM, LOW, INTERPOLATED
    interpolated BOOLEAN DEFAULT FALSE,
    signal_strength SMALLINT, -- 0-100
    
    -- Additional telemetry (JSONB for flexibility)
    telemetry JSONB,
    metadata JSONB,
    
    -- Indexes for performance
    PRIMARY KEY (timestamp, flight_id, id)
) PARTITION BY RANGE (timestamp);

-- Convert to hypertable for TimescaleDB optimization
SELECT create_hypertable('flight_positions', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    create_default_indexes => FALSE
);

-- Create indexes for common queries
CREATE INDEX idx_flight_positions_flight_id ON flight_positions (flight_id, timestamp DESC);
CREATE INDEX idx_flight_positions_location ON flight_positions USING GIST (location);
CREATE INDEX idx_flight_positions_altitude ON flight_positions (altitude) WHERE altitude IS NOT NULL;
CREATE INDEX idx_flight_positions_source ON flight_positions (source);
CREATE INDEX idx_flight_positions_quality ON flight_positions (quality);

-- Flight tracks table (aggregated flight information)
CREATE TABLE flight_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flight_id VARCHAR(64) UNIQUE NOT NULL,
    callsign VARCHAR(16),
    registration VARCHAR(16),
    icao24 VARCHAR(6) NOT NULL,
    
    -- Time bounds
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    
    -- Spatial bounds (for quick filtering)
    bounding_box GEOGRAPHY(POLYGON, 4326),
    max_altitude INTEGER,
    min_altitude INTEGER,
    
    -- Statistics (pre-computed for performance)
    total_distance DECIMAL(10,2), -- nautical miles
    total_duration INTEGER, -- seconds
    max_ground_speed INTEGER, -- knots
    avg_ground_speed DECIMAL(5,1), -- knots
    position_count INTEGER DEFAULT 0,
    
    -- Data quality metrics
    data_gaps JSONB, -- array of gap periods
    primary_source VARCHAR(32),
    quality_score DECIMAL(3,2), -- 0.00-1.00
    
    -- Metadata
    aircraft_type VARCHAR(16),
    operator VARCHAR(64),
    route_origin VARCHAR(4), -- ICAO airport code
    route_destination VARCHAR(4), -- ICAO airport code
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for flight_tracks
CREATE INDEX idx_flight_tracks_callsign ON flight_tracks (callsign);
CREATE INDEX idx_flight_tracks_registration ON flight_tracks (registration);
CREATE INDEX idx_flight_tracks_icao24 ON flight_tracks (icao24);
CREATE INDEX idx_flight_tracks_start_time ON flight_tracks (start_time DESC);
CREATE INDEX idx_flight_tracks_bounding_box ON flight_tracks USING GIST (bounding_box);
CREATE INDEX idx_flight_tracks_route ON flight_tracks (route_origin, route_destination);

-- Retention policies table
CREATE TABLE retention_policies (
    tier VARCHAR(32) PRIMARY KEY,
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
INSERT INTO retention_policies (tier, retention_days, max_exports_per_day, max_export_size_mb, export_formats) VALUES
('free', 2, 0, 0, '{}'),
('premium', 30, 5, 50, '{CSV,JSON}'),
('pro', 365, 25, 250, '{CSV,JSON,GEOJSON,KML}'),
('business', 1095, 100, 1000, '{CSV,JSON,GEOJSON,KML,GPX}');

-- Export jobs table
CREATE TABLE export_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    
    -- Export configuration
    query_params JSONB NOT NULL,
    export_format VARCHAR(16) NOT NULL,
    include_metadata BOOLEAN DEFAULT FALSE,
    compression BOOLEAN DEFAULT TRUE,
    filename VARCHAR(255),
    
    -- Job status
    status VARCHAR(16) NOT NULL DEFAULT 'QUEUED',
    progress INTEGER DEFAULT 0, -- 0-100
    
    -- Results
    result_url TEXT,
    result_size_mb DECIMAL(10,2),
    record_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    CONSTRAINT valid_status CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED'))
);

-- Indexes for export_jobs
CREATE INDEX idx_export_jobs_user_id ON export_jobs (user_id, created_at DESC);
CREATE INDEX idx_export_jobs_status ON export_jobs (status, created_at);
CREATE INDEX idx_export_jobs_expires_at ON export_jobs (expires_at) WHERE status = 'COMPLETED';

-- Playback sessions table
CREATE TABLE playback_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    flight_id VARCHAR(64) NOT NULL,
    
    -- Playback configuration
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    playback_speed DECIMAL(4,2) DEFAULT 1.0,
    current_position INTEGER DEFAULT 0,
    
    -- Status and settings
    status VARCHAR(16) DEFAULT 'STOPPED',
    settings JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_playback_status CHECK (status IN ('PLAYING', 'PAUSED', 'STOPPED', 'COMPLETED')),
    CONSTRAINT valid_playback_speed CHECK (playback_speed > 0 AND playback_speed <= 100)
);

-- Indexes for playback_sessions
CREATE INDEX idx_playback_sessions_user_id ON playback_sessions (user_id, created_at DESC);
CREATE INDEX idx_playback_sessions_flight_id ON playback_sessions (flight_id);
CREATE INDEX idx_playback_sessions_status ON playback_sessions (status, last_accessed_at);

-- User export quotas table (for rate limiting)
CREATE TABLE user_export_quotas (
    user_id UUID PRIMARY KEY,
    tier VARCHAR(32) NOT NULL,
    daily_exports_used INTEGER DEFAULT 0,
    daily_quota_reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
    total_exports_lifetime INTEGER DEFAULT 0,
    last_export_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (tier) REFERENCES retention_policies(tier)
);

-- Index for quota checking
CREATE INDEX idx_user_export_quotas_reset ON user_export_quotas (daily_quota_reset_at);

-- Data retention automation
-- Function to clean up old flight positions based on retention policies
CREATE OR REPLACE FUNCTION cleanup_old_positions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    policy RECORD;
BEGIN
    -- Loop through each retention policy
    FOR policy IN SELECT * FROM retention_policies LOOP
        -- Delete positions older than retention period for this tier
        -- This would need to be joined with user subscriptions in practice
        DELETE FROM flight_positions 
        WHERE timestamp < NOW() - (policy.retention_days || ' days')::INTERVAL;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        RAISE NOTICE 'Deleted % old positions for tier %', deleted_count, policy.tier;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update flight track statistics
CREATE OR REPLACE FUNCTION update_track_statistics(p_flight_id VARCHAR(64))
RETURNS VOID AS $$
DECLARE
    track_stats RECORD;
BEGIN
    -- Calculate statistics from positions
    SELECT 
        COUNT(*) as position_count,
        MIN(timestamp) as start_time,
        MAX(timestamp) as end_time,
        MAX(altitude) as max_altitude,
        MIN(altitude) as min_altitude,
        AVG(ground_speed) as avg_ground_speed,
        MAX(ground_speed) as max_ground_speed,
        ST_Envelope(ST_Collect(location)) as bounding_box
    INTO track_stats
    FROM flight_positions 
    WHERE flight_id = p_flight_id;
    
    -- Update the flight_tracks table
    UPDATE flight_tracks 
    SET 
        position_count = track_stats.position_count,
        start_time = track_stats.start_time,
        end_time = track_stats.end_time,
        max_altitude = track_stats.max_altitude,
        min_altitude = track_stats.min_altitude,
        avg_ground_speed = track_stats.avg_ground_speed,
        max_ground_speed = track_stats.max_ground_speed,
        bounding_box = track_stats.bounding_box,
        updated_at = NOW()
    WHERE flight_id = p_flight_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update track statistics when positions are inserted
CREATE OR REPLACE FUNCTION update_track_on_position_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Update track statistics asynchronously (in practice, this would be queued)
    PERFORM update_track_statistics(NEW.flight_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Automated cleanup job (run daily)
CREATE OR REPLACE FUNCTION schedule_daily_cleanup()
RETURNS VOID AS $$
BEGIN
    -- Clean up old positions
    PERFORM cleanup_old_positions();
    
    -- Clean up expired export jobs
    DELETE FROM export_jobs 
    WHERE status = 'COMPLETED' 
    AND expires_at < NOW();
    
    -- Reset daily export quotas
    UPDATE user_export_quotas 
    SET 
        daily_exports_used = 0,
        daily_quota_reset_at = CURRENT_DATE + INTERVAL '1 day'
    WHERE daily_quota_reset_at <= NOW();
    
    -- Clean up old playback sessions
    DELETE FROM playback_sessions 
    WHERE status = 'COMPLETED' 
    AND updated_at < NOW() - INTERVAL '7 days';
    
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE VIEW recent_flights AS
SELECT 
    ft.*,
    COUNT(fp.id) as recent_position_count
FROM flight_tracks ft
LEFT JOIN flight_positions fp ON ft.flight_id = fp.flight_id 
    AND fp.timestamp > NOW() - INTERVAL '24 hours'
WHERE ft.start_time > NOW() - INTERVAL '7 days'
GROUP BY ft.id
ORDER BY ft.start_time DESC;

CREATE VIEW active_exports AS
SELECT 
    ej.*,
    rp.tier,
    rp.max_export_size_mb
FROM export_jobs ej
JOIN user_export_quotas ueq ON ej.user_id = ueq.user_id
JOIN retention_policies rp ON ueq.tier = rp.tier
WHERE ej.status IN ('QUEUED', 'PROCESSING')
ORDER BY ej.created_at;

-- Performance optimization
-- Continuous aggregate for hourly position counts
CREATE MATERIALIZED VIEW hourly_position_counts
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS hour,
    flight_id,
    COUNT(*) as position_count,
    AVG(altitude) as avg_altitude,
    AVG(ground_speed) as avg_speed
FROM flight_positions
GROUP BY hour, flight_id;

-- Retention policy for continuous aggregate
SELECT add_retention_policy('hourly_position_counts', INTERVAL '90 days');