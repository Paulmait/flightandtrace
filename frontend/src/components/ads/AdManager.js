/**
 * Ad Manager Component
 * Handles ad-free experience for paid users
 */

import React, { useContext, useEffect, useState } from 'react';
import { SubscriptionContext } from '../contexts/SubscriptionContext';

// Ad placement configurations
const AD_PLACEMENTS = {
  banner: {
    id: 'banner-ad',
    size: { width: 728, height: 90 },
    position: 'top'
  },
  sidebar: {
    id: 'sidebar-ad',
    size: { width: 300, height: 250 },
    position: 'right'
  },
  mobile_banner: {
    id: 'mobile-banner',
    size: { width: 320, height: 50 },
    position: 'bottom'
  }
};

const AdManager = ({ placement, className = '', style = {} }) => {
  const { subscription, isLoading } = useContext(SubscriptionContext);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  const isPaidUser = subscription?.tier && subscription.tier !== 'free';
  const shouldShowAd = !isPaidUser && !isLoading;

  useEffect(() => {
    if (shouldShowAd && !adLoaded) {
      loadAd();
    }
  }, [shouldShowAd, adLoaded]);

  const loadAd = async () => {
    const config = AD_PLACEMENTS[placement];
    if (!config) {
      console.warn(`Unknown ad placement: ${placement}`);
      return;
    }

    try {
      // Initialize Google AdSense or your ad provider
      if (window.adsbygoogle) {
        const adElement = document.getElementById(config.id);
        if (adElement && !adElement.hasAttribute('data-ad-loaded')) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          adElement.setAttribute('data-ad-loaded', 'true');
          setAdLoaded(true);
        }
      }
    } catch (error) {
      console.error('Ad loading error:', error);
      setAdError(true);
    }
  };

  // Don't render ads for paid users
  if (isPaidUser) {
    return (
      <div className={`ad-free-space ${className}`} style={style}>
        {/* Optional: Show premium badge or extra content */}
        {process.env.NODE_ENV === 'development' && (
          <div className="premium-indicator">
            ✨ Ad-free experience active
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`ad-loading ${className}`} style={style}>
        <div className="ad-skeleton" />
      </div>
    );
  }

  const config = AD_PLACEMENTS[placement];
  if (!config) return null;

  return (
    <div className={`ad-container ${className}`} style={style}>
      <div className="ad-label">Advertisement</div>
      <ins
        id={config.id}
        className="adsbygoogle"
        style={{
          display: 'inline-block',
          width: `${config.size.width}px`,
          height: `${config.size.height}px`,
          ...style
        }}
        data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
        data-ad-slot="YOUR_AD_SLOT_ID"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      
      {adError && (
        <div className="ad-error">
          <p>Unable to load advertisement</p>
        </div>
      )}
    </div>
  );
};

/**
 * Premium upgrade prompt for free users
 */
export const AdFreePrompt = ({ onUpgrade, compact = false }) => {
  const { subscription } = useContext(SubscriptionContext);
  
  if (subscription?.tier !== 'free') return null;

  return (
    <div className={`ad-free-prompt ${compact ? 'compact' : ''}`}>
      <div className="prompt-content">
        <div className="prompt-icon">✨</div>
        <div className="prompt-text">
          <h4>Go Ad-Free</h4>
          <p>Upgrade to Plus for an uninterrupted flight tracking experience</p>
        </div>
        <button 
          className="upgrade-btn primary"
          onClick={onUpgrade}
        >
          Upgrade Now
        </button>
      </div>
    </div>
  );
};

/**
 * Ad blocker detection
 */
export const AdBlockerDetection = () => {
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const { subscription } = useContext(SubscriptionContext);

  useEffect(() => {
    // Simple ad blocker detection
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbox';
    testAd.style.position = 'absolute';
    testAd.style.left = '-10000px';
    
    document.body.appendChild(testAd);
    
    setTimeout(() => {
      const isBlocked = testAd.offsetHeight === 0;
      setAdBlockDetected(isBlocked);
      document.body.removeChild(testAd);
    }, 100);
  }, []);

  if (!adBlockDetected || subscription?.tier !== 'free') return null;

  return (
    <div className="adblocker-notice">
      <div className="notice-content">
        <h4>Ad Blocker Detected</h4>
        <p>
          We rely on ads to keep FlightTrace free. Please consider upgrading 
          to Plus for an ad-free experience that supports our service.
        </p>
        <div className="notice-actions">
          <button className="btn secondary">Whitelist Site</button>
          <button className="btn primary">Upgrade to Plus</button>
        </div>
      </div>
    </div>
  );
};

export default AdManager;