import React, { useState } from 'react';
import { View, TextInput, Button, Alert, Text } from 'react-native';
import { loginUser } from '../utils/api';

export default function LoginScreen({ navigation, setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password required');
      return;
    }
    try {
      const result = await loginUser(email, password);
      setToken(result.token);
      navigation.replace('Map');
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Login to FlightTrace</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginBottom: 8, padding: 8 }} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginBottom: 8, padding: 8 }} />
      <Button title="Login" onPress={handleLogin} />
      <Button title="Register" onPress={() => navigation.navigate('Register')} />
    </View>
  );
}
