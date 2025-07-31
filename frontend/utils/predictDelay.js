// Utility to call backend predictive delay engine
export async function getDelayPrediction({ scheduled_departure, origin, destination, route }) {
  const res = await fetch('http://localhost:8000/predict-delay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduled_departure, origin, destination, route })
  });
  if (!res.ok) throw new Error('Failed to get delay prediction');
  return res.json();
}
