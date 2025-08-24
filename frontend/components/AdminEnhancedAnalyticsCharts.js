// AdminEnhancedAnalyticsCharts.js
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Button } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryLine, VictoryGroup, VictoryLabel, VictoryScatter } from 'victory-native';
import { fetchCohortRetention, fetchChurnPrediction, fetchRealTimeActivity, fetchPremiumAdoption, fetchAlertEffectiveness, fetchAnomalyDays } from '../utils/analyticsEnhanced';

export default function AdminEnhancedAnalyticsCharts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});
  const [weeks, setWeeks] = useState(12);
  const [days, setDays] = useState(30);
  const [annotations, setAnnotations] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCohortRetention(weeks),
      fetchChurnPrediction(),
      fetchRealTimeActivity(),
      fetchPremiumAdoption(),
      fetchAlertEffectiveness(),
      fetchAnomalyDays(days)
    ]).then(([cohort, churn, realtime, premium, alert, anomaly]) => {
      setData({ cohort, churn, realtime, premium, alert, anomaly });
    }).catch(e => setError(e.message || 'Error fetching enhanced analytics'))
      .finally(() => setLoading(false));
  }, [weeks, days]);

  // CSV Export
  function exportCSV(key) {
    const d = data[key] || [];
    if (!d.length) return;
    const header = Object.keys(d[0]).join(',');
    const rows = d.map(row => Object.values(row).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Admin Annotations
  function addAnnotation(chart, text) {
    setAnnotations([...annotations, { chart, text, ts: new Date().toISOString() }]);
  }

  if (loading) return <ActivityIndicator testID="enhanced-analytics-loading" style={{marginTop: 40}} />;
  if (error) return <Text style={{color: 'red', margin: 20}}>{error}</Text>;

  return (
    <ScrollView style={{padding: 10}}>
      {/* Cohort Retention */}
      <View style={{marginBottom: 30, backgroundColor: '#fff', borderRadius: 8, padding: 10}}>
        <Text style={{fontWeight: 'bold', fontSize: 18}}>Cohort Retention</Text>
        <Button title="Export CSV" onPress={() => exportCSV('cohort')} />
        <Button title="Add Annotation" onPress={() => addAnnotation('cohort', prompt('Annotation for Cohort Retention:'))} />
        {renderCohortChart(data.cohort, weeks)}
        {annotations.filter(a => a.chart === 'cohort').map(a => <Text key={a.ts} style={{fontStyle:'italic', color:'#888'}}>{a.text} ({a.ts.slice(0,16)})</Text>)}
      </View>
      {/* Churn Prediction */}
      <View style={{marginBottom: 30, backgroundColor: '#fff', borderRadius: 8, padding: 10}}>
        <Text style={{fontWeight: 'bold', fontSize: 18}}>Churn Prediction</Text>
        <Button title="Export CSV" onPress={() => exportCSV('churn')} />
        <Button title="Add Annotation" onPress={() => addAnnotation('churn', prompt('Annotation for Churn Prediction:'))} />
        {renderChurnChart(data.churn)}
        {annotations.filter(a => a.chart === 'churn').map(a => <Text key={a.ts} style={{fontStyle:'italic', color:'#888'}}>{a.text} ({a.ts.slice(0,16)})</Text>)}
      </View>
      {/* Real-Time Activity */}
      <View style={{marginBottom: 30, backgroundColor: '#fff', borderRadius: 8, padding: 10}}>
        <Text style={{fontWeight: 'bold', fontSize: 18}}>Real-Time Activity</Text>
        {renderRealTime(data.realtime)}
      </View>
      {/* Premium Adoption */}
      <View style={{marginBottom: 30, backgroundColor: '#fff', borderRadius: 8, padding: 10}}>
        <Text style={{fontWeight: 'bold', fontSize: 18}}>Premium Feature Adoption</Text>
        <Button title="Export CSV" onPress={() => exportCSV('premium')} />
        <Button title="Add Annotation" onPress={() => addAnnotation('premium', prompt('Annotation for Premium Adoption:'))} />
        {renderPremiumChart(data.premium)}
        {annotations.filter(a => a.chart === 'premium').map(a => <Text key={a.ts} style={{fontStyle:'italic', color:'#888'}}>{a.text} ({a.ts.slice(0,16)})</Text>)}
      </View>
      {/* Alert Effectiveness */}
      <View style={{marginBottom: 30, backgroundColor: '#fff', borderRadius: 8, padding: 10}}>
        <Text style={{fontWeight: 'bold', fontSize: 18}}>Alert Effectiveness</Text>
        <Button title="Export CSV" onPress={() => exportCSV('alert')} />
        <Button title="Add Annotation" onPress={() => addAnnotation('alert', prompt('Annotation for Alert Effectiveness:'))} />
        {renderAlertChart(data.alert)}
        {annotations.filter(a => a.chart === 'alert').map(a => <Text key={a.ts} style={{fontStyle:'italic', color:'#888'}}>{a.text} ({a.ts.slice(0,16)})</Text>)}
      </View>
      {/* Anomaly Days */}
      <View style={{marginBottom: 30, backgroundColor: '#fff', borderRadius: 8, padding: 10}}>
        <Text style={{fontWeight: 'bold', fontSize: 18}}>Anomaly Days</Text>
        <Button title="Export CSV" onPress={() => exportCSV('anomaly')} />
        <Button title="Add Annotation" onPress={() => addAnnotation('anomaly', prompt('Annotation for Anomaly Days:'))} />
        {renderAnomalyChart(data.anomaly)}
        {annotations.filter(a => a.chart === 'anomaly').map(a => <Text key={a.ts} style={{fontStyle:'italic', color:'#888'}}>{a.text} ({a.ts.slice(0,16)})</Text>)}
      </View>
    </ScrollView>
  );
}

function renderCohortChart(d, weeks) {
  if (!d || !d.length) return <Text>No cohort data</Text>;
  // Group by cohort, show retention by week
  const cohorts = [...new Set(d.map(x => x.cohort))];
  const weeksList = [...new Set(d.map(x => x.active_week))].sort();
  return (
    <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
      <VictoryGroup offset={10} colorScale="qualitative">
        {cohorts.map((c, i) => (
          <VictoryBar key={c} data={weeksList.map(w => {
            const found = d.find(x => x.cohort === c && x.active_week === w);
            return { week: w, count: found ? found.count : 0 };
          })} x="week" y="count" labels={({ datum }) => datum.count} />
        ))}
      </VictoryGroup>
      <VictoryAxis tickFormat={w => w.slice(5)} label="Week"/>
      <VictoryAxis dependentAxis label="Users"/>
    </VictoryChart>
  );
}

function renderChurnChart(d) {
  if (!d || !d.length) return <Text>No churn data</Text>;
  return (
    <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
      <VictoryBar data={d} x="plan" y="churn_risk" labels={({ datum }) => `${Math.round(datum.churn_risk * 100)}%`} />
      <VictoryAxis label="Plan"/>
      <VictoryAxis dependentAxis label="Churn Risk" tickFormat={t => `${Math.round(t*100)}%`}/>
    </VictoryChart>
  );
}

function renderRealTime(d) {
  if (!d) return <Text>No real-time data</Text>;
  return (
    <View style={{flexDirection:'row', justifyContent:'space-around', marginVertical:10}}>
      <Text>Active Users: {d.active_users}</Text>
      <Text>Active Flights: {d.active_flights}</Text>
    </View>
  );
}

function renderPremiumChart(d) {
  if (!d || !d.length) return <Text>No premium adoption data</Text>;
  // Group by plan, show feature usage
  const plans = [...new Set(d.map(x => x.plan))];
  const features = [...new Set(d.map(x => x.feature))];
  return (
    <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
      <VictoryGroup offset={10} colorScale="qualitative">
        {features.map((f, i) => (
          <VictoryBar key={f} data={plans.map(p => {
            const found = d.find(x => x.plan === p && x.feature === f);
            return { plan: p, uses: found ? found.uses : 0 };
          })} x="plan" y="uses" labels={({ datum }) => datum.uses} />
        ))}
      </VictoryGroup>
      <VictoryAxis label="Plan"/>
      <VictoryAxis dependentAxis label="Uses"/>
    </VictoryChart>
  );
}

function renderAlertChart(d) {
  if (!d || !d.length) return <Text>No alert effectiveness data</Text>;
  return (
    <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
      <VictoryBar data={d} x="type" y="opened" labels={({ datum }) => `Opened: ${datum.opened}`}/>
      <VictoryBar data={d} x="type" y="clicked" labels={({ datum }) => `Clicked: ${datum.clicked}`}/>
      <VictoryAxis label="Type"/>
      <VictoryAxis dependentAxis label="Count"/>
    </VictoryChart>
  );
}

function renderAnomalyChart(d) {
  if (!d || !d.length) return <Text>No anomaly data</Text>;
  return (
    <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
      <VictoryScatter data={d} x="day" y="delays" labels={({ datum }) => datum.delays} size={5} />
      <VictoryAxis label="Day"/>
      <VictoryAxis dependentAxis label="Delays"/>
    </VictoryChart>
  );
}
