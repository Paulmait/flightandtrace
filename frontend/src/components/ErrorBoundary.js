import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <img src="/logo192.png" alt="Flight Tracker" style={{ 
            width: '80px', 
            height: '80px',
            marginBottom: '20px',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
          }} />
          <h1 style={{ color: 'white', marginBottom: '10px' }}>Something went wrong</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '30px', textAlign: 'center', maxWidth: '400px' }}>
            We encountered an unexpected error. Please reload the page to continue tracking flights.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              backgroundColor: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Reload Page
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '20px', color: '#999' }}>
              <summary>Error Details</summary>
              <pre>{this.state.error?.toString()}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;