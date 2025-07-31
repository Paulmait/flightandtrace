import React from 'react';
import { View, Text, FlatList } from 'react-native';

export default function FlightHistory({ history = [] }) {
  return (
    <View>
      <Text>Flight History:</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 8 }}>
            <Text>{item.tail_number} - {item.status} - {item.timestamp}</Text>
          </View>
        )}
      />
    </View>
  );
}
