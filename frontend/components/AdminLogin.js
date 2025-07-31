import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!username || !password) {
      setError('Username and password required');
      return;
    }
    // In real app, call backend for admin auth
    if (username === 'admin' && password === 'adminpass') {
      setError('');
      onLogin && onLogin({ username });
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Admin Login</Text>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }}
        secureTextEntry
      />
      {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}
