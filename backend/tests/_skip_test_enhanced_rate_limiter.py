"""
Unit tests for enhanced rate limiter
Tests IP + user token rate limiting with Redis and in-memory storage
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import time

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.enhanced_rate_limiter import (
    EnhancedRateLimiter, RateLimitRule, RateLimitStatus,
    InMemoryStorage, RedisStorage, check_fuel_api_limits
)


class TestRateLimitRule:
    """Test rate limit rule configuration"""
    
    def test_basic_rule_creation(self):
        """Test creating basic rate limit rule"""
        rule = RateLimitRule(100, 3600)
        
        assert rule.requests == 100
        assert rule.window_seconds == 3600
        assert rule.burst_requests is None
    
    def test_rule_with_burst(self):
        """Test creating rate limit rule with burst allowance"""
        rule = RateLimitRule(10, 60, 20)
        
        assert rule.requests == 10
        assert rule.window_seconds == 60
        assert rule.burst_requests == 20


class TestRateLimitStatus:
    """Test rate limit status response"""
    
    def test_allowed_status(self):
        """Test creating allowed status"""
        reset_time = datetime.utcnow() + timedelta(hours=1)
        status = RateLimitStatus(
            allowed=True,
            limit=100,
            remaining=75,
            reset_time=reset_time
        )
        
        assert status.allowed is True
        assert status.limit == 100
        assert status.remaining == 75
        assert status.reset_time == reset_time
        assert status.retry_after is None
    
    def test_blocked_status(self):
        """Test creating blocked status with retry_after"""
        reset_time = datetime.utcnow() + timedelta(minutes=30)
        status = RateLimitStatus(
            allowed=False,
            limit=100,
            remaining=0,
            reset_time=reset_time,
            retry_after=1800
        )
        
        assert status.allowed is False
        assert status.remaining == 0
        assert status.retry_after == 1800


class TestInMemoryStorage:
    """Test in-memory storage backend"""
    
    @pytest.fixture
    def storage(self):
        """Create in-memory storage instance"""
        return InMemoryStorage()
    
    def test_initial_count_zero(self, storage):
        """Test initial count is zero for new key"""
        count = storage.get_count("test_key", 3600)
        assert count == 0
    
    def test_increment_creates_entry(self, storage):
        """Test increment creates new entry"""
        count = storage.increment("test_key", 3600)
        assert count == 1
        
        # Second increment
        count = storage.increment("test_key", 3600)
        assert count == 2
    
    def test_get_reset_time(self, storage):
        """Test reset time calculation"""
        # Before any increments, should return future time
        reset_time = storage.get_reset_time("new_key", 3600)
        assert reset_time > datetime.utcnow()
        
        # After increment, should return stored expiry
        storage.increment("new_key", 3600)
        reset_time2 = storage.get_reset_time("new_key", 3600)
        assert reset_time2 > datetime.utcnow()
        assert reset_time2 <= datetime.utcnow() + timedelta(seconds=3600)
    
    def test_cleanup_expired_entries(self, storage):
        """Test cleanup of expired entries"""
        # Create entry with very short window
        storage.increment("short_key", 1)
        
        # Verify it exists
        assert storage.get_count("short_key", 1) == 1
        
        # Wait for expiration and trigger cleanup
        time.sleep(1.1)
        count = storage.get_count("expired_key", 3600)  # This triggers cleanup
        
        # Original entry should be cleaned up
        assert "short_key" not in storage._data
    
    def test_different_windows(self, storage):
        """Test different time windows work independently"""
        # Same key, different windows
        count1 = storage.increment("key", 60)
        count2 = storage.increment("key", 3600)
        
        # Should be independent counts
        assert count1 == 1
        assert count2 == 1


class TestRedisStorage:
    """Test Redis storage backend"""
    
    @pytest.fixture
    def mock_redis(self):
        """Create mock Redis client"""
        return Mock()
    
    @pytest.fixture
    def storage(self, mock_redis):
        """Create Redis storage with mock client"""
        return RedisStorage(mock_redis)
    
    def test_get_count_existing(self, storage, mock_redis):
        """Test get_count with existing key"""
        mock_redis.get.return_value = b"42"
        
        count = storage.get_count("test_key", 3600)
        
        assert count == 42
        mock_redis.get.assert_called_with("rate_limit:test_key")
    
    def test_get_count_nonexistent(self, storage, mock_redis):
        """Test get_count with nonexistent key"""
        mock_redis.get.return_value = None
        
        count = storage.get_count("nonexistent", 3600)
        
        assert count == 0
    
    def test_increment_new_key(self, storage, mock_redis):
        """Test increment creates new key with expiry"""
        mock_redis.pipeline.return_value = mock_redis
        mock_redis.execute.return_value = [5]  # New count after increment
        
        count = storage.increment("new_key", 3600)
        
        assert count == 5
        mock_redis.incr.assert_called_with("rate_limit:new_key")
        mock_redis.expire.assert_called_with("rate_limit:new_key", 3600)
    
    def test_get_reset_time_with_ttl(self, storage, mock_redis):
        """Test get_reset_time with remaining TTL"""
        mock_redis.ttl.return_value = 1800  # 30 minutes remaining
        
        reset_time = storage.get_reset_time("test_key", 3600)
        
        expected_time = datetime.utcnow() + timedelta(seconds=1800)
        time_diff = abs((reset_time - expected_time).total_seconds())
        assert time_diff < 1  # Within 1 second
    
    def test_redis_error_handling(self, storage, mock_redis):
        """Test Redis error handling falls back gracefully"""
        mock_redis.get.side_effect = Exception("Redis connection failed")
        
        count = storage.get_count("error_key", 3600)
        
        # Should return 0 on error
        assert count == 0
    
    def test_increment_error_fail_open(self, storage, mock_redis):
        """Test increment error fails open (allows request)"""
        mock_redis.pipeline.side_effect = Exception("Redis error")
        
        count = storage.increment("error_key", 3600)
        
        # Should return 1 (fail open)
        assert count == 1


class TestEnhancedRateLimiter:
    """Test enhanced rate limiter logic"""
    
    @pytest.fixture
    def limiter(self):
        """Create rate limiter with in-memory storage"""
        return EnhancedRateLimiter(InMemoryStorage())
    
    def test_default_rule_loading(self, limiter):
        """Test default rules are loaded"""
        assert 'fuel_estimate_ip' in limiter.DEFAULT_RULES
        assert 'fuel_estimate_user' in limiter.DEFAULT_RULES
        assert 'fuel_estimate_global' in limiter.DEFAULT_RULES
        assert 'api_general' in limiter.DEFAULT_RULES
        assert 'api_burst' in limiter.DEFAULT_RULES
    
    def test_single_limit_allowed(self, limiter):
        """Test request allowed within limit"""
        status = limiter.check_rate_limit("user123", "api_general")
        
        assert status.allowed is True
        assert status.limit == 1000  # api_general default
        assert status.remaining == 999  # After increment
        assert status.retry_after is None
    
    def test_single_limit_exceeded(self, limiter):
        """Test request blocked when limit exceeded"""
        # Create rule with limit of 2
        limiter.add_rule("test_limit", RateLimitRule(2, 3600))
        
        # Make 2 requests (should succeed)
        status1 = limiter.check_rate_limit("user456", "test_limit")
        status2 = limiter.check_rate_limit("user456", "test_limit")
        
        assert status1.allowed is True
        assert status2.allowed is True
        assert status2.remaining == 0
        
        # Third request should be blocked
        status3 = limiter.check_rate_limit("user456", "test_limit")
        
        assert status3.allowed is False
        assert status3.remaining == 0
        assert status3.retry_after is not None
        assert status3.retry_after > 0
    
    def test_fuel_estimate_multiple_limits(self, limiter):
        """Test fuel estimate with IP and user limits"""
        # Should check both IP and user limits for fuel estimates
        status = limiter.check_rate_limit(
            identifier="user789",
            rule_name="fuel_estimate_user",
            ip_address="192.168.1.100",
            user_id="user789"
        )
        
        assert status.allowed is True
        
        # Verify both IP and user counters were incremented
        ip_count = limiter.storage.get_count("ip:192.168.1.100", 3600)
        user_count = limiter.storage.get_count("user:user789", 3600)
        
        assert ip_count == 1
        assert user_count == 1
    
    def test_fuel_estimate_ip_limit_blocks(self, limiter):
        """Test fuel estimate blocked by IP limit"""
        # Set up IP to be at limit
        ip_rule = limiter.DEFAULT_RULES['fuel_estimate_ip']
        for _ in range(ip_rule.requests):
            limiter.storage.increment("ip:192.168.1.200", ip_rule.window_seconds)
        
        # Next request should be blocked by IP limit
        status = limiter.check_rate_limit(
            identifier="user999",
            rule_name="fuel_estimate_user",
            ip_address="192.168.1.200",
            user_id="user999"
        )
        
        assert status.allowed is False
        assert "ip" in str(status).lower() or status.limit == ip_rule.requests
    
    def test_fuel_estimate_global_limit(self, limiter):
        """Test global fuel estimate limit"""
        # Set up global counter near limit
        global_rule = limiter.DEFAULT_RULES['fuel_estimate_global']
        for _ in range(global_rule.requests):
            limiter.storage.increment("global:fuel_estimate", global_rule.window_seconds)
        
        # Next fuel estimate should be blocked
        status = limiter.check_rate_limit(
            identifier="anyuser",
            rule_name="fuel_estimate_user",
            ip_address="192.168.1.1",
            user_id="anyuser"
        )
        
        assert status.allowed is False
    
    def test_burst_limit_handling(self, limiter):
        """Test burst limit with regular limit"""
        burst_rule = limiter.DEFAULT_RULES['api_burst']
        
        # Should use burst_requests if available
        for i in range(burst_rule.burst_requests):
            status = limiter.check_rate_limit("burst_user", "api_burst")
            if i < burst_rule.burst_requests - 1:
                assert status.allowed is True
        
        # Should be blocked after burst limit
        final_status = limiter.check_rate_limit("burst_user", "api_burst")
        assert final_status.allowed is False
    
    def test_get_status_without_increment(self, limiter):
        """Test get_status doesn't increment counter"""
        # Make one request
        limiter.check_rate_limit("status_user", "api_general")
        
        # Get status (shouldn't increment)
        status_info = limiter.get_status("status_user", "api_general")
        
        assert "limit" in status_info
        assert "remaining" in status_info
        assert "reset_time" in status_info
        assert status_info["remaining"] == 999  # Still 999, not 998
        
        # Verify counter wasn't incremented
        count = limiter.storage.get_count("status_user", 3600)
        assert count == 1  # Still 1, not 2
    
    def test_add_custom_rule(self, limiter):
        """Test adding custom rate limit rule"""
        custom_rule = RateLimitRule(50, 1800)
        limiter.add_rule("custom_api", custom_rule)
        
        # Use custom rule
        status = limiter.check_rate_limit("custom_user", "custom_api")
        
        assert status.allowed is True
        assert status.limit == 50
    
    def test_unknown_rule_fallback(self, limiter):
        """Test unknown rule falls back to api_general"""
        status = limiter.check_rate_limit("fallback_user", "nonexistent_rule")
        
        assert status.allowed is True
        # Should use api_general default
        assert status.limit == 1000
    
    def test_clear_limit_in_memory(self, limiter):
        """Test clearing rate limits for in-memory storage"""
        # Create some limits
        limiter.check_rate_limit("clear_user", "api_general")
        limiter.check_rate_limit("ip:192.168.1.50", "fuel_estimate_ip")
        
        # Verify they exist
        assert limiter.storage.get_count("clear_user", 3600) == 1
        assert limiter.storage.get_count("ip:192.168.1.50", 3600) == 1
        
        # Clear limits for user
        limiter.clear_limit("clear_user")
        
        # User limits should be cleared
        assert limiter.storage.get_count("clear_user", 3600) == 0
        
        # IP limits should remain
        assert limiter.storage.get_count("ip:192.168.1.50", 3600) == 1
    
    def test_clear_limit_redis(self):
        """Test clearing rate limits for Redis storage"""
        mock_redis = Mock()
        mock_redis.keys.return_value = [
            b"rate_limit:clear_user",
            b"rate_limit:user:clear_user", 
            b"rate_limit:other_user"
        ]
        
        limiter = EnhancedRateLimiter(RedisStorage(mock_redis))
        limiter.clear_limit("clear_user")
        
        # Should delete matching keys
        mock_redis.delete.assert_called_once()
        deleted_keys = mock_redis.delete.call_args[0]
        assert b"rate_limit:clear_user" in deleted_keys
        assert b"rate_limit:user:clear_user" in deleted_keys
        assert b"rate_limit:other_user" not in deleted_keys
    
    def test_storage_auto_detection(self):
        """Test automatic storage backend detection"""
        # Test Redis environment
        with patch.dict(os.environ, {"REDIS_URL": "redis://localhost:6379"}):
            with patch('src.core.enhanced_rate_limiter.RedisStorage') as mock_redis_storage:
                limiter = EnhancedRateLimiter()
                mock_redis_storage.assert_called_once()
        
        # Test production environment
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            with patch('src.core.enhanced_rate_limiter.RedisStorage') as mock_redis_storage:
                limiter = EnhancedRateLimiter()
                mock_redis_storage.assert_called_once()
        
        # Test development environment (default)
        with patch.dict(os.environ, {}, clear=True):
            limiter = EnhancedRateLimiter()
            assert isinstance(limiter.storage, InMemoryStorage)


