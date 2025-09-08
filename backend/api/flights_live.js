module.exports = (req, res) => {
  // Placeholder for live flights API
  res.status(200).json({
    message: 'Live Flights API endpoint',
    method: req.method,
    path: req.url,
    timestamp: new Date().toISOString()
  });
};