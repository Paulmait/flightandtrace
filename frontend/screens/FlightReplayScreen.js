import React from 'react';
import { View, Text, Button } from 'react-native';

export default function FlightReplayScreen({ userPlan, navigation, flightData }) {
  if (userPlan === 'Free') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 20, marginBottom: 16 }}>Flight Replay is a Premium feature.</Text>
        <Button title="Upgrade to Premium" onPress={() => navigation.navigate('ProFeatures')} />
      </View>
    );
  }
  // Example timeline UI
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Flight Replay Timeline</Text>
      {flightData && flightData.timeline ? (
        flightData.timeline.map((event, idx) => (
          <View key={idx} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold' }}>{event.status}</Text>
            <Text>{event.time_local} ({event.time_utc} UTC)</Text>
            <Text>{event.details}</Text>
          </View>
        ))
      ) : (
        <Text>No timeline data available.</Text>
      )}
      <Button title="Replay Animation" onPress={() => {/* Animate flight path */}} />
      <Button title="Share Replay" onPress={() => {/* Share logic */}} />
    </View>
  );
}
