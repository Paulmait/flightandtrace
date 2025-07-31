import React from 'react';
import { View, Text, FlatList } from 'react-native';

export default function TailNumberList({ tailNumbers = [] }) {
  return (
    <View>
      <Text>Tracked Tail Numbers:</Text>
      <FlatList
        data={tailNumbers}
        keyExtractor={(item) => item}
        renderItem={({ item }) => <Text>{item}</Text>}
      />
    </View>
  );
}
