import React, { useState, useEffect, useCallback, useRef } from 'react';
import FinalMap from './Map/FinalMap.jsx';
import { getOptimalLocation } from '../utils/locationService';
import { 
  getAirlineInfo, 
  AnimatedCounter, 
  useKeyboardShortcuts, 
  useSoundNotifications, 
  HelpModal
} from './EnhancedFeatures';
import Legal from './Legal';
import FlightDetailsPanel from './FlightDetailsPanel';
import { estimateRoute } from '../utils/airportDatabase';
import { 
  calculateFuelConsumption, 
  getEmissionRate
} from '../utils/emissionsCalculator';
import './EnhancedApp.css';

// Regional configurations for different parts of the world
const REGIONS = {
  northAmerica: {
    name: 'North America',
    bbox: '-130,20,-60,55', // West to East US/Canada
    center: [-95, 40],
    zoom: 4
  },
  europe: {
    name: 'Europe',
    bbox: '-15,35,35,65',
    center: [10, 50],
    zoom: 4
  },
  asia: {
    name: 'Asia',
    bbox: '60,5,150,55',
    center: [105, 35],
    zoom: 3
  },
  southAmerica: {
    name: 'South America',
    bbox: '-85,-55,-30,15',
    center: [-60, -15],
    zoom: 4
  },
  africa: {
    name: 'Africa',
    bbox: '-20,-35,55,40',
    center: [20, 0],
    zoom: 4
  },
  oceania: {
    name: 'Oceania',
    bbox: '110,-50,180,-10',
    center: [135, -25],
    zoom: 4
  }
};

// Detect region based on coordinates
function detectRegion(lat, lon) {
  if (lat >= 20 && lat <= 55 && lon >= -130 && lon <= -60) return REGIONS.northAmerica;
  if (lat >= 35 && lat <= 65 && lon >= -15 && lon <= 35) return REGIONS.europe;
  if (lat >= 5 && lat <= 55 && lon >= 60 && lon <= 150) return REGIONS.asia;
  if (lat >= -55 && lat <= 15 && lon >= -85 && lon <= -30) return REGIONS.southAmerica;
  if (lat >= -35 && lat <= 40 && lon >= -20 && lon <= 55) return REGIONS.africa;
  if (lat >= -50 && lat <= -10 && lon >= 110 && lon <= 180) return REGIONS.oceania;
  
  // Default to Europe if uncertain
  return REGIONS.europe;
}

