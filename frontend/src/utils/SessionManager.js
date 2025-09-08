/**
 * Session Manager
 * Handles session timeout logic with premium user benefits
 */

class SessionManager {
  constructor() {
    this.isActive = true;
    this.lastActivity = Date.now();
    this.sessionTimeout = null;
    this.warningTimeout = null;
    this.listeners = new Set();
    
    // Default timeouts (can be overridden)
    this.FREE_USER_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    this.WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
    
    this.initializeActivityTracking();
  }

  /**
   * Initialize activity tracking
   */
  initializeActivityTracking() {
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'focus'
    ];
    
    const throttledActivityHandler = this.throttle(
      () => this.updateActivity(), 
      1000
    );
    
    events.forEach(event => {
      document.addEventListener(event, throttledActivityHandler, true);
    });
    
    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateActivity();
      }
    });
    
    // Track page navigation
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Update session configuration based on user subscription
   */
  updateSessionConfig(subscription) {
    this.clearTimeouts();
    
    const isPaidUser = subscription?.tier && subscription.tier !== 'free';
    
    if (isPaidUser) {
      // Paid users get unlimited session time
      console.log('✨ Premium session: Unlimited tracking time');
      this.notifyListeners({
        type: 'session_unlimited',
        isPaidUser: true,
        tier: subscription.tier
      });
    } else {
      // Free users have session timeout
      this.startSessionTimeout();
      this.notifyListeners({
        type: 'session_timeout_enabled',
        isPaidUser: false,
        timeoutMinutes: this.FREE_USER_TIMEOUT / 60000
      });
    }
  }

  /**
   * Update user activity
   */
  updateActivity() {
    if (!this.isActive) return;
    
    this.lastActivity = Date.now();
    
    // Reset timeouts for free users
    this.startSessionTimeout();
    
    this.notifyListeners({
      type: 'activity_updated',
      timestamp: this.lastActivity
    });
  }

  /**
   * Start session timeout for free users
   */
  startSessionTimeout() {
    this.clearTimeouts();
    
    // Set warning timeout (5 minutes before session end)
    this.warningTimeout = setTimeout(() => {
      this.showSessionWarning();
    }, this.FREE_USER_TIMEOUT - this.WARNING_TIME);
    
    // Set session timeout
    this.sessionTimeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.FREE_USER_TIMEOUT);
  }

  /**
   * Show session warning
   */
  showSessionWarning() {
    const remainingTime = Math.ceil(this.WARNING_TIME / 60000); // minutes
    
    this.notifyListeners({
      type: 'session_warning',
      remainingMinutes: remainingTime,
      canExtend: true
    });
  }

  /**
   * Handle session timeout
   */
  handleSessionTimeout() {
    this.isActive = false;
    
    this.notifyListeners({
      type: 'session_expired',
      lastActivity: this.lastActivity,
      canRestart: true
    });
  }

  /**
   * Extend session (for free users)
   */
  extendSession() {
    if (this.isActive) {
      this.updateActivity();
      
      this.notifyListeners({
        type: 'session_extended',
        newExpiry: Date.now() + this.FREE_USER_TIMEOUT
      });
    }
  }

  /**
   * Restart session after timeout
   */
  restartSession() {
    this.isActive = true;
    this.updateActivity();
    
    this.notifyListeners({
      type: 'session_restarted',
      timestamp: Date.now()
    });
  }

  /**
   * Get session status
   */
  getSessionStatus() {
    return {
      isActive: this.isActive,
      lastActivity: this.lastActivity,
      timeUntilTimeout: this.sessionTimeout ? 
        (this.lastActivity + this.FREE_USER_TIMEOUT) - Date.now() : null,
      hasActiveTimeouts: !!(this.sessionTimeout || this.warningTimeout)
    };
  }

  /**
   * Add session event listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Session listener error:', error);
      }
    });
  }

  /**
   * Clear all timeouts
   */
  clearTimeouts() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Cleanup when page unloads
   */
  cleanup() {
    this.clearTimeouts();
    this.listeners.clear();
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();

/**
 * React Hook for session management
 */
import { useState, useEffect, useContext } from 'react';
import { SubscriptionContext } from '../contexts/SubscriptionContext';

export const useSession = () => {
  const { subscription } = useContext(SubscriptionContext);
  const [sessionState, setSessionState] = useState(() => 
    sessionManager.getSessionStatus()
  );

  useEffect(() => {
    // Update session config when subscription changes
    sessionManager.updateSessionConfig(subscription);
    
    // Listen for session events
    const unsubscribe = sessionManager.addListener((event) => {
      setSessionState(prev => ({
        ...prev,
        ...sessionManager.getSessionStatus(),
        lastEvent: event
      }));
    });
    
    return unsubscribe;
  }, [subscription]);

  return {
    ...sessionState,
    isPaidUser: subscription?.tier && subscription.tier !== 'free',
    extendSession: () => sessionManager.extendSession(),
    restartSession: () => sessionManager.restartSession()
  };
};

export default SessionManager;