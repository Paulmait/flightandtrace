import React from 'react';
import { View, Text, FlatList, Button } from 'react-native';

const PRICING_TIERS = [
  {
    name: 'Free',
    price: 'Free',
    features: [
      'Track up to 3 tail numbers',
      '24-hour history',
      'Basic alerts',
    ],
  },
  {
    name: 'Premium',
    price: '$5/month or $50/year',
    features: [
      'Unlimited tail numbers',
      'Advanced notifications',
      'Flight replay',
    ],
  },
  {
    name: 'Family Plan',
    price: '$8/month or $80/year',
    features: [
      'Up to 5 users per household',
      'Shared tracking lists',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom pricing',
    features: [
      'Concierge onboarding',
      'Brandable dashboards',
      'API access',
    ],
  },
];

export default function PricingScreen({ navigation }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Choose Your Plan</Text>
      <FlatList
        data={PRICING_TIERS}
        keyExtractor={item => item.name}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 24, borderWidth: 1, borderRadius: 8, padding: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{item.name}</Text>
            <Text style={{ fontSize: 16, marginBottom: 8 }}>{item.price}</Text>
            {item.features.map((f, idx) => (
              <Text key={idx} style={{ fontSize: 14 }}>• {f}</Text>
            ))}
            <Button title={`Select ${item.name}`} onPress={() => navigation.navigate('Payment', { plan: item.name })} />
          </View>
        )}
      />
    </View>
  );
}
