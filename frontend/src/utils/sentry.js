import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Initialize Sentry for error tracking and performance monitoring
export function initSentry() {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  
  if (!dsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }
  
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new BrowserTracing(),
    ],
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.REACT_APP_VERSION || '1.0.0',
    
    // User context
    beforeSend(event, hint) {
      // Filter out sensitive information
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      
      // Add user context if available
      const user = getUserContext();
      if (user) {
        event.user = {
          id: user.id,
          email: user.email,
          subscription: user.subscription
        };
      }
      
      // Add custom context
      event.tags = {
        ...event.tags,
        component: 'frontend',
        browser: navigator.userAgent.includes('Chrome') ? 'chrome' : 
                 navigator.userAgent.includes('Safari') ? 'safari' : 
                 navigator.userAgent.includes('Firefox') ? 'firefox' : 'other'
      };
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      
      // User actions
      'User cancelled',
      'User denied',
    ],
  });
}

// Get user context for error tracking
function getUserContext() {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

// Custom error boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Performance monitoring
export function trackPerformance(name, callback) {
  const transaction = Sentry.startTransaction({ name });
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
  
  try {
    const result = callback();
    if (result instanceof Promise) {
      return result.finally(() => transaction.finish());
    }
    transaction.finish();
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    transaction.finish();
    throw error;
  }
}

// Track user actions
export function trackAction(action, data = {}) {
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: action,
    level: 'info',
    data
  });
}

// Track API errors
export function trackAPIError(endpoint, error, context = {}) {
  Sentry.captureException(error, {
    tags: {
      type: 'api-error',
      endpoint
    },
    extra: {
      ...context,
      response: error.response?.data,
      status: error.response?.status
    }
  });
}

// Track flight data issues
export function trackFlightDataIssue(issue, context = {}) {
  Sentry.captureMessage(issue, {
    level: 'warning',
    tags: {
      type: 'flight-data',
    },
    extra: context
  });
}