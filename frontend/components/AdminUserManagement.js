import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { resetUserPassword, resetAdminPassword } from '../utils/api';

export default function AdminUserManagement({ onResetUser, onResetAdmin }) {
  const [userToReset, setUserToReset] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showChange, setShowChange] = useState(false);

  const handleResetUser = async () => {
    if (!userToReset) return Alert.alert('Error', 'Enter username to reset');
    try {
      await resetUserPassword(userToReset);
      onResetUser && onResetUser(userToReset);
      Alert.alert('User Reset', `Reset link sent to ${userToReset}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to reset user password');
    }
  };

  const handleResetAdmin = async () => {
    if (!adminPassword || !newAdminPassword) return Alert.alert('Error', 'Enter old and new password');
    try {
      await resetAdminPassword(adminPassword, newAdminPassword);
      onResetAdmin && onResetAdmin(adminPassword, newAdminPassword);
      Alert.alert('Admin Password Changed', 'Password updated. Expires in 180 days.');
    } catch (e) {
      Alert.alert('Error', 'Failed to change admin password');
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>User Management</Text>
      <TextInput
        placeholder="Username to reset"
        value={userToReset}
        onChangeText={setUserToReset}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }}
      />
      <Button title="Reset User Password" onPress={handleResetUser} />
      <Button title="Change Admin Password" onPress={() => setShowChange(s => !s)} />
      {showChange && (
        <View style={{ marginTop: 8 }}>
          <TextInput
            placeholder="Current Admin Password"
            value={adminPassword}
            onChangeText={setAdminPassword}
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }}
            secureTextEntry
          />
          <TextInput
            placeholder="New Admin Password"
            value={newAdminPassword}
            onChangeText={setNewAdminPassword}
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }}
            secureTextEntry
          />
          <Button title="Update Admin Password" onPress={handleResetAdmin} />
          <Text style={{ color: '#888', marginTop: 4 }}>Password expires every 180 days.</Text>
        </View>
      )}
    </View>
  );
}
