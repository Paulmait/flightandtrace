"""
Feature Flag System for FlightTrace
Manages feature toggles for progressive rollout and A/B testing
"""

import os
import json
from typing import Dict, Any, Optional
from enum import Enum
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class Environment(Enum):
    """Deployment environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class FeatureFlags:
    """
    Centralized feature flag management
    Supports environment-specific flags and remote configuration
    """
    
    # Default feature flags
    DEFAULT_FLAGS = {
        "fuelEstimates": {
            "development": True,   # ON in dev
            "staging": True,       # ON in staging
            "production": False,   # OFF in prod
            "description": "Enable fuel and CO2 estimation features"
        },
        "advancedAnalytics": {
            "development": True,
            "staging": True,
            "production": False,
            "description": "Advanced flight analytics and predictions"
        },
        "socialSharing": {
            "development": True,
            "staging": True,
            "production": True,
            "description": "Social media sharing features"
        },
        "familySharing": {
            "development": True,
            "staging": True,
            "production": True,
            "description": "Family flight tracking features"
        },
        "weatherOverlay": {
            "development": True,
            "staging": True,
            "production": True,
            "description": "Weather overlay on maps"
        },
        "voiceAssistant": {
            "development": True,
            "staging": False,
            "production": False,
            "description": "Voice assistant integration"
        },
        "realtimeNotifications": {
            "development": True,
            "staging": True,
            "production": True,
            "description": "Real-time push notifications"
        },
        "multiWindow": {
            "development": True,
            "staging": True,
            "production": False,
            "description": "Multi-window support for web app"
        },
        "debugMode": {
            "development": True,
            "staging": False,
            "production": False,
            "description": "Debug mode with additional logging"
        },
        "maintenanceMode": {
            "development": False,
            "staging": False,
            "production": False,
            "description": "Maintenance mode - blocks all requests"
        }
    }
    
    # In-memory cache for flags
    _flags_cache: Dict[str, bool] = {}
    _environment: Optional[Environment] = None
    _remote_config_url: Optional[str] = None
    _last_remote_fetch: Optional[float] = None
    
    @classmethod
    def initialize(cls, environment: Optional[str] = None, remote_config_url: Optional[str] = None):
        """
        Initialize feature flags system
        
        Args:
            environment: Current environment (development/staging/production)
            remote_config_url: Optional URL for remote configuration
        """
        env_str = environment or os.getenv('ENVIRONMENT', 'development')
        
        try:
            cls._environment = Environment(env_str.lower())
        except ValueError:
            logger.warning(f"Invalid environment '{env_str}', defaulting to development")
            cls._environment = Environment.DEVELOPMENT
        
        cls._remote_config_url = remote_config_url or os.getenv('FEATURE_FLAGS_URL')
        
        # Load local overrides if they exist
        cls._load_local_overrides()
        
        # Load remote configuration if available
        if cls._remote_config_url:
            cls._load_remote_config()
        
        logger.info(f"Feature flags initialized for environment: {cls._environment.value}")
    
    @classmethod
    def is_enabled(cls, flag_name: str, user_id: Optional[str] = None) -> bool:
        """
        Check if a feature flag is enabled
        
        Args:
            flag_name: Name of the feature flag
            user_id: Optional user ID for user-specific flags
        
        Returns:
            True if feature is enabled, False otherwise
        """
        # Initialize if not done
        if cls._environment is None:
            cls.initialize()
        
        # Check maintenance mode first
        if flag_name != "maintenanceMode" and cls.is_enabled("maintenanceMode"):
            return False
        
        # Check cache first
        cache_key = f"{flag_name}:{user_id}" if user_id else flag_name
        if cache_key in cls._flags_cache:
            return cls._flags_cache[cache_key]
        
        # Check if flag exists
        if flag_name not in cls.DEFAULT_FLAGS:
            logger.warning(f"Unknown feature flag: {flag_name}")
            return False
        
        # Get flag configuration
        flag_config = cls.DEFAULT_FLAGS[flag_name]
        
        # Get environment-specific value
        enabled = flag_config.get(cls._environment.value, False)
        
        # Apply user-specific rules if provided
        if user_id:
            enabled = cls._apply_user_rules(flag_name, user_id, enabled)
        
        # Cache the result
        cls._flags_cache[cache_key] = enabled
        
        return enabled
    
    @classmethod
    def get_all_flags(cls, user_id: Optional[str] = None) -> Dict[str, bool]:
        """
        Get all feature flags and their states
        
        Args:
            user_id: Optional user ID for user-specific flags
        
        Returns:
            Dictionary of flag names to enabled states
        """
        if cls._environment is None:
            cls.initialize()
        
        flags = {}
        for flag_name in cls.DEFAULT_FLAGS:
            flags[flag_name] = cls.is_enabled(flag_name, user_id)
        
        return flags
    
    @classmethod
    def set_flag(cls, flag_name: str, enabled: bool, environment: Optional[str] = None):
        """
        Override a feature flag (for testing or admin control)
        
        Args:
            flag_name: Name of the feature flag
            enabled: Whether to enable or disable
            environment: Optional specific environment to set
        """
        if flag_name not in cls.DEFAULT_FLAGS:
            logger.warning(f"Setting unknown feature flag: {flag_name}")
            cls.DEFAULT_FLAGS[flag_name] = {
                "development": enabled,
                "staging": enabled,
                "production": enabled,
                "description": "Dynamically added flag"
            }
        
        env = environment or cls._environment.value if cls._environment else "development"
        cls.DEFAULT_FLAGS[flag_name][env] = enabled
        
        # Clear cache
        cls._clear_cache_for_flag(flag_name)
        
        logger.info(f"Feature flag '{flag_name}' set to {enabled} for environment '{env}'")
    
    @classmethod
    def _apply_user_rules(cls, flag_name: str, user_id: str, default_enabled: bool) -> bool:
        """
        Apply user-specific rules for feature flags
        
        This could include:
        - A/B testing based on user ID hash
        - Beta user access
        - Gradual rollout percentages
        """
        # Example: Gradual rollout based on user ID hash
        if flag_name == "fuelEstimates" and cls._environment == Environment.PRODUCTION:
            # Roll out to 10% of users in production
            user_hash = hash(user_id) % 100
            return user_hash < 10
        
        # Example: Beta users get early access
        beta_users = os.getenv('BETA_USERS', '').split(',')
        if user_id in beta_users:
            return True
        
        return default_enabled
    
    @classmethod
    def _load_local_overrides(cls):
        """Load local feature flag overrides from file"""
        override_path = Path('feature_flags_override.json')
        
        if override_path.exists():
            try:
                with open(override_path, 'r') as f:
                    overrides = json.load(f)
                    
                for flag_name, config in overrides.items():
                    if isinstance(config, bool):
                        # Simple boolean override
                        cls.set_flag(flag_name, config)
                    elif isinstance(config, dict):
                        # Environment-specific overrides
                        for env, enabled in config.items():
                            cls.set_flag(flag_name, enabled, env)
                
                logger.info(f"Loaded {len(overrides)} feature flag overrides")
            except Exception as e:
                logger.error(f"Failed to load feature flag overrides: {e}")
    
    @classmethod
    def _load_remote_config(cls):
        """Load feature flags from remote configuration service"""
        if not cls._remote_config_url:
            return
        
        try:
            import requests
            from time import time
            
            # Cache remote config for 5 minutes
            if cls._last_remote_fetch and (time() - cls._last_remote_fetch) < 300:
                return
            
            response = requests.get(cls._remote_config_url, timeout=5)
            if response.ok:
                remote_flags = response.json()
                
                for flag_name, config in remote_flags.items():
                    if isinstance(config, bool):
                        cls.set_flag(flag_name, config)
                    elif isinstance(config, dict):
                        for env, enabled in config.items():
                            if env == cls._environment.value:
                                cls.set_flag(flag_name, enabled, env)
                
                cls._last_remote_fetch = time()
                logger.info(f"Loaded {len(remote_flags)} feature flags from remote config")
                
        except Exception as e:
            logger.warning(f"Failed to load remote feature flags: {e}")
    
    @classmethod
    def _clear_cache_for_flag(cls, flag_name: str):
        """Clear cache entries for a specific flag"""
        keys_to_remove = [key for key in cls._flags_cache if key.startswith(flag_name)]
        for key in keys_to_remove:
            del cls._flags_cache[key]
    
    @classmethod
    def export_config(cls) -> Dict[str, Any]:
        """Export current feature flag configuration"""
        if cls._environment is None:
            cls.initialize()
        
        return {
            "environment": cls._environment.value,
            "flags": cls.DEFAULT_FLAGS,
            "cache": cls._flags_cache
        }

# Decorator for feature flag protected functions
def feature_required(flag_name: str):
    """
    Decorator to protect functions with feature flags
    
    Usage:
        @feature_required("fuelEstimates")
        def calculate_fuel():
            ...
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not FeatureFlags.is_enabled(flag_name):
                raise PermissionError(f"Feature '{flag_name}' is not enabled")
            return func(*args, **kwargs)
        return wrapper
    return decorator