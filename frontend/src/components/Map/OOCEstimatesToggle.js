/**
 * Out of Coverage (OOC) Estimates Toggle
 * Shows estimated positions for flights outside radar coverage
 */

import React, { useState, useContext, useEffect } from 'react';
import { SubscriptionContext } from '../contexts/SubscriptionContext';

const OOCEstimatesToggle = ({ onToggle, enabled = false }) => {
  const { subscription } = useContext(SubscriptionContext);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [estimateQuality, setEstimateQuality] = useState('good');
  const [oocFlightCount, setOocFlightCount] = useState(0);

  const isPremiumUser = subscription?.tier && subscription.tier !== 'free';

  useEffect(() => {
    // Simulate OOC flight counting
    if (isEnabled) {
      const mockCount = Math.floor(Math.random() * 50) + 20; // 20-70 flights
      setOocFlightCount(mockCount);
    } else {
      setOocFlightCount(0);
    }
  }, [isEnabled]);

  const handleToggle = () => {
    if (!isPremiumUser && !isEnabled) {
      // Show upgrade prompt for free users
      onToggle?.('upgrade_required');
      return;
    }

    const newState = !isEnabled;
    setIsEnabled(newState);
    onToggle?.(newState ? 'enabled' : 'disabled');
  };

  const getEstimateAccuracy = () => {
    // Simulate different accuracy levels
    const accuracyLevels = {
      excellent: { percentage: 95, color: 'green', icon: '🎯' },
      good: { percentage: 87, color: 'blue', icon: '✅' },
      fair: { percentage: 72, color: 'orange', icon: '⚠️' },
      poor: { percentage: 45, color: 'red', icon: '❌' }
    };

    return accuracyLevels[estimateQuality] || accuracyLevels.good;
  };

  const accuracy = getEstimateAccuracy();

  return (
    <div className="ooc-estimates-control">
      <div className="ooc-header">
        <div className="ooc-title">
          <span className="ooc-icon">🛰️</span>
          <span>Out of Coverage Estimates</span>
          {!isPremiumUser && <span className="premium-badge">PRO</span>}
        </div>
        
        <div className="ooc-toggle-container">
          <label className="ooc-toggle">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggle}
              disabled={!isPremiumUser}
            />
            <span className={`toggle-slider ${!isPremiumUser ? 'disabled' : ''}`} />
          </label>
        </div>
      </div>

      {isEnabled && (
        <div className="ooc-details">
          <div className="ooc-stats">
            <div className="stat">
              <span className="stat-value">{oocFlightCount}</span>
              <span className="stat-label">Estimated</span>
            </div>
            <div className="stat">
              <span className="stat-value accuracy" style={{ color: accuracy.color }}>
                {accuracy.percentage}%
              </span>
              <span className="stat-label">Accuracy</span>
            </div>
          </div>

          <div className="ooc-info">
            <div className="accuracy-indicator">
              <span className="accuracy-icon">{accuracy.icon}</span>
              <span className="accuracy-text">
                Estimate quality: <strong>{estimateQuality}</strong>
              </span>
            </div>
            
            <div className="ooc-explanation">
              <p>
                Showing predicted positions for flights outside radar coverage 
                using flight plans and historical data.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isPremiumUser && (
        <div className="ooc-upgrade-prompt">
          <div className="upgrade-content">
            <h4>🛰️ Enhanced Coverage</h4>
            <p>
              Get estimated positions for flights outside radar coverage areas, 
              including oceanic and remote regions.
            </p>
            <div className="upgrade-features">
              <div className="feature">✈️ Oceanic flight tracking</div>
              <div className="feature">🌍 Global coverage estimates</div>
              <div className="feature">📍 Position predictions</div>
              <div className="feature">⏰ ETA calculations</div>
            </div>
            <button 
              className="upgrade-btn"
              onClick={() => onToggle?.('upgrade_required')}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {isEnabled && (
        <div className="ooc-legend">
          <h5>Map Legend:</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-symbol live"></div>
              <span>Live radar data</span>
            </div>
            <div className="legend-item">
              <div className="legend-symbol estimated"></div>
              <span>Estimated position</span>
            </div>
            <div className="legend-item">
              <div className="legend-symbol interpolated"></div>
              <span>Interpolated track</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * OOC Flight Badge - shows on flights with estimated positions
 */
export const OOCFlightBadge = ({ 
  estimateType = 'predicted', 
  confidence = 'medium',
  lastKnownTime 
}) => {
  const getBadgeConfig = () => {
    const configs = {
      predicted: { 
        icon: '🔮', 
        text: 'Predicted', 
        color: 'blue' 
      },
      interpolated: { 
        icon: '📈', 
        text: 'Interpolated', 
        color: 'orange' 
      },
      extrapolated: { 
        icon: '🎯', 
        text: 'Extrapolated', 
        color: 'purple' 
      }
    };

    return configs[estimateType] || configs.predicted;
  };

  const config = getBadgeConfig();
  const timeSince = lastKnownTime ? 
    Math.floor((Date.now() - new Date(lastKnownTime)) / 60000) : null;

  return (
    <div className={`ooc-flight-badge ${estimateType} confidence-${confidence}`}>
      <div className="badge-icon">{config.icon}</div>
      <div className="badge-content">
        <div className="badge-title">{config.text} Position</div>
        {timeSince && (
          <div className="badge-subtitle">
            Last known: {timeSince}m ago
          </div>
        )}
      </div>
      <div className={`confidence-indicator ${confidence}`}>
        <div className="confidence-dots">
          <span className={confidence === 'high' ? 'active' : ''}></span>
          <span className={['medium', 'high'].includes(confidence) ? 'active' : ''}></span>
          <span className={confidence === 'high' ? 'active' : ''}></span>
        </div>
      </div>
    </div>
  );
};

/**
 * Coverage map overlay showing radar coverage areas
 */
export const CoverageMapOverlay = ({ visible = false }) => {
  const [coverageData, setCoverageData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && coverageData.length === 0) {
      fetchCoverageData();
    }
  }, [visible]);

  const fetchCoverageData = async () => {
    setLoading(true);
    try {
      // Mock coverage data - in reality this would come from your API
      const mockCoverage = [
        {
          id: 'us_east',
          name: 'US East Coast',
          type: 'radar',
          quality: 'excellent',
          bounds: {
            north: 45,
            south: 25,
            east: -65,
            west: -85
          }
        },
        {
          id: 'europe',
          name: 'European Coverage',
          type: 'radar',
          quality: 'good',
          bounds: {
            north: 60,
            south: 35,
            east: 30,
            west: -10
          }
        },
        {
          id: 'north_atlantic',
          name: 'North Atlantic',
          type: 'satellite',
          quality: 'fair',
          bounds: {
            north: 60,
            south: 30,
            east: -10,
            west: -60
          }
        }
      ];

      setCoverageData(mockCoverage);
    } catch (error) {
      console.error('Error fetching coverage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="coverage-map-overlay">
      {loading ? (
        <div className="coverage-loading">Loading coverage data...</div>
      ) : (
        <>
          {coverageData.map(area => (
            <div
              key={area.id}
              className={`coverage-area ${area.type} quality-${area.quality}`}
              data-name={area.name}
            >
              {/* This would be rendered as map polygons in the actual implementation */}
            </div>
          ))}
          
          <div className="coverage-legend">
            <h5>Coverage Quality:</h5>
            <div className="legend-items">
              <div className="legend-item">
                <div className="coverage-sample excellent"></div>
                <span>Excellent (Radar)</span>
              </div>
              <div className="legend-item">
                <div className="coverage-sample good"></div>
                <span>Good (Multi-radar)</span>
              </div>
              <div className="legend-item">
                <div className="coverage-sample fair"></div>
                <span>Fair (Satellite)</span>
              </div>
              <div className="legend-item">
                <div className="coverage-sample poor"></div>
                <span>Limited (Estimated)</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OOCEstimatesToggle;