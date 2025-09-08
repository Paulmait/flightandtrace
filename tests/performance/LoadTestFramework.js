/**
 * Synthetic Load Testing Framework for FlightTrace
 * Generates realistic flight data at 10x current MAU scale
 */

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

class LoadTestFramework {
  constructor(options = {}) {
    this.config = {
      baseURL: options.baseURL || 'http://localhost:3000',
      wsURL: options.wsURL || 'ws://localhost:3001',
      targetRPS: options.targetRPS || 1000,
      maxConcurrentUsers: options.maxConcurrentUsers || 10000,
      testDuration: options.testDuration || 300000, // 5 minutes
      rampUpTime: options.rampUpTime || 60000, // 1 minute
      
      // Flight simulation parameters
      totalFlights: options.totalFlights || 50000,
      updateInterval: options.updateInterval || 5000, // 5 seconds
      geoBounds: options.geoBounds || {
        north: 60, south: -60, east: 180, west: -180
      }
    };
    
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0 },
      responses: { times: [], p95: 0, p99: 0, avg: 0 },
      websockets: { connected: 0, messages: 0, errors: 0 },
      flights: { generated: 0, updated: 0 },
      startTime: 0,
      endTime: 0
    };
    
    this.activeUsers = new Map();
    this.flightDatabase = new Map();
    this.isRunning = false;
    
    this.initializeFlightData();
  }

  /**
   * Initialize synthetic flight data
   */
  initializeFlightData() {
    console.log('🛫 Generating synthetic flight data...');
    
    for (let i = 0; i < this.config.totalFlights; i++) {
      const flight = this.generateRandomFlight(`SYN${i.toString().padStart(4, '0')}`);
      this.flightDatabase.set(flight.id, flight);
    }
    
    console.log(`✅ Generated ${this.config.totalFlights} synthetic flights`);
  }

  /**
   * Generate a random flight with realistic parameters
   */
  generateRandomFlight(flightId) {
    const { geoBounds } = this.config;
    
    // Generate realistic flight paths (great circles between major airports)
    const airports = this.getMajorAirports();
    const origin = airports[Math.floor(Math.random() * airports.length)];
    const destination = airports[Math.floor(Math.random() * airports.length)];
    
    // Current position along route
    const progress = Math.random();
    const lat = origin.lat + (destination.lat - origin.lat) * progress;
    const lng = origin.lng + (destination.lng - origin.lng) * progress;
    
    return {
      id: flightId,
      callsign: this.generateCallsign(),
      icao24: this.generateIcao24(),
      aircraft: {
        type: this.getRandomAircraftType(),
        registration: this.generateRegistration()
      },
      position: {
        latitude: lat,
        longitude: lng,
        altitude: 35000 + Math.random() * 10000, // 35k-45k feet
        heading: Math.random() * 360,
        groundSpeed: 450 + Math.random() * 150, // 450-600 knots
        verticalSpeed: (Math.random() - 0.5) * 2000 // ±1000 fpm
      },
      route: { origin: origin.code, destination: destination.code },
      status: 'en_route',
      lastUpdate: Date.now(),
      updateFrequency: 5000 + Math.random() * 5000 // 5-10 seconds
    };
  }

  /**
   * Get major world airports for realistic routing
   */
  getMajorAirports() {
    return [
      { code: 'LAX', lat: 33.9425, lng: -118.4081 },
      { code: 'JFK', lat: 40.6413, lng: -73.7781 },
      { code: 'LHR', lat: 51.4700, lng: -0.4543 },
      { code: 'CDG', lat: 49.0128, lng: 2.5500 },
      { code: 'NRT', lat: 35.7720, lng: 140.3929 },
      { code: 'SIN', lat: 1.3644, lng: 103.9915 },
      { code: 'DXB', lat: 25.2532, lng: 55.3657 },
      { code: 'FRA', lat: 50.0379, lng: 8.5622 },
      { code: 'SYD', lat: -33.9399, lng: 151.1753 },
      { code: 'GRU', lat: -23.4356, lng: -46.4731 }
    ];
  }

  /**
   * Generate realistic callsign
   */
  generateCallsign() {
    const airlines = ['AAL', 'UAL', 'DAL', 'SWA', 'BAW', 'AFR', 'DLH', 'KLM', 'SIA', 'ELK'];
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const number = Math.floor(Math.random() * 9999).toString().padStart(3, '0');
    return `${airline}${number}`;
  }

  /**
   * Generate ICAO24 identifier
   */
  generateIcao24() {
    return Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  }

  /**
   * Generate aircraft registration
   */
  generateRegistration() {
    const prefixes = ['N', 'G-', 'D-', 'F-', 'JA', 'VH-', '9V-', 'A6-'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `${prefix}${suffix}`;
  }

  /**
   * Get random aircraft type
   */
  getRandomAircraftType() {
    const types = ['B738', 'A320', 'B777', 'A350', 'B787', 'A380', 'B747', 'E190'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Start the load test
   */
  async startLoadTest() {
    console.log('🚀 Starting load test...');
    console.log(`Target: ${this.config.maxConcurrentUsers} concurrent users`);
    console.log(`Duration: ${this.config.testDuration / 1000} seconds`);
    console.log(`RPS Target: ${this.config.targetRPS}`);
    
    this.isRunning = true;
    this.metrics.startTime = Date.now();
    
    // Start flight position updates
    this.startFlightSimulation();
    
    // Ramp up users gradually
    await this.rampUpUsers();
    
    // Run main test phase
    await this.runMainTestPhase();
    
    // Ramp down and cleanup
    await this.rampDownUsers();
    
    this.isRunning = false;
    this.metrics.endTime = Date.now();
    
    return this.generateReport();
  }

  /**
   * Start flight position simulation
   */
  startFlightSimulation() {
    this.flightUpdateInterval = setInterval(() => {
      this.updateFlightPositions();
    }, this.config.updateInterval);
  }

  /**
   * Update all flight positions
   */
  updateFlightPositions() {
    const updateBatch = [];
    
    for (const [flightId, flight] of this.flightDatabase.entries()) {
      if (Date.now() - flight.lastUpdate > flight.updateFrequency) {
        this.updateFlightPosition(flight);
        updateBatch.push(flight);
        flight.lastUpdate = Date.now();
      }
    }
    
    // Broadcast updates to connected websockets
    this.broadcastFlightUpdates(updateBatch);
    
    this.metrics.flights.updated += updateBatch.length;
  }

  /**
   * Update individual flight position
   */
  updateFlightPosition(flight) {
    // Simulate realistic movement
    const speedKnots = flight.position.groundSpeed;
    const speedMs = speedKnots * 0.514444; // Convert knots to m/s
    const timeStep = flight.updateFrequency / 1000; // seconds
    const distanceM = speedMs * timeStep;
    
    // Calculate new position based on heading
    const earthRadius = 6371000; // meters
    const bearing = flight.position.heading * Math.PI / 180;
    const lat1 = flight.position.latitude * Math.PI / 180;
    const lng1 = flight.position.longitude * Math.PI / 180;
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceM / earthRadius) +
      Math.cos(lat1) * Math.sin(distanceM / earthRadius) * Math.cos(bearing)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(distanceM / earthRadius) * Math.cos(lat1),
      Math.cos(distanceM / earthRadius) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    flight.position.latitude = lat2 * 180 / Math.PI;
    flight.position.longitude = lng2 * 180 / Math.PI;
    
    // Add some realistic variations
    flight.position.altitude += (Math.random() - 0.5) * 500; // ±250 feet
    flight.position.heading += (Math.random() - 0.5) * 10;   // ±5 degrees
    flight.position.groundSpeed += (Math.random() - 0.5) * 20; // ±10 knots
    
    // Keep within reasonable bounds
    flight.position.altitude = Math.max(1000, Math.min(45000, flight.position.altitude));
    flight.position.heading = ((flight.position.heading % 360) + 360) % 360;
    flight.position.groundSpeed = Math.max(100, Math.min(650, flight.position.groundSpeed));
  }

  /**
   * Broadcast flight updates to websocket clients
   */
  broadcastFlightUpdates(flights) {
    if (flights.length === 0) return;
    
    const message = JSON.stringify({
      type: 'flight_updates',
      data: flights.map(f => ({
        id: f.id,
        callsign: f.callsign,
        position: f.position,
        timestamp: Date.now()
      }))
    });
    
    for (const [userId, user] of this.activeUsers.entries()) {
      if (user.websocket && user.websocket.readyState === WebSocket.OPEN) {
        user.websocket.send(message);
        this.metrics.websockets.messages++;
      }
    }
  }

  /**
   * Ramp up users gradually
   */
  async rampUpUsers() {
    const usersPerStep = Math.ceil(this.config.maxConcurrentUsers / 20); // 20 steps
    const stepInterval = this.config.rampUpTime / 20;
    
    console.log('📈 Ramping up users...');
    
    for (let step = 0; step < 20 && this.isRunning; step++) {
      const startUsers = step * usersPerStep;
      const endUsers = Math.min((step + 1) * usersPerStep, this.config.maxConcurrentUsers);
      
      for (let userId = startUsers; userId < endUsers; userId++) {
        await this.createUser(userId);
        await this.sleep(Math.random() * 100); // Stagger user creation
      }
      
      console.log(`👥 ${endUsers} users active`);
      await this.sleep(stepInterval);
    }
  }

  /**
   * Create a simulated user
   */
  async createUser(userId) {
    const user = {
      id: userId,
      startTime: Date.now(),
      requestCount: 0,
      websocket: null,
      viewport: this.generateRandomViewport(),
      lastActivity: Date.now()
    };
    
    // Establish websocket connection
    try {
      user.websocket = new WebSocket(this.config.wsURL);
      
      user.websocket.on('open', () => {
        this.metrics.websockets.connected++;
        user.websocket.send(JSON.stringify({
          type: 'subscribe',
          viewport: user.viewport
        }));
      });
      
      user.websocket.on('error', () => {
        this.metrics.websockets.errors++;
      });
      
      user.websocket.on('close', () => {
        this.metrics.websockets.connected--;
      });
      
    } catch (error) {
      this.metrics.websockets.errors++;
    }
    
    this.activeUsers.set(userId, user);
    
    // Start user activity simulation
    this.simulateUserActivity(user);
  }

  /**
   * Generate random viewport for user
   */
  generateRandomViewport() {
    const airports = this.getMajorAirports();
    const center = airports[Math.floor(Math.random() * airports.length)];
    const zoom = 8 + Math.random() * 4; // Zoom 8-12
    const size = Math.pow(2, 12 - zoom) * 2; // Degrees
    
    return {
      center: { lat: center.lat, lng: center.lng },
      bounds: {
        north: center.lat + size,
        south: center.lat - size,
        east: center.lng + size,
        west: center.lng - size
      },
      zoom
    };
  }

  /**
   * Simulate realistic user activity
   */
  simulateUserActivity(user) {
    const activityInterval = 5000 + Math.random() * 10000; // 5-15 seconds
    
    const activity = async () => {
      if (!this.isRunning || !this.activeUsers.has(user.id)) {
        return;
      }
      
      try {
        // Random API call
        const action = this.getRandomUserAction();
        await this.executeUserAction(user, action);
        
        user.requestCount++;
        user.lastActivity = Date.now();
        
      } catch (error) {
        this.metrics.requests.errors++;
      }
      
      // Schedule next activity
      setTimeout(activity, activityInterval + Math.random() * 5000);
    };
    
    // Start activity after random delay
    setTimeout(activity, Math.random() * 5000);
  }

  /**
   * Get random user action
   */
  getRandomUserAction() {
    const actions = [
      'get_flights',
      'get_flight_details',
      'search_flights', 
      'get_airports',
      'pan_map',
      'zoom_map'
    ];
    
    return actions[Math.floor(Math.random() * actions.length)];
  }

  /**
   * Execute user action
   */
  async executeUserAction(user, action) {
    const startTime = performance.now();
    let success = false;
    
    try {
      switch (action) {
        case 'get_flights':
          await this.makeAPICall('/api/flights', {
            params: {
              bounds: `${user.viewport.bounds.north},${user.viewport.bounds.south},${user.viewport.bounds.east},${user.viewport.bounds.west}`
            }
          });
          break;
          
        case 'get_flight_details':
          const randomFlight = this.getRandomFlight();
          await this.makeAPICall(`/api/flights/${randomFlight.id}`);
          break;
          
        case 'search_flights':
          await this.makeAPICall('/api/flights/search', {
            params: { q: this.generateRandomCallsign().substring(0, 3) }
          });
          break;
          
        case 'get_airports':
          await this.makeAPICall('/api/airports', {
            params: {
              bounds: `${user.viewport.bounds.north},${user.viewport.bounds.south},${user.viewport.bounds.east},${user.viewport.bounds.west}`
            }
          });
          break;
          
        case 'pan_map':
          user.viewport = this.generateRandomViewport();
          if (user.websocket && user.websocket.readyState === WebSocket.OPEN) {
            user.websocket.send(JSON.stringify({
              type: 'update_viewport',
              viewport: user.viewport
            }));
          }
          break;
          
        case 'zoom_map':
          user.viewport.zoom += (Math.random() - 0.5) * 2;
          user.viewport.zoom = Math.max(3, Math.min(15, user.viewport.zoom));
          break;
      }
      
      success = true;
      this.metrics.requests.success++;
      
    } catch (error) {
      this.metrics.requests.errors++;
    }
    
    const responseTime = performance.now() - startTime;
    this.metrics.responses.times.push(responseTime);
    this.metrics.requests.total++;
  }

  /**
   * Make HTTP API call
   */
  async makeAPICall(endpoint, options = {}) {
    const response = await axios.get(`${this.config.baseURL}${endpoint}`, {
      timeout: 5000,
      ...options
    });
    
    return response.data;
  }

  /**
   * Get random flight from database
   */
  getRandomFlight() {
    const flights = Array.from(this.flightDatabase.values());
    return flights[Math.floor(Math.random() * flights.length)];
  }

  /**
   * Run main test phase
   */
  async runMainTestPhase() {
    console.log('⚡ Running main load test phase...');
    
    const mainTestDuration = this.config.testDuration - this.config.rampUpTime - 30000;
    await this.sleep(mainTestDuration);
  }

  /**
   * Ramp down users
   */
  async rampDownUsers() {
    console.log('📉 Ramping down users...');
    
    const users = Array.from(this.activeUsers.keys());
    const batchSize = Math.ceil(users.length / 10);
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      for (const userId of batch) {
        await this.removeUser(userId);
      }
      
      await this.sleep(1000);
    }
  }

  /**
   * Remove user and cleanup
   */
  async removeUser(userId) {
    const user = this.activeUsers.get(userId);
    if (user) {
      if (user.websocket) {
        user.websocket.close();
      }
      this.activeUsers.delete(userId);
    }
  }

  /**
   * Calculate performance metrics
   */
  calculateMetrics() {
    const times = this.metrics.responses.times.sort((a, b) => a - b);
    
    if (times.length > 0) {
      this.metrics.responses.avg = times.reduce((a, b) => a + b) / times.length;
      this.metrics.responses.p95 = times[Math.floor(times.length * 0.95)];
      this.metrics.responses.p99 = times[Math.floor(times.length * 0.99)];
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    this.calculateMetrics();
    
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    const rps = this.metrics.requests.total / duration;
    
    const report = {
      summary: {
        duration,
        totalRequests: this.metrics.requests.total,
        successfulRequests: this.metrics.requests.success,
        failedRequests: this.metrics.requests.errors,
        successRate: (this.metrics.requests.success / this.metrics.requests.total) * 100,
        averageRPS: rps,
        peakConcurrentUsers: this.config.maxConcurrentUsers
      },
      performance: {
        averageResponseTime: this.metrics.responses.avg,
        p95ResponseTime: this.metrics.responses.p95,
        p99ResponseTime: this.metrics.responses.p99,
        sloViolations: this.metrics.responses.times.filter(t => t > 100).length // >100ms
      },
      websockets: {
        peakConnections: this.metrics.websockets.connected,
        totalMessages: this.metrics.websockets.messages,
        connectionErrors: this.metrics.websockets.errors
      },
      flights: {
        totalFlights: this.config.totalFlights,
        flightUpdates: this.metrics.flights.updated,
        updateRate: this.metrics.flights.updated / duration
      }
    };
    
    console.log('\n📊 Load Test Results:');
    console.log('====================');
    console.log(`Duration: ${duration.toFixed(1)}s`);
    console.log(`Total Requests: ${report.summary.totalRequests.toLocaleString()}`);
    console.log(`Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`Average RPS: ${report.summary.averageRPS.toFixed(1)}`);
    console.log(`P95 Response Time: ${report.performance.p95ResponseTime.toFixed(1)}ms`);
    console.log(`P99 Response Time: ${report.performance.p99ResponseTime.toFixed(1)}ms`);
    console.log(`SLO Violations (>100ms): ${report.performance.sloViolations}`);
    console.log(`Peak WebSocket Connections: ${this.metrics.websockets.connected}`);
    console.log(`Flight Update Rate: ${report.flights.updateRate.toFixed(1)}/sec`);
    
    return report;
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup() {
    this.isRunning = false;
    
    if (this.flightUpdateInterval) {
      clearInterval(this.flightUpdateInterval);
    }
    
    // Close all websockets
    for (const [userId, user] of this.activeUsers.entries()) {
      if (user.websocket) {
        user.websocket.close();
      }
    }
    
    this.activeUsers.clear();
    
    console.log('✅ Load test cleanup complete');
  }

  /**
   * Utility sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { LoadTestFramework };

// CLI usage
if (require.main === module) {
  const test = new LoadTestFramework({
    maxConcurrentUsers: process.argv[2] ? parseInt(process.argv[2]) : 1000,
    testDuration: process.argv[3] ? parseInt(process.argv[3]) * 1000 : 300000
  });
  
  test.startLoadTest()
    .then(() => test.cleanup())
    .catch(error => {
      console.error('Load test failed:', error);
      test.cleanup();
      process.exit(1);
    });
}