class TestCheckFuelApiLimits:
    """Test convenience function for fuel API limits"""
    
    @pytest.fixture
    def mock_rate_limiter(self):
        """Mock global rate limiter"""
        with patch('src.core.enhanced_rate_limiter.rate_limiter') as mock:
            yield mock
    
    def test_check_with_user_id(self, mock_rate_limiter):
        """Test fuel API limits with user ID"""
        mock_status = RateLimitStatus(True, 500, 499, datetime.utcnow())
        mock_rate_limiter.check_rate_limit.return_value = mock_status
        
        status = check_fuel_api_limits("192.168.1.1", "user123")
        
        assert status == mock_status
        mock_rate_limiter.check_rate_limit.assert_called_with(
            identifier="user123",
            rule_name="fuel_estimate_user",
            ip_address="192.168.1.1",
            user_id="user123"
        )
    
    def test_check_without_user_id(self, mock_rate_limiter):
        """Test fuel API limits with IP only"""
        mock_status = RateLimitStatus(True, 100, 99, datetime.utcnow())
        mock_rate_limiter.check_rate_limit.return_value = mock_status
        
        status = check_fuel_api_limits("192.168.1.2")
        
        assert status == mock_status
        mock_rate_limiter.check_rate_limit.assert_called_with(
            identifier="192.168.1.2",
            rule_name="fuel_estimate_ip",
            ip_address="192.168.1.2",
            user_id=None
        )


