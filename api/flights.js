// Vercel serverless function
export default function handler(req, res) {
  res.status(200).json({
    message: 'Flights API endpoint',
    method: req.method,
    path: req.url,
    timestamp: new Date().toISOString(),
    flights: []
  });
}