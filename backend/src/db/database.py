import sqlite3
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def get_db_path():
    db_path = os.path.join(os.path.dirname(__file__), '../../data')
    os.makedirs(db_path, exist_ok=True)
    return os.path.join(db_path, 'flights.db')

def get_connection():
    conn = sqlite3.connect(get_db_path())
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Users table with enhanced security fields
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                email_verified BOOLEAN DEFAULT 0,
                email_verification_token TEXT,
                email_verification_sent_at TIMESTAMP,
                password_reset_token TEXT,
                password_reset_sent_at TIMESTAMP,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                mfa_enabled BOOLEAN DEFAULT 0,
                mfa_secret TEXT,
                deleted_at TIMESTAMP,
                gdpr_consent BOOLEAN DEFAULT 0,
                gdpr_consent_date TIMESTAMP,
                privacy_settings TEXT DEFAULT '{}'
            );
        """)
        
        # Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
        # Tail numbers with soft delete
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tail_numbers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tail_number TEXT NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                notes TEXT,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                UNIQUE(user_id, tail_number)
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tail_numbers_user ON tail_numbers(user_id)")
        # Flight states with enhanced tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS flight_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tail_number TEXT NOT NULL,
                status TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                latitude REAL,
                longitude REAL,
                altitude INTEGER,
                speed INTEGER,
                heading INTEGER,
                departure_airport TEXT,
                arrival_airport TEXT,
                estimated_arrival TIMESTAMP,
                data_source TEXT,
                raw_data TEXT
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_flight_states_tail ON flight_states(tail_number)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_flight_states_timestamp ON flight_states(timestamp)")
        # Notifications with delivery tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tail_number TEXT,
                notification_type TEXT NOT NULL,
                status TEXT NOT NULL,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                delivered_at TIMESTAMP,
                read_at TIMESTAMP,
                channel TEXT DEFAULT 'email',
                priority TEXT DEFAULT 'normal',
                content TEXT,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)")
        
        # Audit log for compliance
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE SET NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)")
        
        # Subscriptions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                plan TEXT NOT NULL,
                status TEXT NOT NULL,
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                cancel_at_period_end BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                trial_end TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)")
        
        # API rate limiting
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rate_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                ip_address TEXT,
                endpoint TEXT NOT NULL,
                requests_count INTEGER DEFAULT 1,
                window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON rate_limits(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address)")
        
        # Session management
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                refresh_token TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)")
        
        # Privacy preferences
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS privacy_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                data_collection_consent BOOLEAN DEFAULT 0,
                marketing_consent BOOLEAN DEFAULT 0,
                third_party_sharing_consent BOOLEAN DEFAULT 0,
                analytics_consent BOOLEAN DEFAULT 0,
                consent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        """)
        
        # Terms of Service acceptance
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tos_acceptance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                version TEXT NOT NULL,
                accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        """)
        
        conn.commit()
        logger.info("Database initialized successfully")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error initializing database: {str(e)}")
        raise
    finally:
        conn.close()

def cleanup_old_data():
    """Clean up old data according to retention policies"""
    from src.core.config import settings
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Clean old audit logs
        cursor.execute("""
            DELETE FROM audit_log 
            WHERE timestamp < datetime('now', '-' || ? || ' days')
        """, (settings.LOG_RETENTION_DAYS,))
        
        # Clean old rate limit records
        cursor.execute("""
            DELETE FROM rate_limits 
            WHERE window_start < datetime('now', '-1 day')
        """)
        
        # Clean expired sessions
        cursor.execute("""
            DELETE FROM sessions 
            WHERE expires_at < datetime('now')
        """)
        
        conn.commit()
        logger.info("Old data cleaned up successfully")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error cleaning up old data: {str(e)}")
    finally:
        conn.close()
