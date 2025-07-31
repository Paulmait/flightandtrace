import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';

export default function MFASetup({ onSetup }) {
  const [code, setCode] = useState('');
  const [secret, setSecret] = useState('ABC123'); // In real app, fetch from backend
  const [enabled, setEnabled] = useState(false);

  const handleEnable = () => {
    // In real app, verify code with backend
    if (code === '123456') {
      setEnabled(true);
      onSetup && onSetup(true);
      Alert.alert('MFA Enabled', 'Multi-factor authentication is now active.');
    } else {
      Alert.alert('Invalid Code', 'Please enter the correct code from your authenticator app.');
    }
  };

  if (enabled) return <Text style={{ color: 'green', margin: 12 }}>MFA is enabled for your account.</Text>;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Enable Multi-Factor Authentication</Text>
      <Text>Scan this code in your authenticator app:</Text>
      <Text selectable style={{ fontFamily: 'monospace', marginVertical: 8 }}>{secret}</Text>
      <TextInput
        placeholder="Enter 6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }}
      />
      <Button title="Enable MFA" onPress={handleEnable} />
    </View>
  );
}
