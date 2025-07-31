import React from 'react';
import { View, Text, ScrollView } from 'react-native';

// Example analytics data
const analyticsData = {
  flightFrequency: [
    { tail: 'N12345', count: 12 },
    { tail: 'N67890', count: 8 },
  ],
  delays: [
    { tail: 'N12345', delays: 2 },
    { tail: 'N67890', delays: 1 },
  ],
  patterns: [
    { tail: 'N12345', pattern: 'Morning flights' },
    { tail: 'N67890', pattern: 'Weekend flights' },
  ],
};

export default function AnalyticsScreen() {
  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Flight Analytics</Text>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>Flight Frequency:</Text>
      {analyticsData.flightFrequency.map((item, idx) => (
        <Text key={idx}>{item.tail}: {item.count} flights</Text>
      ))}
      <Text style={{ fontSize: 18, marginTop: 16, marginBottom: 8 }}>Delays:</Text>
      {analyticsData.delays.map((item, idx) => (
        <Text key={idx}>{item.tail}: {item.delays} delays</Text>
      ))}
      <Text style={{ fontSize: 18, marginTop: 16, marginBottom: 8 }}>Patterns:</Text>
      {analyticsData.patterns.map((item, idx) => (
        <Text key={idx}>{item.tail}: {item.pattern}</Text>
      ))}
    </ScrollView>
  );
}
