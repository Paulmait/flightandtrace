import React, { useEffect, useState } from 'react';

// Airline data with logos and colors
export const AIRLINE_DATA = {
  'AAL': { name: 'American Airlines', color: '#0078D2', icon: '🇺🇸' },
  'UAL': { name: 'United Airlines', color: '#003876', icon: '🇺🇸' },
  'DAL': { name: 'Delta Air Lines', color: '#003366', icon: '🇺🇸' },
  'SWA': { name: 'Southwest Airlines', color: '#304CB2', icon: '🇺🇸' },
  'BAW': { name: 'British Airways', color: '#075AAA', icon: '🇬🇧' },
  'DLH': { name: 'Lufthansa', color: '#05164D', icon: '🇩🇪' },
  'AFR': { name: 'Air France', color: '#002157', icon: '🇫🇷' },
  'KLM': { name: 'KLM', color: '#00A1E4', icon: '🇳🇱' },
  'RYR': { name: 'Ryanair', color: '#073590', icon: '🇮🇪' },
  'EZY': { name: 'easyJet', color: '#FF6600', icon: '🇬🇧' },
  'UAE': { name: 'Emirates', color: '#D71921', icon: '🇦🇪' },
  'SIA': { name: 'Singapore Airlines', color: '#0A2462', icon: '🇸🇬' },
  'QFA': { name: 'Qantas', color: '#E40000', icon: '🇦🇺' },
  'ACA': { name: 'Air Canada', color: '#F01428', icon: '🇨🇦' },
  'JAL': { name: 'Japan Airlines', color: '#E60012', icon: '🇯🇵' },
  'ANA': { name: 'All Nippon Airways', color: '#003D7A', icon: '🇯🇵' },
  'CCA': { name: 'Air China', color: '#E31837', icon: '🇨🇳' },
  'CSN': { name: 'China Southern', color: '#003D7E', icon: '🇨🇳' },
  'THY': { name: 'Turkish Airlines', color: '#E81932', icon: '🇹🇷' },
  'IBE': { name: 'Iberia', color: '#CC0000', icon: '🇪🇸' },
};

// Get airline info from callsign
export const getAirlineInfo = (callsign) => {
  if (!callsign) return null;
  const code = callsign.substring(0, 3);
  return AIRLINE_DATA[code] || { name: code, color: '#666', icon: '✈️' };
};

// Animated counter component
export const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setDisplayValue(Math.floor(progress * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

// Keyboard shortcuts hook
export const useKeyboardShortcuts = (callbacks) => {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Shortcuts
      if (key === 'd' && !ctrl) callbacks.toggleDarkMode?.();
      if (key === 's' && !ctrl) callbacks.toggleSidebar?.();
      if (key === 'r' && !ctrl) callbacks.refresh?.();
      if (key === 'f' && ctrl) {
        e.preventDefault();
        callbacks.focusSearch?.();
      }
      if (key === '1' && !ctrl) callbacks.switchRegion?.(0);
      if (key === '2' && !ctrl) callbacks.switchRegion?.(1);
      if (key === '3' && !ctrl) callbacks.switchRegion?.(2);
      if (key === '4' && !ctrl) callbacks.switchRegion?.(3);
      if (key === '5' && !ctrl) callbacks.switchRegion?.(4);
      if (key === '6' && !ctrl) callbacks.switchRegion?.(5);
      if (key === '?' && !ctrl) callbacks.showHelp?.();
      if (key === 'escape') callbacks.closeAll?.();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [callbacks]);
};

// Flight prediction line
export const FlightPath = ({ flight, map }) => {
  useEffect(() => {
    if (!map || !flight?.position) return;

    // Calculate predicted position (5 minutes ahead)
    const predictedLat = flight.position.latitude + 
      (flight.position.groundSpeed * 0.0833 * Math.sin(flight.position.heading * Math.PI / 180)) / 60;
    const predictedLon = flight.position.longitude + 
      (flight.position.groundSpeed * 0.0833 * Math.cos(flight.position.heading * Math.PI / 180)) / 60;

    // Draw path line
    const pathId = `path-${flight.id}`;
    
    if (map.getSource(pathId)) {
      map.removeLayer(pathId);
      map.removeSource(pathId);
    }

    map.addSource(pathId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [flight.position.longitude, flight.position.latitude],
            [predictedLon, predictedLat]
          ]
        }
      }
    });

    map.addLayer({
      id: pathId,
      type: 'line',
      source: pathId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3498db',
        'line-width': 2,
        'line-opacity': 0.5,
        'line-dasharray': [2, 2]
      }
    });

    return () => {
      if (map.getSource(pathId)) {
        map.removeLayer(pathId);
        map.removeSource(pathId);
      }
    };
  }, [flight, map]);

  return null;
};

