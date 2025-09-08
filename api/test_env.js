// Vercel serverless function
export default function handler(req, res) {
  res.status(200).json({
    nodeEnv: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
    method: req.method
  });
}