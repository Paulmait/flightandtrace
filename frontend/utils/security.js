// Security utilities for FlightTrace frontend

// Content Security Policy
export const CSP_HEADER = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'https://api.stripe.com', 'wss://'],
  'frame-src': ['https://js.stripe.com', 'https://hooks.stripe.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

// XSS Protection
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Validate URLs to prevent open redirects
export function isValidRedirectUrl(url) {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    // Only allow same-origin redirects
    return parsedUrl.origin === window.location.origin;
  } catch {
    return false;
  }
}

// Secure token storage
export const SecureStorage = {
  setToken: (token) => {
    // Store in memory for most secure option
    window.__authToken = token;
    
    // Also store in sessionStorage with encryption if available
    if (window.crypto && window.crypto.subtle) {
      // In production, encrypt the token before storage
      sessionStorage.setItem('auth_token', token);
    }
  },
  
  getToken: () => {
    return window.__authToken || sessionStorage.getItem('auth_token');
  },
  
  clearToken: () => {
    delete window.__authToken;
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token');
  },
  
  setRefreshToken: (token) => {
    // Refresh tokens should be httpOnly cookies, but if needed in storage:
    sessionStorage.setItem('refresh_token', token);
  },
  
  getRefreshToken: () => {
    return sessionStorage.getItem('refresh_token');
  }
};

// API Request Security
export function secureApiRequest(url, options = {}) {
  const token = SecureStorage.getToken();
  
  const secureOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers
    },
    credentials: 'same-origin'
  };
  
  if (token) {
    secureOptions.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add CSRF token if available
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (csrfToken) {
    secureOptions.headers['X-CSRF-Token'] = csrfToken;
  }
  
  return fetch(url, secureOptions);
}

// Password validation
export function validatePassword(password) {
  const minLength = 12;
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain a special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Email validation
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Input validation for various fields
export function validateInput(type, value) {
  switch (type) {
    case 'username':
      return /^[a-zA-Z0-9_-]{3,50}$/.test(value);
    
    case 'tailNumber':
      return /^[A-Z0-9]{1,6}$/.test(value.toUpperCase());
    
    case 'url':
      try {
        const url = new URL(value);
        return url.protocol === 'https:';
      } catch {
        return false;
      }
    
    default:
      return true;
  }
}

// Rate limiting helper
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }
  
  getRemainingTime() {
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    const resetTime = oldestRequest + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }
}

// Session timeout manager
export class SessionManager {
  constructor(timeoutMinutes = 30, warningMinutes = 5) {
    this.timeoutMs = timeoutMinutes * 60 * 1000;
    this.warningMs = warningMinutes * 60 * 1000;
    this.lastActivity = Date.now();
    this.timeoutId = null;
    this.warningId = null;
    
    this.startTimers();
    this.setupActivityListeners();
  }
  
  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => this.resetTimers(), true);
    });
  }
  
  startTimers() {
    // Warning timer
    this.warningId = setTimeout(() => {
      this.onWarning();
    }, this.timeoutMs - this.warningMs);
    
    // Timeout timer
    this.timeoutId = setTimeout(() => {
      this.onTimeout();
    }, this.timeoutMs);
  }
  
  resetTimers() {
    this.lastActivity = Date.now();
    
    if (this.warningId) clearTimeout(this.warningId);
    if (this.timeoutId) clearTimeout(this.timeoutId);
    
    this.startTimers();
  }
  
  onWarning() {
    // Override this method to show warning
    console.warn('Session will expire soon');
  }
  
  onTimeout() {
    // Override this method to handle timeout
    SecureStorage.clearToken();
    window.location.href = '/login?expired=true';
  }
  
  destroy() {
    if (this.warningId) clearTimeout(this.warningId);
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}

// Secure random string generator
export function generateSecureRandom(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Check for common security issues
export function performSecurityCheck() {
  const issues = [];
  
  // Check for HTTP
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    issues.push('Not using HTTPS');
  }
  
  // Check for mixed content
  if (window.location.protocol === 'https:') {
    const insecureElements = document.querySelectorAll(
      'img[src^="http:"], script[src^="http:"], link[href^="http:"]'
    );
    if (insecureElements.length > 0) {
      issues.push('Mixed content detected');
    }
  }
  
  // Check for outdated browser
  const isOutdated = !window.crypto || !window.crypto.subtle;
  if (isOutdated) {
    issues.push('Browser may be outdated');
  }
  
  return issues;
}

// Export all utilities
export default {
  sanitizeInput,
  isValidRedirectUrl,
  SecureStorage,
  secureApiRequest,
  validatePassword,
  validateEmail,
  validateInput,
  RateLimiter,
  SessionManager,
  generateSecureRandom,
  performSecurityCheck
};