import React from 'react';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import './FeatureGate.css';

const FeatureGate = ({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true, 
  ...featureArgs 
}) => {
  const { checkFeature } = useFeatureGate();
  const result = checkFeature(feature, ...featureArgs);

  if (result.allowed) {
    return children;
  }

  if (fallback) {
    return fallback(result);
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return <UpgradePrompt result={result} feature={feature} />;
};

const UpgradePrompt = ({ result, feature }) => {
  const getUpgradeMessage = () => {
    switch (feature) {
      case 'realTimeData':
        return {
          title: 'Real-Time Data Unavailable',
          message: `Flight data is delayed by ${Math.floor(result.delaySeconds / 60)} minutes in the free plan.`,
          benefit: 'Get live flight tracking with zero delay'
        };
      
      case 'weatherOverlay':
        return {
          title: 'Weather Overlay Locked',
          message: 'Weather data and overlays are available in Premium and higher plans.',
          benefit: 'See precipitation, clouds, and weather conditions on the map'
        };
      
      case 'csvExport':
      case 'geoJsonExport':
        return {
          title: 'Data Export Unavailable',
          message: 'Export functionality requires a Pro subscription or higher.',
          benefit: 'Export flight data in CSV, GeoJSON, and other formats'
        };
      
      case 'apiAccess':
        return {
          title: result.remaining === 0 ? 'API Limit Reached' : 'API Access Unavailable',
          message: result.remaining === 0 
            ? 'You have reached your daily API limit.'
            : 'API access requires a Premium subscription or higher.',
          benefit: 'Access our REST API for custom integrations'
        };
      
      case 'unlimitedAlerts':
        return {
          title: 'Alert Limit Reached',
          message: `You have reached the maximum of ${result.limit} alerts for your plan.`,
          benefit: 'Create unlimited flight alerts and monitoring rules'
        };
      
      case 'historicalData':
        return {
          title: 'Historical Data Limited',
          message: `Your plan includes ${result.maxDays} days of history. You requested ${result.requestedDays} days.`,
          benefit: 'Access extended flight history up to 3 years'
        };
      
      default:
        return {
          title: 'Feature Unavailable',
          message: result.reason || 'This feature is not available in your current plan.',
          benefit: 'Unlock more features with a subscription upgrade'
        };
    }
  };

  const { title, message, benefit } = getUpgradeMessage();
  const suggestedTier = result.suggestedTier || 'premium';

  return (
    <div className="feature-gate-prompt">
      <div className="prompt-icon">🔒</div>
      <div className="prompt-content">
        <h3>{title}</h3>
        <p className="prompt-message">{message}</p>
        <p className="prompt-benefit">{benefit}</p>
        
        <div className="prompt-actions">
          <button 
            className="btn-upgrade"
            onClick={() => window.location.href = '/pricing'}
          >
            Upgrade to {suggestedTier.charAt(0).toUpperCase() + suggestedTier.slice(1)}
          </button>
          
          {result.resetTime && (
            <div className="reset-info">
              Resets {result.resetTime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const withFeatureGate = (WrappedComponent, feature, options = {}) => {
  return (props) => (
    <FeatureGate 
      feature={feature} 
      {...options}
    >
      <WrappedComponent {...props} />
    </FeatureGate>
  );
};

export const FeatureWrapper = ({ 
  feature, 
  children, 
  upgradeComponent: UpgradeComponent,
  ...featureArgs 
}) => {
  const { checkFeature } = useFeatureGate();
  const result = checkFeature(feature, ...featureArgs);

  if (result.allowed) {
    return children;
  }

  if (UpgradeComponent) {
    return <UpgradeComponent result={result} />;
  }

  return null;
};

export const useFeatureCheck = (feature, ...args) => {
  const { checkFeature } = useFeatureGate();
  return checkFeature(feature, ...args);
};

export default FeatureGate;