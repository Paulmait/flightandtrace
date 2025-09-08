module.exports = (req, res) => {
  // Placeholder for weather API
  res.status(200).json({
    message: 'Weather API endpoint',
    method: req.method,
    path: req.url,
    timestamp: new Date().toISOString()
  });
};