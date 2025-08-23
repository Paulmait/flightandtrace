"""
Enhanced Rate Limiter with IP + User Token Tracking
Supports both in-memory (development) and Redis (production) storage
"""

from typing import Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
import logging
import os
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

@dataclass
class RateLimitRule:
    """Rate limiting rule configuration"""
    requests: int       # Number of requests
    window_seconds: int # Time window in seconds
    burst_requests: Optional[int] = None  # Burst allowance

@dataclass
class RateLimitStatus:
    """Current rate limit status"""
    allowed: bool
    limit: int
    remaining: int
    reset_time: datetime
    retry_after: Optional[int] = None

class RateLimitStorage(ABC):
    """Abstract base class for rate limit storage backends"""
    
    @abstractmethod
    def get_count(self, key: str, window_seconds: int) -> int:
        """Get current request count for key within window"""
        pass
    
    @abstractmethod
    def increment(self, key: str, window_seconds: int) -> int:
        """Increment request count and return new count"""
        pass
    
    @abstractmethod
    def get_reset_time(self, key: str, window_seconds: int) -> datetime:
        """Get reset time for rate limit window"""
        pass

class InMemoryStorage(RateLimitStorage):
    """In-memory storage for development/testing"""
    
    def __init__(self):
        self._data: Dict[str, Dict[str, Any]] = {}
    
    def _cleanup_expired(self):
        """Remove expired entries"""
        now = datetime.utcnow()
        expired_keys = []
        
        for key, data in self._data.items():
            if data['expires'] < now:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self._data[key]
    
    def get_count(self, key: str, window_seconds: int) -> int:
        self._cleanup_expired()
        
        if key not in self._data:
            return 0
        
        return self._data[key]['count']
    
    def increment(self, key: str, window_seconds: int) -> int:
        self._cleanup_expired()
        now = datetime.utcnow()
        expires = now + timedelta(seconds=window_seconds)
        
        if key not in self._data:
            self._data[key] = {
                'count': 0,
                'created': now,
                'expires': expires
            }
        
        self._data[key]['count'] += 1
        return self._data[key]['count']
    
    def get_reset_time(self, key: str, window_seconds: int) -> datetime:
        if key not in self._data:
            return datetime.utcnow() + timedelta(seconds=window_seconds)
        
        return self._data[key]['expires']

class RedisStorage(RateLimitStorage):
    """Redis storage for production use"""
    
    def __init__(self, redis_client=None):
        if redis_client is None:
            try:
                import redis
                redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
                self.redis = redis.from_url(redis_url)
            except ImportError:
                logger.error("Redis not available, falling back to in-memory storage")
                raise
        else:
            self.redis = redis_client
    
    def get_count(self, key: str, window_seconds: int) -> int:
        try:
            count = self.redis.get(f"rate_limit:{key}")
            return int(count) if count else 0
        except Exception as e:
            logger.error(f"Redis get_count error: {e}")
            return 0
    
    def increment(self, key: str, window_seconds: int) -> int:
        try:
            pipe = self.redis.pipeline()
            pipe.incr(f"rate_limit:{key}")
            pipe.expire(f"rate_limit:{key}", window_seconds)
            results = pipe.execute()
            return int(results[0])
        except Exception as e:
            logger.error(f"Redis increment error: {e}")
            return 1  # Fail open
    
    def get_reset_time(self, key: str, window_seconds: int) -> datetime:
        try:
            ttl = self.redis.ttl(f"rate_limit:{key}")
            if ttl > 0:
                return datetime.utcnow() + timedelta(seconds=ttl)
        except Exception as e:
            logger.error(f"Redis get_reset_time error: {e}")
        
        return datetime.utcnow() + timedelta(seconds=window_seconds)

