module.exports = (req, res) => {
  // Placeholder for admin API
  res.status(200).json({
    message: 'Admin API endpoint',
    method: req.method,
    path: req.url,
    timestamp: new Date().toISOString()
  });
};