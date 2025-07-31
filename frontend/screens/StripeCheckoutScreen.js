import React, { useEffect } from 'react';
import { View, Text, Button, Linking } from 'react-native';
import { createCheckoutSession } from '../utils/api';

export default function StripeCheckoutScreen({ route, navigation }) {
  const { plan } = route.params || {};
  const [loading, setLoading] = React.useState(false);
  const [checkoutUrl, setCheckoutUrl] = React.useState(null);

  useEffect(() => {
    if (plan) {
      setLoading(true);
      createCheckoutSession(plan)
        .then(res => {
          setCheckoutUrl(res.url);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [plan]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Subscribe to {plan} Plan</Text>
      {loading && <Text>Loading checkout...</Text>}
      {checkoutUrl && (
        <Button title="Proceed to Payment" onPress={() => Linking.openURL(checkoutUrl)} />
      )}
      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}
