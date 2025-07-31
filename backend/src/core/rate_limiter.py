import time
import redis
from typing import Optional, Tuple
from datetime import datetime, timedelta
import logging
from src.core.config import settings
from src.db.database import get_connection

logger = logging.getLogger(__name__)

class RateLimiter:
    """Advanced rate limiting with Redis support and fallback to database"""
    
    def __init__(self):
        self.redis_client = None
        if settings.REDIS_URL:
            try:
                self.redis_client = redis.from_url(settings.REDIS_URL)
                self.redis_client.ping()
                logger.info("Redis connected for rate limiting")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Using database fallback.")
                self.redis_client = None
    
    def check_rate_limit(self, identifier: str, limit: int, window_seconds: int) -> Tuple[bool, dict]:
        """
        Check if request should be allowed based on rate limits
        Returns (allowed, metadata)
        """
        if self.redis_client:
            return self._check_redis_rate_limit(identifier, limit, window_seconds)
        else:
            return self._check_db_rate_limit(identifier, limit, window_seconds)
    
    def _check_redis_rate_limit(self, identifier: str, limit: int, window_seconds: int) -> Tuple[bool, dict]:
        """Redis-based sliding window rate limiting"""
        try:
            key = f"rate_limit:{identifier}"
            now = time.time()
            window_start = now - window_seconds
            
            # Remove old entries
            self.redis_client.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            current_count = self.redis_client.zcard(key)
            
            # Calculate reset time
            oldest = self.redis_client.zrange(key, 0, 0, withscores=True)
            if oldest:
                reset_time = int(oldest[0][1] + window_seconds)
            else:
                reset_time = int(now + window_seconds)
            
            metadata = {
                "limit": limit,
                "remaining": max(0, limit - current_count),
                "reset": reset_time
            }
            
            if current_count >= limit:
                return False, metadata
            
            # Add current request
            self.redis_client.zadd(key, {str(now): now})
            self.redis_client.expire(key, window_seconds + 60)  # Extra time for safety
            
            metadata["remaining"] = max(0, limit - current_count - 1)
            return True, metadata
            
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            # Fallback to database
            return self._check_db_rate_limit(identifier, limit, window_seconds)
    
    def _check_db_rate_limit(self, identifier: str, limit: int, window_seconds: int) -> Tuple[bool, dict]:
        """Database-based rate limiting fallback"""
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=window_seconds)
            
            # Clean old entries
            cursor.execute("""
                DELETE FROM rate_limits 
                WHERE window_start < ?
            """, (window_start,))
            
            # Check if identifier is IP or user
            is_ip = '.' in identifier or ':' in identifier
            
            if is_ip:
                # Count requests for IP
                cursor.execute("""
                    SELECT COUNT(*) FROM rate_limits 
                    WHERE ip_address = ? AND window_start >= ?
                """, (identifier, window_start))
            else:
                # Count requests for user
                cursor.execute("""
                    SELECT COUNT(*) FROM rate_limits 
                    WHERE user_id = ? AND window_start >= ?
                """, (int(identifier), window_start))
            
            current_count = cursor.fetchone()[0]
            
            # Get oldest request for reset calculation
            if is_ip:
                cursor.execute("""
                    SELECT MIN(window_start) FROM rate_limits 
                    WHERE ip_address = ? AND window_start >= ?
                """, (identifier, window_start))
            else:
                cursor.execute("""
                    SELECT MIN(window_start) FROM rate_limits 
                    WHERE user_id = ? AND window_start >= ?
                """, (int(identifier), window_start))
            
            oldest = cursor.fetchone()[0]
            if oldest:
                reset_time = int((oldest + timedelta(seconds=window_seconds)).timestamp())
            else:
                reset_time = int((now + timedelta(seconds=window_seconds)).timestamp())
            
            metadata = {
                "limit": limit,
                "remaining": max(0, limit - current_count),
                "reset": reset_time
            }
            
            if current_count >= limit:
                conn.close()
                return False, metadata
            
            # Add current request
            if is_ip:
                cursor.execute("""
                    INSERT INTO rate_limits (ip_address, endpoint, window_start)
                    VALUES (?, 'api', ?)
                """, (identifier, now))
            else:
                cursor.execute("""
                    INSERT INTO rate_limits (user_id, endpoint, window_start)
                    VALUES (?, 'api', ?)
                """, (int(identifier), now))
            
            conn.commit()
            metadata["remaining"] = max(0, limit - current_count - 1)
            
            return True, metadata
            
        except Exception as e:
            logger.error(f"Database rate limit error: {e}")
            conn.rollback()
            # On error, allow request but log
            return True, {"limit": limit, "remaining": 0, "reset": 0}
        finally:
            conn.close()

class DDoSProtection:
    """DDoS protection mechanisms"""
    
    def __init__(self):
        self.rate_limiter = RateLimiter()
        self.blocked_ips = set()
        self.suspicious_patterns = {}
    
    def check_request(self, ip: str, path: str, headers: dict) -> Tuple[bool, Optional[str]]:
        """
        Check if request should be allowed
        Returns (allowed, reason)
        """
        # Check if IP is blocked
        if ip in self.blocked_ips:
            return False, "IP blocked"
        
        # Check for suspicious user agents
        user_agent = headers.get("user-agent", "").lower()
        suspicious_agents = ["bot", "crawler", "scraper", "curl", "wget", "python-requests"]
        
        if any(agent in user_agent for agent in suspicious_agents):
            # Stricter rate limit for suspicious agents
            allowed, _ = self.rate_limiter.check_rate_limit(
                f"suspicious:{ip}", 
                limit=10, 
                window_seconds=3600
            )
            if not allowed:
                self.blocked_ips.add(ip)
                return False, "Suspicious activity detected"
        
        # Check for request patterns
        pattern_key = f"{ip}:{path}"
        now = time.time()
        
        if pattern_key not in self.suspicious_patterns:
            self.suspicious_patterns[pattern_key] = []
        
        # Clean old entries
        self.suspicious_patterns[pattern_key] = [
            t for t in self.suspicious_patterns[pattern_key] 
            if now - t < 60
        ]
        
        # Add current request
        self.suspicious_patterns[pattern_key].append(now)
        
        # Check for rapid repeated requests to same endpoint
        if len(self.suspicious_patterns[pattern_key]) > 20:
            self.blocked_ips.add(ip)
            return False, "Rapid request pattern detected"
        
        return True, None
    
    def unblock_ip(self, ip: str):
        """Manually unblock an IP"""
        self.blocked_ips.discard(ip)
    
    def get_blocked_ips(self) -> list:
        """Get list of blocked IPs"""
        return list(self.blocked_ips)

# Global instances
rate_limiter = RateLimiter()
ddos_protection = DDoSProtection()