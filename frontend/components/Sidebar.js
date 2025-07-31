import React from 'react';
import { View, Text } from 'react-native';
import TailNumberList from './TailNumberList';
import AddTailNumberForm from './AddTailNumberForm';
import FlightHistory from './FlightHistory';

export default function Sidebar({ tailNumbers, onAddTail, history }) {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Your Flights</Text>
      <TailNumberList tailNumbers={tailNumbers} />
      <AddTailNumberForm onAdd={onAddTail} />
      <FlightHistory history={history} />
    </View>
  );
}
