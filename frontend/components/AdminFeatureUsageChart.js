// AdminFeatureUsageChart.js
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';
import { fetchFeatureUsage } from '../utils/adminAnalytics';

export default function AdminFeatureUsageChart({ userId, days = 30 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchFeatureUsage(userId)
      .then(res => {
        // Aggregate by feature
        const counts = {};
        res.forEach(e => {
          const f = e.feature || 'unknown';
          counts[f] = (counts[f] || 0) + 1;
        });
        setData(Object.entries(counts).map(([feature, count]) => ({ feature, count })));
      })
      .catch(e => setError(e.message || 'Error fetching feature usage'))
      .finally(() => setLoading(false));
  }, [userId, days]);

  if (loading) return <ActivityIndicator testID="feature-usage-loading" style={{marginTop: 20}} />;
  if (error) return <Text style={{color: 'red', margin: 10}}>{error}</Text>;
  if (!data.length) return <Text style={{margin: 10}}>No feature usage data</Text>;

  return (
    <View style={{marginVertical: 10}}>
      <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 6}}>Feature Usage (last {days} days)</Text>
      <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
        <VictoryAxis tickFormat={t => t} label="Feature"/>
        <VictoryAxis dependentAxis label="Count"/>
        <VictoryBar data={data} x="feature" y="count" style={{data: {fill: '#4f8ef7'}}}/>
      </VictoryChart>
    </View>
  );
}
