import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { responsiveSize, responsivePadding } from '../styles/responsive';

export default function NotificationCenterWidget({ notifications }) {
  if (!notifications || notifications.length === 0) return null;
  return (
    <View style={[styles.container, { padding: responsivePadding() }] }>
      <Text style={[styles.title, { fontSize: responsiveSize(16, 20, 24) }]}>Notifications</Text>
      <ScrollView style={styles.scroll}>
        {notifications.map((n, i) => (
          <View key={i} style={styles.notification}>
            <Text style={styles.message}>{n.message}</Text>
            <Text style={styles.time}>{n.time}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7f7f7',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    margin: 12,
    maxHeight: 320,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0099ff',
  },
  scroll: {
    maxHeight: 260,
  },
  notification: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  message: {
    color: '#333',
  },
  time: {
    color: '#888',
    fontSize: 12,
  },
});
