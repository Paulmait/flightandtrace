import re
import secrets
import hashlib
import hmac
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import bleach
from urllib.parse import urlparse
import ipaddress
from fastapi import Request, HTTPException, status
import logging

logger = logging.getLogger(__name__)

class SecurityValidator:
    """Enhanced security validation and sanitization"""
    
    @staticmethod
    def sanitize_input(text: str, max_length: int = 1000, allow_html: bool = False) -> str:
        """Sanitize user input to prevent XSS and injection attacks"""
        if not text:
            return ""
        
        # Truncate to max length
        text = text[:max_length]
        
        if allow_html:
            # Allow only safe HTML tags
            allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']
            allowed_attributes = {'a': ['href', 'title']}
            text = bleach.clean(text, tags=allowed_tags, attributes=allowed_attributes)
        else:
            # Remove all HTML
            text = bleach.clean(text, tags=[], strip=True)
        
        # Remove null bytes
        text = text.replace('\x00', '')
        
        # Normalize whitespace
        text = ' '.join(text.split())
        
        return text
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Enhanced email validation"""
        if not email or len(email) > 254:
            return False
        
        # Basic regex pattern
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False
        
        # Check for common disposable email domains
        disposable_domains = [
            'tempmail.com', 'throwaway.email', 'guerrillamail.com',
            'mailinator.com', '10minutemail.com', 'trashmail.com'
        ]
        domain = email.split('@')[1].lower()
        if domain in disposable_domains:
            logger.warning(f"Disposable email detected: {domain}")
            return False
        
        return True
    
    @staticmethod
    def validate_url(url: str, allowed_schemes: list = None) -> bool:
        """Validate URL for webhook and external requests"""
        if allowed_schemes is None:
            allowed_schemes = ['https']
        
        try:
            parsed = urlparse(url)
            
            # Check scheme
            if parsed.scheme not in allowed_schemes:
                return False
            
            # Check for local/private IPs
            hostname = parsed.hostname
            if hostname:
                # Check for localhost
                if hostname in ['localhost', '127.0.0.1', '0.0.0.0']:
                    return False
                
                # Check for private IP ranges
                try:
                    ip = ipaddress.ip_address(hostname)
                    if ip.is_private or ip.is_loopback or ip.is_link_local:
                        return False
                except ValueError:
                    # Not an IP address, continue
                    pass
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def validate_tail_number(tail_number: str) -> bool:
        """Validate aircraft tail number format using enhanced aviation validation"""
        from .aviation_utils import validate_tail_number_enhanced
        
        is_valid, country_code = validate_tail_number_enhanced(tail_number)
        
        if is_valid and country_code:
            logger.info(f"Valid tail number {tail_number} from country: {country_code}")
        
        return is_valid

class RateLimiter:
    """Enhanced rate limiting with sliding window"""
    
    def __init__(self):
        self.requests: Dict[str, list] = {}
    
    def check_rate_limit(self, identifier: str, max_requests: int, window_seconds: int) -> bool:
        """Check if request should be allowed"""
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > window_start
        ]
        
        # Check limit
        if len(self.requests[identifier]) >= max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True

class SecurityHeaders:
    """Security headers management"""
    
    @staticmethod
    def get_security_headers(request: Request) -> Dict[str, str]:
        """Get comprehensive security headers"""
        headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
                "img-src 'self' data: https:; "
                "font-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
                "connect-src 'self' https://api.flighttrace.com wss://api.flighttrace.com; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
        }
        
        # Add HSTS for production
        if request.url.scheme == "https":
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        return headers

class DataEncryption:
    """Encryption utilities for sensitive data"""
    
    def __init__(self, key: bytes):
        self.key = key
    
    def encrypt_field(self, data: str) -> str:
        """Encrypt sensitive field data"""
        # Use Fernet for symmetric encryption
        from cryptography.fernet import Fernet
        f = Fernet(self.key)
        return f.encrypt(data.encode()).decode()
    
    def decrypt_field(self, encrypted_data: str) -> str:
        """Decrypt sensitive field data"""
        from cryptography.fernet import Fernet
        f = Fernet(self.key)
        return f.decrypt(encrypted_data.encode()).decode()
    
    @staticmethod
    def generate_encryption_key() -> bytes:
        """Generate a new encryption key"""
        from cryptography.fernet import Fernet
        return Fernet.generate_key()

class SessionManager:
    """Enhanced session management"""
    
    @staticmethod
    def create_session_token() -> str:
        """Create secure session token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def validate_session_token(token: str) -> bool:
        """Validate session token format"""
        if not token or len(token) < 32:
            return False
        
        # Check for valid URL-safe base64
        try:
            import base64
            base64.urlsafe_b64decode(token + '==')  # Add padding
            return True
        except Exception:
            return False

class SecurityAuditor:
    """Security audit and monitoring"""
    
    @staticmethod
    def log_security_event(event_type: str, user_id: Optional[int], 
                          details: Dict[str, Any], request: Request):
        """Log security-relevant events"""
        from src.db.database import get_connection
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Get client IP
            client_ip = request.client.host if request.client else "unknown"
            
            # Get user agent
            user_agent = request.headers.get("User-Agent", "unknown")
            
            # Create audit log entry
            cursor.execute("""
                INSERT INTO audit_log (user_id, action, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            """, (
                user_id,
                event_type,
                str(details),
                client_ip,
                user_agent
            ))
            
            conn.commit()
            
            # Log critical events
            if event_type in ["failed_login", "account_locked", "suspicious_activity"]:
                logger.warning(f"Security event: {event_type} for user {user_id} from {client_ip}")
            
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")
        finally:
            conn.close()
    
    @staticmethod
    def check_suspicious_activity(request: Request, user_id: Optional[int]) -> bool:
        """Check for suspicious activity patterns"""
        # Check for rapid requests
        # Check for unusual user agents
        # Check for proxy/VPN usage
        # Check for geographic anomalies
        
        user_agent = request.headers.get("User-Agent", "")
        
        # Suspicious user agent patterns
        suspicious_patterns = [
            r'curl', r'wget', r'python-requests', r'scrapy',
            r'bot', r'crawler', r'spider', r'scraper'
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, user_agent, re.IGNORECASE):
                logger.warning(f"Suspicious user agent detected: {user_agent}")
                return True
        
        return False

class InputValidator:
    """Comprehensive input validation"""
    
    @staticmethod
    def validate_username(username: str) -> bool:
        """Validate username format"""
        if not username or len(username) < 3 or len(username) > 30:
            return False
        
        # Allow only alphanumeric, underscore, and hyphen
        if not re.match(r'^[a-zA-Z0-9_-]+$', username):
            return False
        
        # Check for reserved names
        reserved_names = [
            'admin', 'root', 'system', 'administrator', 'moderator',
            'flighttrace', 'api', 'www', 'mail', 'ftp'
        ]
        
        if username.lower() in reserved_names:
            return False
        
        return True
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format"""
        # Remove common formatting characters
        phone = re.sub(r'[\s\-\(\)\+]', '', phone)
        
        # Check if it's all digits and reasonable length
        if not phone.isdigit() or len(phone) < 10 or len(phone) > 15:
            return False
        
        return True

# CSRF Protection
class CSRFProtection:
    """CSRF token management"""
    
    @staticmethod
    def generate_csrf_token() -> str:
        """Generate CSRF token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def validate_csrf_token(token: str, session_token: str) -> bool:
        """Validate CSRF token"""
        if not token or not session_token:
            return False
        
        # In production, validate against stored session CSRF token
        # This is a simplified example
        expected = hmac.new(
            session_token.encode(),
            b"csrf_validation",
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(token, expected)