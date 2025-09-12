// Simple test endpoint
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    message: 'API is working',
    time: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};