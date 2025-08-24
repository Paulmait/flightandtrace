// OAuth2 Login Screen (scaffold)
import React from 'react';
import { View, Text } from 'react-native';
import OAuth2Login from '../components/OAuth2Login';

export default function OAuth2LoginScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Sign in with a Provider</Text>
      <OAuth2Login />
    </View>
  );
}
