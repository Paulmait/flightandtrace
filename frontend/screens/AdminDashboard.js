import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import AdminAuditLog from '../components/AdminAuditLog';
import { LineChart } from 'react-native-chart-kit';
import { responsiveSize, responsivePadding } from '../styles/responsive';
import AdminLogin from '../components/AdminLogin';
import AdminTimeout from '../components/AdminTimeout';
import AdminUserManagement from '../components/AdminUserManagement';
import { fetchAnalytics } from '../utils/api';
import AdminAnalyticsCharts from '../components/AdminAnalyticsCharts';
import AdminAnalyticsExtraCharts from '../components/AdminAnalyticsExtraCharts';
import AdminFeatureUsageChart from '../components/AdminFeatureUsageChart';
import AdminLoginEventsChart from '../components/AdminLoginEventsChart';
import AdminEnhancedAnalyticsCharts from '../components/AdminEnhancedAnalyticsCharts';

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    if (admin) {
      setLoading(true);
      fetchAnalytics('admin-token')
        .then(data => { setAnalytics(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [admin]);

  if (!admin || timedOut) {
    return <AdminLogin onLogin={a => { setAdmin(a); setTimedOut(false); }} />;
  }

  return (
    <AdminTimeout timeout={900} onTimeout={() => { setAdmin(null); setTimedOut(true); }}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Admin & Funding Analytics</Text>
        <Button title="Refresh Analytics" onPress={() => {
          setLoading(true);
          fetchAnalytics('admin-token').then(data => { setAnalytics(data); setLoading(false); });
        }} />
        <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 8}}>
          <Text style={{marginRight: 8}}>Date Range:</Text>
          {[7, 30, 90].map(d => (
            <Button key={d} title={`${d}d`} onPress={() => setDateRange(d)} color={dateRange === d ? '#0099ff' : '#ccc'} />
          ))}
        </View>
        <AdminUserManagement
          onResetUser={username => {/* wire to backend */}}
          onResetAdmin={(oldPass, newPass) => {/* wire to backend */}}
        />
        {loading ? <Text style={{ color: '#0099ff', margin: 12 }}>Loading analytics...</Text> : null}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Metrics</Text>
          <Text>Total Users: {analytics?.totalUsers ?? '...'}</Text>
          <Text>Premium Users: {analytics?.premiumUsers ?? '...'}</Text>
          <Text>Active Users (24h): {analytics?.activeUsers ?? '...'}</Text>
          <Text>Churn Rate: {analytics?.churnRate ?? '...'}%</Text>
          {analytics?.userHistory && (
            <LineChart
              data={{
                labels: analytics.userHistory.labels,
                datasets: [{ data: analytics.userHistory.data }],
              }}
              width={320}
              height={180}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#f7f7f7',
                backgroundGradientTo: '#e0f7fa',
                color: () => '#0099ff',
                labelColor: () => '#333',
              }}
              style={{ marginVertical: 8, borderRadius: 8 }}
            />
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue</Text>
          <Text>MRR: ${analytics?.mrr ?? '...'}</Text>
          <Text>ARR: ${analytics?.arr ?? '...'}</Text>
          <Text>ARPU: ${analytics?.arpu ?? '...'}</Text>
          <Text>Lifetime Value: ${analytics?.ltv ?? '...'}</Text>
          {analytics?.revenueHistory && (
            <LineChart
              data={{
                labels: analytics.revenueHistory.labels,
                datasets: [{ data: analytics.revenueHistory.data }],
              }}
              width={320}
              height={180}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#f7f7f7',
                backgroundGradientTo: '#e0f7fa',
                color: () => '#ff9900',
                labelColor: () => '#333',
              }}
              style={{ marginVertical: 8, borderRadius: 8 }}
            />
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Activity</Text>
          <Text>Flights Tracked (24h): {analytics?.flights24h ?? '...'}</Text>
          <Text>Notifications Sent (24h): {analytics?.notifications24h ?? '...'}</Text>
          <Text>Delays Predicted: {analytics?.delaysPredicted ?? '...'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Funding KPIs</Text>
          <Text>Burn Rate: ${analytics?.burnRate ?? '...'}</Text>
          <Text>Runway: {analytics?.runway ?? '...'} months</Text>
          <Text>Conversion Rate: {analytics?.conversionRate ?? '...'}%</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Usage</Text>
          <AdminFeatureUsageChart days={dateRange} />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Login Events</Text>
          <AdminLoginEventsChart days={dateRange} />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Analytics</Text>
          <AdminAnalyticsCharts />
          <AdminAnalyticsExtraCharts />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enhanced Analytics</Text>
          <AdminEnhancedAnalyticsCharts />
        </View>
        <AdminAuditLog />
      </ScrollView>
    </AdminTimeout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: responsivePadding(),
  },
  title: {
    fontSize: responsiveSize(24, 32, 40),
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#0099ff',
  },
  section: {
    marginBottom: 32,
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: responsiveSize(16, 20, 24),
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
});
