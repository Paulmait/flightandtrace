require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// In-memory cache (simple alternative to Redis)
let flightCache = { ac: [] };
let lastFetchTime = 0;

const getFlights = async () => {
  const now = Date.now();
  
  // Refresh cache every 5 seconds
  if (now - lastFetchTime > 5000) {
    try {
      const { data } = await axios.get('https://adsbexchange.com/api/aircraft/json/');
      flightCache = data;
      lastFetchTime = now;
    } catch (error) {
      console.error('Error fetching flight data:', error);
    }
  }
  
  return flightCache;
};

// Emit flight data every 2 seconds
setInterval(async () => {
  const flights = await getFlights();
  io.emit('flight-update', flights);
}, 2000);

// Basic security headers
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

server.listen(process.env.PORT || 3001, () => {
  console.log(`Backend running on port ${process.env.PORT || 3001}`);
});