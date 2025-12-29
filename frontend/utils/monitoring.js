/**
 * FlightTrace Monitoring & Error Tracking
 *
 * Integrates Sentry for error tracking and performance monitoring.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// Environment detection
const ENV = Constants.expoConfig?.extra?.APP_ENV || 'development';
const IS_DEV = __DEV__ || ENV === 'development';

// Sentry configuration
const SENTRY_CONFIG = {
  dsn: Constants.expoConfig?.extra?.SENTRY_DSN || '',
  environment: ENV,
  release: `flighttrace@${Application.nativeApplicationVersion || '1.0.0'}`,
  dist: Application.nativeBuildVersion || '1',
  debug: IS_DEV,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
  tracesSampleRate: IS_DEV ? 1.0 : 0.2,
  attachStacktrace: true,
  normalizeDepth: 10,
  maxBreadcrumbs: 100,
  beforeSend(event, hint) {
    // Filter out development errors
    if (IS_DEV) {
      console.log('Sentry Event (Dev):', event.message || event.exception);
      return null; // Don't send in development
    }

    // Filter out known non-critical errors
    const message = event.message || event.exception?.values?.[0]?.value || '';
    const ignoredErrors = [
      'Network request failed',
      'AbortError',
      'User cancelled',
      'The operation was aborted',
    ];

    if (ignoredErrors.some((ignored) => message.includes(ignored))) {
      return null;
    }

    return event;
  },
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter sensitive data from breadcrumbs
    if (breadcrumb.category === 'fetch' && breadcrumb.data?.url) {
      // Remove auth tokens from URLs
      breadcrumb.data.url = breadcrumb.data.url.replace(
        /token=[^&]+/g,
        'token=[REDACTED]'
      );
    }
    return breadcrumb;
  },
  integrations: [
    new Sentry.ReactNativeTracing({
      tracingOrigins: [
        'localhost',
        'flightandtrace.com',
        /^\//,
      ],
      routingInstrumentation: Sentry.reactNavigationIntegration,
    }),
  ],
};

/**
 * Initialize Sentry monitoring
 */
export function initMonitoring(navigationRef = null) {
  if (!SENTRY_CONFIG.dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  // Initialize Sentry
  Sentry.init(SENTRY_CONFIG);

  // Set up navigation tracking if ref provided
  if (navigationRef) {
    Sentry.reactNavigationIntegration.registerNavigationContainer(navigationRef);
  }

  // Set default context
  setDeviceContext();

  console.log(`Monitoring initialized for ${ENV} environment`);
}

/**
 * Set device context
 */
async function setDeviceContext() {
  try {
    Sentry.setContext('device', {
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platformApiLevel: Device.platformApiLevel,
      totalMemory: Device.totalMemory,
    });

    Sentry.setContext('app', {
      version: Application.nativeApplicationVersion,
      buildNumber: Application.nativeBuildVersion,
      platform: Platform.OS,
      platformVersion: Platform.Version,
    });
  } catch (error) {
    console.warn('Failed to set device context:', error);
  }
}

/**
 * Set user context for tracking
 */
export function setUserContext(user) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id || user.userId,
    email: user.email,
    username: user.displayName || user.name,
    subscription: user.subscriptionTier || 'free',
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for user actions
 */
export function addBreadcrumb(message, category = 'user', data = {}) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
}

/**
 * Add navigation breadcrumb
 */
export function addNavigationBreadcrumb(fromRoute, toRoute) {
  addBreadcrumb(`Navigate: ${fromRoute} -> ${toRoute}`, 'navigation', {
    from: fromRoute,
    to: toRoute,
  });
}

/**
 * Add API call breadcrumb
 */
export function addApiBreadcrumb(method, url, statusCode, duration) {
  addBreadcrumb(`API: ${method} ${url}`, 'http', {
    method,
    url: url.split('?')[0], // Remove query params
    status_code: statusCode,
    duration_ms: duration,
  });
}

/**
 * Capture exception with context
 */
export function captureException(error, context = {}) {
  const { tags, extras, level } = context;

  Sentry.withScope((scope) => {
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (extras) {
      Object.entries(extras).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    if (level) {
      scope.setLevel(level);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture message
 */
export function captureMessage(message, level = 'info', context = {}) {
  Sentry.withScope((scope) => {
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context.extras) {
      Object.entries(context.extras).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name, op = 'task') {
  return Sentry.startTransaction({ name, op });
}

/**
 * Create a span within a transaction
 */
export function startSpan(transaction, operation, description) {
  return transaction.startChild({
    op: operation,
    description,
  });
}

/**
 * Performance tracking wrapper for async functions
 */
export function trackPerformance(name, fn, op = 'function') {
  return async (...args) => {
    const transaction = startTransaction(name, op);

    try {
      const result = await fn(...args);
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      captureException(error, { tags: { operation: name } });
      throw error;
    } finally {
      transaction.finish();
    }
  };
}

/**
 * Track API request performance
 */
export async function trackApiRequest(url, requestFn) {
  const transaction = startTransaction(`API: ${url}`, 'http.client');
  const startTime = Date.now();

  try {
    const response = await requestFn();
    const duration = Date.now() - startTime;

    transaction.setStatus('ok');
    transaction.setData('response_status', response.status);
    transaction.setData('response_time_ms', duration);

    addApiBreadcrumb('GET', url, response.status, duration);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    transaction.setStatus('internal_error');
    transaction.setData('error', error.message);
    transaction.setData('response_time_ms', duration);

    addApiBreadcrumb('GET', url, 0, duration);
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * User feedback dialog
 */
export function showUserFeedback(eventId) {
  if (IS_DEV) {
    console.log('User feedback dialog (Dev mode):', eventId);
    return;
  }

  Sentry.showReportDialog({ eventId });
}

/**
 * Create error boundary wrapper with Sentry
 */
export function withSentryErrorBoundary(Component, fallback) {
  return Sentry.withErrorBoundary(Component, {
    fallback,
    showDialog: !IS_DEV,
  });
}

/**
 * Performance metrics collection
 */
export const PerformanceMetrics = {
  appLaunchTime: null,
  screenLoadTimes: new Map(),

  recordAppLaunch() {
    this.appLaunchTime = Date.now();
    addBreadcrumb('App launched', 'lifecycle');
  },

  recordScreenLoad(screenName, loadTime) {
    this.screenLoadTimes.set(screenName, loadTime);

    Sentry.withScope((scope) => {
      scope.setTag('screen', screenName);
      scope.setExtra('load_time_ms', loadTime);
      Sentry.captureMessage(`Screen Load: ${screenName} (${loadTime}ms)`, 'info');
    });
  },

  getMetrics() {
    return {
      appLaunchTime: this.appLaunchTime,
      screenLoadTimes: Object.fromEntries(this.screenLoadTimes),
    };
  },
};

export default {
  initMonitoring,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  addNavigationBreadcrumb,
  addApiBreadcrumb,
  captureException,
  captureMessage,
  startTransaction,
  startSpan,
  trackPerformance,
  trackApiRequest,
  showUserFeedback,
  withSentryErrorBoundary,
  PerformanceMetrics,
};
