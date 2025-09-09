import React, { useState, useEffect } from 'react';
import FlightMap from './components/Map/FlightMap';

function App() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch live flights
  const fetchFlights = async () => {
    try {
      setLoading(true);
      // Use the Vercel API endpoint
      const response = await fetch('/api/flights?bbox=-10,45,5,55'); // UK/Ireland area
      
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
      setError(err.message);
      
      // Use mock data as fallback
      setFlights([
        {
          id: '1',
          callsign: 'MOCK001',
          registration: 'G-DEMO',
          icao24: '400001',
          position: {
            latitude: 51.5,
            longitude: -0.1,
            altitude: 35000,
            heading: 90,
            groundSpeed: 500,
            verticalRate: 0
          },
          status: 'EN_ROUTE'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch flights immediately
    fetchFlights();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchFlights, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
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
        <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
          ✈️ Flight Tracker
        </h1>
        
        {loading && !flights.length ? (
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>
            Loading live flights...
          </p>
        ) : error ? (
          <div>
            <p style={{ margin: '5px 0 0 0', color: '#e74c3c' }}>
              ⚠️ {error}
            </p>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '12px' }}>
              Showing mock data. Check console for details.
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
        </div>
      </div>
      
      <FlightMap 
        flights={flights}
        center={[-0.118092, 51.509865]} // London
        zoom={6}
      />
    </div>
  );
}

export default App;