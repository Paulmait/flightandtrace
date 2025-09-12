import React, { useState, useEffect, useCallback } from 'react';
import WorkingMap from './components/Map/WorkingMap.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import CookieConsent from './components/GDPR/CookieConsent.jsx';
import { AuthProvider } from './contexts/AuthContext';
import { getOptimalLocation, calculateBoundingBox, getRegionDefaults } from './utils/locationService';

function App() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [mapCenter, setMapCenter] = useState([10, 50]); // Default center
  const [mapZoom, setMapZoom] = useState(5);
  const [userLocation, setUserLocation] = useState(null);
  const [boundingBox, setBoundingBox] = useState('-20,35,30,65'); // Default Europe

  // Fetch live flights
  const fetchFlights = useCallback(async (bbox) => {
    const bboxToUse = bbox || boundingBox;
    if (!bboxToUse) return; // Don't fetch if no bounding box
    
    try {
      setLoading(true);
      // Use the Vercel API endpoint with dynamic bounding box
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? `http://localhost:3000/api/flights?bbox=${bboxToUse}`
        : `/api/flights?bbox=${bboxToUse}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.flights) {
        setFlights(data.flights);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch flights');
      }
    } catch (err) {
      console.error('Error fetching flights:', err);
      console.error('Full error details:', err);
      setError(err.message);
      // Don't set mock data - keep flights empty on error
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }, [boundingBox]);

  // Initialize user location
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const location = await getOptimalLocation();
        setUserLocation(location);
        
        // Calculate bounding box for user's area
        const regionDefaults = getRegionDefaults(location.latitude, location.longitude);
        const box = calculateBoundingBox(location.latitude, location.longitude, regionDefaults.radius);
        const bboxString = `${box.minLon},${box.minLat},${box.maxLon},${box.maxLat}`;
        
        setBoundingBox(bboxString);
        setMapCenter([location.longitude, location.latitude]);
        setMapZoom(regionDefaults.zoom);
        
        // Fetch flights for user's area
        fetchFlights(bboxString);
      } catch (error) {
        console.error('Location initialization failed:', error);
        // Use default and fetch flights
        fetchFlights();
      }
    };
    
    initializeLocation();
  }, [fetchFlights]);

  // Set up refresh interval
  useEffect(() => {
    if (!boundingBox) return;
    
    const interval = setInterval(() => fetchFlights(boundingBox), 30000);
    return () => clearInterval(interval);
  }, [boundingBox, fetchFlights]);

  // Show loading screen for initial load
  if (loading && !flights.length && !error) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
        background: 'white',
        padding: '10px 20px',
        borderRadius: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '400px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <img src="/logo192.png" alt="Flight and Trace" style={{ width: '32px', height: '32px' }} />
          <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
            Flight and Trace
          </h1>
        </div>
        
        {loading && flights.length > 0 ? (
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>
            Updating...
          </p>
        ) : error ? (
          <div>
            <p style={{ margin: '5px 0 0 0', color: '#e74c3c' }}>
              ⚠️ {error}
            </p>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '12px' }}>
              Unable to load flight data. Please try again.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ margin: '5px 0 0 0', color: '#27ae60', fontWeight: 'bold' }}>
              🟢 LIVE - {flights.length} aircraft tracked
            </p>
            {lastUpdate && (
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '12px' }}>
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
        
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
          Data: OpenSky Network | Updates: 30s
          {userLocation && userLocation.city && (
            <span> | Location: {userLocation.city}</span>
          )}
          {userLocation && (
            <span> | {userLocation.source === 'geolocation' ? '📍' : '🌐'}</span>
          )}
        </div>
        
      </div>
      
      <WorkingMap 
        flights={flights}
        center={mapCenter}
        zoom={mapZoom}
      />
      
      <CookieConsent />
    </div>
    </AuthProvider>
  );
}

export default App;