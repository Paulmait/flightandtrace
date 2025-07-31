import React from 'react';
import { View, Text, Button } from 'react-native';

export default function ProFeaturesScreen({ navigation }) {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Unlock Pro Features</Text>
      <Text style={{ fontSize: 18, marginBottom: 24, textAlign: 'center' }}>
        🚀 Smart Alerts for Real Humans
        {'\n'}• Get instant, easy-to-read notifications for takeoff, landing, and delays.
        {'\n'}• Share or explain flight status with one tap.
        {'\n'}\n🎬 Flight Replay Timeline
        {'\n'}• Replay any flight’s journey with interactive timeline and map.
        {'\n'}• Perfect for aviation fans and professionals.
        {'\n'}\n🌐 Cross-Platform First Design
        {'\n'}• Use on iOS, Android, and Web seamlessly.
      </Text>
      <Button title="Upgrade to Premium" onPress={() => navigation.navigate('Pricing')} />
      <Text style={{ fontSize: 14, marginTop: 16, color: '#888', textAlign: 'center' }}>
        These features are available for Premium, Family, and Enterprise users.
      </Text>
    </View>
  );
}
