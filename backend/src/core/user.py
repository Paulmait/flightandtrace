from src.db.database import get_connection
from src.core.auth import get_password_hash, validate_password, validate_email, EmailNotValidError
from datetime import datetime
import re
import logging

logger = logging.getLogger(__name__)

def sanitize_input(input_str: str) -> str:
    """Sanitize user input to prevent injection attacks"""
    # Remove any potential SQL injection characters
    return re.sub(r'[;\\"\']', '', input_str.strip())

def validate_username(username: str) -> None:
    """Validate username format"""
    if not username or len(username) < 3:
        raise ValueError("Username must be at least 3 characters")
    if len(username) > 50:
        raise ValueError("Username must not exceed 50 characters")
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        raise ValueError("Username can only contain letters, numbers, hyphens and underscores")

def register_user(username: str, email: str, password: str) -> int:
    try:
        # Validate inputs
        validate_username(username)
        validate_password(password)
        
        # Validate email
        try:
            valid_email = validate_email(email)
            email = valid_email.email
        except EmailNotValidError as e:
            raise ValueError(f"Invalid email: {str(e)}")
        
        # Hash password
        password_hash = get_password_hash(password)
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Check if username or email already exists
        cursor.execute("SELECT username, email FROM users WHERE username = ? OR email = ?", 
                      (username, email))
        existing = cursor.fetchone()
        if existing:
            if existing[0] == username:
                raise ValueError("Username already exists")
            else:
                raise ValueError("Email already registered")
        
        # Insert user with proper fields
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, created_at, is_active, role, 
                             failed_login_attempts, last_login, email_verified, mfa_enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (username, email, password_hash, datetime.utcnow(), True, 'user', 0, None, False, False))
        
        user_id = cursor.lastrowid
        
        # Log user registration for audit
        cursor.execute("""
            INSERT INTO audit_log (user_id, action, details, ip_address, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, 'user_registered', f'User {username} registered', None, datetime.utcnow()))
        
        conn.commit()
        conn.close()
        
        logger.info(f"User registered successfully: {username}")
        return user_id
        
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        if conn:
            conn.rollback()
            conn.close()
        raise

def add_tail_number(user_id: int, tail_number: str) -> None:
    """Add aircraft tail number for user with validation"""
    # Validate tail number format (FAA format)
    tail_number = tail_number.strip().upper()
    if not re.match(r'^[A-Z0-9]{1,6}$', tail_number):
        raise ValueError("Invalid tail number format")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Check if user exists and is active
        cursor.execute("SELECT is_active FROM users WHERE user_id = ?", (user_id,))
        user = cursor.fetchone()
        if not user or not user[0]:
            raise ValueError("User not found or inactive")
        
        # Check for duplicate tail number
        cursor.execute("SELECT id FROM tail_numbers WHERE user_id = ? AND tail_number = ?", 
                      (user_id, tail_number))
        if cursor.fetchone():
            raise ValueError("Tail number already added for this user")
        
        # Check user's subscription limits
        cursor.execute("""
            SELECT COUNT(*) FROM tail_numbers WHERE user_id = ? AND is_active = 1
        """, (user_id,))
        count = cursor.fetchone()[0]
        
        # Get user's plan limits
        cursor.execute("""
            SELECT s.plan FROM users u 
            JOIN subscriptions s ON u.user_id = s.user_id 
            WHERE u.user_id = ? AND s.status = 'active'
        """, (user_id,))
        subscription = cursor.fetchone()
        
        # Define plan limits
        plan_limits = {
            'free': 1,
            'premium': 10,
            'family': 25,
            'enterprise': 1000
        }
        
        plan = subscription[0] if subscription else 'free'
        limit = plan_limits.get(plan.lower(), 1)
        
        if count >= limit:
            raise ValueError(f"Tail number limit reached for {plan} plan ({limit} max)")
        
        # Insert tail number
        cursor.execute("""
            INSERT INTO tail_numbers (user_id, tail_number, added_at, is_active)
            VALUES (?, ?, ?, ?)
        """, (user_id, tail_number, datetime.utcnow(), True))
        
        # Log action
        cursor.execute("""
            INSERT INTO audit_log (user_id, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, (user_id, 'tail_number_added', f'Added tail number: {tail_number}', datetime.utcnow()))
        
        conn.commit()
        logger.info(f"Tail number {tail_number} added for user {user_id}")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error adding tail number: {str(e)}")
        raise
    finally:
        conn.close()

def get_user_tail_numbers(user_id: int) -> list:
    """Get active tail numbers for user"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT tail_number, added_at 
        FROM tail_numbers 
        WHERE user_id = ? AND is_active = 1
        ORDER BY added_at DESC
    """, (user_id,))
    result = cursor.fetchall()
    conn.close()
    return [{'tail_number': row[0], 'added_at': row[1]} for row in result]

def get_all_user_ids() -> list:
    """Get all active user IDs"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM users WHERE is_active = 1")
    result = cursor.fetchall()
    conn.close()
    return [row[0] for row in result]

def authenticate_user(username: str, password: str) -> dict:
    """Authenticate user and return user data"""
    from src.core.auth import verify_password, check_login_attempts, record_failed_login, clear_failed_login_attempts
    
    # Check login attempts first
    check_login_attempts(username)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Get user by username or email
        cursor.execute("""
            SELECT user_id, username, email, password_hash, is_active, role, email_verified, mfa_enabled
            FROM users WHERE username = ? OR email = ?
        """, (username, username))
        
        user = cursor.fetchone()
        
        if not user:
            record_failed_login(username)
            raise ValueError("Invalid credentials")
        
        user_id, username, email, password_hash, is_active, role, email_verified, mfa_enabled = user
        
        # Verify password
        if not verify_password(password, password_hash):
            record_failed_login(username)
            
            # Update failed login attempts in database
            cursor.execute("""
                UPDATE users SET failed_login_attempts = failed_login_attempts + 1
                WHERE user_id = ?
            """, (user_id,))
            conn.commit()
            
            raise ValueError("Invalid credentials")
        
        # Check if account is active
        if not is_active:
            raise ValueError("Account is disabled")
        
        # Clear failed login attempts
        clear_failed_login_attempts(username)
        cursor.execute("""
            UPDATE users SET failed_login_attempts = 0, last_login = ?
            WHERE user_id = ?
        """, (datetime.utcnow(), user_id))
        
        # Log successful login
        cursor.execute("""
            INSERT INTO audit_log (user_id, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, (user_id, 'user_login', 'Successful login', datetime.utcnow()))
        
        conn.commit()
        
        return {
            'user_id': user_id,
            'username': username,
            'email': email,
            'role': role,
            'email_verified': email_verified,
            'mfa_enabled': mfa_enabled
        }
        
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise
    finally:
        conn.close()

def delete_user_data(user_id: int) -> None:
    """Delete user data for GDPR compliance"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Delete in correct order due to foreign keys
        cursor.execute("DELETE FROM notifications WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM tail_numbers WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM audit_log WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM subscriptions WHERE user_id = ?", (user_id,))
        
        # Anonymize user record instead of deleting
        cursor.execute("""
            UPDATE users 
            SET username = ?, email = ?, password_hash = ?, 
                is_active = 0, deleted_at = ?
            WHERE user_id = ?
        """, (f'deleted_user_{user_id}', f'deleted_{user_id}@deleted.com', 
               'DELETED', datetime.utcnow(), user_id))
        
        conn.commit()
        logger.info(f"User data deleted for user_id: {user_id}")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error deleting user data: {str(e)}")
        raise
    finally:
        conn.close()
