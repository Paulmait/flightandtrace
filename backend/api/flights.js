module.exports = (req, res) => {
  // Placeholder for flights API
  res.status(200).json({
    message: 'Flights API endpoint',
    method: req.method,
    path: req.url,
    timestamp: new Date().toISOString()
  });
};