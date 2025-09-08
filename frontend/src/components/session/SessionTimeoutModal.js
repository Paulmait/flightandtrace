/**
 * Session Timeout Modal
 * Shows countdown and upgrade prompt for free users
 */

import React, { useState, useEffect } from 'react';
import { useSession } from '../../utils/SessionManager';

const SessionTimeoutModal = ({ onUpgrade }) => {
  const session = useSession();
  const [countdown, setCountdown] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (session.lastEvent) {
      const { type } = session.lastEvent;
      
      switch (type) {
        case 'session_warning':
          setCountdown(session.lastEvent.remainingMinutes * 60);
          setIsVisible(true);
          break;
          
        case 'session_expired':
          setIsVisible(true);
          setCountdown(0);
          break;
          
        case 'session_extended':
        case 'session_restarted':
          setIsVisible(false);
          break;
      }
    }
  }, [session.lastEvent]);

  useEffect(() => {
    let interval;
    
    if (isVisible && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsVisible(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isVisible, countdown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExtend = () => {
    session.extendSession();
    setIsVisible(false);
  };

  const handleRestart = () => {
    session.restartSession();
    setIsVisible(false);
  };

  if (!isVisible || session.isPaidUser) return null;

  const isExpired = countdown === 0;

  return (
    <div className="session-modal-overlay">
      <div className="session-modal">
        <div className="session-modal-header">
          <div className="session-icon">
            {isExpired ? '⏰' : '⚠️'}
          </div>
          <h2>
            {isExpired ? 'Session Expired' : 'Session Expiring Soon'}
          </h2>
        </div>
        
        <div className="session-modal-content">
          {!isExpired ? (
            <>
              <p>Your tracking session will expire in:</p>
              <div className="countdown-timer">
                {formatTime(countdown)}
              </div>
              <p className="session-note">
                Free users have a 30-minute session limit to ensure fair usage.
              </p>
            </>
          ) : (
            <>
              <p>Your session has expired due to inactivity.</p>
              <p className="session-note">
                Click "Continue Tracking" to start a new session.
              </p>
            </>
          )}
        </div>

        <div className="session-modal-actions">
          {!isExpired ? (
            <>
              <button 
                className="btn secondary"
                onClick={handleExtend}
              >
                Extend Session
              </button>
              <button 
                className="btn primary upgrade-btn"
                onClick={onUpgrade}
              >
                <span className="premium-icon">✨</span>
                Upgrade for Unlimited
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn secondary"
                onClick={handleRestart}
              >
                Continue Tracking
              </button>
              <button 
                className="btn primary upgrade-btn"
                onClick={onUpgrade}
              >
                <span className="premium-icon">✨</span>
                Go Premium - No Limits
              </button>
            </>
          )}
        </div>

        <div className="premium-benefits">
          <h4>Premium Benefits:</h4>
          <ul>
            <li>✅ Unlimited session time</li>
            <li>✅ No interruptions</li>
            <li>✅ Advanced flight history</li>
            <li>✅ Ad-free experience</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;