class EnhancedRateLimiter:
    """
    Enhanced rate limiter supporting IP + user token rate limiting
    """
    
    # Default rate limit rules
    DEFAULT_RULES = {
        'fuel_estimate_ip': RateLimitRule(100, 3600),      # 100/hour per IP
        'fuel_estimate_user': RateLimitRule(500, 3600),    # 500/hour per user
        'fuel_estimate_global': RateLimitRule(10000, 3600), # 10k/hour globally
        'api_general': RateLimitRule(1000, 3600),          # 1000/hour per user
        'api_burst': RateLimitRule(10, 60, 20),            # 10/min with 20 burst
    }
    
    def __init__(self, storage: Optional[RateLimitStorage] = None):
        """
        Initialize rate limiter
        
        Args:
            storage: Storage backend (None for auto-detect)
        """
        if storage is None:
            # Auto-detect storage backend
            if os.getenv('REDIS_URL') or os.getenv('NODE_ENV') == 'production':
                try:
                    self.storage = RedisStorage()
                    logger.info("Using Redis storage for rate limiting")
                except Exception:
                    logger.warning("Redis unavailable, using in-memory storage")
                    self.storage = InMemoryStorage()
            else:
                self.storage = InMemoryStorage()
                logger.info("Using in-memory storage for rate limiting")
        else:
            self.storage = storage
    
    def check_rate_limit(self, 
                        identifier: str, 
                        rule_name: str = 'api_general',
                        ip_address: Optional[str] = None,
                        user_id: Optional[str] = None) -> RateLimitStatus:
        """
        Check if request should be allowed based on rate limits
        
        Args:
            identifier: Primary identifier (e.g., user_id or ip)
            rule_name: Rate limit rule to apply
            ip_address: Client IP address for IP-based limiting
            user_id: User ID for user-based limiting
            
        Returns:
            RateLimitStatus indicating if request is allowed
        """
        rule = self.DEFAULT_RULES.get(rule_name)
        if not rule:
            logger.warning(f"Unknown rate limit rule: {rule_name}")
            rule = self.DEFAULT_RULES['api_general']
        
        # Check multiple limits and return most restrictive
        checks = []
        
        # Primary identifier limit
        checks.append(self._check_single_limit(identifier, rule))
        
        # IP-based limit (if fuel estimation)
        if ip_address and rule_name.startswith('fuel_estimate'):
            ip_rule = self.DEFAULT_RULES.get('fuel_estimate_ip', rule)
            checks.append(self._check_single_limit(f"ip:{ip_address}", ip_rule))
        
        # User-based limit (if fuel estimation)
        if user_id and rule_name.startswith('fuel_estimate'):
            user_rule = self.DEFAULT_RULES.get('fuel_estimate_user', rule)
            checks.append(self._check_single_limit(f"user:{user_id}", user_rule))
        
        # Global limit check
        if rule_name.startswith('fuel_estimate'):
            global_rule = self.DEFAULT_RULES.get('fuel_estimate_global')
            if global_rule:
                checks.append(self._check_single_limit("global:fuel_estimate", global_rule))
        
        # Return most restrictive result
        for status in checks:
            if not status.allowed:
                return status
        
        # All checks passed, increment all counters
        for i, status in enumerate(checks):
            if i == 0:  # Primary identifier
                self.storage.increment(identifier, rule.window_seconds)
            elif ip_address and i == 1:  # IP check
                self.storage.increment(f"ip:{ip_address}", self.DEFAULT_RULES['fuel_estimate_ip'].window_seconds)
            elif user_id and i == 2:  # User check
                self.storage.increment(f"user:{user_id}", self.DEFAULT_RULES['fuel_estimate_user'].window_seconds)
            elif rule_name.startswith('fuel_estimate'):  # Global check
                self.storage.increment("global:fuel_estimate", self.DEFAULT_RULES['fuel_estimate_global'].window_seconds)
        
        return checks[0]  # Return primary limit status
    
    def _check_single_limit(self, key: str, rule: RateLimitRule) -> RateLimitStatus:
        """Check a single rate limit"""
        current_count = self.storage.get_count(key, rule.window_seconds)
        reset_time = self.storage.get_reset_time(key, rule.window_seconds)
        
        limit = rule.burst_requests if rule.burst_requests else rule.requests
        allowed = current_count < limit
        remaining = max(0, limit - current_count - 1) if allowed else 0
        
        retry_after = None
        if not allowed:
            retry_after = int((reset_time - datetime.utcnow()).total_seconds())
            retry_after = max(1, retry_after)
        
        return RateLimitStatus(
            allowed=allowed,
            limit=limit,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=retry_after
        )
    
    def get_status(self, identifier: str, rule_name: str = 'api_general') -> Dict[str, Any]:
        """
        Get current rate limit status without incrementing
        
        Args:
            identifier: Rate limit identifier
            rule_name: Rule to check
            
        Returns:
            Status information
        """
        rule = self.DEFAULT_RULES.get(rule_name, self.DEFAULT_RULES['api_general'])
        current_count = self.storage.get_count(identifier, rule.window_seconds)
        reset_time = self.storage.get_reset_time(identifier, rule.window_seconds)
        
        return {
            'limit': rule.requests,
            'remaining': max(0, rule.requests - current_count),
            'reset_time': reset_time.isoformat(),
            'window_seconds': rule.window_seconds
        }
    
    def add_rule(self, name: str, rule: RateLimitRule):
        """Add custom rate limit rule"""
        self.DEFAULT_RULES[name] = rule
        logger.info(f"Added rate limit rule: {name} = {rule.requests}/{rule.window_seconds}s")
    
    def clear_limit(self, identifier: str):
        """Clear rate limit for identifier (admin function)"""
        try:
            if hasattr(self.storage, 'redis'):
                # Redis storage
                pattern = f"rate_limit:*{identifier}*"
                keys = self.storage.redis.keys(pattern)
                if keys:
                    self.storage.redis.delete(*keys)
            elif hasattr(self.storage, '_data'):
                # In-memory storage
                keys_to_remove = [k for k in self.storage._data.keys() if identifier in k]
                for key in keys_to_remove:
                    del self.storage._data[key]
            
            logger.info(f"Cleared rate limits for: {identifier}")
        except Exception as e:
            logger.error(f"Failed to clear rate limits for {identifier}: {e}")

# Global instance
rate_limiter = EnhancedRateLimiter()

def check_fuel_api_limits(ip_address: str, user_id: Optional[str] = None) -> RateLimitStatus:
    """
    Convenience function for fuel API rate limiting
    
    Args:
        ip_address: Client IP address
        user_id: Optional user ID
        
    Returns:
        RateLimitStatus
    """
    identifier = user_id if user_id else ip_address
    return rate_limiter.check_rate_limit(
        identifier=identifier,
        rule_name='fuel_estimate_user' if user_id else 'fuel_estimate_ip',
        ip_address=ip_address,
        user_id=user_id
    )