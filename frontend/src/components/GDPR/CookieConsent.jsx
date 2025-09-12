import React, { useState, useEffect } from 'react';
import './CookieConsent.css';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be changed
    analytics: false,
    marketing: false,
    functional: false
  });

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after 1 second
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Apply saved preferences
      const savedPrefs = JSON.parse(consent);
      applyPreferences(savedPrefs);
    }
  }, []);

  const applyPreferences = (prefs) => {
    // Apply analytics
    if (prefs.analytics) {
      // Enable Google Analytics
      window.gtag = window.gtag || function() { (window.dataLayer = window.dataLayer || []).push(arguments); };
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    } else {
      // Disable Google Analytics
      window.gtag = window.gtag || function() { (window.dataLayer = window.dataLayer || []).push(arguments); };
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }

    // Apply marketing
    if (prefs.marketing) {
      window.gtag('consent', 'update', {
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted'
      });
    } else {
      window.gtag('consent', 'update', {
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied'
      });
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    applyPreferences(allAccepted);
    setShowBanner(false);
    
    // Track consent
    if (window.gtag) {
      window.gtag('event', 'cookie_consent', {
        action: 'accept_all'
      });
    }
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('cookieConsent', JSON.stringify(onlyNecessary));
    applyPreferences(onlyNecessary);
    setShowBanner(false);
    
    // Clear existing cookies (except necessary)
    clearNonEssentialCookies();
  };

  const handleSavePreferences = () => {
    const savedPrefs = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('cookieConsent', JSON.stringify(savedPrefs));
    applyPreferences(savedPrefs);
    setShowBanner(false);
    setShowDetails(false);
    
    // Track consent
    if (window.gtag) {
      window.gtag('event', 'cookie_consent', {
        action: 'custom_selection',
        analytics: preferences.analytics,
        marketing: preferences.marketing,
        functional: preferences.functional
      });
    }
    
    // Clear cookies based on preferences
    if (!preferences.analytics || !preferences.marketing) {
      clearNonEssentialCookies();
    }
  };

  const clearNonEssentialCookies = () => {
    // Get all cookies
    const cookies = document.cookie.split(';');
    
    // List of essential cookies to keep
    const essentialCookies = ['cookieConsent', 'auth', 'session'];
    
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      // Skip essential cookies
      if (!essentialCookies.some(essential => name.includes(essential))) {
        // Delete cookie
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
      }
    });
  };

  const togglePreference = (type) => {
    if (type === 'necessary') return; // Cannot toggle necessary cookies
    setPreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (!showBanner) return null;

  return (
    <div className="cookie-consent-overlay">
      <div className="cookie-consent-banner">
        <div className="cookie-content">
          <div className="cookie-header">
            <h3>🍪 Cookie Settings</h3>
            <p className="cookie-intro">
              We use cookies to enhance your experience on FlightTrace. 
              You can manage your preferences or accept all cookies.
            </p>
          </div>

          {!showDetails ? (
            <div className="cookie-simple">
              <p className="cookie-description">
                We use necessary cookies to make our site work. We'd also like to set optional cookies to help us improve it.
                For more information, read our <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
              </p>
              <div className="cookie-actions">
                <button className="btn-reject" onClick={handleRejectAll}>
                  Reject All
                </button>
                <button className="btn-customize" onClick={() => setShowDetails(true)}>
                  Customize
                </button>
                <button className="btn-accept" onClick={handleAcceptAll}>
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            <div className="cookie-details">
              <div className="cookie-categories">
                <div className="cookie-category">
                  <div className="category-header">
                    <input 
                      type="checkbox" 
                      checked={preferences.necessary}
                      disabled
                      id="necessary"
                    />
                    <label htmlFor="necessary">
                      <strong>Necessary Cookies</strong> (Always Enabled)
                    </label>
                  </div>
                  <p className="category-description">
                    These cookies are essential for the website to function properly. 
                    They enable basic functions like page navigation and access to secure areas.
                  </p>
                </div>

                <div className="cookie-category">
                  <div className="category-header">
                    <input 
                      type="checkbox" 
                      checked={preferences.analytics}
                      onChange={() => togglePreference('analytics')}
                      id="analytics"
                    />
                    <label htmlFor="analytics">
                      <strong>Analytics Cookies</strong>
                    </label>
                  </div>
                  <p className="category-description">
                    These cookies help us understand how visitors interact with our website 
                    by collecting and reporting information anonymously.
                  </p>
                </div>

                <div className="cookie-category">
                  <div className="category-header">
                    <input 
                      type="checkbox" 
                      checked={preferences.marketing}
                      onChange={() => togglePreference('marketing')}
                      id="marketing"
                    />
                    <label htmlFor="marketing">
                      <strong>Marketing Cookies</strong>
                    </label>
                  </div>
                  <p className="category-description">
                    These cookies are used to track visitors across websites to display 
                    ads that are relevant and engaging for individual users.
                  </p>
                </div>

                <div className="cookie-category">
                  <div className="category-header">
                    <input 
                      type="checkbox" 
                      checked={preferences.functional}
                      onChange={() => togglePreference('functional')}
                      id="functional"
                    />
                    <label htmlFor="functional">
                      <strong>Functional Cookies</strong>
                    </label>
                  </div>
                  <p className="category-description">
                    These cookies enable enhanced functionality and personalization, 
                    such as remembering your preferences and saved flights.
                  </p>
                </div>
              </div>

              <div className="cookie-actions">
                <button className="btn-back" onClick={() => setShowDetails(false)}>
                  Back
                </button>
                <button className="btn-save" onClick={handleSavePreferences}>
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          <div className="cookie-footer">
            <p className="cookie-compliance">
              This site complies with GDPR and CCPA regulations. 
              Learn more in our <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and 
              <a href="/cookie-policy" target="_blank" rel="noopener noreferrer"> Cookie Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;