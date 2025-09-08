/**
 * Offline Banner Component
 * Shows connection status and handles graceful degradation
 */

import React, { useState, useEffect } from 'react';

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnectMessage, setShowReconnectMessage] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState(Date.now());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      if (wasOffline) {
        setShowReconnectMessage(true);
        setTimeout(() => setShowReconnectMessage(false), 5000);
      }
      
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setLastOnlineTime(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Enhanced connection check
  useEffect(() => {
    if (!isOnline) return;

    const checkConnection = async () => {
      try {
        // Ping a small endpoint to verify real connectivity
        const response = await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache',
          timeout: 5000
        });
        
        if (!response.ok) {
          throw new Error('Server unreachable');
        }
      } catch (error) {
        console.warn('Connection check failed:', error);
        // Could set a different state for "connected but server unreachable"
      }
    };

    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [isOnline]);

  const formatOfflineTime = () => {
    const minutes = Math.floor((Date.now() - lastOnlineTime) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  const retryConnection = () => {
    window.location.reload();
  };

  // Success reconnection banner
  if (showReconnectMessage) {
    return (
      <div className="connection-banner reconnected">
        <div className="banner-content">
          <div className="status-icon">✅</div>
          <div className="status-message">
            <strong>You're back online!</strong>
            <span>Flight data is updating again</span>
          </div>
        </div>
      </div>
    );
  }

  // Offline banner
  if (!isOnline) {
    return (
      <div className="connection-banner offline">
        <div className="banner-content">
          <div className="status-icon">⚠️</div>
          <div className="status-message">
            <strong>You're offline</strong>
            <span>Last updated {formatOfflineTime()}</span>
          </div>
          <div className="offline-actions">
            <button 
              className="retry-btn"
              onClick={retryConnection}
            >
              Retry
            </button>
          </div>
        </div>
        
        <div className="offline-info">
          <h4>Limited Functionality Available:</h4>
          <div className="offline-features">
            <div className="feature available">
              ✓ View cached flight data
            </div>
            <div className="feature available">
              ✓ Browse saved aircraft & airports
            </div>
            <div className="feature available">
              ✓ Access watchlist
            </div>
            <div className="feature unavailable">
              ✗ Real-time flight updates
            </div>
            <div className="feature unavailable">
              ✗ New flight searches
            </div>
            <div className="feature unavailable">
              ✗ Live tracking
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Offline-aware component wrapper
 */
export const OfflineWrapper = ({ children, fallback, requiresConnection = true }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline && requiresConnection) {
    return fallback || (
      <div className="offline-placeholder">
        <div className="offline-icon">📡</div>
        <h3>Connection Required</h3>
        <p>This feature requires an internet connection.</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return children;
};

/**
 * Hook for checking online status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState('good');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection quality
    if ('connection' in navigator) {
      const updateConnectionQuality = () => {
        const connection = navigator.connection;
        
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          setConnectionQuality('poor');
        } else if (connection.effectiveType === '3g') {
          setConnectionQuality('moderate');
        } else {
          setConnectionQuality('good');
        }
      };

      navigator.connection.addEventListener('change', updateConnectionQuality);
      updateConnectionQuality();

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        navigator.connection.removeEventListener('change', updateConnectionQuality);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionQuality };
};

/**
 * Connection quality indicator
 */
export const ConnectionIndicator = () => {
  const { isOnline, connectionQuality } = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="connection-indicator offline">
        <span className="indicator-dot"></span>
        <span className="indicator-text">Offline</span>
      </div>
    );
  }

  return (
    <div className={`connection-indicator ${connectionQuality}`}>
      <span className="indicator-dot"></span>
      <span className="indicator-text">
        {connectionQuality === 'good' ? 'Online' :
         connectionQuality === 'moderate' ? 'Slow connection' :
         'Very slow connection'}
      </span>
    </div>
  );
};

/**
 * Data staleness indicator
 */
export const DataFreshnessIndicator = ({ lastUpdated, maxAge = 300000 }) => {
  const [isStale, setIsStale] = useState(false);
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    const checkStaleness = () => {
      const age = Date.now() - lastUpdated;
      setIsStale(age > maxAge);
    };

    checkStaleness();
    const interval = setInterval(checkStaleness, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [lastUpdated, maxAge]);

  if (!isStale && isOnline) return null;

  const age = Math.floor((Date.now() - lastUpdated) / 60000);
  
  return (
    <div className={`data-freshness ${isStale ? 'stale' : ''} ${!isOnline ? 'offline' : ''}`}>
      <div className="freshness-icon">
        {!isOnline ? '📡' : '🔄'}
      </div>
      <div className="freshness-text">
        {!isOnline ? 'Cached data' : `Data is ${age}m old`}
      </div>
    </div>
  );
};

export default OfflineBanner;