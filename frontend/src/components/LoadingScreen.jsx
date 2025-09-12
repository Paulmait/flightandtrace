import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  const [loadingText, setLoadingText] = useState('Initializing radar systems');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const texts = [
      'Initializing radar systems',
      'Connecting to ATC networks',
      'Establishing satellite uplink',
      'Loading aircraft database',
      'Calibrating tracking systems',
      'Synchronizing live data feeds',
      'Ready for departure'
    ];
    
    let index = 0;
    const textInterval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, 2000);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 15;
      });
    }, 300);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="loading-screen">
      {/* Aviation-themed background */}
      <div className="loading-background">
        <div className="radar-sweep"></div>
        <div className="grid-overlay"></div>
      </div>

      {/* Main content */}
      <div className="loading-content">
        {/* Logo and Title */}
        <div className="loading-header">
          <div className="logo-container">
            <svg className="plane-icon" viewBox="0 0 100 100" width="80" height="80">
              <defs>
                <linearGradient id="planeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#4ECDC4', stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#1A5F7A', stopOpacity:1}} />
                </linearGradient>
              </defs>
              <path d="M50 10 L65 40 L90 45 L65 50 L50 90 L35 50 L10 45 L35 40 Z" 
                    fill="url(#planeGradient)" 
                    className="plane-path"/>
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#planeGradient)" 
                      strokeWidth="2" className="radar-ring" opacity="0.5"/>
              <circle cx="50" cy="50" r="35" fill="none" stroke="url(#planeGradient)" 
                      strokeWidth="1.5" className="radar-ring" opacity="0.4"/>
              <circle cx="50" cy="50" r="25" fill="none" stroke="url(#planeGradient)" 
                      strokeWidth="1" className="radar-ring" opacity="0.3"/>
            </svg>
          </div>
          <h1 className="loading-title">FlightTrace</h1>
          <p className="loading-subtitle">Professional Aviation Intelligence</p>
        </div>

        {/* Loading indicators */}
        <div className="loading-indicators">
          <div className="loading-text">{loadingText}</div>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{width: `${Math.min(progress, 100)}%`}}></div>
            </div>
            <span className="progress-percent">{Math.round(Math.min(progress, 100))}%</span>
          </div>
        </div>

        {/* Aviation stats */}
        <div className="aviation-stats">
          <div className="stat-item">
            <span className="stat-number">35,000+</span>
            <span className="stat-label">Live Flights</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">195</span>
            <span className="stat-label">Countries</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Monitoring</span>
          </div>
        </div>

        {/* Premium features highlight */}
        <div className="features-preview">
          <div className="feature-pill">✈️ Real-time Tracking</div>
          <div className="feature-pill">🌦️ Weather Overlay</div>
          <div className="feature-pill">📊 Flight Analytics</div>
          <div className="feature-pill">🔔 Smart Alerts</div>
        </div>
      </div>

      {/* Animated background elements */}
      <div className="floating-planes">
        <div className="floating-plane plane-1">✈️</div>
        <div className="floating-plane plane-2">🛩️</div>
        <div className="floating-plane plane-3">✈️</div>
      </div>
    </div>
  );
};

export default LoadingScreen;