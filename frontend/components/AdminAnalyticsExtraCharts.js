// AdminAnalyticsExtraCharts.js
// Visualizes advanced analytics: airport congestion, route trends, alert response times, weather impact, fleet utilization, user engagement, subscription analytics
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, ActivityIndicator } from 'react-native';
import { VictoryChart, VictoryBar, VictoryLine, VictoryAxis, VictoryTheme, VictoryLabel, VictoryPie } from 'victory-native';
import axios from 'axios';

const endpoints = [
  { key: 'airport-congestion', label: 'Airport Congestion' },
  { key: 'route-trends', label: 'Route Trends' },
  { key: 'alert-response-times', label: 'Alert Response Times' },
  { key: 'weather-impact', label: 'Weather Impact' },
  { key: 'fleet-utilization', label: 'Fleet Utilization' },
  { key: 'user-engagement', label: 'User Engagement' },
  { key: 'subscription', label: 'Subscription Analytics' },
];

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/analytics-extra';

const chartColors = ["#4f8ef7", "#f78e4f", "#4ff7a2", "#f74f8e", "#8e4ff7", "#f7e24f", "#4ff7e2"];

export default function AdminAnalyticsExtraCharts() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          endpoints.map(e => axios.get(`${API_BASE}/${e.key}`))
        );
        const d = {};
        endpoints.forEach((e, i) => { d[e.key] = results[i].data; });
        setData(d);
      } catch (err) {
        setError(err.message || 'Error fetching analytics');
      }
      setLoading(false);
    }
    fetchAll();
  }, []);

  if (loading) return <ActivityIndicator testID="analytics-loading" size="large" color="#4f8ef7" style={{marginTop: 40}} />;
  if (error) return <Text style={{color: 'red', margin: 20}}>{error}</Text>;

  return (
    <ScrollView style={{padding: 10}}>
      {endpoints.map((e, idx) => (
        <View key={e.key} style={{marginBottom: 30, backgroundColor: '#fff', borderRadius: 8, padding: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4}}>
          <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 8}}>{e.label}</Text>
          {renderChart(e.key, data[e.key], idx)}
        </View>
      ))}
    </ScrollView>
  );
}

function renderChart(key, d, idx) {
  if (!d || d.length === 0) return <Text>No data</Text>;
  switch (key) {
    case 'airport-congestion':
      return (
        <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
          <VictoryAxis tickFormat={t => t} label="Hour"/>
          <VictoryAxis dependentAxis label="Flights"/>
          <VictoryBar data={d} x="hour" y="count" style={{data: {fill: chartColors[idx % chartColors.length]}}} />
        </VictoryChart>
      );
    case 'route-trends':
      return (
        <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
          <VictoryAxis tickFormat={t => t} label="Route"/>
          <VictoryAxis dependentAxis label="Flights"/>
          <VictoryBar data={d} x="route" y="flights" style={{data: {fill: chartColors[idx % chartColors.length]}}} labels={({datum}) => `${Math.round(datum.avg_minutes)}m`} labelComponent={<VictoryLabel angle={-45}/>}/>
        </VictoryChart>
      );
    case 'alert-response-times':
      return (
        <VictoryChart theme={VictoryTheme.material}>
          <VictoryAxis label="Event"/>
          <VictoryAxis dependentAxis label="Response (s)"/>
          <VictoryLine data={d} x="event_id" y="response_sec" style={{data: {stroke: chartColors[idx % chartColors.length]}}}/>
        </VictoryChart>
      );
    case 'weather-impact':
      return (
        <VictoryPie data={d} x="weather_code" y="delays" colorScale={chartColors} labels={({datum}) => `${datum.weather_code}: ${datum.delays}`}/>
      );
    case 'fleet-utilization':
      return (
        <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
          <VictoryAxis tickFormat={t => t} label="Tail"/>
          <VictoryAxis dependentAxis label="Flights"/>
          <VictoryBar data={d} x="tail" y="flights" style={{data: {fill: chartColors[idx % chartColors.length]}}}/>
        </VictoryChart>
      );
    case 'user-engagement':
      return (
        <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
          <VictoryAxis tickFormat={t => t} label="User"/>
          <VictoryAxis dependentAxis label="Actions"/>
          <VictoryBar data={d} x="user_id" y="actions" style={{data: {fill: chartColors[idx % chartColors.length]}}}/>
        </VictoryChart>
      );
    case 'subscription':
      return (
        <VictoryPie data={d} x="plan" y="users" colorScale={chartColors} labels={({datum}) => `${datum.plan}: ${datum.users}`}/>
      );
    default:
      return <Text>Unknown chart</Text>;
  }
}