class TestRateLimitPerformance:
    """Test rate limiter performance characteristics"""
    
    def test_memory_usage_cleanup(self):
        """Test in-memory storage cleans up expired entries"""
        storage = InMemoryStorage()
        
        # Create many entries with short expiry
        for i in range(1000):
            storage.increment(f"temp_{i}", 1)
        
        # Verify entries exist
        assert len(storage._data) == 1000
        
        # Wait for expiration
        time.sleep(1.1)
        
        # Trigger cleanup
        storage.get_count("trigger_cleanup", 3600)
        
        # Expired entries should be cleaned up
        assert len(storage._data) == 1  # Only the trigger entry
    
    def test_concurrent_access_safety(self):
        """Test thread-safe access to in-memory storage"""
        import threading
        import time
        
        storage = InMemoryStorage()
        results = []
        
        def increment_counter(key, times):
            for _ in range(times):
                count = storage.increment(key, 3600)
                results.append(count)
                time.sleep(0.001)  # Small delay to encourage race conditions
        
        # Start multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=increment_counter, args=(f"concurrent_{i}", 10))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify results
        assert len(results) == 50  # 5 threads × 10 increments each
        
        # Each key should have count of 10
        for i in range(5):
            final_count = storage.get_count(f"concurrent_{i}", 3600)
            assert final_count == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=src.core.enhanced_rate_limiter", "--cov-report=term-missing"])