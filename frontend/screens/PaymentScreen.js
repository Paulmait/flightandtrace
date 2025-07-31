import React from 'react';
import { View, Text, Button } from 'react-native';

export default function PaymentScreen({ route, navigation }) {
  const { plan } = route.params || {};

  // Placeholder for payment integration (Stripe, PayPal, etc.)
  const handlePayment = () => {
    // Integrate payment gateway here
    alert(`Payment for ${plan} plan successful!`);
    navigation.replace('Map');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Subscribe to {plan} Plan</Text>
      <Text style={{ fontSize: 16, marginBottom: 24 }}>
        Secure payment powered by Stripe/PayPal (integration pending)
      </Text>
      <Button title={`Pay & Subscribe`} onPress={handlePayment} />
      <Button title="Back to Pricing" onPress={() => navigation.goBack()} />
    </View>
  );
}
