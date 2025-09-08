import React, { useState } from 'react';
import FlightMap from './components/Map/FlightMap';
// Temporarily disable Supabase to test deployment
// import { SubscriptionProvider } from './contexts/SubscriptionContext';
// import { SupabaseProvider } from './contexts/SupabaseContext';
// import SupabaseTest from './components/SupabaseTest';
// import AuthTest from './components/AuthTest';

function App() {
  // Mock flight data compatible with the new FlightMap component
  const [flights] = useState([
    {
      id: '1',
      callsign: 'BA123',
      registration: 'G-EUUU',
      icao24: '400001',
      position: {
        latitude: 51.5,
        longitude: -0.1,
        altitude: 35000,
        heading: 90,
        groundSpeed: 500,
        verticalRate: 0
      },
      status: 'EN_ROUTE',
      aircraft: {
        registration: 'G-EUUU',
        icaoTypeCode: 'A320',
        model: 'Airbus A320-200'
      }
    },
    {
      id: '2', 
      callsign: 'AF456',
      registration: 'F-HBNK',
      icao24: '400002',
      position: {
        latitude: 51.6,
        longitude: 0.1,
        altitude: 32000,
        heading: 180,
        groundSpeed: 480,
        verticalRate: 0
      },
      status: 'EN_ROUTE',
      aircraft: {
        registration: 'F-HBNK',
        icaoTypeCode: 'A319',
        model: 'Airbus A319-100'
      }
    },
    {
      id: '3',
      callsign: 'DL789',
      registration: 'N123DL',
      icao24: '400003',
      position: {
        latitude: 51.4,
        longitude: -0.3,
        altitude: 38000,
        heading: 270,
        groundSpeed: 520,
        verticalRate: 0
      },
      status: 'EN_ROUTE',
      aircraft: {
        registration: 'N123DL',
        icaoTypeCode: 'B763',
        model: 'Boeing 767-300'
      }
    }
  ]);

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
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
          ✈️ Flight Tracker - Deployment Successful!
        </h1>
        <p style={{ margin: '5px 0 0 0', color: '#666' }}>
          Showing {flights.length} mock flights over London
        </p>
      </div>
      <FlightMap 
        flights={flights}
        center={[-0.118092, 51.509865]}
        zoom={5}
      />
    </div>
  );
}

export default App;