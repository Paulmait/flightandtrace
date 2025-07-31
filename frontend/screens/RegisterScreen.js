import React, { useState } from 'react';
import { View, TextInput, Button, Alert, Text } from 'react-native';
import { registerUser } from '../utils/api';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'All fields required');
      return;
    }
    try {
      await registerUser(username, email, password);
      Alert.alert('Success', 'Registration complete! Please login.');
      navigation.replace('Login');
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Create Your Account</Text>
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={{ borderWidth: 1, marginBottom: 8, padding: 8 }} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginBottom: 8, padding: 8 }} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginBottom: 8, padding: 8 }} />
      <Button title="Register" onPress={handleRegister} />
      <Button title="Back to Login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
}
