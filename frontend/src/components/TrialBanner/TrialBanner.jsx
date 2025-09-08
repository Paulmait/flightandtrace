import React, { useState, useEffect } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import './TrialBanner.css';

const TrialBanner = ({ onUpgrade, onDismiss }) => {
  const { 
    subscription, 
    isTrialing, 
    getTrialDaysRemaining, 
    createCheckoutSession,
    featureGate 
  } = useSubscription();
  
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('trialBannerDismissed') === 'true';
  });
  
  const [showUrgency, setShowUrgency] = useState(false);
  
  const trialDaysRemaining = getTrialDaysRemaining();
  const showBanner = (isTrialing() || subscription?.tier === 'free') && !dismissed;

  useEffect(() => {
    if (trialDaysRemaining <= 3 && trialDaysRemaining > 0) {
      setShowUrgency(true);
    }
  }, [trialDaysRemaining]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('trialBannerDismissed', 'true');
    if (onDismiss) onDismiss();
  };

  const handleUpgrade = async () => {
    try {
      if (onUpgrade) {
        onUpgrade();
      } else {
        await createCheckoutSession(
          process.env.REACT_APP_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
          0
        );
      }
    } catch (error) {
      console.error('Failed to start upgrade process:', error);
    }
  };

  const getBannerContent = () => {
    if (subscription?.tier === 'free') {
      return {
        title: 'Experience Real-Time Flight Tracking',
        message: 'Upgrade to Premium for live data, weather overlays, and API access',
        ctaText: 'Start 7-Day Free Trial',
        urgency: false,
        className: 'free-banner'
      };
    }

    if (isTrialing()) {
      const isUrgent = trialDaysRemaining <= 3;
      const daysText = trialDaysRemaining === 1 ? 'day' : 'days';
      
      return {
        title: isUrgent 
          ? `Trial Ending Soon - ${trialDaysRemaining} ${daysText} left!`
          : `${trialDaysRemaining} ${daysText} left in your Premium trial`,
        message: isUrgent
          ? 'Don\'t lose access to real-time data and premium features'
          : 'Enjoying your Premium trial? Upgrade now to continue with full access',
        ctaText: 'Upgrade Now',
        urgency: isUrgent,
        className: isUrgent ? 'trial-urgent' : 'trial-banner'
      };
    }

    return null;
  };

  if (!showBanner) return null;

  const content = getBannerContent();
  if (!content) return null;

  return (
    <div className={`trial-banner ${content.className} ${showUrgency ? 'urgent' : ''}`}>
      <div className="trial-banner-content">
        <div className="trial-banner-text">
          <h4 className="trial-banner-title">
            {content.urgency && <span className="urgency-icon">⚠️</span>}
            {content.title}
          </h4>
          <p className="trial-banner-message">{content.message}</p>
        </div>
        
        <div className="trial-banner-actions">
          {subscription?.tier === 'free' && (
            <div className="trial-features">
              <span className="feature">✓ Real-time data</span>
              <span className="feature">✓ 90-day history</span>
              <span className="feature">✓ Weather overlay</span>
            </div>
          )}
          
          <div className="banner-buttons">
            <button 
              className="btn-upgrade"
              onClick={handleUpgrade}
            >
              {content.ctaText}
            </button>
            
            {!content.urgency && (
              <button 
                className="btn-dismiss"
                onClick={handleDismiss}
                title="Dismiss banner"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
      
      {content.urgency && (
        <div className="urgency-progress">
          <div 
            className="progress-bar"
            style={{ 
              width: `${Math.max(10, (trialDaysRemaining / 7) * 100)}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TrialBanner;