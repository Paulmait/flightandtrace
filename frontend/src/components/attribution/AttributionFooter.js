/**
 * Attribution Footer Component
 * Data source disclaimers and legal attributions
 */

import React, { useState } from 'react';

const AttributionFooter = ({ compact = false, position = 'bottom' }) => {
  const [showDetails, setShowDetails] = useState(false);

  const dataSources = [
    {
      name: 'ADS-B Network',
      description: 'Real-time aircraft position data from ADS-B transponders',
      type: 'primary',
      coverage: 'Global',
      accuracy: 'High',
      updateRate: '1-5 seconds'
    },
    {
      name: 'FAA (Federal Aviation Administration)',
      description: 'Aircraft registration and flight plan data',
      type: 'government',
      coverage: 'United States',
      accuracy: 'Official',
      updateRate: 'Daily'
    },
    {
      name: 'ICAO (International Civil Aviation Organization)',
      description: 'International aircraft codes and standards',
      type: 'international',
      coverage: 'Global',
      accuracy: 'Official',
      updateRate: 'As needed'
    },
    {
      name: 'OpenSky Network',
      description: 'Crowdsourced ADS-B data from volunteers worldwide',
      type: 'crowdsourced',
      coverage: 'Global',
      accuracy: 'Community-verified',
      updateRate: '1-10 seconds'
    },
    {
      name: 'OpenWeatherMap',
      description: 'Weather overlay data and atmospheric conditions',
      type: 'weather',
      coverage: 'Global',
      accuracy: 'Professional',
      updateRate: '10 minutes'
    },
    {
      name: 'Aircraft Database',
      description: 'Aircraft type, manufacturer, and specification data',
      type: 'reference',
      coverage: 'Global',
      accuracy: 'Community-maintained',
      updateRate: 'Weekly'
    }
  ];

  const legalNotices = [
    {
      title: 'Data Accuracy Disclaimer',
      content: 'Flight tracking data is provided for informational purposes only. While we strive for accuracy, real-time data may contain delays, errors, or omissions. Do not rely on this data for operational decisions.'
    },
    {
      title: 'Privacy Notice', 
      content: 'Some aircraft may be blocked from display due to privacy requests or security considerations. FlightTrace respects privacy rights and complies with applicable regulations.'
    },
    {
      title: 'Commercial Use',
      content: 'Data provided through FlightTrace is licensed for personal use. Commercial use requires appropriate licensing from data providers and compliance with their terms of service.'
    },
    {
      title: 'Government Aircraft',
      content: 'Military and government aircraft may be filtered, delayed, or blocked in accordance with national security requirements and international agreements.'
    }
  ];

  if (compact) {
    return (
      <div className={`attribution-footer compact ${position}`}>
        <div className="attribution-line">
          <span className="data-sources">
            Data: ADS-B, FAA, ICAO, OpenSky, OpenWeather
          </span>
          <button 
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            ℹ️ Info
          </button>
        </div>
        
        {showDetails && (
          <div className="attribution-details">
            <div className="disclaimer-text">
              Flight data provided for informational purposes only. 
              Not for operational use. Some aircraft may be filtered for privacy/security.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <footer className="attribution-footer full">
      <div className="footer-content">
        <div className="attribution-section">
          <h3>Data Sources & Attribution</h3>
          <div className="sources-grid">
            {dataSources.map((source, index) => (
              <div key={index} className={`source-card ${source.type}`}>
                <div className="source-header">
                  <h4>{source.name}</h4>
                  <span className={`source-type ${source.type}`}>
                    {source.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="source-description">{source.description}</p>
                <div className="source-specs">
                  <div className="spec">
                    <span className="label">Coverage:</span>
                    <span className="value">{source.coverage}</span>
                  </div>
                  <div className="spec">
                    <span className="label">Accuracy:</span>
                    <span className="value">{source.accuracy}</span>
                  </div>
                  <div className="spec">
                    <span className="label">Updates:</span>
                    <span className="value">{source.updateRate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="legal-section">
          <h3>Important Disclaimers</h3>
          <div className="legal-notices">
            {legalNotices.map((notice, index) => (
              <div key={index} className="legal-notice">
                <h4>{notice.title}</h4>
                <p>{notice.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="compliance-section">
          <h3>Compliance & Regulations</h3>
          <div className="compliance-info">
            <div className="regulation-item">
              <strong>GDPR Compliance:</strong> FlightTrace complies with European data protection regulations. 
              <a href="/privacy">Privacy Policy</a>
            </div>
            <div className="regulation-item">
              <strong>CCPA Compliance:</strong> California residents have specific rights regarding their data. 
              <a href="/privacy#ccpa">Learn more</a>
            </div>
            <div className="regulation-item">
              <strong>Aviation Regulations:</strong> Data display complies with applicable aviation authorities and international agreements.
            </div>
            <div className="regulation-item">
              <strong>Export Controls:</strong> Some data may be restricted under export control regulations.
            </div>
          </div>
        </div>

        <div className="attribution-footer-bottom">
          <div className="copyright">
            <p>&copy; {new Date().getFullYear()} FlightTrace. All rights reserved.</p>
          </div>
          
          <div className="data-freshness">
            <span className="freshness-indicator">
              🔄 Data updated: {new Date().toLocaleTimeString()}
            </span>
          </div>

          <div className="footer-links">
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/data-sources">Data Sources</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

/**
 * Inline data source attribution component
 */
export const InlineAttribution = ({ sources = ['ADS-B'], showAccuracy = false }) => {
  const sourceMap = {
    'ADS-B': { name: 'ADS-B', accuracy: 'Real-time' },
    'FAA': { name: 'FAA', accuracy: 'Official' },
    'ICAO': { name: 'ICAO', accuracy: 'Standard' },
    'OpenSky': { name: 'OpenSky', accuracy: 'Community' },
    'Weather': { name: 'Weather', accuracy: 'Professional' }
  };

  return (
    <div className="inline-attribution">
      <span className="attribution-label">Source:</span>
      <span className="attribution-sources">
        {sources.map((source, index) => (
          <span key={index} className="source-tag">
            {sourceMap[source]?.name || source}
            {showAccuracy && (
              <span className="accuracy">({sourceMap[source]?.accuracy})</span>
            )}
          </span>
        ))}
      </span>
    </div>
  );
};

/**
 * Data accuracy indicator
 */
export const AccuracyIndicator = ({ accuracy = 'high', lastUpdate, delay = 0 }) => {
  const getAccuracyConfig = () => {
    const configs = {
      high: { color: 'green', icon: '🟢', text: 'High Accuracy' },
      medium: { color: 'orange', icon: '🟡', text: 'Medium Accuracy' },
      low: { color: 'red', icon: '🔴', text: 'Low Accuracy' },
      estimated: { color: 'blue', icon: '🔵', text: 'Estimated' }
    };
    return configs[accuracy] || configs.high;
  };

  const config = getAccuracyConfig();
  const updateAge = lastUpdate ? Math.floor((Date.now() - new Date(lastUpdate)) / 1000) : null;

  return (
    <div className={`accuracy-indicator ${accuracy}`}>
      <div className="accuracy-main">
        <span className="accuracy-icon">{config.icon}</span>
        <span className="accuracy-text">{config.text}</span>
      </div>
      
      {(updateAge || delay > 0) && (
        <div className="accuracy-details">
          {updateAge && (
            <span className="update-age">
              Updated {updateAge}s ago
            </span>
          )}
          {delay > 0 && (
            <span className="delay-info">
              ~{delay}s delay
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Privacy notice component
 */
export const PrivacyNotice = ({ type = 'aircraft' }) => {
  const notices = {
    aircraft: {
      icon: '🔒',
      title: 'Privacy Protected',
      message: 'Some aircraft data may be filtered or blocked to protect privacy.'
    },
    location: {
      icon: '📍',
      title: 'Location Privacy',
      message: 'Coordinates may be rounded for privacy protection.'
    },
    blocked: {
      icon: '🚫', 
      title: 'Aircraft Blocked',
      message: 'This aircraft has been blocked from public display.'
    }
  };

  const notice = notices[type] || notices.aircraft;

  return (
    <div className={`privacy-notice ${type}`}>
      <div className="notice-icon">{notice.icon}</div>
      <div className="notice-content">
        <div className="notice-title">{notice.title}</div>
        <div className="notice-message">{notice.message}</div>
      </div>
    </div>
  );
};

export default AttributionFooter;