import React from 'react';
import { View, Text, Button } from 'react-native';

export default function OnboardingScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Welcome to FlightTrace!</Text>
      <Text style={{ fontSize: 16, marginBottom: 24 }}>
        Track flights, get instant alerts, and replay flight history. Choose your plan and get started!
      </Text>
      <Button title="Get Started" onPress={() => navigation.replace('Login')} />
    </View>
  );
}
