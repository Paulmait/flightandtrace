import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { fetchAuditLog } from '../utils/api';

export default function AdminAuditLog() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLog = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLog();
      setLog(data);
    } catch {
      setLog([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadLog(); }, []);

  const handleExport = () => {
    const csv = 'action,user,ts\n' + log.map(l => `${l.action || ''},${l.user || ''},${l.ts}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit_log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <View style={styles.container}>
      <Button title="Refresh Log" onPress={loadLog} />
      <Button title="Export CSV" onPress={handleExport} />
      <ScrollView style={styles.log}>
        {loading ? <Text>Loading...</Text> : log.map((l, i) => (
          <Text key={i} style={styles.entry}>{JSON.stringify(l)}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  log: { maxHeight: 200, marginTop: 8 },
  entry: { fontSize: 12, color: '#333', marginBottom: 2 },
});
