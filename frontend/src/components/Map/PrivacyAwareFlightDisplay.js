/**
 * Privacy-Aware Flight Display Component
 * Integrates privacy controls with flight map display
 */

import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { PrivacyNotice } from '../attribution/AttributionFooter';
import PrivacyAwareFlightService from '../../services/PrivacyAwareFlightService';

const PrivacyAwareFlightDisplay = ({ 
  flightService, 
  bounds, 
  onFlightSelect,
  showPrivacyIndicators = true 
}) => {
  const { user } = useContext(UserContext);
  const [flights, setFlights] = useState([]);
  const [privacyService, setPrivacyService] = useState(null);
  const [privacyStats, setPrivacyStats] = useState({});
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    // Initialize privacy-aware service
    const privacyConfig = {
      showBlockedAircraft: user?.subscription?.tier !== 'free',
      anonymizePositions: true,
      coordinatePrecision: getTierPrecision(user?.subscription?.tier),
      showPrivacyNotices: true
    };

    const service = new PrivacyAwareFlightService(flightService, privacyConfig);
    setPrivacyService(service);

    // Load blocked aircraft list
    service.loadBlockedAircraft();
  }, [flightService, user]);

  useEffect(() => {
    if (!privacyService) return;

    const fetchFlights = async () => {
      try {
        const userTier = user?.subscription?.tier || 'free';
        const flightData = await privacyService.getFlights(bounds, { userTier });
        
        setFlights(flightData);
        setPrivacyStats(privacyService.getPrivacyStats());
      } catch (error) {
        console.error('Error fetching privacy-aware flights:', error);
      }
    };

    fetchFlights();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchFlights, 5000);
    return () => clearInterval(interval);
  }, [privacyService, bounds, user]);

  const getTierPrecision = (tier) => {
    const precisionMap = {
      free: 2,
      plus: 3,
      pro: 4,
      business: 5,
      enterprise: 6
    };
    return precisionMap[tier] || precisionMap.free;
  };

  const handleFlightClick = (flight) => {
    setSelectedFlight(flight);
    
    if (flight.blocked || flight.privacyMode) {
      setShowPrivacyModal(true);
    } else {
      onFlightSelect?.(flight);
    }
  };

  const renderFlightMarker = (flight) => {
    const isBlocked = flight.blocked || flight.privacyMode;
    const isAnonymized = flight.privacy?.anonymized;

    return (
      <div
        key={flight.id}
        className={`flight-marker ${isBlocked ? 'blocked' : ''} ${isAnonymized ? 'anonymized' : ''}`}
        style={{
          position: 'absolute',
          left: `${flight.screenX}px`,
          top: `${flight.screenY}px`,
          transform: `translate(-50%, -50%) rotate(${flight.heading || 0}deg)`,
          cursor: 'pointer'
        }}
        onClick={() => handleFlightClick(flight)}
      >
        {isBlocked ? (
          <BlockedAircraftMarker flight={flight} />
        ) : (
          <StandardAircraftMarker flight={flight} />
        )}
        
        {showPrivacyIndicators && isAnonymized && (
          <div className="privacy-indicator" title="Data anonymized for privacy">
            🔒
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="privacy-aware-flight-display">
      {/* Flight Markers */}
      <div className="flight-markers-layer">
        {flights.map(renderFlightMarker)}
      </div>

      {/* Privacy Statistics */}
      {showPrivacyIndicators && (
        <PrivacyStatsOverlay stats={privacyStats} userTier={user?.subscription?.tier} />
      )}

      {/* Privacy Modal */}
      {showPrivacyModal && selectedFlight && (
        <PrivacyModal
          flight={selectedFlight}
          onClose={() => setShowPrivacyModal(false)}
          userTier={user?.subscription?.tier}
        />
      )}
    </div>
  );
};

/**
 * Blocked Aircraft Marker
 */
const BlockedAircraftMarker = ({ flight }) => (
  <div className="blocked-aircraft-marker">
    <div className="aircraft-icon blocked">
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="2" y="8" width="16" height="4" fill="#666" opacity="0.5" />
        <circle cx="10" cy="10" r="8" fill="none" stroke="#999" strokeWidth="2" strokeDasharray="2,2" />
        <text x="10" y="14" textAnchor="middle" fontSize="8" fill="#666">🔒</text>
      </svg>
    </div>
    <div className="altitude-label blocked">BLOCKED</div>
  </div>
);

/**
 * Standard Aircraft Marker
 */
const StandardAircraftMarker = ({ flight }) => {
  const getAircraftIcon = () => {
    if (flight.aircraft?.category === 'heavy') return '✈️';
    if (flight.aircraft?.category === 'light') return '🛩️';
    return '✈️';
  };

  return (
    <div className="standard-aircraft-marker">
      <div className="aircraft-icon">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path
            d="M12 2l-2 8H4l-2 2 2 2h6l2 8 2-8h6l2-2-2-2h-6z"
            fill={flight.privacy?.anonymized ? "#FFA500" : "#007AFF"}
          />
        </svg>
      </div>
      
      {flight.callsign && (
        <div className="callsign-label">
          {flight.privacy?.anonymized ? flight.callsign.substring(0, 3) + '***' : flight.callsign}
        </div>
      )}
      
      {flight.altitude && (
        <div className="altitude-label">
          {Math.round(flight.altitude / 100) * 100}ft
        </div>
      )}
    </div>
  );
};

/**
 * Privacy Statistics Overlay
 */
const PrivacyStatsOverlay = ({ stats, userTier }) => (
  <div className="privacy-stats-overlay">
    <div className="stats-header">
      <span className="privacy-icon">🔒</span>
      <span>Privacy Controls Active</span>
    </div>
    
    <div className="stats-content">
      <div className="stat-item">
        <span className="stat-label">Blocked Aircraft:</span>
        <span className="stat-value">{stats.blockedAircraft || 0}</span>
      </div>
      
      <div className="stat-item">
        <span className="stat-label">Data Precision:</span>
        <span className="stat-value">
          {userTier === 'free' ? 'Low' : 
           userTier === 'plus' ? 'Medium' : 
           userTier === 'pro' ? 'High' : 'Full'}
        </span>
      </div>
    </div>
  </div>
);

/**
 * Privacy Information Modal
 */
const PrivacyModal = ({ flight, onClose, userTier }) => {
  const getPrivacyMessage = () => {
    if (flight.blocked || flight.privacyMode) {
      return {
        title: 'Aircraft Privacy Protected',
        message: 'This aircraft has been blocked from public display to protect owner privacy.',
        icon: '🔒',
        type: 'blocked'
      };
    }
    
    if (flight.privacy?.anonymized) {
      return {
        title: 'Data Anonymized',
        message: 'Some aircraft details have been anonymized based on your subscription tier.',
        icon: '🔐',
        type: 'anonymized'
      };
    }
    
    return {
      title: 'Full Data Available',
      message: 'Complete aircraft information is available for your subscription tier.',
      icon: '✅',
      type: 'full'
    };
  };

  const privacyInfo = getPrivacyMessage();

  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="privacy-icon">{privacyInfo.icon}</span>
          <h3>{privacyInfo.title}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <p>{privacyInfo.message}</p>
          
          {flight.blocked && (
            <div className="blocked-info">
              <h4>Why is this aircraft blocked?</h4>
              <ul>
                <li>Owner requested privacy protection</li>
                <li>Government or military aircraft</li>
                <li>Security or safety requirements</li>
                <li>Commercial sensitivity</li>
              </ul>
            </div>
          )}
          
          {flight.privacy?.anonymized && (
            <div className="anonymization-info">
              <h4>What data is anonymized?</h4>
              <ul>
                <li>Precise coordinates (reduced precision)</li>
                <li>Owner/operator information</li>
                <li>Detailed route information</li>
                <li>Passenger/cargo details</li>
              </ul>
              
              <div className="upgrade-notice">
                <p>Upgrade to access more detailed information:</p>
                <button className="upgrade-button">View Plans</button>
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <PrivacyNotice type={privacyInfo.type} />
        </div>
      </div>
    </div>
  );
};

export default PrivacyAwareFlightDisplay;