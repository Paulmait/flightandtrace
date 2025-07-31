import React, { useState } from 'react';
import { View, Text, Switch, Button, TextInput, Alert } from 'react-native';
import { sendPushNotification, sendSMS, sendEmail } from '../utils/notificationService';

export default function NotificationsScreen({ userPlan, navigation, preferences, onSave, userId }) {
  const [push, setPush] = useState(preferences?.push || false);
  const [sms, setSms] = useState(preferences?.sms || false);
  const [email, setEmail] = useState(preferences?.email || false);
  const [threshold, setThreshold] = useState(preferences?.threshold || '');
  const [sharedEmail, setSharedEmail] = useState('');

  if (userPlan === 'Free') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Custom notifications are a Premium feature.</Text>
        <Button title="Upgrade to Premium" onPress={() => navigation.navigate('ProFeatures')} />
      </View>
    );
  }

  const handleSave = async () => {
    onSave({ push, sms, email, threshold });
    // Send test notification for each enabled type
    try {
      if (push) await sendPushNotification(userId, 'Test push notification');
      if (sms) await sendSMS(userId, 'Test SMS notification');
      if (email) await sendEmail(userId, 'Test notification', 'This is a test email notification');
      Alert.alert('Saved', 'Notification preferences updated and test notifications sent');
    } catch (err) {
      Alert.alert('Error', 'Failed to send test notifications');
    }
  };

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
      <Button title="Save Preferences" onPress={handleSave} />
    </View>
  );
}
