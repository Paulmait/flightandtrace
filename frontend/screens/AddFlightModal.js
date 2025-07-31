import React, { useState } from 'react';
import { View, Text, TextInput, Button, Modal, Picker } from 'react-native';

export default function AddFlightModal({ visible, onClose, onSave, people }) {
  const [flightNumber, setFlightNumber] = useState('');
  const [route, setRoute] = useState('');
  const [assignedPerson, setAssignedPerson] = useState(people?.[0] || '');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Add Flight</Text>
        <TextInput
          placeholder="Enter flight # or tail #"
          value={flightNumber}
          onChangeText={setFlightNumber}
          style={{ borderWidth: 1, marginBottom: 12, padding: 8 }}
        />
        <TextInput
          placeholder="Optional: Enter route (e.g. MIA → LAX)"
          value={route}
          onChangeText={setRoute}
          style={{ borderWidth: 1, marginBottom: 12, padding: 8 }}
        />
        <Text style={{ marginBottom: 8 }}>Assign to person:</Text>
        <Picker
          selectedValue={assignedPerson}
          onValueChange={setAssignedPerson}
          style={{ marginBottom: 16 }}
        >
          {people?.map((person, idx) => (
            <Picker.Item key={idx} label={person} value={person} />
          ))}
        </Picker>
        <Button title="Save" onPress={() => onSave({ flightNumber, route, assignedPerson })} />
        <Button title="Cancel" onPress={onClose} color="#888" />
      </View>
    </Modal>
  );
}
