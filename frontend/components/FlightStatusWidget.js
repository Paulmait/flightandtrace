import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { responsiveSize, responsivePadding } from '../styles/responsive';

export default function FlightStatusWidget({ flight }) {
  if (!flight) return null;
  return (
    <View style={[styles.container, { padding: responsivePadding() }] }>
      <Text style={[styles.title, { fontSize: responsiveSize(18, 22, 28) }]}>{flight.tailNumber}</Text>
      <Text style={styles.status}>{flight.status}</Text>
      <Text style={styles.details}>Departure: {flight.departure}</Text>
      <Text style={styles.details}>Arrival: {flight.arrival}</Text>
      <Text style={styles.details}>ETA: {flight.eta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    margin: 12,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  status: {
    color: '#0099ff',
    fontWeight: '600',
    marginBottom: 4,
  },
  details: {
    color: '#333',
    marginBottom: 2,
  },
});
