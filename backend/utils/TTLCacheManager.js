/**
 * TTL Cache Manager for Tiles and Time Bins
 * High-performance caching system for spatial-temporal flight data
 */

const NodeCache = require('node-cache');
const Redis = require('redis');
const { promisify } = require('util');

class TTLCacheManager {
  constructor(options = {}) {
    this.config = {
      // Tile cache settings
      tileCacheTTL: options.tileCacheTTL || 300, // 5 minutes
      tileCacheSize: options.tileCacheSize || 10000,
      
      // Time bin cache settings  
      timeBinTTL: options.timeBinTTL || 120, // 2 minutes
      timeBinSize: options.timeBinSize || 5000,
      
      // Memory cache settings
      memoryLimit: options.memoryLimit || 512 * 1024 * 1024, // 512MB
      compressionEnabled: options.compressionEnabled || true,
      
      // Redis settings
      redisEnabled: options.redisEnabled || false,
      redisConfig: options.redisConfig || {}
    };
    
    // Initialize cache layers
    this.memoryCache = new NodeCache({
      stdTTL: this.config.tileCacheTTL,
      checkperiod: 60,
      useClones: false,
      maxKeys: this.config.tileCacheSize + this.config.timeBinSize
    });
    
    // Redis client for distributed caching
    this.redisClient = null;
    if (this.config.redisEnabled) {
      this.initializeRedis();
    }
    
    // Cache statistics
    this.stats = {
      hits: { memory: 0, redis: 0, total: 0 },
      misses: { memory: 0, redis: 0, total: 0 },
      sets: { memory: 0, redis: 0, total: 0 },
      deletes: { memory: 0, redis: 0, total: 0 },
      evictions: 0,
      memoryUsage: 0
    };
    
    // Specialized caches
    this.tileCache = new TileCache(this, this.config.tileCacheTTL);
    this.timeBinCache = new TimeBinCache(this, this.config.timeBinTTL);
    
    this.startPeriodicCleanup();
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient(this.config.redisConfig);
      
      this.redisClient.on('error', (error) => {
        console.error('Redis cache error:', error);
      });
      
      this.redisClient.on('connect', () => {
        console.log('✅ Redis cache connected');
      });
      
      await this.redisClient.connect();
      
    } catch (error) {
      console.warn('⚠️ Redis cache initialization failed, using memory only:', error.message);
      this.config.redisEnabled = false;
    }
  }

  /**
   * Get data from cache with fallback layers
   */
  async get(key) {
    // Try memory cache first
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue !== undefined) {
      this.stats.hits.memory++;
      this.stats.hits.total++;
      return this.decompress(memoryValue);
    }
    
    this.stats.misses.memory++;
    
    // Try Redis cache if available
    if (this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue !== null) {
          this.stats.hits.redis++;
          this.stats.hits.total++;
          
          // Store in memory cache for faster future access
          const decompressed = this.decompress(redisValue);
          this.memoryCache.set(key, this.compress(decompressed));
          
          return decompressed;
        }
      } catch (error) {
        console.warn('Redis get error:', error.message);
      }
    }
    
    this.stats.misses.redis++;
    this.stats.misses.total++;
    return null;
  }

  /**
   * Set data in cache with TTL
   */
  async set(key, value, ttl = null) {
    const compressed = this.compress(value);
    const cacheTTL = ttl || this.config.tileCacheTTL;
    
    // Set in memory cache
    this.memoryCache.set(key, compressed, cacheTTL);
    this.stats.sets.memory++;
    
    // Set in Redis cache if available
    if (this.redisClient) {
      try {
        await this.redisClient.setEx(key, cacheTTL, compressed);
        this.stats.sets.redis++;
      } catch (error) {
        console.warn('Redis set error:', error.message);
      }
    }
    
    this.stats.sets.total++;
    this.updateMemoryUsage();
  }

  /**
   * Delete from all cache layers
   */
  async delete(key) {
    // Delete from memory
    this.memoryCache.del(key);
    this.stats.deletes.memory++;
    
    // Delete from Redis
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
        this.stats.deletes.redis++;
      } catch (error) {
        console.warn('Redis delete error:', error.message);
      }
    }
    
    this.stats.deletes.total++;
  }

  /**
   * Compress data for storage
   */
  compress(data) {
    if (!this.config.compressionEnabled || typeof data !== 'object') {
      return data;
    }
    
    try {
      const json = JSON.stringify(data);
      // Simple compression: remove whitespace and common patterns
      return json.replace(/\s+/g, ' ').trim();
    } catch (error) {
      return data;
    }
  }

  /**
   * Decompress stored data
   */
  decompress(data) {
    if (!this.config.compressionEnabled || typeof data !== 'string') {
      return data;
    }
    
    try {
      return JSON.parse(data);
    } catch (error) {
      return data;
    }
  }

  /**
   * Update memory usage statistics
   */
  updateMemoryUsage() {
    this.stats.memoryUsage = this.memoryCache.getStats().vsize || 0;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startPeriodicCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60000); // Every minute
  }

  /**
   * Perform cache cleanup and optimization
   */
  performCleanup() {
    // Clean expired entries from memory cache
    this.memoryCache.flushStats();
    
    // Check memory usage and evict if necessary
    if (this.stats.memoryUsage > this.config.memoryLimit) {
      this.evictLeastUsed();
    }
    
    this.updateMemoryUsage();
  }

  /**
   * Evict least recently used entries
   */
  evictLeastUsed() {
    const keys = this.memoryCache.keys();
    const keysToEvict = Math.floor(keys.length * 0.1); // Evict 10%
    
    for (let i = 0; i < keysToEvict && i < keys.length; i++) {
      this.memoryCache.del(keys[i]);
      this.stats.evictions++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memStats = this.memoryCache.getStats();
    const hitRate = this.stats.hits.total + this.stats.misses.total > 0 ?
      (this.stats.hits.total / (this.stats.hits.total + this.stats.misses.total)) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate,
      memoryStats: {
        keys: memStats.keys,
        hits: memStats.hits,
        misses: memStats.misses,
        ksize: memStats.ksize,
        vsize: memStats.vsize
      },
      redisConnected: this.redisClient ? this.redisClient.isOpen : false
    };
  }

  /**
   * Clear all caches
   */
  async clearAll() {
    this.memoryCache.flushAll();
    
    if (this.redisClient) {
      try {
        await this.redisClient.flushAll();
      } catch (error) {
        console.warn('Redis clear error:', error.message);
      }
    }
    
    // Reset statistics
    this.stats = {
      hits: { memory: 0, redis: 0, total: 0 },
      misses: { memory: 0, redis: 0, total: 0 },
      sets: { memory: 0, redis: 0, total: 0 },
      deletes: { memory: 0, redis: 0, total: 0 },
      evictions: 0,
      memoryUsage: 0
    };
  }

  /**
   * Shutdown cache manager
   */
  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.memoryCache.close();
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    console.log('✅ TTL Cache Manager shutdown complete');
  }
}

