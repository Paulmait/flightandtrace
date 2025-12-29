-- GDPR Compliance Tables Migration
-- Run this migration to add support for GDPR data export and account deletion

-- Data Export Requests Table
CREATE TABLE IF NOT EXISTS data_export_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, expired
    format TEXT DEFAULT 'json', -- json, csv
    include_flight_history BOOLEAN DEFAULT 1,
    include_settings BOOLEAN DEFAULT 1,
    include_alerts BOOLEAN DEFAULT 1,
    download_token_hash TEXT,
    export_data TEXT, -- JSON blob of exported data
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_completion TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    downloaded_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_data_export_user ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_request_id ON data_export_requests(request_id);

-- Account Deletions Table
CREATE TABLE IF NOT EXISTS account_deletions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, cancelled, completed, failed
    reason TEXT, -- optional reason for deletion
    feedback TEXT, -- optional feedback
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_deletion_date TIMESTAMP NOT NULL,
    recovery_deadline TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_deletions_user ON account_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletions_status ON account_deletions(status);
CREATE INDEX IF NOT EXISTS idx_account_deletions_scheduled ON account_deletions(scheduled_deletion_date);

-- User Settings Table (for privacy settings)
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- Alerts Table (if not exists)
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL, -- departure, arrival, delay, gate_change
    flight_number TEXT,
    origin TEXT,
    destination TEXT,
    scheduled_time TIMESTAMP,
    alert_time TIMESTAMP,
    status TEXT DEFAULT 'active', -- active, triggered, expired, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    triggered_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);

-- Add pending_deletion columns to users table
ALTER TABLE users ADD COLUMN pending_deletion BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN deletion_requested_at TIMESTAMP;

-- Consent Records Table (for GDPR consent tracking)
CREATE TABLE IF NOT EXISTS consent_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    consent_type TEXT NOT NULL, -- gdpr, terms, marketing, analytics
    consented BOOLEAN NOT NULL,
    consent_text TEXT, -- version of terms consented to
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_type ON consent_records(consent_type);

-- Data Processing Log (for audit trail)
CREATE TABLE IF NOT EXISTS data_processing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL, -- export, delete, update, access
    data_category TEXT, -- profile, flights, alerts, settings
    processor TEXT, -- system, admin, user
    purpose TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_data_processing_user ON data_processing_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_action ON data_processing_log(action);
CREATE INDEX IF NOT EXISTS idx_data_processing_date ON data_processing_log(created_at);

-- Cookie Consent Table (for web users)
CREATE TABLE IF NOT EXISTS cookie_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER, -- NULL for anonymous users
    essential BOOLEAN DEFAULT 1,
    analytics BOOLEAN DEFAULT 0,
    marketing BOOLEAN DEFAULT 0,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cookie_consent_session ON cookie_consents(session_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consent_user ON cookie_consents(user_id);
