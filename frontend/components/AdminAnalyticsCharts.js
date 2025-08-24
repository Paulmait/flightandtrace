// AdminAnalyticsCharts.js - Visualize advanced analytics endpoints
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function fetchAnalyticsEndpoint(endpoint) {
  const res = await fetch(`${API_BASE}/analytics/${endpoint}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export default function AdminAnalyticsCharts() {
  const [flightFreq, setFlightFreq] = useState(null);
  const [delays, setDelays] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, d, p] = await Promise.all([
          fetchAnalyticsEndpoint('flight-frequency'),
          fetchAnalyticsEndpoint('delays'),
          fetchAnalyticsEndpoint('patterns')
        ]);
        setFlightFreq(f);
        setDelays(d);
        setPatterns(p);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>{error}</Text>;

  return (
    <ScrollView style={{ padding: 12 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Flight Frequency (last 30 days)</Text>
      {flightFreq && (
        <BarChart
          data={{
            labels: flightFreq.map(f => f.tail),
            datasets: [{ data: flightFreq.map(f => f.count) }],
          }}
          width={320}
          height={180}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#f7f7f7',
            backgroundGradientTo: '#e0f7fa',
            color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
          }}
        />
      )}
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginTop: 16 }}>Delays (last 30 days)</Text>
      {delays && (
        <BarChart
          data={{
            labels: delays.map(d => d.tail),
            datasets: [{ data: delays.map(d => d.delays) }],
          }}
          width={320}
          height={180}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#f7f7f7',
            backgroundGradientTo: '#e0f7fa',
            color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
          }}
        />
      )}
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginTop: 16 }}>Flight Patterns (by weekday)</Text>
      {patterns && Object.keys(patterns).map(tail => (
        <View key={tail} style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: 'bold' }}>{tail}</Text>
          <LineChart
            data={{
              labels: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
              datasets: [{ data: [0,1,2,3,4,5,6].map(w => patterns[tail][w] || 0) }],
            }}
            width={320}
            height={120}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#f7f7f7',
              backgroundGradientTo: '#e0f7fa',
              color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
}
