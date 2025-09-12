import React, { useState, useEffect, useCallback } from 'react';
import FinalMap from './Map/FinalMap.jsx';
import { getOptimalLocation, calculateBoundingBox } from '../utils/locationService';
import './EnhancedApp.css';

function EnhancedApp() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [mapCenter, setMapCenter] = useState([10, 50]);
  const [mapZoom, setMapZoom] = useState(4); // Start zoomed out more to see more flights
  const [userLocation, setUserLocation] = useState(null); // eslint-disable-line no-unused-vars
  const [boundingBox, setBoundingBox] = useState(null); // Let API use its large default
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mapLayer, setMapLayer] = useState('default');
  const [showWeather, setShowWeather] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Statistics
  const [stats, setStats] = useState({
    totalFlights: 0,
    inAir: 0,
    onGround: 0,
    avgAltitude: 0,
    avgSpeed: 0,
    airlines: new Set(),
    countries: new Set()
  });

  // Fetch flights
  const fetchFlights = useCallback(async (bbox) => {
    const bboxToUse = bbox || boundingBox || '';
    
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

  // Update statistics
  const updateStatistics = (flightData) => {
    const inAir = flightData.filter(f => !f.onGround).length;
    const onGround = flightData.filter(f => f.onGround).length;
    const avgAlt = flightData.reduce((sum, f) => sum + (f.position?.altitude || 0), 0) / (flightData.length || 1);
    const avgSpd = flightData.reduce((sum, f) => sum + (f.position?.groundSpeed || 0), 0) / (flightData.length || 1);
    const airlines = new Set(flightData.map(f => f.callsign?.substring(0, 3)).filter(Boolean));
    const countries = new Set(flightData.map(f => f.origin).filter(Boolean));

    setStats({
      totalFlights: flightData.length,
      inAir,
      onGround,
      avgAltitude: Math.round(avgAlt),
      avgSpeed: Math.round(avgSpd),
      airlines,
      countries
    });
  };

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

  // Get location on mount
  useEffect(() => {
    async function initLocation() {
      try {
        const location = await getOptimalLocation();
        setUserLocation(location);
        
        if (location && location.coords) {
          const bbox = calculateBoundingBox(location.coords.latitude, location.coords.longitude, 500);
          setBoundingBox(bbox);
          setMapCenter([location.coords.longitude, location.coords.latitude]);
          setMapZoom(7);
        }
      } catch (err) {
        console.error('Location error:', err);
      }
    }
    
    initLocation();
  }, []);

  // Fetch flights on mount and refresh
  useEffect(() => {
    fetchFlights();
    
    if (autoRefresh) {
      const interval = setInterval(fetchFlights, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchFlights, autoRefresh]);

  // Toggle dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const handleFlightClick = (flight) => {
    setSelectedFlight(flight);
    if (flight.position) {
      setMapCenter([flight.position.longitude, flight.position.latitude]);
      setMapZoom(10);
    }
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
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-section">
            <h3>Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{stats.totalFlights}</div>
                <div className="stat-label">Total Aircraft</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.inAir}</div>
                <div className="stat-label">In Flight</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.onGround}</div>
                <div className="stat-label">On Ground</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.avgAltitude.toLocaleString()} ft</div>
                <div className="stat-label">Avg Altitude</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.avgSpeed} kts</div>
                <div className="stat-label">Avg Speed</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.airlines.size}</div>
                <div className="stat-label">Airlines</div>
              </div>
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
              {filteredFlights.slice(0, 10).map((flight) => (
                <div
                  key={flight.id}
                  className={`flight-item ${selectedFlight?.id === flight.id ? 'selected' : ''}`}
                  onClick={() => handleFlightClick(flight)}
                >
                  <div className="flight-item-header">
                    <span className="flight-icon">{flight.onGround ? '🛬' : '✈️'}</span>
                    <span className="flight-callsign">{flight.callsign || flight.icao24}</span>
                  </div>
                  <div className="flight-item-details">
                    <span>{Math.round(flight.position?.altitude || 0).toLocaleString()} ft</span>
                    <span>{Math.round(flight.position?.groundSpeed || 0)} kts</span>
                  </div>
                </div>
              ))}
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
          </div>
        </aside>

        {/* Map Container */}
        <main className="map-container">
          <FinalMap 
            flights={filteredFlights}
            center={mapCenter}
            zoom={mapZoom}
          />

          {/* Map Controls Overlay */}
          <div className="map-controls">
            <button 
              className="map-control-btn"
              onClick={() => fetchFlights()}
              title="Refresh flights"
            >
              ⟳
            </button>
            <button 
              className="map-control-btn"
              onClick={() => setMapZoom(mapZoom + 1)}
              title="Zoom in"
            >
              +
            </button>
            <button 
              className="map-control-btn"
              onClick={() => setMapZoom(mapZoom - 1)}
              title="Zoom out"
            >
              −
            </button>
          </div>

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
    </div>
  );
}

export default EnhancedApp;