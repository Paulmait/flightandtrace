import React, { useState } from 'react';
import { View, Text, Switch, Button, TextInput } from 'react-native';

export default function NotificationsPreferences({ preferences, onSave }) {
  const [push, setPush] = useState(preferences?.push || false);
  const [sms, setSms] = useState(preferences?.sms || false);
  const [email, setEmail] = useState(preferences?.email || false);
  const [threshold, setThreshold] = useState(preferences?.threshold || '');
  const [sharedEmail, setSharedEmail] = useState('');

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Notification Preferences</Text>
      <View style={{ marginBottom: 12 }}>
        <Text>Push Notifications</Text>
        <Switch value={push} onValueChange={setPush} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text>SMS Alerts</Text>
        <Switch value={sms} onValueChange={setSms} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text>Email Alerts</Text>
        <Switch value={email} onValueChange={setEmail} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text>Alert Threshold (delay, takeoff, landing)</Text>
        <TextInput value={threshold} onChangeText={setThreshold} style={{ borderWidth: 1, padding: 8 }} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text>Share access (add email)</Text>
        <TextInput value={sharedEmail} onChangeText={setSharedEmail} style={{ borderWidth: 1, padding: 8 }} />
        <Button title="Add Shared User" onPress={() => {/* Add logic */}} />
      </View>
      <Button title="Save Preferences" onPress={() => onSave({ push, sms, email, threshold })} />
    </View>
  );
}
