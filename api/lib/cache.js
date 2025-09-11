import Redis from 'ioredis';
import crypto from 'crypto';

class CacheManager {
  constructor() {
    this.redis = null;
    this.fallbackCache = new Map();
    this.isConnected = false;
    this.init();
  }

  init() {
    try {
      // Use Redis if available
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = new Redis(redisUrl, {
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('Redis connection failed, using in-memory cache');
            this.isConnected = false;
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        }
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis cache connected');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.error('Redis error:', err.message);
        this.isConnected = false;
      });

    } catch (error) {
      console.warn('Redis not available, using in-memory cache');
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key with namespace
   */
  generateKey(namespace, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});
    
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(sortedParams))
      .digest('hex')
      .substring(0, 8);
    
    return `${namespace}:${hash}`;
  }

  /**
   * Get data from cache
   */
  async get(key) {
    try {
      if (this.isConnected && this.redis) {
        const data = await this.redis.get(key);
        if (data) {
          return JSON.parse(data);
        }
      } else {
        // Fallback to in-memory cache
        const cached = this.fallbackCache.get(key);
        if (cached && cached.expires > Date.now()) {
          return cached.data;
        }
        this.fallbackCache.delete(key);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    return null;
  }

  /**
   * Set data in cache with TTL
   */
  async set(key, data, ttl = 60) {
    try {
      const serialized = JSON.stringify(data);
      
      if (this.isConnected && this.redis) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        // Fallback to in-memory cache with size limit
        if (this.fallbackCache.size > 1000) {
          // Remove oldest entries
          const toDelete = Array.from(this.fallbackCache.keys()).slice(0, 100);
          toDelete.forEach(k => this.fallbackCache.delete(k));
        }
        
        this.fallbackCache.set(key, {
          data,
          expires: Date.now() + (ttl * 1000)
        });
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete from cache
   */
  async del(key) {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
      } else {
        this.fallbackCache.delete(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern) {
    try {
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // Clear matching keys from fallback cache
        Array.from(this.fallbackCache.keys())
          .filter(key => key.includes(pattern.replace('*', '')))
          .forEach(key => this.fallbackCache.delete(key));
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Cache wrapper for async functions
   */
  async cached(key, ttl, fetchFunction) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return {
        ...cached,
        cached: true,
        cacheKey: key
      };
    }

    // Fetch fresh data
    try {
      const data = await fetchFunction();
      
      // Cache the result
      await this.set(key, data, ttl);
      
      return {
        ...data,
        cached: false,
        cacheKey: key
      };
    } catch (error) {
      // On error, try to return stale cache if available
      const stale = await this.get(key);
      if (stale) {
        return {
          ...stale,
          cached: true,
          stale: true,
          cacheKey: key
        };
      }
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (this.isConnected && this.redis) {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();
      return {
        type: 'redis',
        connected: true,
        size: dbSize,
        info
      };
    } else {
      return {
        type: 'memory',
        connected: false,
        size: this.fallbackCache.size,
        maxSize: 1000
      };
    }
  }
}

// TTL configurations (in seconds)
export const CacheTTL = {
  FLIGHTS: parseInt(process.env.CACHE_TTL_FLIGHTS) || 30,        // 30 seconds for real-time data
  WEATHER: parseInt(process.env.CACHE_TTL_WEATHER) || 300,       // 5 minutes for weather
  AIRCRAFT: 3600,      // 1 hour for aircraft details
  AIRPORT: 86400,      // 24 hours for airport data
  ROUTE: 3600,         // 1 hour for route data
  USER: 300,           // 5 minutes for user data
  STATIC: 86400,       // 24 hours for static content
};

// Create singleton instance
const cacheManager = new CacheManager();

// Helper functions for common cache operations
export const flightCache = {
  key: (bbox) => cacheManager.generateKey('flights', { bbox }),
  get: (bbox) => cacheManager.get(flightCache.key(bbox)),
  set: (bbox, data) => cacheManager.set(flightCache.key(bbox), data, CacheTTL.FLIGHTS),
  clear: () => cacheManager.clearPattern('flights:*')
};

export const weatherCache = {
  key: (lat, lon) => cacheManager.generateKey('weather', { lat, lon }),
  get: (lat, lon) => cacheManager.get(weatherCache.key(lat, lon)),
  set: (lat, lon, data) => cacheManager.set(weatherCache.key(lat, lon), data, CacheTTL.WEATHER),
  clear: () => cacheManager.clearPattern('weather:*')
};

export const aircraftCache = {
  key: (icao24) => cacheManager.generateKey('aircraft', { icao24 }),
  get: (icao24) => cacheManager.get(aircraftCache.key(icao24)),
  set: (icao24, data) => cacheManager.set(aircraftCache.key(icao24), data, CacheTTL.AIRCRAFT),
  clear: () => cacheManager.clearPattern('aircraft:*')
};

export default cacheManager;