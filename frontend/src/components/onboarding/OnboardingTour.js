/**
 * Onboarding Tour Component
 * Interactive tour for new users with empty state guidance
 */

import React, { useState, useEffect, useContext } from 'react';
import { SubscriptionContext } from '../contexts/SubscriptionContext';

const OnboardingTour = ({ onComplete, onSkip }) => {
  const { user } = useContext(SubscriptionContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const tourSteps = [
    {
      id: 'welcome',
      title: 'Welcome to FlightTrace! ✈️',
      content: (
        <div className="tour-step-welcome">
          <h3>Track flights worldwide in real-time</h3>
          <p>
            FlightTrace gives you access to live flight data, aircraft tracking, 
            and airport information from around the globe.
          </p>
          <div className="welcome-features">
            <div className="feature">
              <div className="feature-icon">🌍</div>
              <div className="feature-text">Global Coverage</div>
            </div>
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <div className="feature-text">Real-time Updates</div>
            </div>
            <div className="feature">
              <div className="feature-icon">📊</div>
              <div className="feature-text">Rich Analytics</div>
            </div>
          </div>
        </div>
      ),
      target: null,
      placement: 'center'
    },
    {
      id: 'map',
      title: 'Explore the Flight Map',
      content: (
        <div className="tour-step-content">
          <p>
            This is your main flight tracking interface. Each moving dot 
            represents a live aircraft with real-time position data.
          </p>
          <div className="tour-tips">
            <div className="tip">🖱️ Click and drag to pan around</div>
            <div className="tip">🔍 Scroll to zoom in/out</div>
            <div className="tip">✈️ Click any aircraft for details</div>
          </div>
        </div>
      ),
      target: '.flight-map',
      placement: 'right'
    },
    {
      id: 'search',
      title: 'Search Anything',
      content: (
        <div className="tour-step-content">
          <p>
            Find specific flights, aircraft, or airports using our powerful search.
          </p>
          <div className="search-examples">
            <div className="example">
              <strong>Flight:</strong> "AA1234" or "American 1234"
            </div>
            <div className="example">
              <strong>Aircraft:</strong> "N123AA" or "Boeing 737"
            </div>
            <div className="example">
              <strong>Airport:</strong> "LAX" or "Los Angeles"
            </div>
          </div>
        </div>
      ),
      target: '.search-bar',
      placement: 'bottom'
    },
    {
      id: 'filters',
      title: 'Filter Your View',
      content: (
        <div className="tour-step-content">
          <p>
            Use filters to focus on specific types of flights, altitudes, 
            or aircraft categories.
          </p>
          <div className="filter-preview">
            <span className="filter-tag">✈️ Commercial</span>
            <span className="filter-tag">🚁 Helicopters</span>
            <span className="filter-tag">📊 Above 30,000ft</span>
          </div>
        </div>
      ),
      target: '.map-filters',
      placement: 'left'
    },
    {
      id: 'watchlist',
      title: 'Build Your Watchlist',
      content: (
        <div className="tour-step-content">
          <p>
            Save interesting flights, aircraft, and airports to track them over time.
          </p>
          <div className="watchlist-benefits">
            <div className="benefit">📱 Get notifications</div>
            <div className="benefit">📈 View statistics</div>
            <div className="benefit">🔄 Track patterns</div>
          </div>
        </div>
      ),
      target: '.watchlist-button',
      placement: 'bottom'
    },
    {
      id: 'upgrade',
      title: 'Unlock Premium Features',
      content: (
        <div className="tour-step-content">
          <p>
            Get the most out of FlightTrace with our premium tiers.
          </p>
          <div className="premium-preview">
            <div className="premium-feature">🚫 Ad-free experience</div>
            <div className="premium-feature">⏰ Unlimited session time</div>
            <div className="premium-feature">📊 Extended history (365 days)</div>
            <div className="premium-feature">🎯 Advanced alerts</div>
          </div>
          <p className="upgrade-note">
            Start with our free tier and upgrade anytime!
          </p>
        </div>
      ),
      target: '.upgrade-button',
      placement: 'left'
    }
  ];

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem(`tour_completed_${user?.id || 'anonymous'}`);
    
    if (!hasSeenTour) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        setIsVisible(true);
      }, 1000);
    }
  }, [user]);

  useEffect(() => {
    // Handle keyboard navigation
    const handleKeyPress = (e) => {
      if (!isVisible) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case 'Space':
          nextStep();
          break;
        case 'ArrowLeft':
          prevStep();
          break;
        case 'Escape':
          handleSkip();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, currentStep]);

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (stepIndex) => {
    setCurrentStep(stepIndex);
  };

  const handleComplete = () => {
    localStorage.setItem(`tour_completed_${user?.id || 'anonymous'}`, 'true');
    setIsVisible(false);
    onComplete && onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(`tour_completed_${user?.id || 'anonymous'}`, 'true');
    setIsVisible(false);
    onSkip && onSkip();
  };

  const getTourStepPosition = (target, placement) => {
    if (!target) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const element = document.querySelector(target);
    if (!element) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;

    let position = {};

    switch (placement) {
      case 'top':
        position = {
          top: rect.top - tooltipHeight - 10,
          left: rect.left + (rect.width / 2) - (tooltipWidth / 2)
        };
        break;
      case 'right':
        position = {
          top: rect.top + (rect.height / 2) - (tooltipHeight / 2),
          left: rect.right + 10
        };
        break;
      case 'bottom':
        position = {
          top: rect.bottom + 10,
          left: rect.left + (rect.width / 2) - (tooltipWidth / 2)
        };
        break;
      case 'left':
        position = {
          top: rect.top + (rect.height / 2) - (tooltipHeight / 2),
          left: rect.left - tooltipWidth - 10
        };
        break;
      default:
        position = {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }

    return position;
  };

  const highlightTarget = (target) => {
    // Remove previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });

    if (target) {
      const element = document.querySelector(target);
      if (element) {
        element.classList.add('tour-highlight');
      }
    }
  };

  useEffect(() => {
    if (isVisible && tourSteps[currentStep]) {
      highlightTarget(tourSteps[currentStep].target);
    }

    return () => {
      // Cleanup highlights
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [currentStep, isVisible]);

  if (!isVisible) return null;

  const currentTourStep = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="tour-overlay" />
      
      {/* Tour tooltip */}
      <div 
        className="tour-tooltip"
        style={getTourStepPosition(currentTourStep.target, currentTourStep.placement)}
      >
        <div className="tour-header">
          <h3>{currentTourStep.title}</h3>
          <button className="tour-close" onClick={handleSkip}>
            ✕
          </button>
        </div>
        
        <div className="tour-content">
          {currentTourStep.content}
        </div>
        
        <div className="tour-footer">
          <div className="tour-progress">
            <div className="progress-dots">
              {tourSteps.map((_, index) => (
                <button
                  key={index}
                  className={`progress-dot ${
                    index === currentStep ? 'active' : ''
                  } ${
                    completedSteps.has(index) ? 'completed' : ''
                  }`}
                  onClick={() => goToStep(index)}
                />
              ))}
            </div>
            <div className="progress-text">
              {currentStep + 1} of {tourSteps.length}
            </div>
          </div>
          
          <div className="tour-actions">
            {currentStep > 0 && (
              <button className="btn secondary" onClick={prevStep}>
                Previous
              </button>
            )}
            
            <button className="btn tertiary" onClick={handleSkip}>
              Skip Tour
            </button>
            
            <button className="btn primary" onClick={nextStep}>
              {isLastStep ? 'Get Started!' : 'Next'}
            </button>
          </div>
        </div>
        
        <div className="tour-hint">
          <span>💡 Use arrow keys to navigate or ESC to skip</span>
        </div>
      </div>
    </>
  );
};

/**
 * Empty state tour triggers
 */
export const EmptyStateTours = {
  // Show specific mini-tours for empty states
  showSearchTour: () => {
    // Mini tour for search functionality
  },
  
  showWatchlistTour: () => {
    // Mini tour for watchlist features
  },
  
  showMapTour: () => {
    // Mini tour for map controls
  }
};

/**
 * Tour restart component
 */
export const TourRestartButton = () => {
  const { user } = useContext(SubscriptionContext);
  
  const restartTour = () => {
    localStorage.removeItem(`tour_completed_${user?.id || 'anonymous'}`);
    window.location.reload(); // Simple restart - could be more elegant
  };

  return (
    <button className="tour-restart-btn" onClick={restartTour}>
      🎯 Restart Tour
    </button>
  );
};

export default OnboardingTour;