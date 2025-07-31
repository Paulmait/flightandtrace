import React from 'react';
import { View, Button, StyleSheet } from 'react-native';

export default function OAuth2Login({ onLogin }) {
  // In real app, use expo-auth-session or similar
  const handleGoogle = () => onLogin && onLogin('google');
  const handleMicrosoft = () => onLogin && onLogin('microsoft');
  const handleApple = () => onLogin && onLogin('apple');

  return (
    <View style={styles.container}>
      <Button title="Sign in with Google" onPress={handleGoogle} color="#4285F4" />
      <Button title="Sign in with Microsoft" onPress={handleMicrosoft} color="#2F2F2F" />
      <Button title="Sign in with Apple" onPress={handleApple} color="#000" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    gap: 8,
  },
});
