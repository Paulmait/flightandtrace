/**
 * FlightTrace Error Boundary
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a fallback UI.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';

/**
 * Error Boundary Class Component
 * (Must be class component - hooks cannot catch errors)
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (__DEV__) {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Log to Sentry in production
    if (!__DEV__) {
      Sentry.withScope((scope) => {
        scope.setExtras(errorInfo);
        const eventId = Sentry.captureException(error);
        this.setState({ eventId });
      });
    }

    // Update state with error info
    this.setState({ errorInfo });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });

    // Call onRetry callback if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReportFeedback = () => {
    if (this.state.eventId && !__DEV__) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          retry: this.handleRetry,
        });
      }

      // Default fallback UI
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
            </View>

            <Text style={styles.title}>Something went wrong</Text>

            <Text style={styles.message}>
              We're sorry, but something unexpected happened. Our team has been
              notified and is working to fix the issue.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorContainer} horizontal={false}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
                accessibilityRole="button"
                accessibilityLabel="Try again"
              >
                <Ionicons name="refresh" size={20} color="#FFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              {!__DEV__ && this.state.eventId && (
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={this.handleReportFeedback}
                  accessibilityRole="button"
                  accessibilityLabel="Report this issue"
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#0066CC" />
                  <Text style={styles.feedbackButtonText}>Report Issue</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.supportText}>
              If this problem persists, please contact{' '}
              <Text style={styles.emailText}>support@flighttrace.com</Text>
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

/**
 * Screen-level Error Boundary with navigation reset
 */
export class ScreenErrorBoundary extends React.Component {
  handleRetry = () => {
    // Reset navigation if available
    if (this.props.navigation) {
      this.props.navigation.reset({
        index: 0,
        routes: [{ name: this.props.fallbackRoute || 'Home' }],
      });
    }
  };

  render() {
    return (
      <ErrorBoundary
        onRetry={this.handleRetry}
        fallback={this.props.fallback}
        onError={this.props.onError}
      >
        {this.props.children}
      </ErrorBoundary>
    );
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary(WrappedComponent, options = {}) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props) => (
    <ErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

/**
 * Hook for triggering error boundary manually
 */
export function useErrorHandler() {
  const [error, setError] = React.useState(null);

  if (error) {
    throw error;
  }

  const handleError = React.useCallback((err) => {
    setError(err);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { handleError, resetError };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 300,
  },
  errorContainer: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C53030',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#C53030',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#999',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0066CC',
    gap: 8,
  },
  feedbackButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
  supportText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emailText: {
    color: '#0066CC',
    fontWeight: '500',
  },
});

export default ErrorBoundary;
