import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import MainMap from '../components/MainMap';
import { fetchLiveAircraft } from '../utils/api';

export default function MapScreen() {
  const [aircraft, setAircraft] = useState([]);

  useEffect(() => {
    fetchLiveAircraft().then(setAircraft);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <MainMap aircraft={aircraft} />
    </View>
  );
}
