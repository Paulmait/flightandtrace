import React from 'react';
import { View, Text, Button } from 'react-native';
import DelayPredictionDisplay from './DelayPredictionDisplay';

export default function FlightDetailTimeline({ timeline, onReplay, flight }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Flight Timeline</Text>
      {timeline && timeline.length ? (
        timeline.map((event, idx) => (
          <View key={idx} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold' }}>{event.status}</Text>
            <Text>{event.time_local} ({event.time_utc} UTC)</Text>
            <Text>{event.details}</Text>
          </View>
        ))
      ) : (
        <Text>No timeline data available.</Text>
      )}
      <DelayPredictionDisplay flight={flight} />
      <Button title="Replay Flight" onPress={onReplay} />
    </View>
  );
}
