import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MainMap({ aircraft = [] }) {
  return (
    <View style={styles.container}>
      <MapView style={styles.map}>
        {aircraft.map((plane) => (
          <Marker
            key={plane.id}
            coordinate={{ latitude: plane.lat, longitude: plane.lon }}
            title={plane.tail_number}
            description={plane.status}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 }
});
