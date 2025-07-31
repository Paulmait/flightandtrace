import React, { useState } from 'react';
import { View, Text, Button, FlatList, TextInput, Modal } from 'react-native';

export default function MyPeopleDashboard({ people, onAdd, onEdit, onDelete, onLinkFlight, userPlan, navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newPerson, setNewPerson] = useState('');

  if (userPlan === 'Free') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 20, marginBottom: 16 }}>Linking flights to people is a Premium feature.</Text>
        <Button title="Upgrade to Premium" onPress={() => navigation.navigate('ProFeatures')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>My People</Text>
      <FlatList
        data={people}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12, borderWidth: 1, borderRadius: 8, padding: 8 }}>
            <Text style={{ fontSize: 18 }}>{item.name}</Text>
            <Button title="Edit" onPress={() => onEdit(item)} />
            <Button title="Delete" onPress={() => onDelete(item.id)} color="#d00" />
            <Button title="Link Flight" onPress={() => onLinkFlight(item.id)} />
          </View>
        )}
      />
      <Button title="Add Person" onPress={() => setModalVisible(true)} />
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <TextInput
            placeholder="Person's Name"
            value={newPerson}
            onChangeText={setNewPerson}
            style={{ borderWidth: 1, marginBottom: 12, padding: 8 }}
          />
          <Button title="Save" onPress={() => { onAdd(newPerson); setModalVisible(false); setNewPerson(''); }} />
          <Button title="Cancel" onPress={() => setModalVisible(false)} color="#888" />
        </View>
      </Modal>
    </View>
  );
}
