/**
 * Rate Limiting and Abuse Control Middleware
 * Enterprise-grade protection with tier-based limits
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const Redis = require('redis');

class RateLimiter {
  constructor(options = {}) {
    this.redisClient = options.redis ? Redis.createClient(options.redis) : null;
    this.limits = this.initializeLimits();
    this.setupLimiters();
  }

  /**
   * Initialize rate limits by subscription tier
   */
  initializeLimits() {
    return {
      free: {
        api: { requests: 100, window: 3600 }, // 100 requests per hour
        search: { requests: 20, window: 3600 }, // 20 searches per hour
        websocket: { connections: 1, window: 3600 },
        export: { requests: 0, window: 3600 }, // No exports for free
        alerts: { requests: 5, window: 3600 }
      },
      plus: {
        api: { requests: 1000, window: 3600 }, // 1K requests per hour
        search: { requests: 200, window: 3600 },
        websocket: { connections: 3, window: 3600 },
        export: { requests: 10, window: 3600 },
        alerts: { requests: 50, window: 3600 }
      },
      pro: {
        api: { requests: 10000, window: 3600 }, // 10K requests per hour
        search: { requests: 1000, window: 3600 },
        websocket: { connections: 10, window: 3600 },
        export: { requests: 100, window: 3600 },
        alerts: { requests: 500, window: 3600 }
      },
      business: {
        api: { requests: 50000, window: 3600 }, // 50K requests per hour
        search: { requests: 5000, window: 3600 },
        websocket: { connections: 25, window: 3600 },
        export: { requests: 500, window: 3600 },
        alerts: { requests: 2000, window: 3600 }
      },
      enterprise: {
        api: { requests: 100000, window: 3600 }, // 100K requests per hour
        search: { requests: 10000, window: 3600 },
        websocket: { connections: 100, window: 3600 },
        export: { requests: 1000, window: 3600 },
        alerts: { requests: 10000, window: 3600 }
      }
    };
  }

  /**
   * Setup rate limiters for different endpoints
   */
  setupLimiters() {
    const LimiterClass = this.redisClient ? RateLimiterRedis : RateLimiterMemory;
    
    // General API limiter
    this.apiLimiter = new LimiterClass({
      storeClient: this.redisClient,
      keyPrefix: 'api_limit',
      points: 1000, // Default for unidentified users
      duration: 3600,
      blockDuration: 3600,
    });

    // Search endpoint limiter
    this.searchLimiter = new LimiterClass({
      storeClient: this.redisClient,
      keyPrefix: 'search_limit',
      points: 100,
      duration: 3600,
      blockDuration: 1800,
    });

    // Heavy operation limiter (exports, bulk operations)
    this.heavyLimiter = new LimiterClass({
      storeClient: this.redisClient,
      keyPrefix: 'heavy_limit',
      points: 10,
      duration: 3600,
      blockDuration: 3600,
    });

    // WebSocket connection limiter
    this.wsLimiter = new LimiterClass({
      storeClient: this.redisClient,
      keyPrefix: 'ws_limit',
      points: 5,
      duration: 3600,
      blockDuration: 1800,
    });

    // Abuse detection limiter (very restrictive)
    this.abuseLimiter = new LimiterClass({
      storeClient: this.redisClient,
      keyPrefix: 'abuse_limit',
      points: 1,
      duration: 300, // 5 minutes
      blockDuration: 86400, // 24 hours
    });
  }

  /**
   * Get user's subscription tier
   */
  getUserTier(req) {
    return req.user?.subscription?.tier || 'free';
  }

  /**
   * Get appropriate limits for user tier
   */
  getLimitsForTier(tier, endpoint) {
    return this.limits[tier]?.[endpoint] || this.limits.free[endpoint];
  }

  /**
   * General API rate limiting middleware
   */
  apiRateLimit() {
    return async (req, res, next) => {
      try {
        const userTier = this.getUserTier(req);
        const limits = this.getLimitsForTier(userTier, 'api');
        const key = req.user?.id || req.ip;

        // Update limiter with user-specific limits
        this.apiLimiter.points = limits.requests;
        this.apiLimiter.duration = limits.window;

        await this.apiLimiter.consume(key);
        
        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': limits.requests,
          'X-RateLimit-Remaining': Math.max(0, limits.requests - 1),
          'X-RateLimit-Reset': new Date(Date.now() + limits.window * 1000),
          'X-RateLimit-Tier': userTier
        });

        next();
      } catch (rejRes) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        
        // Log abuse attempt
        this.logRateLimit(req, 'api', rejRes);
        
        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${secs} seconds.`,
          tier: this.getUserTier(req),
          upgradeUrl: '/pricing'
        });
      }
    };
  }

  /**
   * Search endpoint rate limiting
   */
  searchRateLimit() {
    return async (req, res, next) => {
      try {
        const userTier = this.getUserTier(req);
        const limits = this.getLimitsForTier(userTier, 'search');
        const key = `search_${req.user?.id || req.ip}`;

        this.searchLimiter.points = limits.requests;
        this.searchLimiter.duration = limits.window;

        await this.searchLimiter.consume(key);
        next();
      } catch (rejRes) {
        this.logRateLimit(req, 'search', rejRes);
        
        res.status(429).json({
          error: 'Search rate limit exceeded',
          message: 'Too many searches. Upgrade for higher limits.',
          upgradeUrl: '/pricing'
        });
      }
    };
  }

  /**
   * Export and heavy operations limiter
   */
  heavyOperationsLimit() {
    return async (req, res, next) => {
      try {
        const userTier = this.getUserTier(req);
        const limits = this.getLimitsForTier(userTier, 'export');
        
        if (limits.requests === 0) {
          return res.status(403).json({
            error: 'Feature not available',
            message: 'Data export requires a paid subscription.',
            upgradeUrl: '/pricing'
          });
        }

        const key = `heavy_${req.user?.id || req.ip}`;
        this.heavyLimiter.points = limits.requests;
        this.heavyLimiter.duration = limits.window;

        await this.heavyLimiter.consume(key);
        next();
      } catch (rejRes) {
        this.logRateLimit(req, 'heavy', rejRes);
        
        res.status(429).json({
          error: 'Export limit exceeded',
          message: 'Too many export requests. Upgrade for higher limits.',
          upgradeUrl: '/pricing'
        });
      }
    };
  }

  /**
   * WebSocket connection limiter
   */
  websocketLimit(socket, next) {
    return async () => {
      try {
        const user = socket.handshake.auth?.user;
        const userTier = user?.subscription?.tier || 'free';
        const limits = this.getLimitsForTier(userTier, 'websocket');
        const key = `ws_${user?.id || socket.handshake.address}`;

        this.wsLimiter.points = limits.connections;
        this.wsLimiter.duration = limits.window;

        await this.wsLimiter.consume(key);
        next();
      } catch (rejRes) {
        this.logRateLimit({ user: socket.handshake.auth?.user, ip: socket.handshake.address }, 'websocket', rejRes);
        
        next(new Error('WebSocket connection limit exceeded. Upgrade for more concurrent connections.'));
      }
    };
  }

  /**
   * Abuse detection middleware
   */
  abuseDetection() {
    return async (req, res, next) => {
      const suspiciousPatterns = [
        // Rapid sequential requests
        req.headers['user-agent']?.includes('bot'),
        req.headers['user-agent']?.includes('crawler'),
        // Missing common headers
        !req.headers['accept'],
        !req.headers['accept-language'],
        // Suspicious query patterns
        req.query.toString().length > 1000,
        // Known bad IPs (you'd maintain this list)
        this.isKnownBadIP(req.ip)
      ];

      const suspiciousCount = suspiciousPatterns.filter(Boolean).length;
      
      if (suspiciousCount >= 2) {
        try {
          const key = `abuse_${req.ip}`;
          await this.abuseLimiter.consume(key);
          
          // Log suspicious activity
          this.logSuspiciousActivity(req, suspiciousPatterns);
        } catch (rejRes) {
          // Block for 24 hours
          this.logAbuseDetection(req, rejRes);
          
          return res.status(429).json({
            error: 'Access temporarily restricted',
            message: 'Suspicious activity detected. Contact support if you believe this is an error.'
          });
        }
      }

      next();
    };
  }

  /**
   * DDoS protection middleware
   */
  ddosProtection() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute per IP
      message: {
        error: 'Too many requests from this IP',
        message: 'Please slow down your requests.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * Gradual slowdown for approaching limits
   */
  slowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // Allow 50 requests at full speed
      delayMs: 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 5000, // Maximum delay of 5 seconds
    });
  }

  /**
   * Check if IP is in known bad IP list
   */
  isKnownBadIP(ip) {
    // You'd maintain this list from threat intelligence feeds
    const knownBadIPs = new Set([
      // Add known bad IPs here
    ]);
    
    return knownBadIPs.has(ip);
  }

  /**
   * Log rate limit violations
   */
  logRateLimit(req, endpoint, rejRes) {
    const logData = {
      timestamp: new Date().toISOString(),
      type: 'rate_limit_violation',
      endpoint,
      user: req.user?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      tier: this.getUserTier(req),
      remainingPoints: rejRes.remainingPoints,
      msBeforeNext: rejRes.msBeforeNext
    };

    console.warn('Rate limit violation:', logData);
    
    // Send to your logging service
    if (this.auditLogger) {
      this.auditLogger.warn(logData);
    }
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(req, patterns) {
    const logData = {
      timestamp: new Date().toISOString(),
      type: 'suspicious_activity',
      user: req.user?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      patterns: patterns.map((pattern, index) => pattern ? index : null).filter(Boolean),
      url: req.originalUrl,
      method: req.method
    };

    console.warn('Suspicious activity detected:', logData);
    
    if (this.auditLogger) {
      this.auditLogger.warn(logData);
    }
  }

  /**
   * Log abuse detection
   */
  logAbuseDetection(req, rejRes) {
    const logData = {
      timestamp: new Date().toISOString(),
      type: 'abuse_detected',
      user: req.user?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      blockedFor: rejRes.msBeforeNext,
      url: req.originalUrl,
      method: req.method
    };

    console.error('Abuse detected and blocked:', logData);
    
    if (this.auditLogger) {
      this.auditLogger.error(logData);
    }
  }

  /**
   * Get rate limit status for user
   */
  async getRateLimitStatus(userId, tier = 'free') {
    const limits = this.limits[tier];
    const status = {};

    for (const [endpoint, limiter] of Object.entries({
      api: this.apiLimiter,
      search: this.searchLimiter,
      heavy: this.heavyLimiter
    })) {
      try {
        const res = await limiter.get(userId);
        status[endpoint] = {
          limit: limits[endpoint].requests,
          remaining: Math.max(0, limits[endpoint].requests - (res?.hitCount || 0)),
          resetTime: res?.msBeforeNext ? new Date(Date.now() + res.msBeforeNext) : null
        };
      } catch (error) {
        status[endpoint] = {
          limit: limits[endpoint].requests,
          remaining: limits[endpoint].requests,
          resetTime: null
        };
      }
    }

    return status;
  }
}

/**
 * Express middleware factory
 */
function createRateLimiter(options = {}) {
  const rateLimiter = new RateLimiter(options);

  return {
    // Basic middlewares
    api: rateLimiter.apiRateLimit(),
    search: rateLimiter.searchRateLimit(),
    heavy: rateLimiter.heavyOperationsLimit(),
    abuse: rateLimiter.abuseDetection(),
    ddos: rateLimiter.ddosProtection(),
    slowDown: rateLimiter.slowDown(),
    
    // WebSocket middleware
    websocket: rateLimiter.websocketLimit.bind(rateLimiter),
    
    // Utility functions
    getStatus: rateLimiter.getRateLimitStatus.bind(rateLimiter),
    
    // Instance for advanced usage
    instance: rateLimiter
  };
}

module.exports = { RateLimiter, createRateLimiter };