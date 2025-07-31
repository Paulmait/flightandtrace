import React from 'react';
import { View, Text, Button } from 'react-native';
import { addPerson, editPerson, deletePerson, linkFlightToPerson } from '../utils/firebaseUser';

export default function HomeScreen({ navigation, user, activeFlights }) {
  // Example usage of Firebase user management utilities
  // addPerson(user.id, { id: 'uuid', name: 'Dad', flights: [] });
  // editPerson(user.id, 'uuid', 'Father');
  // deletePerson(user.id, 'uuid');
  // linkFlightToPerson(user.id, 'uuid', 'N12345');
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
        Hi {user?.name || 'User'}! Tracking {activeFlights?.length || 0} flights today
      </Text>
      <View style={{ marginBottom: 16, padding: 16, borderWidth: 1, borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Active Flights</Text>
        {activeFlights && activeFlights.length > 0 ? (
          activeFlights.map((flight, idx) => (
            <Text key={idx}>{flight.tail_number} - {flight.status}</Text>
          ))
        ) : (
          <Text>No active flights</Text>
        )}
      </View>
      <Button title="Live Map" onPress={() => navigation.navigate('Map')} />
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Upcoming Flights</Text>
        {/* Scrollable list of upcoming flights */}
        <View style={{ maxHeight: 120 }}>
          {user?.upcomingFlights?.length ? (
            user.upcomingFlights.map((flight, idx) => (
              <Text key={idx}>{flight.tail_number} - {flight.departure_time}</Text>
            ))
          ) : (
            <Text>No upcoming flights</Text>
          )}
        </View>
      </View>
      <Button title="Add Flight" onPress={() => navigation.navigate('AddFlightModal')} />
    </View>
  );
}