function EnhancedAppV2() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [mapCenter, setMapCenter] = useState([0, 30]); // Start with world center
  const [mapZoom, setMapZoom] = useState(2); // Start zoomed out
  const [userLocation, setUserLocation] = useState(null);
  const [currentRegion, setCurrentRegion] = useState(REGIONS.northAmerica); // Default to North America
  const [boundingBox, setBoundingBox] = useState(REGIONS.northAmerica.bbox); // Default bbox
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mapLayer, setMapLayer] = useState('default');
  const [showWeather, setShowWeather] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statsModal, setStatsModal] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [selectedFlightDetails, setSelectedFlightDetails] = useState(null);
  
  const mapRef = useRef(null);
  const isUserNavigating = useRef(false);
  const searchInputRef = useRef(null);

  // Statistics
  const [stats, setStats] = useState({
    totalFlights: 0,
    inAir: 0,
    onGround: 0,
    avgAltitude: 0,
    avgSpeed: 0,
    airlines: new Set(),
    countries: new Set(),
    topAirlines: [],
    topCountries: [],
    totalEmissions: 0,
    emissionsRate: 0
  });

  // Fetch flights with dynamic bbox based on map view
  const fetchFlights = useCallback(async (customBbox) => {
    const bboxToUse = customBbox || boundingBox;
    
    try {
      setLoading(true);
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `http://localhost:3000/api/flights?bbox=${bboxToUse}`
        : `/api/flights?bbox=${bboxToUse}`;
      
      const response = await fetch(apiUrl);
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response:', jsonError);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (data && data.flights && Array.isArray(data.flights)) {
        setFlights(data.flights);
        setLastUpdate(new Date());
        setError(null);
        updateStatistics(data.flights);
      } else {
        setFlights([]);
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching flights:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boundingBox]);

  // Update statistics with more details
  const updateStatistics = (flightData) => {
    const inAir = flightData.filter(f => !f.onGround).length;
    const onGround = flightData.filter(f => f.onGround).length;
    const avgAlt = flightData.reduce((sum, f) => sum + (f.position?.altitude || 0), 0) / (flightData.length || 1);
    const avgSpd = flightData.reduce((sum, f) => sum + (f.position?.groundSpeed || 0), 0) / (flightData.length || 1);
    
    // Calculate total emissions
    let totalEmissionsPerHour = 0;
    flightData.forEach(flight => {
      const emissionRate = getEmissionRate(flight);
      if (emissionRate) {
        totalEmissionsPerHour += parseFloat(emissionRate.perHour);
      }
    });
    
    // Count airlines and countries
    const airlineCount = {};
    const countryCount = {};
    
    flightData.forEach(f => {
      const airline = f.callsign?.substring(0, 3);
      if (airline) {
        airlineCount[airline] = (airlineCount[airline] || 0) + 1;
      }
      if (f.origin) {
        countryCount[f.origin] = (countryCount[f.origin] || 0) + 1;
      }
    });
    
    // Get top 5 airlines and countries
    const topAirlines = Object.entries(airlineCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const topCountries = Object.entries(countryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    setStats({
      totalFlights: flightData.length,
      inAir,
      onGround,
      avgAltitude: Math.round(avgAlt),
      avgSpeed: Math.round(avgSpd),
      airlines: new Set(Object.keys(airlineCount)),
      countries: new Set(Object.keys(countryCount)),
      topAirlines,
      topCountries,
      totalEmissions: Math.round(totalEmissionsPerHour),
      emissionsRate: Math.round(totalEmissionsPerHour / 60)
    });
  };

  // Handle map movement and fetch flights for visible area
  const handleMapMove = useCallback(() => {
    if (!mapRef.current || !isUserNavigating.current) return;
    
    // Get current map bounds
    const bounds = mapRef.current.getBounds();
    if (bounds) {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const newBbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
      
      // Update bounding box and fetch flights for new area
      setBoundingBox(newBbox);
      fetchFlights(newBbox);
    }
  }, [fetchFlights]);

  // Search flights
  const filteredFlights = flights.filter(flight => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      flight.callsign?.toLowerCase().includes(query) ||
      flight.icao24?.toLowerCase().includes(query) ||
      flight.origin?.toLowerCase().includes(query)
    );
  });

  // Get location and set appropriate region on mount
  useEffect(() => {
    async function initLocation() {
      try {
        const location = await getOptimalLocation();
        setUserLocation(location);
        
        if (location && location.coords) {
          // Detect region based on user location
          const detectedRegion = detectRegion(location.coords.latitude, location.coords.longitude);
          console.log('User location detected:', location.city, location.country);
          console.log('Setting region to:', detectedRegion.name);
          
          setCurrentRegion(detectedRegion);
          setBoundingBox(detectedRegion.bbox);
          setMapCenter(detectedRegion.center);
          setMapZoom(detectedRegion.zoom);
          
          // Fetch flights for user's region
          fetchFlights(detectedRegion.bbox);
        } else {
          // Try to detect based on timezone or IP
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          let defaultRegion = REGIONS.europe; // Final fallback
          
          if (timezone.includes('America')) {
            defaultRegion = REGIONS.northAmerica;
          } else if (timezone.includes('Asia')) {
            defaultRegion = REGIONS.asia;
          } else if (timezone.includes('Africa')) {
            defaultRegion = REGIONS.africa;
          } else if (timezone.includes('Australia')) {
            defaultRegion = REGIONS.oceania;
          }
          
          console.log('Using timezone-based region:', defaultRegion.name);
          setCurrentRegion(defaultRegion);
          setBoundingBox(defaultRegion.bbox);
          setMapCenter(defaultRegion.center);
          setMapZoom(defaultRegion.zoom);
          fetchFlights(defaultRegion.bbox);
        }
      } catch (err) {
        console.error('Location error:', err);
        // Use timezone as fallback
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let fallbackRegion = REGIONS.europe;
        
        if (timezone.includes('America')) {
          fallbackRegion = REGIONS.northAmerica;
        } else if (timezone.includes('Asia')) {
          fallbackRegion = REGIONS.asia;
        }
        
        setCurrentRegion(fallbackRegion);
        setBoundingBox(fallbackRegion.bbox);
        setMapCenter(fallbackRegion.center);
        setMapZoom(fallbackRegion.zoom);
        fetchFlights(fallbackRegion.bbox);
      }
    }
    
    initLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto refresh
  useEffect(() => {
    if (autoRefresh && boundingBox) {
      const interval = setInterval(() => {
        fetchFlights();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchFlights, autoRefresh, boundingBox]);

  // Toggle dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Initialize sound notifications
  const { playSound } = useSoundNotifications(soundEnabled);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    toggleDarkMode: () => setDarkMode(prev => !prev),
    toggleSidebar: () => setSidebarOpen(prev => !prev),
    refresh: () => fetchFlights(),
    focusSearch: () => searchInputRef.current?.focus(),
    switchRegion: (index) => {
      const regions = Object.values(REGIONS);
      if (regions[index]) {
        switchRegion(regions[index]);
      }
    },
    showHelp: () => setShowHelp(true),
    closeAll: () => {
      setStatsModal(null);
      setShowHelp(false);
      setSelectedFlight(null);
    }
  });

  // Check for nearby aircraft and play sound
  useEffect(() => {
    if (!soundEnabled || !userLocation) return;
    
    const nearbyFlights = flights.filter(flight => {
      if (!flight.position) return false;
      const distance = Math.sqrt(
        Math.pow(flight.position.latitude - userLocation.coords.latitude, 2) +
        Math.pow(flight.position.longitude - userLocation.coords.longitude, 2)
      );
      return distance < 0.5; // Within ~50km
    });

    if (nearbyFlights.length > 0) {
      playSound('nearby');
    }
  }, [flights, soundEnabled, userLocation, playSound]);

  // Handle flight click
  const handleFlightClick = (flight) => {
    setSelectedFlight(flight);
    
    // Estimate route based on position and heading
    const route = estimateRoute(
      flight.latitude || flight.position?.latitude,
      flight.longitude || flight.position?.longitude,
      flight.true_track || flight.heading || 0,
      flight.callsign
    );
    
    // Add route information to flight object
    const flightWithRoute = {
      ...flight,
      origin: route.origin,
      destination: route.destination,
      airline: getAirlineInfo(flight.callsign).name,
      aircraft_type: flight.aircraft_type || 'A320' // Default to A320 if unknown
    };
    
    setSelectedFlightDetails(flightWithRoute);
    
    if (flight.position) {
      isUserNavigating.current = false; // Prevent fetch on programmatic move
      setMapCenter([flight.position.longitude, flight.position.latitude]);
      setMapZoom(10);
      setTimeout(() => {
        isUserNavigating.current = true;
      }, 1000);
    }
  };

  // Handle region switch
  const switchRegion = (region) => {
    setCurrentRegion(region);
    setBoundingBox(region.bbox);
    setMapCenter(region.center);
    setMapZoom(region.zoom);
    isUserNavigating.current = false;
    fetchFlights(region.bbox);
    setTimeout(() => {
      isUserNavigating.current = true;
    }, 1000);
  };

  // Handle stats click for detailed modal
  const handleStatsClick = (type) => {
    setStatsModal(type);
  };

  return (
    <div className={`enhanced-app ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <h1 className="app-title">
            <span className="logo-icon">✈️</span>
            Flight & Trace
          </h1>
        </div>

        <div className="header-center">
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search flight, airline, or airport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="search-btn">🔍</button>
          </div>
        </div>

        <div className="header-right">
          <div className="region-selector">
            <select 
              value={currentRegion?.name || 'Loading...'} 
              onChange={(e) => switchRegion(Object.values(REGIONS).find(r => r.name === e.target.value))}
              className="region-dropdown"
              disabled={!currentRegion}
            >
              {!currentRegion && <option>Loading...</option>}
              {Object.values(REGIONS).map(region => (
                <option key={region.name} value={region.name}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="status-indicator">
            <span className={`status-dot ${loading ? 'loading' : 'active'}`}></span>
            <span className="status-text">
              {loading ? 'UPDATING' : 'LIVE'}
            </span>
          </div>
          
          <button 
            className="header-btn"
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          >
            {autoRefresh ? '⟳' : '⏸'}
          </button>
          
          <button 
            className="header-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title="Toggle sound notifications"
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>
          
          <button 
            className="header-btn"
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          
          <button 
            className="header-btn"
            onClick={() => setShowHelp(true)}
            title="Show keyboard shortcuts"
          >
            ?
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-section">
            <h3>Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item clickable" onClick={() => handleStatsClick('total')}>
                <div className="stat-value"><AnimatedCounter value={stats.totalFlights} /></div>
                <div className="stat-label">Total Aircraft</div>
              </div>
              <div className="stat-item clickable" onClick={() => handleStatsClick('inAir')}>
                <div className="stat-value"><AnimatedCounter value={stats.inAir} /></div>
                <div className="stat-label">In Flight</div>
              </div>
              <div className="stat-item clickable" onClick={() => handleStatsClick('onGround')}>
                <div className="stat-value"><AnimatedCounter value={stats.onGround} /></div>
                <div className="stat-label">On Ground</div>
              </div>
              <div className="stat-item clickable" onClick={() => handleStatsClick('altitude')}>
                <div className="stat-value"><AnimatedCounter value={stats.avgAltitude} /> ft</div>
                <div className="stat-label">Avg Altitude</div>
              </div>
              <div className="stat-item clickable" onClick={() => handleStatsClick('speed')}>
                <div className="stat-value"><AnimatedCounter value={stats.avgSpeed} /> kts</div>
                <div className="stat-label">Avg Speed</div>
              </div>
              <div className="stat-item clickable" onClick={() => handleStatsClick('airlines')}>
                <div className="stat-value"><AnimatedCounter value={stats.airlines.size} /></div>
                <div className="stat-label">Airlines</div>
              </div>
            </div>
          </div>

          <div className="sidebar-section emissions-section">
            <h3>🌍 Environmental Impact</h3>
            <div className="emissions-display">
              <div className="emissions-stat">
                <div className="emissions-value">
                  <AnimatedCounter value={stats.totalEmissions} />
                  <span className="emissions-unit"> tons CO₂/hr</span>
                </div>
                <div className="emissions-label">Current Emissions Rate</div>
              </div>
              <div className="emissions-context">
                <div className="context-item">
                  🌳 {Math.round(stats.totalEmissions / 21)} trees needed/year
                </div>
                <div className="context-item">
                  🚗 {(stats.totalEmissions / 0.12).toFixed(0)} km by car
                </div>
                <div className="context-item">
                  ⚡ {(stats.totalEmissions / 20).toFixed(1)} days home energy
                </div>
              </div>
              <div className="emissions-info">
                <small>Based on ICAO methodology</small>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Quick Regions</h3>
            <div className="region-buttons">
              {Object.values(REGIONS).map(region => (
                <button
                  key={region.name}
                  className={`region-btn ${currentRegion?.name === region.name ? 'active' : ''}`}
                  onClick={() => switchRegion(region)}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Map Layers</h3>
            <div className="layer-controls">
              <label className="layer-option">
                <input
                  type="radio"
                  name="mapLayer"
                  value="default"
                  checked={mapLayer === 'default'}
                  onChange={(e) => setMapLayer(e.target.value)}
                />
                <span>Default</span>
              </label>
              <label className="layer-option">
                <input
                  type="radio"
                  name="mapLayer"
                  value="satellite"
                  checked={mapLayer === 'satellite'}
                  onChange={(e) => setMapLayer(e.target.value)}
                />
                <span>Satellite</span>
              </label>
              <label className="layer-option">
                <input
                  type="checkbox"
                  checked={showWeather}
                  onChange={(e) => setShowWeather(e.target.checked)}
                />
                <span>Weather</span>
              </label>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Recent Flights</h3>
            <div className="flight-list">
              {filteredFlights.slice(0, 10).map((flight) => {
                const airline = getAirlineInfo(flight.callsign);
                return (
                  <div
                    key={flight.id}
                    className={`flight-item ${selectedFlight?.id === flight.id ? 'selected' : ''}`}
                    onClick={() => handleFlightClick(flight)}
                    style={{ borderLeft: `3px solid ${airline?.color || '#666'}` }}
                  >
                    <div className="flight-item-header">
                      <span className="flight-icon">{airline?.icon || (flight.onGround ? '🛬' : '✈️')}</span>
                      <div className="flight-info">
                        <span className="flight-callsign">{flight.callsign || flight.icao24}</span>
                        {airline && (
                          <span className="airline-name" style={{ fontSize: '11px', opacity: 0.7 }}>
                            {airline.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flight-item-details">
                      <span>{Math.round(flight.position?.altitude || 0).toLocaleString()} ft</span>
                      <span>{Math.round(flight.position?.groundSpeed || 0)} kts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="update-info">
              {lastUpdate && (
                <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
              )}
            </div>
            <div className="data-source">
              Data: OpenSky Network
            </div>
            {userLocation && userLocation.city && (
              <div className="location-info">
                📍 {userLocation.city}, {userLocation.country}
              </div>
            )}
            <div className="legal-links">
              <button 
                className="legal-link" 
                onClick={() => setShowLegal(true)}
              >
                Legal & Privacy
              </button>
              <span className="separator">•</span>
              <span className="company">© 2025 Cien Rios LLC</span>
            </div>
          </div>
        </aside>

        {/* Map Container */}
        <main className="map-container">
          <FinalMap 
            flights={filteredFlights}
            center={mapCenter}
            zoom={mapZoom}
            onFlightClick={handleFlightClick}
            onMapReady={(map) => {
              mapRef.current = map;
              isUserNavigating.current = true;
              
              // Add map move listener
              if (map) {
                map.on('moveend', handleMapMove);
              }
            }}
          />

          {/* Map Controls Overlay - Removed duplicate refresh (already in header) */}

          {/* Selected Flight Panel */}
          {selectedFlight && (
            <div className="flight-detail-panel">
              <button 
                className="panel-close"
                onClick={() => setSelectedFlight(null)}
              >
                ×
              </button>
              <h3>{selectedFlight.callsign || selectedFlight.icao24}</h3>
              <div className="flight-details">
                <div className="detail-row">
                  <span>ICAO:</span>
                  <span>{selectedFlight.icao24}</span>
                </div>
                <div className="detail-row">
                  <span>Altitude:</span>
                  <span>{Math.round(selectedFlight.position?.altitude || 0).toLocaleString()} ft</span>
                </div>
                <div className="detail-row">
                  <span>Speed:</span>
                  <span>{Math.round(selectedFlight.position?.groundSpeed || 0)} kts</span>
                </div>
                <div className="detail-row">
                  <span>Heading:</span>
                  <span>{Math.round(selectedFlight.position?.heading || 0)}°</span>
                </div>
                <div className="detail-row">
                  <span>V/Rate:</span>
                  <span>{Math.round(selectedFlight.position?.verticalRate || 0)} fpm</span>
                </div>
                <div className="detail-row">
                  <span>Origin:</span>
                  <span>{selectedFlight.origin || 'Unknown'}</span>
                </div>
                <div className="detail-row">
                  <span>Status:</span>
                  <span className={selectedFlight.onGround ? 'status-ground' : 'status-air'}>
                    {selectedFlight.onGround ? 'On Ground' : 'In Flight'}
                  </span>
                </div>
                {(() => {
                  const emissionRate = getEmissionRate(selectedFlight);
                  const fuelData = calculateFuelConsumption(selectedFlight);
                  if (emissionRate && fuelData) {
                    return (
                      <>
                        <div className="emissions-divider"></div>
                        <div className="detail-section">
                          <h4>🌍 Environmental Impact</h4>
                          <div className="detail-row">
                            <span>Fuel Flow:</span>
                            <span>{fuelData.instantaneous.toFixed(0)} kg/hr</span>
                          </div>
                          <div className="detail-row">
                            <span>CO₂ Rate:</span>
                            <span>{emissionRate.perHour} kg/hr</span>
                          </div>
                          <div className="detail-row">
                            <span>Phase:</span>
                            <span>{emissionRate.phase}</span>
                          </div>
                          <div className="detail-row">
                            <span>Aircraft:</span>
                            <span>{emissionRate.aircraftClass}</span>
                          </div>
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}

          {/* Statistics Modal */}
          {statsModal && (
            <div className="stats-modal">
              <div className="modal-content">
                <button className="modal-close" onClick={() => setStatsModal(null)}>×</button>
                <h3>{statsModal === 'airlines' ? 'Top Airlines' : 
                     statsModal === 'total' ? 'Flight Statistics' :
                     statsModal === 'inAir' ? 'Airborne Aircraft' :
                     statsModal === 'onGround' ? 'Grounded Aircraft' :
                     statsModal === 'altitude' ? 'Altitude Distribution' :
                     statsModal === 'speed' ? 'Speed Analysis' :
                     'Statistics'}</h3>
                
                <div className="modal-body">
                  {statsModal === 'airlines' && (
                    <div>
                      <h4>Top Airlines by Fleet Count:</h4>
                      {stats.topAirlines.map(([airline, count]) => (
                        <div key={airline} className="stat-bar">
                          <span>{airline}</span>
                          <div className="bar" style={{width: `${(count/stats.totalFlights)*100}%`}}></div>
                          <span>{count} flights</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {statsModal === 'total' && (
                    <div>
                      <p>Total aircraft tracked: {stats.totalFlights}</p>
                      <p>Coverage area: {currentRegion?.name || 'Global'}</p>
                      <p>Last update: {lastUpdate?.toLocaleTimeString()}</p>
                      <h4>By Origin Country:</h4>
                      {stats.topCountries.map(([country, count]) => (
                        <div key={country} className="stat-bar">
                          <span>{country}</span>
                          <div className="bar" style={{width: `${(count/stats.totalFlights)*100}%`}}></div>
                          <span>{count} flights</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {(statsModal === 'inAir' || statsModal === 'onGround') && (
                    <div>
                      <p>{statsModal === 'inAir' ? 'Airborne' : 'Grounded'}: {statsModal === 'inAir' ? stats.inAir : stats.onGround} aircraft</p>
                      <p>Percentage: {((statsModal === 'inAir' ? stats.inAir : stats.onGround) / stats.totalFlights * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  
                  {statsModal === 'altitude' && (
                    <div>
                      <p>Average altitude: {stats.avgAltitude.toLocaleString()} ft</p>
                      <p>Typical cruise altitude: 35,000-42,000 ft</p>
                    </div>
                  )}
                  
                  {statsModal === 'speed' && (
                    <div>
                      <p>Average ground speed: {stats.avgSpeed} knots</p>
                      <p>Typical cruise speed: 450-550 knots</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              ⚠️ {error}
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        .region-selector {
          margin-right: 15px;
        }
        
        .region-dropdown {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5da;
          background: white;
          font-size: 14px;
          cursor: pointer;
        }
        
        .dark .region-dropdown {
          background: #242830;
          border-color: #383d47;
          color: #e4e6eb;
        }
        
        .region-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .region-btn {
          padding: 8px 12px;
          border: 1px solid #d1d5da;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .region-btn:hover {
          background: #f6f8fa;
        }
        
        .region-btn.active {
          background: #0366d6;
          color: white;
          border-color: #0366d6;
        }
        
        .dark .region-btn {
          background: #1a1d23;
          border-color: #383d47;
          color: #e4e6eb;
        }
        
        .dark .region-btn:hover {
          background: #383d47;
        }
        
        .stat-item.clickable {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .stat-item.clickable:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .stats-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 70vh;
          overflow-y: auto;
          position: relative;
        }
        
        .dark .modal-content {
          background: #242830;
          color: #e4e6eb;
        }
        
        .modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6a737d;
        }
        
        .modal-body {
          margin-top: 20px;
        }
        
        .stat-bar {
          display: flex;
          align-items: center;
          margin: 10px 0;
          gap: 10px;
        }
        
        .stat-bar .bar {
          height: 20px;
          background: linear-gradient(90deg, #0366d6, #58a6ff);
          border-radius: 4px;
          flex: 1;
        }
        
        .location-info {
          margin-top: 8px;
          font-size: 12px;
          color: #6a737d;
        }
      `}</style>
      
      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      
      {/* Legal Modal */}
      <Legal isOpen={showLegal} onClose={() => setShowLegal(false)} />
      
      {selectedFlightDetails && (
        <FlightDetailsPanel 
          flight={selectedFlightDetails} 
          onClose={() => {
            setSelectedFlightDetails(null);
            setSelectedFlight(null);
          }}
        />
      )}
    </div>
  );
}

export default EnhancedAppV2;