/**
 * Specialized cache for map tiles
 */
class TileCache {
  constructor(cacheManager, defaultTTL) {
    this.cache = cacheManager;
    this.defaultTTL = defaultTTL;
    this.tileSize = 256;
  }

  /**
   * Get tile data
   */
  async getTile(zoom, x, y, layer = 'flights') {
    const key = this.getTileKey(zoom, x, y, layer);
    return await this.cache.get(key);
  }

  /**
   * Set tile data with appropriate TTL based on zoom level
   */
  async setTile(zoom, x, y, data, layer = 'flights') {
    const key = this.getTileKey(zoom, x, y, layer);
    const ttl = this.getTileTTL(zoom);
    
    await this.cache.set(key, data, ttl);
  }

  /**
   * Generate tile cache key
   */
  getTileKey(zoom, x, y, layer) {
    return `tile:${layer}:${zoom}:${x}:${y}`;
  }

  /**
   * Calculate TTL based on zoom level
   */
  getTileTTL(zoom) {
    // Higher zoom = shorter TTL (more frequent updates needed)
    if (zoom >= 12) return 60;      // 1 minute for high zoom
    if (zoom >= 8) return 180;      // 3 minutes for medium zoom
    if (zoom >= 4) return 300;      // 5 minutes for low zoom
    return 600;                     // 10 minutes for very low zoom
  }

