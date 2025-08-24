// MFA Setup Screen (scaffold)
import React from 'react';
import { View, Text } from 'react-native';
import MFASetup from '../components/MFASetup';

export default function MFASetupScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Set up Multi-Factor Authentication</Text>
      <MFASetup onSetup={() => navigation.goBack()} />
    </View>
  );
}
