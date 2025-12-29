/**
 * FlightTrace Secure Storage
 *
 * Secure storage for sensitive data like auth tokens using expo-secure-store.
 * Falls back to AsyncStorage for non-sensitive data or unsupported platforms.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'flighttrace_auth_token',
  REFRESH_TOKEN: 'flighttrace_refresh_token',
  USER_ID: 'flighttrace_user_id',
  SESSION_ID: 'flighttrace_session_id',
  BIOMETRIC_ENABLED: 'flighttrace_biometric',
  TOKEN_EXPIRY: 'flighttrace_token_expiry',
  DEVICE_ID: 'flighttrace_device_id',
};

// Check if secure store is available
const isSecureStoreAvailable = async () => {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

/**
 * Secure Storage Class
 */
class SecureStorage {
  constructor() {
    this.isSecureAvailable = null;
    this._initPromise = this._init();
  }

  async _init() {
    this.isSecureAvailable = await isSecureStoreAvailable();
  }

  async _ensureInit() {
    await this._initPromise;
  }

  /**
   * Store a value securely
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   * @param {Object} options - Additional options
   */
  async setItem(key, value, options = {}) {
    await this._ensureInit();

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (this.isSecureAvailable && options.secure !== false) {
      try {
        await SecureStore.setItemAsync(key, stringValue, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        return true;
      } catch (error) {
        console.warn('SecureStore failed, falling back to AsyncStorage:', error.message);
      }
    }

    // Fallback to AsyncStorage
    await AsyncStorage.setItem(key, stringValue);
    return true;
  }

  /**
   * Retrieve a value
   * @param {string} key - Storage key
   * @param {Object} options - Additional options
   */
  async getItem(key, options = {}) {
    await this._ensureInit();

    let value = null;

    if (this.isSecureAvailable && options.secure !== false) {
      try {
        value = await SecureStore.getItemAsync(key);
      } catch (error) {
        console.warn('SecureStore get failed:', error.message);
      }
    }

    // Fallback to AsyncStorage if not found
    if (value === null) {
      value = await AsyncStorage.getItem(key);
    }

    // Parse JSON if requested
    if (value && options.parse) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  }

  /**
   * Remove a value
   * @param {string} key - Storage key
   */
  async removeItem(key) {
    await this._ensureInit();

    if (this.isSecureAvailable) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.warn('SecureStore delete failed:', error.message);
      }
    }

    // Also remove from AsyncStorage (in case of fallback)
    await AsyncStorage.removeItem(key);
    return true;
  }

  /**
   * Clear all secure storage
   */
  async clear() {
    const keys = Object.values(STORAGE_KEYS);
    await Promise.all(keys.map((key) => this.removeItem(key)));
    return true;
  }
}

// Singleton instance
const secureStorage = new SecureStorage();

/**
 * Auth Token Manager
 */
export const AuthTokenManager = {
  /**
   * Store authentication tokens
   */
  async setTokens({ accessToken, refreshToken, expiresIn }) {
    const expiry = Date.now() + (expiresIn || 3600) * 1000;

    await Promise.all([
      secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken),
      refreshToken && secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      secureStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiry.toString()),
    ]);

    return true;
  },

  /**
   * Get current access token
   */
  async getAccessToken() {
    const [token, expiry] = await Promise.all([
      secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
      secureStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY),
    ]);

    // Check if token is expired
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      // Token expired, try to refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      }
      return null;
    }

    return token;
  },

  /**
   * Get refresh token
   */
  async getRefreshToken() {
    return secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  /**
   * Refresh the access token
   */
  async refreshToken() {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      // Import API to avoid circular dependency
      const { refreshAuthToken } = require('./api');
      const result = await refreshAuthToken(refreshToken);

      if (result.accessToken) {
        await this.setTokens(result);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error.message);
    }

    return false;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const token = await this.getAccessToken();
    return !!token;
  },

  /**
   * Clear all auth tokens (logout)
   */
  async clearTokens() {
    await Promise.all([
      secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      secureStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY),
      secureStorage.removeItem(STORAGE_KEYS.SESSION_ID),
    ]);
    return true;
  },

  /**
   * Get token expiry time
   */
  async getTokenExpiry() {
    const expiry = await secureStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    return expiry ? parseInt(expiry, 10) : null;
  },

  /**
   * Check if token will expire soon (within 5 minutes)
   */
  async isTokenExpiringSoon() {
    const expiry = await this.getTokenExpiry();
    if (!expiry) return true;

    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() > expiry - fiveMinutes;
  },
};

/**
 * Session Manager
 */
export const SessionManager = {
  /**
   * Create new session
   */
  async createSession(userId) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await Promise.all([
      secureStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId),
      secureStorage.setItem(STORAGE_KEYS.USER_ID, userId),
    ]);

    return sessionId;
  },

  /**
   * Get current session
   */
  async getSession() {
    const [sessionId, userId] = await Promise.all([
      secureStorage.getItem(STORAGE_KEYS.SESSION_ID),
      secureStorage.getItem(STORAGE_KEYS.USER_ID),
    ]);

    if (!sessionId) return null;

    return { sessionId, userId };
  },

  /**
   * End session
   */
  async endSession() {
    await Promise.all([
      secureStorage.removeItem(STORAGE_KEYS.SESSION_ID),
      secureStorage.removeItem(STORAGE_KEYS.USER_ID),
      AuthTokenManager.clearTokens(),
    ]);
    return true;
  },

  /**
   * Get user ID
   */
  async getUserId() {
    return secureStorage.getItem(STORAGE_KEYS.USER_ID);
  },
};

/**
 * Device Manager
 */
export const DeviceManager = {
  /**
   * Get or create device ID
   */
  async getDeviceId() {
    let deviceId = await secureStorage.getItem(STORAGE_KEYS.DEVICE_ID);

    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await secureStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }

    return deviceId;
  },

  /**
   * Check if biometric auth is enabled
   */
  async isBiometricEnabled() {
    const value = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return value === 'true';
  },

  /**
   * Enable/disable biometric auth
   */
  async setBiometricEnabled(enabled) {
    await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
    return true;
  },
};

export { STORAGE_KEYS };
export default secureStorage;
