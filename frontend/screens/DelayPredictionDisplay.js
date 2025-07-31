export default function DelayPredictionDisplay({ flight, userPlan, navigation }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (userPlan === 'Free') {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Delay prediction is a Premium feature.</Text>
        <Button title="Upgrade to Premium" onPress={() => navigation.navigate('ProFeatures')} />
      </View>
    );
  }

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDelayPrediction({
        scheduled_departure: flight.scheduled_departure,
        origin: flight.origin,
        destination: flight.destination,
        route: flight.route,
      });
      setPrediction(result);
    } catch (err) {
      setError('Could not fetch prediction');
    }
    setLoading(false);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Delay Prediction</Text>
      <Button title="Get Delay Prediction" onPress={handlePredict} />
      {loading && <ActivityIndicator style={{ marginTop: 8 }} />}
      {error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}
      {prediction && (
        <View style={{ marginTop: 12 }}>
          <Text>Probability of Delay: {Math.round(prediction.delay_probability * 100)}%</Text>
          <Text>Predicted Delay: {prediction.predicted_delay_minutes} min</Text>
        </View>
      )}
    </View>
  );
}
