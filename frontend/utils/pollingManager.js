/**
 * FlightTrace Battery-Efficient Polling Manager
 *
 * Implements adaptive polling with:
 * - App state awareness (foreground/background)
 * - Network condition detection
 * - Battery state optimization
 * - Exponential backoff for failures
 * - Priority-based polling
 */

import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Battery from 'expo-battery';

// Polling intervals (milliseconds)
const INTERVALS = {
  // Foreground intervals
  FOREGROUND_FAST: 5000,      // 5 seconds - active map view
  FOREGROUND_NORMAL: 15000,   // 15 seconds - flight details
  FOREGROUND_SLOW: 30000,     // 30 seconds - inactive screens

  // Background intervals
  BACKGROUND_NORMAL: 60000,    // 1 minute - has active alerts
  BACKGROUND_SLOW: 300000,     // 5 minutes - no alerts
  BACKGROUND_MINIMAL: 900000,  // 15 minutes - low battery mode

  // Error backoff
  MIN_BACKOFF: 5000,
  MAX_BACKOFF: 300000,        // 5 minutes max backoff
};

// Priority levels
const PRIORITY = {
  CRITICAL: 1,    // Flight alerts about to trigger
  HIGH: 2,        // Active map view
  NORMAL: 3,      // Flight details view
  LOW: 4,         // Background refresh
  MINIMAL: 5,     // Low battery mode
};

/**
 * Polling Manager Class
 */
class PollingManager {
  constructor() {
    this.subscribers = new Map();
    this.appState = AppState.currentState;
    this.networkState = { isConnected: true, type: 'unknown' };
    this.batteryLevel = 1;
    this.isLowBatteryMode = false;
    this.failureCount = new Map();
    this.timers = new Map();
    this.isPaused = false;

    this._setupListeners();
  }

