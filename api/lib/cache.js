// Simple in-memory cache for Vercel serverless functions
class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key, value, ttl = 30) {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiry });
    
    // Clean up old entries
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (v.expiry < now) {
          this.cache.delete(k);
        }
      }
    }
  }

  async delete(key) {
    return this.cache.delete(key);
  }

  async clear() {
    this.cache.clear();
  }
}

export const CacheTTL = {
  FLIGHTS: 30,
  WEATHER: 300,
  STATIC: 3600,
  AIRPORTS: 86400
};

// Create cache instances
export const flightCache = new CacheManager();
export const weatherCache = new CacheManager();
export const staticCache = new CacheManager();

const cacheManager = {
  flight: flightCache,
  weather: weatherCache,
  static: staticCache
};

export default cacheManager;
