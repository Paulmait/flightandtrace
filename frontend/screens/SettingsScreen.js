import React from 'react';
import { View, Text } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Notification Preferences (SMS, Email, Push):</Text>
      {/* Add forms for notification config here */}
    </View>
  );
}