  /**
   * Set up app state, network, and battery listeners
   */
  _setupListeners() {
    // App state changes
    this._appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = this.appState.match(/inactive|background/);
      const isNowForeground = nextAppState === 'active';

      this.appState = nextAppState;

      if (wasBackground && isNowForeground) {
        // Coming to foreground - refresh immediately
        this._onForeground();
      } else if (nextAppState.match(/inactive|background/)) {
        // Going to background - reduce polling
        this._onBackground();
      }
    });

    // Network state changes
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.networkState.isConnected;
      this.networkState = {
        isConnected: state.isConnected,
        type: state.type,
        isWifi: state.type === 'wifi',
        isCellular: state.type === 'cellular',
      };

      if (wasOffline && state.isConnected) {
        // Network restored - refresh data
        this._onNetworkRestored();
      }
    });

    // Battery state (iOS/Android)
    this._setupBatteryListener();
  }

  /**
   * Set up battery monitoring
   */
  async _setupBatteryListener() {
    try {
      // Get initial battery level
      this.batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();

      // Check if in low power mode
      this.isLowBatteryMode = this.batteryLevel < 0.2 ||
        batteryState === Battery.BatteryState.UNPLUGGED && this.batteryLevel < 0.3;

      // Subscribe to changes
      Battery.addBatteryLevelListener(({ batteryLevel }) => {
        this.batteryLevel = batteryLevel;
        this._updateBatteryMode();
      });

      Battery.addBatteryStateListener(({ batteryState }) => {
        this._updateBatteryMode();
      });

      // iOS low power mode
      if (Platform.OS === 'ios') {
        Battery.addLowPowerModeListener(({ lowPowerMode }) => {
          this.isLowBatteryMode = lowPowerMode;
          this._adjustAllPolling();
        });
      }
    } catch (error) {
      console.warn('Battery monitoring not available:', error.message);
    }
  }

  /**
   * Update battery mode status
   */
  _updateBatteryMode() {
    const wasLowBattery = this.isLowBatteryMode;
    this.isLowBatteryMode = this.batteryLevel < 0.2;

    if (wasLowBattery !== this.isLowBatteryMode) {
      this._adjustAllPolling();
    }
  }

  /**
   * Called when app comes to foreground
   */
  _onForeground() {
    // Immediately poll all high-priority subscribers
    this.subscribers.forEach((sub, id) => {
      if (sub.priority <= PRIORITY.NORMAL) {
        this._executePoll(id);
      }
    });

    this._adjustAllPolling();
  }

  /**
   * Called when app goes to background
   */
  _onBackground() {
    this._adjustAllPolling();
  }

  /**
   * Called when network is restored
   */
  _onNetworkRestored() {
    // Clear failure counts
    this.failureCount.clear();

    // Refresh all subscribers
    this.subscribers.forEach((sub, id) => {
      this._executePoll(id);
    });
  }

  /**
   * Calculate polling interval based on current state
   */
  _calculateInterval(subscriber) {
    const { priority } = subscriber;
    const isBackground = this.appState !== 'active';

    // Low battery mode
    if (this.isLowBatteryMode) {
      return INTERVALS.BACKGROUND_MINIMAL;
    }

    // Background mode
    if (isBackground) {
      switch (priority) {
        case PRIORITY.CRITICAL:
          return INTERVALS.BACKGROUND_NORMAL;
        case PRIORITY.HIGH:
          return INTERVALS.BACKGROUND_NORMAL;
        default:
          return INTERVALS.BACKGROUND_SLOW;
      }
    }

    // Foreground mode
    switch (priority) {
      case PRIORITY.CRITICAL:
        return INTERVALS.FOREGROUND_FAST;
      case PRIORITY.HIGH:
        return INTERVALS.FOREGROUND_FAST;
      case PRIORITY.NORMAL:
        return INTERVALS.FOREGROUND_NORMAL;
      default:
        return INTERVALS.FOREGROUND_SLOW;
    }
  }

  /**
   * Apply exponential backoff for failures
   */
  _getBackoffInterval(subscriberId, baseInterval) {
    const failures = this.failureCount.get(subscriberId) || 0;
    if (failures === 0) return baseInterval;

    const backoff = Math.min(
      baseInterval * Math.pow(2, failures),
      INTERVALS.MAX_BACKOFF
    );

    return Math.max(backoff, INTERVALS.MIN_BACKOFF);
  }

  /**
   * Adjust polling for all subscribers
   */
  _adjustAllPolling() {
    this.subscribers.forEach((sub, id) => {
      this._scheduleNext(id);
    });
  }

  /**
   * Schedule next poll for a subscriber
   */
  _scheduleNext(subscriberId) {
    // Clear existing timer
    const existingTimer = this.timers.get(subscriberId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (this.isPaused) return;

    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return;

    // Calculate interval
    let interval = this._calculateInterval(subscriber);
    interval = this._getBackoffInterval(subscriberId, interval);

    // Adjust for network type (cellular = slower)
    if (this.networkState.isCellular && !subscriber.allowCellular) {
      interval = Math.max(interval, INTERVALS.FOREGROUND_SLOW);
    }

    // Schedule next poll
    const timer = setTimeout(() => {
      this._executePoll(subscriberId);
    }, interval);

    this.timers.set(subscriberId, timer);
  }

  /**
   * Execute poll for a subscriber
   */
  async _executePoll(subscriberId) {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return;

    // Check network
    if (!this.networkState.isConnected) {
      // Use cached data, schedule retry
      this._scheduleNext(subscriberId);
      return;
    }

    try {
      // Execute callback
      await subscriber.callback();

      // Clear failure count on success
      this.failureCount.set(subscriberId, 0);

      // Call success handler if provided
      if (subscriber.onSuccess) {
        subscriber.onSuccess();
      }
    } catch (error) {
      // Increment failure count
      const failures = (this.failureCount.get(subscriberId) || 0) + 1;
      this.failureCount.set(subscriberId, failures);

      // Call error handler if provided
      if (subscriber.onError) {
        subscriber.onError(error, failures);
      }

      console.warn(`Poll failed for ${subscriberId}:`, error.message);
    }

    // Schedule next poll
    this._scheduleNext(subscriberId);
  }

  // Public API

  /**
   * Subscribe to polling
   *
   * @param {string} id - Unique subscriber ID
   * @param {Object} options - Subscription options
   * @param {Function} options.callback - Async function to call on poll
   * @param {number} options.priority - Priority level (default: NORMAL)
   * @param {boolean} options.allowCellular - Allow faster polling on cellular
   * @param {Function} options.onSuccess - Called on successful poll
   * @param {Function} options.onError - Called on poll error
   * @returns {Function} Unsubscribe function
   */
  subscribe(id, options) {
    const subscriber = {
      callback: options.callback,
      priority: options.priority || PRIORITY.NORMAL,
      allowCellular: options.allowCellular !== false,
      onSuccess: options.onSuccess,
      onError: options.onError,
    };

    this.subscribers.set(id, subscriber);

    // Initial poll
    this._executePoll(id);

    // Return unsubscribe function
    return () => this.unsubscribe(id);
  }

  /**
   * Unsubscribe from polling
   */
  unsubscribe(id) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.subscribers.delete(id);
    this.failureCount.delete(id);
  }

  /**
   * Update subscriber priority
   */
  setPriority(id, priority) {
    const subscriber = this.subscribers.get(id);
    if (subscriber) {
      subscriber.priority = priority;
      this._scheduleNext(id);
    }
  }

  /**
   * Manually trigger poll for a subscriber
   */
  pollNow(id) {
    if (this.subscribers.has(id)) {
      this._executePoll(id);
    }
  }

  /**
   * Pause all polling
   */
  pause() {
    this.isPaused = true;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * Resume all polling
   */
  resume() {
    this.isPaused = false;
    this._adjustAllPolling();
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      appState: this.appState,
      networkState: this.networkState,
      batteryLevel: this.batteryLevel,
      isLowBatteryMode: this.isLowBatteryMode,
      isPaused: this.isPaused,
      subscriberCount: this.subscribers.size,
    };
  }

  /**
   * Clean up listeners
   */
  destroy() {
    this.pause();
    this._appStateSubscription?.remove();
    this.subscribers.clear();
    this.failureCount.clear();
  }
}

// Singleton instance
const pollingManager = new PollingManager();

// Export priority constants and manager
export { PRIORITY, INTERVALS };
export default pollingManager;

/**
 * React Hook for using polling manager
 */
export function usePolling(id, callback, options = {}) {
  const { useEffect, useRef, useState } = require('react');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const callbackRef = useRef(callback);

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const unsubscribe = pollingManager.subscribe(id, {
      callback: async () => {
        setIsLoading(true);
        setError(null);
        try {
          await callbackRef.current();
          setLastUpdated(new Date());
        } finally {
          setIsLoading(false);
        }
      },
      priority: options.priority || PRIORITY.NORMAL,
      allowCellular: options.allowCellular,
      onError: (err) => setError(err),
    });

    return () => {
      unsubscribe();
    };
  }, [id, options.priority, options.allowCellular]);

  return {
    isLoading,
    error,
    lastUpdated,
    refresh: () => pollingManager.pollNow(id),
    pause: () => pollingManager.pause(),
    resume: () => pollingManager.resume(),
  };
}
