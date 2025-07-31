import React, { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { fetchFlightHistory } from '../utils/api';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchFlightHistory().then(setHistory);
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
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
