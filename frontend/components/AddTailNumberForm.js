import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';

export default function AddTailNumberForm({ onAdd }) {
  const [tailNumber, setTailNumber] = useState('');

  return (
    <View>
      <TextInput
        placeholder="Enter Tail Number"
        value={tailNumber}
        onChangeText={setTailNumber}
        style={{ borderWidth: 1, marginBottom: 8, padding: 8 }}
      />
      <Button title="Add" onPress={() => {
        onAdd(tailNumber);
        setTailNumber('');
      }} />
    </View>
  );
}