  /**
   * Preload tiles around a viewport
   */
  async preloadTiles(centerX, centerY, zoom, radius = 2) {
    const promises = [];
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        if (x >= 0 && y >= 0 && x < Math.pow(2, zoom) && y < Math.pow(2, zoom)) {
          promises.push(this.getTile(zoom, x, y));
        }
      }
    }
    
    return await Promise.allSettled(promises);
  }

  /**
   * Clear tiles for specific zoom levels
   */
  async clearZoomLevel(zoom, layer = 'flights') {
    const pattern = `tile:${layer}:${zoom}:*`;
    // Implementation would depend on cache backend capabilities
  }
}

/**
 * Specialized cache for time-binned data
 */
class TimeBinCache {
  constructor(cacheManager, defaultTTL) {
    this.cache = cacheManager;
    this.defaultTTL = defaultTTL;
    this.binSizeMs = 60000; // 1 minute bins
  }

  /**
   * Get time bin data
   */
  async getTimeBin(timestamp, bounds = null) {
    const binKey = this.getTimeBinKey(timestamp, bounds);
    return await this.cache.get(binKey);
  }

  /**
   * Set time bin data
   */
  async setTimeBin(timestamp, data, bounds = null) {
    const binKey = this.getTimeBinKey(timestamp, bounds);
    const ttl = this.getTimeBinTTL(timestamp);
    
    await this.cache.set(binKey, data, ttl);
  }

  /**
   * Generate time bin cache key
   */
  getTimeBinKey(timestamp, bounds) {
    const binTime = Math.floor(timestamp / this.binSizeMs) * this.binSizeMs;
    const boundsKey = bounds ? 
      `${bounds.north}_${bounds.south}_${bounds.east}_${bounds.west}` : 'global';
    
    return `timebin:${binTime}:${boundsKey}`;
  }

  /**
   * Calculate TTL based on data age
   */
  getTimeBinTTL(timestamp) {
    const age = Date.now() - timestamp;
    
    if (age < 300000) return 30;      // 30 seconds for very recent data
    if (age < 1800000) return 120;    // 2 minutes for recent data  
    if (age < 3600000) return 300;    // 5 minutes for older data
    return 600;                       // 10 minutes for historical data
  }

  /**
   * Get time range data (multiple bins)
   */
  async getTimeRange(startTime, endTime, bounds = null) {
    const startBin = Math.floor(startTime / this.binSizeMs) * this.binSizeMs;
    const endBin = Math.floor(endTime / this.binSizeMs) * this.binSizeMs;
    
    const promises = [];
    for (let binTime = startBin; binTime <= endBin; binTime += this.binSizeMs) {
      promises.push(this.getTimeBin(binTime, bounds));
    }
    
    const results = await Promise.allSettled(promises);
    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);
  }

  /**
   * Preload future time bins
   */
  async preloadFutureBins(currentTime, count = 5, bounds = null) {
    const promises = [];
    
    for (let i = 1; i <= count; i++) {
      const futureTime = currentTime + (i * this.binSizeMs);
      promises.push(this.getTimeBin(futureTime, bounds));
    }
    
    return await Promise.allSettled(promises);
  }
}

module.exports = { TTLCacheManager, TileCache, TimeBinCache };