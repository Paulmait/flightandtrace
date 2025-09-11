import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cacheManager from './lib/cache.js';

class FlightWebSocketServer {
  constructor() {
    this.io = null;
    this.connections = new Map();
    this.updateInterval = null;
    this.flightData = new Map();
    this.subscriptions = new Map(); // Track user subscriptions to regions
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (token) {
          const user = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
          socket.user = user;
        } else {
          // Allow anonymous connections with limitations
          socket.user = { 
            id: socket.id, 
            subscription: 'free',
            anonymous: true 
          };
        }
        
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Start update loop
    this.startUpdateLoop();
  }

  handleConnection(socket) {
    const connectionInfo = {
      id: socket.id,
      user: socket.user,
      connectedAt: new Date(),
      regions: new Set(),
      lastActivity: new Date()
    };
    
    this.connections.set(socket.id, connectionInfo);
    
    console.log(`Client connected: ${socket.id} (${socket.user.subscription})`);
    
    // Send welcome message with connection info
    socket.emit('welcome', {
      connectionId: socket.id,
      subscription: socket.user.subscription,
      features: this.getFeaturesByTier(socket.user.subscription),
      updateInterval: this.getUpdateInterval(socket.user.subscription)
    });

    // Handle region subscription
    socket.on('subscribe:region', (data) => {
      this.handleRegionSubscribe(socket, data);
    });

    // Handle region unsubscription
    socket.on('unsubscribe:region', (data) => {
      this.handleRegionUnsubscribe(socket, data);
    });

    // Handle flight details request
    socket.on('flight:details', async (data) => {
      await this.handleFlightDetails(socket, data);
    });

    // Handle flight tracking
    socket.on('track:flight', (data) => {
      this.handleFlightTracking(socket, data);
    });

    // Handle custom alerts
    socket.on('alert:create', (data) => {
      this.handleAlertCreate(socket, data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle ping for keeping connection alive
    socket.on('ping', () => {
      connectionInfo.lastActivity = new Date();
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  handleRegionSubscribe(socket, { bbox, filters = {} }) {
    const connection = this.connections.get(socket.id);
    
    if (!bbox) {
      socket.emit('error', { message: 'Bounding box required' });
      return;
    }
    
    // Validate bbox size based on subscription
    const maxRegions = this.getMaxRegions(socket.user.subscription);
    if (connection.regions.size >= maxRegions) {
      socket.emit('error', { 
        message: `Maximum ${maxRegions} regions allowed for ${socket.user.subscription} tier`,
        upgradeUrl: '/pricing'
      });
      return;
    }
    
    // Add region to user's subscriptions
    connection.regions.add(bbox);
    
    // Join room for this region
    const roomName = `region:${bbox}`;
    socket.join(roomName);
    
    // Add to global subscriptions tracking
    if (!this.subscriptions.has(bbox)) {
      this.subscriptions.set(bbox, new Set());
    }
    this.subscriptions.get(bbox).add(socket.id);
    
    // Send current data for this region
    const flightData = this.flightData.get(bbox);
    if (flightData) {
      socket.emit('flights:update', {
        bbox,
        flights: this.filterFlightsByTier(flightData, socket.user.subscription),
        timestamp: new Date().toISOString()
      });
    }
    
    socket.emit('subscribed', { bbox, regions: Array.from(connection.regions) });
  }

  handleRegionUnsubscribe(socket, { bbox }) {
    const connection = this.connections.get(socket.id);
    
    if (connection && bbox) {
      connection.regions.delete(bbox);
      socket.leave(`region:${bbox}`);
      
      const regionSubs = this.subscriptions.get(bbox);
      if (regionSubs) {
        regionSubs.delete(socket.id);
        if (regionSubs.size === 0) {
          this.subscriptions.delete(bbox);
        }
      }
      
      socket.emit('unsubscribed', { bbox, regions: Array.from(connection.regions) });
    }
  }

  async handleFlightDetails(socket, { icao24 }) {
    if (!icao24) {
      socket.emit('error', { message: 'ICAO24 required' });
      return;
    }
    
    try {
      // Check cache first
      const cacheKey = `aircraft:${icao24}`;
      let details = await cacheManager.get(cacheKey);
      
      if (!details) {
        // Fetch from API (would need actual aircraft database)
        details = {
          icao24,
          registration: 'N/A',
          model: 'Unknown',
          operator: 'Unknown',
          // Add more details from your aircraft database
        };
        
        // Cache for 1 hour
        await cacheManager.set(cacheKey, details, 3600);
      }
      
      socket.emit('flight:details:response', {
        icao24,
        details,
        cached: !!details
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch flight details' });
    }
  }

  handleFlightTracking(socket, { icao24, enable }) {
    const connection = this.connections.get(socket.id);
    
    if (!connection.tracking) {
      connection.tracking = new Set();
    }
    
    if (enable) {
      // Limit tracking based on subscription
      const maxTracking = socket.user.subscription === 'enterprise' ? 100 :
                         socket.user.subscription === 'pro' ? 20 : 5;
      
      if (connection.tracking.size >= maxTracking) {
        socket.emit('error', { 
          message: `Maximum ${maxTracking} simultaneous tracking allowed`,
          upgradeUrl: '/pricing'
        });
        return;
      }
      
      connection.tracking.add(icao24);
      socket.join(`tracking:${icao24}`);
      socket.emit('tracking:started', { icao24 });
    } else {
      connection.tracking.delete(icao24);
      socket.leave(`tracking:${icao24}`);
      socket.emit('tracking:stopped', { icao24 });
    }
  }

  handleAlertCreate(socket, alertConfig) {
    // Premium feature
    if (socket.user.subscription === 'free') {
      socket.emit('error', { 
        message: 'Alerts require Pro subscription or higher',
        upgradeUrl: '/pricing'
      });
      return;
    }
    
    // Store alert configuration (would need database)
    const alert = {
      id: `alert_${Date.now()}`,
      userId: socket.user.id,
      ...alertConfig,
      createdAt: new Date()
    };
    
    socket.emit('alert:created', alert);
  }

  handleDisconnection(socket) {
    const connection = this.connections.get(socket.id);
    
    if (connection) {
      // Clean up subscriptions
      connection.regions.forEach(bbox => {
        const regionSubs = this.subscriptions.get(bbox);
        if (regionSubs) {
          regionSubs.delete(socket.id);
          if (regionSubs.size === 0) {
            this.subscriptions.delete(bbox);
          }
        }
      });
      
      this.connections.delete(socket.id);
    }
    
    console.log(`Client disconnected: ${socket.id}`);
  }

  async startUpdateLoop() {
    // Update flight data periodically
    const updateFlights = async () => {
      try {
        // Only fetch data for subscribed regions
        for (const [bbox, subscribers] of this.subscriptions.entries()) {
          if (subscribers.size === 0) continue;
          
          // Fetch latest flight data
          const flights = await this.fetchFlightData(bbox);
          
          if (flights) {
            // Store in memory
            this.flightData.set(bbox, flights);
            
            // Broadcast to subscribers in this region
            this.io.to(`region:${bbox}`).emit('flights:update', {
              bbox,
              flights: flights.slice(0, 500), // Limit data sent
              timestamp: new Date().toISOString(),
              updateType: 'periodic'
            });
            
            // Send targeted updates for tracked flights
            this.sendTrackedFlightUpdates(flights);
          }
        }
      } catch (error) {
        console.error('Update loop error:', error);
      }
    };
    
    // Initial update
    await updateFlights();
    
    // Set up periodic updates (30 seconds for free, 10 seconds for premium)
    this.updateInterval = setInterval(updateFlights, 30000);
  }

  async fetchFlightData(bbox) {
    try {
      // Use the cache manager to get flight data
      const cacheKey = `flights:${bbox}`;
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        return cached.flights;
      }
      
      // If not cached, fetch from API
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/flights?bbox=${bbox}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache for next time
        await cacheManager.set(cacheKey, { flights: data.flights }, 30);
        
        return data.flights;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch flight data:', error);
      return null;
    }
  }

  sendTrackedFlightUpdates(flights) {
    // Send updates for specifically tracked flights
    flights.forEach(flight => {
      const room = `tracking:${flight.icao24}`;
      if (this.io.sockets.adapter.rooms.has(room)) {
        this.io.to(room).emit('tracking:update', {
          flight,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  filterFlightsByTier(flights, subscription) {
    // Apply tier-based filtering
    switch (subscription) {
      case 'enterprise':
        return flights; // All data
      case 'pro':
        return flights.slice(0, 500); // Up to 500 flights
      case 'basic':
        return flights.slice(0, 200); // Up to 200 flights
      default:
        return flights.slice(0, 100); // Up to 100 flights for free
    }
  }

  getFeaturesByTier(subscription) {
    const features = {
      free: {
        maxRegions: 1,
        updateInterval: 30000,
        maxTracking: 5,
        alerts: false,
        history: false,
        export: false
      },
      basic: {
        maxRegions: 3,
        updateInterval: 20000,
        maxTracking: 10,
        alerts: false,
        history: true,
        export: false
      },
      pro: {
        maxRegions: 5,
        updateInterval: 10000,
        maxTracking: 20,
        alerts: true,
        history: true,
        export: true
      },
      enterprise: {
        maxRegions: 10,
        updateInterval: 5000,
        maxTracking: 100,
        alerts: true,
        history: true,
        export: true,
        api: true
      }
    };
    
    return features[subscription] || features.free;
  }

  getMaxRegions(subscription) {
    const limits = {
      free: 1,
      basic: 3,
      pro: 5,
      enterprise: 10
    };
    return limits[subscription] || 1;
  }

  getUpdateInterval(subscription) {
    const intervals = {
      free: 30000,
      basic: 20000,
      pro: 10000,
      enterprise: 5000
    };
    return intervals[subscription] || 30000;
  }

  // Clean up on shutdown
  shutdown() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.io) {
      this.io.close();
    }
  }
}

// Create singleton instance
const wsServer = new FlightWebSocketServer();

// Export for use in main server
export default wsServer;

// Vercel serverless function handler
export function handler(req, res) {
  res.status(200).json({
    message: 'WebSocket server info',
    connections: wsServer.connections.size,
    subscriptions: wsServer.subscriptions.size,
    regions: Array.from(wsServer.subscriptions.keys())
  });
}