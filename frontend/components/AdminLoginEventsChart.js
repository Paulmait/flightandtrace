// AdminLoginEventsChart.js
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';
import { fetchLoginEvents } from '../utils/adminAnalytics';

export default function AdminLoginEventsChart({ days = 30 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchLoginEvents()
      .then(res => {
        // Aggregate by day
        const counts = {};
        res.forEach(e => {
          const day = (e.timestamp || '').slice(0, 10);
          counts[day] = (counts[day] || 0) + 1;
        });
        setData(Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)));
      })
      .catch(e => setError(e.message || 'Error fetching login events'))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <ActivityIndicator testID="login-events-loading" style={{marginTop: 20}} />;
  if (error) return <Text style={{color: 'red', margin: 10}}>{error}</Text>;
  if (!data.length) return <Text style={{margin: 10}}>No login events data</Text>;

  return (
    <View style={{marginVertical: 10}}>
      <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 6}}>Login Events (last {days} days)</Text>
      <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
        <VictoryAxis tickFormat={t => t.slice(5)} label="Date"/>
        <VictoryAxis dependentAxis label="Logins"/>
        <VictoryBar data={data} x="date" y="count" style={{data: {fill: '#f78e4f'}}}/>
      </VictoryChart>
    </View>
  );
}
