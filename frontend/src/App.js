import React, { useState } from 'react';
import FlightMap from './components/Map/FlightMap';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { SupabaseProvider } from './contexts/SupabaseContext';
import SupabaseTest from './components/SupabaseTest';
import AuthTest from './components/AuthTest';

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
      callsign: 'LH789',
      registration: 'D-AIQF',
      icao24: '400003',
      position: {
        latitude: 51.4,
        longitude: -0.3,
        altitude: 34000,
        heading: 270,
        groundSpeed: 510,
        verticalRate: 0
      },
      status: 'EN_ROUTE',
      aircraft: {
        registration: 'D-AIQF',
        icaoTypeCode: 'A320',
        model: 'Airbus A320-200'
      }
    }
  ]);

  return (
    <SupabaseProvider>
      <SubscriptionProvider>
        <div style={{ width: '100%', height: '100vh' }}>
          <SupabaseTest />
          <AuthTest />
          <FlightMap 
            flights={flights}
            center={[-0.118092, 51.509865]}
            zoom={5}
          />
        </div>
      </SubscriptionProvider>
    </SupabaseProvider>
  );
}

export default App;