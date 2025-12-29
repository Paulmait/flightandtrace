import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Cache keys
const CACHE_KEYS = {
  FLIGHTS: 'cached_flights',
  FLIGHT_HISTORY: 'cached_flight_history',
  USER_PROFILE: 'cached_user_profile',
  ALERTS: 'cached_alerts',
  AIRPORTS: 'cached_airports',
  LAST_SYNC: 'last_sync_timestamp',
};

// Cache expiration times (in milliseconds)
const CACHE_TTL = {
  FLIGHTS: 60000,          // 1 minute - live flight data expires quickly
  FLIGHT_HISTORY: 3600000, // 1 hour - historical data changes less frequently
  USER_PROFILE: 300000,    // 5 minutes
  ALERTS: 120000,          // 2 minutes
  AIRPORTS: 86400000,      // 24 hours - static data
};

// Stale data thresholds
export const STALE_THRESHOLDS = {
  FRESH: 30000,     // 30 seconds
  WARNING: 60000,   // 1 minute
  STALE: 300000,    // 5 minutes
  CRITICAL: 600000, // 10 minutes
};

/**
 * Get cached data with freshness metadata
 */
export async function getCachedData(key) {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS[key] || key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    const ttl = CACHE_TTL[key] || 300000;

    return {
      data,
      timestamp,
      age,
      isStale: age > ttl,
      freshness: getFreshnessLevel(age),
    };
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data with timestamp
 */
export async function setCachedData(key, data) {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      CACHE_KEYS[key] || key,
      JSON.stringify(cacheEntry)
    );
    return true;
  } catch (error) {
    console.error(`Error writing cache for ${key}:`, error);
    return false;
  }
}

/**
 * Clear specific cache
 */
export async function clearCache(key) {
  try {
    await AsyncStorage.removeItem(CACHE_KEYS[key] || key);
    return true;
  } catch (error) {
    console.error(`Error clearing cache for ${key}:`, error);
    return false;
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache() {
  try {
    const keys = Object.values(CACHE_KEYS);
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    console.error('Error clearing all cache:', error);
    return false;
  }
}

/**
 * Get data freshness level
 */
export function getFreshnessLevel(ageMs) {
  if (ageMs < STALE_THRESHOLDS.FRESH) return 'fresh';
  if (ageMs < STALE_THRESHOLDS.WARNING) return 'warning';
  if (ageMs < STALE_THRESHOLDS.STALE) return 'stale';
  return 'critical';
}

/**
 * Check if data is stale
 */
export function isDataStale(timestamp, threshold = STALE_THRESHOLDS.STALE) {
  if (!timestamp) return true;
  return Date.now() - timestamp > threshold;
}

/**
 * Check network connectivity
 */
export async function isOnline() {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch with offline fallback
 * Attempts network fetch first, falls back to cache on failure
 */
export async function fetchWithOfflineFallback(
  fetchFn,
  cacheKey,
  options = {}
) {
  const {
    forceRefresh = false,
    cacheTTL = CACHE_TTL[cacheKey],
  } = options;

  const online = await isOnline();

  // If offline, return cached data immediately
  if (!online) {
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        offline: true,
      };
    }
    throw new Error('No internet connection and no cached data available');
  }

  // If not forcing refresh, check cache freshness
  if (!forceRefresh) {
    const cached = await getCachedData(cacheKey);
    if (cached && !cached.isStale) {
      return {
        ...cached,
        fromCache: true,
        offline: false,
      };
    }
  }

  // Attempt network fetch
  try {
    const data = await fetchFn();

    // Cache the fresh data
    await setCachedData(cacheKey, data);

    return {
      data,
      timestamp: Date.now(),
      age: 0,
      isStale: false,
      freshness: 'fresh',
      fromCache: false,
      offline: false,
    };
  } catch (error) {
    // Network failed, try cache
    const cached = await getCachedData(cacheKey);
    if (cached) {
      console.warn(`Network fetch failed, using cached data:`, error.message);
      return {
        ...cached,
        fromCache: true,
        fetchError: error.message,
      };
    }
    throw error;
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime() {
  try {
    const timestamp = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Update last sync timestamp
 */
export async function updateLastSyncTime() {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Format time since last update for display
 */
export function formatTimeSinceUpdate(timestamp) {
  if (!timestamp) return 'Never updated';

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/**
 * Get cache storage size (approximate)
 */
export async function getCacheSize() {
  try {
    let totalSize = 0;
    for (const key of Object.values(CACHE_KEYS)) {
      const item = await AsyncStorage.getItem(key);
      if (item) {
        totalSize += item.length * 2; // Approximate bytes (2 bytes per character)
      }
    }
    return totalSize;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
  getCachedData,
  setCachedData,
  clearCache,
  clearAllCache,
  getFreshnessLevel,
  isDataStale,
  isOnline,
  fetchWithOfflineFallback,
  getLastSyncTime,
  updateLastSyncTime,
  formatTimeSinceUpdate,
  getCacheSize,
  formatBytes,
  CACHE_KEYS,
  CACHE_TTL,
  STALE_THRESHOLDS,
};