// Sound notifications
export const useSoundNotifications = (enabled = false) => {
  const playSound = (type) => {
    if (!enabled) return;
    
    const audio = new Audio();
    switch(type) {
      case 'nearby':
        // Create a simple beep sound
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPDTgjMGHm7A7+OZURE';
        audio.volume = 0.3;
        break;
      case 'alert':
        audio.src = 'data:audio/wav;base64,UklGRl9uBABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn';
        audio.volume = 0.5;
        break;
      default:
        audio.volume = 0.3;
        break;
    }
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  return { playSound };
};

// Help modal content
export const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <h2>Keyboard Shortcuts</h2>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="shortcuts-grid">
          <div className="shortcut">
            <kbd>D</kbd>
            <span>Toggle dark mode</span>
          </div>
          <div className="shortcut">
            <kbd>S</kbd>
            <span>Toggle sidebar</span>
          </div>
          <div className="shortcut">
            <kbd>R</kbd>
            <span>Refresh flights</span>
          </div>
          <div className="shortcut">
            <kbd>Ctrl</kbd> + <kbd>F</kbd>
            <span>Focus search</span>
          </div>
          <div className="shortcut">
            <kbd>1-6</kbd>
            <span>Switch regions</span>
          </div>
          <div className="shortcut">
            <kbd>?</kbd>
            <span>Show this help</span>
          </div>
          <div className="shortcut">
            <kbd>Esc</kbd>
            <span>Close dialogs</span>
          </div>
        </div>
        
        <div className="help-section">
          <h3>Tips</h3>
          <ul>
            <li>Click any aircraft for details</li>
            <li>Click statistics for in-depth analysis</li>
            <li>Drag map to load flights in that area</li>
            <li>Data refreshes every 30 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Enhanced aircraft marker with airline info
export const EnhancedAircraftMarker = ({ flight }) => {
  const airline = getAirlineInfo(flight.callsign);
  
  return (
    <div className="enhanced-marker" style={{
      backgroundColor: airline?.color || '#666',
      borderRadius: '50%',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      border: '2px solid white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      transform: `rotate(${flight.position?.heading || 0}deg)`,
      transition: 'transform 0.5s ease'
    }}>
      {airline?.icon || '✈️'}
    </div>
  );
};

// Add the styles
const styles = `
  .help-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }
  
  .help-modal {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
  }
  
  .dark .help-modal {
    background: #242830;
    color: #e4e6eb;
  }
  
  .shortcuts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 20px 0;
  }
  
  .shortcut {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  kbd {
    background: #f4f4f4;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 8px;
    font-family: monospace;
    font-size: 12px;
  }
  
  .dark kbd {
    background: #383d47;
    border-color: #4a5261;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const EnhancedFeatures = {
  AIRLINE_DATA,
  getAirlineInfo,
  AnimatedCounter,
  useKeyboardShortcuts,
  FlightPath,
  useSoundNotifications,
  HelpModal,
  EnhancedAircraftMarker
};

export default EnhancedFeatures;