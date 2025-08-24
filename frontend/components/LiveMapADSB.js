// LiveMapADSB.js - Live aircraft map using ADS-B data
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { fetchLiveADSB } from '../utils/aviationData';

export default function LiveMapADSB() {
  const [region, setRegion] = useState(null);
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 1,
        longitudeDelta: 1,
      });
      try {
        const data = await fetchLiveADSB(loc.coords.latitude, loc.coords.longitude);
        setAircraft(data.states || []);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>{error}</Text>;
  if (!region) return <Text>Locating...</Text>;

  return (
    <MapView style={{ flex: 1 }} region={region}>
      {aircraft.map((a, i) => (
        <Marker
          key={i}
          coordinate={{ latitude: a[6], longitude: a[5] }}
          title={a[1] || 'Aircraft'}
          description={`Altitude: ${a[7]} ft`}
        />
      ))}
    </MapView>
  );
}
