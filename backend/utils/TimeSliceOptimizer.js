/**
 * Time-Slice Query Optimization for Flight Data
 * Optimized for read-heavy workloads with temporal queries
 */

const { Pool } = require('pg');

class TimeSliceOptimizer {
  constructor(options = {}) {
    this.dbPool = options.dbPool;
    this.timeSliceDuration = options.timeSliceDuration || 60000; // 1 minute
    this.maxConcurrentQueries = options.maxConcurrentQueries || 10;
    this.cacheSize = options.cacheSize || 1000;
    
    // Query optimization cache
    this.queryCache = new Map();
    this.executionPlans = new Map();
    this.activeQueries = new Set();
    
    // Performance metrics
    this.metrics = {
      queriesExecuted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      optimizationsApplied: 0
    };
    
    this.initializeOptimizations();
  }

  /**
   * Initialize database optimizations
   */
  async initializeOptimizations() {
    if (!this.dbPool) return;
    
    try {
      const client = await this.dbPool.connect();
      
      // Create optimized indexes for time-slice queries
      await this.createTimeSliceIndexes(client);
      
      // Set up prepared statements
      await this.setupPreparedStatements(client);
      
      // Configure query planner
      await this.optimizeQueryPlanner(client);
      
      client.release();
      
      console.log('✅ Time-slice optimizations initialized');
    } catch (error) {
      console.error('❌ Time-slice optimization setup failed:', error);
    }
  }

  /**
   * Create optimized indexes for temporal queries
   */
  async createTimeSliceIndexes(client) {
    const indexes = [
      // Composite index for time-range queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flight_positions_time_location 
       ON flight_positions (timestamp, latitude, longitude) 
       WHERE timestamp > NOW() - INTERVAL '24 hours'`,
      
      // Partial index for recent data
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flight_positions_recent 
       ON flight_positions (flight_id, timestamp DESC) 
       WHERE timestamp > NOW() - INTERVAL '6 hours'`,
      
      // GiST index for spatial-temporal queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flight_positions_spatiotemporal 
       ON flight_positions USING gist (
         ll_to_earth(latitude, longitude), 
         timestamp
       )`,
      
      // BRIN index for large time ranges (archival data)
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flight_positions_time_brin 
       ON flight_positions USING brin (timestamp) 
       WITH (pages_per_range = 128)`,
      
      // Hash index for flight_id lookups
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flight_positions_flight_id_hash 
       ON flight_positions USING hash (flight_id)`
    ];
    
    for (const indexSQL of indexes) {
      try {
        await client.query(indexSQL);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.warn('Index creation warning:', error.message);
        }
      }
    }
  }

  /**
   * Setup prepared statements for common queries
   */
  async setupPreparedStatements(client) {
    const statements = {
      // Time slice query for viewport
      'get_viewport_slice': `
        SELECT flight_id, callsign, latitude, longitude, altitude, 
               ground_speed, heading, timestamp
        FROM flight_positions 
        WHERE timestamp >= $1 AND timestamp <= $2
          AND latitude BETWEEN $3 AND $4
          AND longitude BETWEEN $5 AND $6
        ORDER BY timestamp DESC
      `,
      
      // Flight trajectory over time
      'get_flight_trajectory': `
        SELECT latitude, longitude, altitude, ground_speed, 
               heading, timestamp
        FROM flight_positions 
        WHERE flight_id = $1 
          AND timestamp >= $2 AND timestamp <= $3
        ORDER BY timestamp ASC
      `,
      
      // Active flights in region
      'get_active_flights': `
        SELECT DISTINCT ON (flight_id) 
               flight_id, callsign, latitude, longitude, altitude,
               ground_speed, heading, timestamp
        FROM flight_positions 
        WHERE timestamp >= NOW() - INTERVAL '10 minutes'
          AND latitude BETWEEN $1 AND $2
          AND longitude BETWEEN $3 AND $4
        ORDER BY flight_id, timestamp DESC
      `,
      
      // Historical density query
      'get_traffic_density': `
        SELECT 
          FLOOR(latitude * 10) / 10 as lat_bucket,
          FLOOR(longitude * 10) / 10 as lng_bucket,
          COUNT(*) as flight_count,
          AVG(altitude) as avg_altitude
        FROM flight_positions 
        WHERE timestamp >= $1 AND timestamp <= $2
          AND latitude BETWEEN $3 AND $4
          AND longitude BETWEEN $5 AND $6
        GROUP BY lat_bucket, lng_bucket
        HAVING COUNT(*) > $7
      `
    };
    
    for (const [name, query] of Object.entries(statements)) {
      try {
        await client.query(`PREPARE ${name} AS ${query}`);
      } catch (error) {
        // Prepared statement might already exist
        if (!error.message.includes('already exists')) {
          console.warn(`Prepared statement ${name} warning:`, error.message);
        }
      }
    }
  }

  /**
   * Optimize query planner settings
   */
  async optimizeQueryPlanner(client) {
    const settings = [
      'SET enable_seqscan = off',
      'SET enable_indexscan = on',
      'SET enable_bitmapscan = on',
      'SET work_mem = "128MB"',
      'SET effective_cache_size = "4GB"',
      'SET random_page_cost = 1.1',
      'SET cpu_tuple_cost = 0.01'
    ];
    
    for (const setting of settings) {
      try {
        await client.query(setting);
      } catch (error) {
        console.warn('Query optimizer setting warning:', error.message);
      }
    }
  }

  /**
   * Get flights in viewport with time slice optimization
   */
  async getViewportSlice(bounds, startTime, endTime, options = {}) {
    const queryKey = `viewport_${JSON.stringify(bounds)}_${startTime}_${endTime}`;
    
    // Check cache first
    if (this.queryCache.has(queryKey)) {
      this.metrics.cacheHits++;
      return this.queryCache.get(queryKey);
    }
    
    this.metrics.cacheMisses++;
    const startQueryTime = Date.now();
    
    try {
      // Optimize query based on time range
      const optimizedQuery = this.optimizeTimeRangeQuery(startTime, endTime, bounds);
      
      const client = await this.dbPool.connect();
      
      const result = await client.query(optimizedQuery.sql, optimizedQuery.params);
      
      client.release();
      
      const queryTime = Date.now() - startQueryTime;
      this.updateQueryMetrics(queryTime);
      
      // Cache result if within reasonable size
      if (result.rows.length < 10000) {
        this.cacheResult(queryKey, result.rows);
      }
      
      return result.rows;
      
    } catch (error) {
      console.error('Viewport slice query error:', error);
      throw error;
    }
  }

  /**
   * Optimize query based on time range characteristics
   */
  optimizeTimeRangeQuery(startTime, endTime, bounds) {
    const timeRange = endTime - startTime;
    const isRecentData = (Date.now() - endTime) < 3600000; // 1 hour
    
    let sql, params;
    
    if (timeRange <= 300000 && isRecentData) {
      // Short time range, recent data - use hot partition
      sql = `
        SELECT flight_id, callsign, latitude, longitude, altitude, 
               ground_speed, heading, timestamp
        FROM flight_positions_hot 
        WHERE timestamp >= $1 AND timestamp <= $2
          AND latitude BETWEEN $3 AND $4
          AND longitude BETWEEN $5 AND $6
        ORDER BY timestamp DESC
        LIMIT 5000
      `;
    } else if (timeRange > 86400000) {
      // Large time range - use aggregated view
      sql = `
        SELECT flight_id, callsign, latitude, longitude, altitude,
               ground_speed, heading, timestamp
        FROM flight_positions_aggregated
        WHERE time_bucket >= $1 AND time_bucket <= $2
          AND latitude BETWEEN $3 AND $4
          AND longitude BETWEEN $5 AND $6
        ORDER BY time_bucket DESC
      `;
    } else {
      // Standard query with optimized hints
      sql = `
        /*+ IndexScan(flight_positions idx_flight_positions_time_location) */
        SELECT flight_id, callsign, latitude, longitude, altitude,
               ground_speed, heading, timestamp
        FROM flight_positions 
        WHERE timestamp >= $1 AND timestamp <= $2
          AND latitude BETWEEN $3 AND $4
          AND longitude BETWEEN $5 AND $6
        ORDER BY timestamp DESC
        LIMIT 10000
      `;
    }
    
    params = [
      new Date(startTime),
      new Date(endTime),
      bounds.south,
      bounds.north,
      bounds.west,
      bounds.east
    ];
    
    return { sql, params };
  }

  /**
   * Get flight trajectory with temporal optimization
   */
  async getFlightTrajectory(flightId, startTime, endTime, resolution = 'high') {
    const queryKey = `trajectory_${flightId}_${startTime}_${endTime}_${resolution}`;
    
    if (this.queryCache.has(queryKey)) {
      this.metrics.cacheHits++;
      return this.queryCache.get(queryKey);
    }
    
    this.metrics.cacheMisses++;
    const startQueryTime = Date.now();
    
    try {
      const client = await this.dbPool.connect();
      
      let sql, params;
      
      if (resolution === 'low') {
        // Downsample for long trajectories
        sql = `
          SELECT latitude, longitude, altitude, ground_speed, heading, timestamp
          FROM (
            SELECT DISTINCT ON (date_trunc('minute', timestamp)) 
                   latitude, longitude, altitude, ground_speed, heading, timestamp
            FROM flight_positions 
            WHERE flight_id = $1 
              AND timestamp >= $2 AND timestamp <= $3
            ORDER BY date_trunc('minute', timestamp), timestamp DESC
          ) t
          ORDER BY timestamp ASC
        `;
      } else {
        // High resolution trajectory
        sql = `
          SELECT latitude, longitude, altitude, ground_speed, heading, timestamp
          FROM flight_positions 
          WHERE flight_id = $1 
            AND timestamp >= $2 AND timestamp <= $3
          ORDER BY timestamp ASC
        `;
      }
      
      params = [flightId, new Date(startTime), new Date(endTime)];
      
      const result = await client.query(sql, params);
      client.release();
      
      const queryTime = Date.now() - startQueryTime;
      this.updateQueryMetrics(queryTime);
      
      // Cache trajectory data
      this.cacheResult(queryKey, result.rows);
      
      return result.rows;
      
    } catch (error) {
      console.error('Flight trajectory query error:', error);
      throw error;
    }
  }

  /**
   * Get traffic density with spatial-temporal optimization
   */
  async getTrafficDensity(bounds, startTime, endTime, gridSize = 0.1) {
    const queryKey = `density_${JSON.stringify(bounds)}_${startTime}_${endTime}_${gridSize}`;
    
    if (this.queryCache.has(queryKey)) {
      this.metrics.cacheHits++;
      return this.queryCache.get(queryKey);
    }
    
    const startQueryTime = Date.now();
    
    try {
      const client = await this.dbPool.connect();
      
      const sql = `
        WITH density_grid AS (
          SELECT 
            FLOOR(latitude / $7) * $7 as lat_bucket,
            FLOOR(longitude / $7) * $7 as lng_bucket,
            COUNT(*) as flight_count,
            AVG(altitude) as avg_altitude,
            COUNT(DISTINCT flight_id) as unique_flights
          FROM flight_positions 
          WHERE timestamp >= $1 AND timestamp <= $2
            AND latitude BETWEEN $3 AND $4
            AND longitude BETWEEN $5 AND $6
          GROUP BY lat_bucket, lng_bucket
          HAVING COUNT(*) > 5
        )
        SELECT lat_bucket, lng_bucket, flight_count, avg_altitude, unique_flights
        FROM density_grid
        ORDER BY flight_count DESC
        LIMIT 1000
      `;
      
      const params = [
        new Date(startTime),
        new Date(endTime),
        bounds.south,
        bounds.north,
        bounds.west,
        bounds.east,
        gridSize
      ];
      
      const result = await client.query(sql, params);
      client.release();
      
      const queryTime = Date.now() - startQueryTime;
      this.updateQueryMetrics(queryTime);
      
      this.cacheResult(queryKey, result.rows);
      
      return result.rows;
      
    } catch (error) {
      console.error('Traffic density query error:', error);
      throw error;
    }
  }

  /**
   * Cache query result with LRU eviction
   */
  cacheResult(key, data) {
    if (this.queryCache.size >= this.cacheSize) {
      // Remove oldest entry (LRU)
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }
    
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  /**
   * Update query performance metrics
   */
  updateQueryMetrics(queryTime) {
    this.metrics.queriesExecuted++;
    
    this.metrics.averageQueryTime = 
      (this.metrics.averageQueryTime * (this.metrics.queriesExecuted - 1) + queryTime) / 
      this.metrics.queriesExecuted;
    
    if (queryTime > 1000) {
      this.metrics.slowQueries++;
    }
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(maxAge = 300000) { // 5 minutes
    const now = Date.now();
    
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 ?
      (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0;
    
    return {
      ...this.metrics,
      cacheSize: this.queryCache.size,
      cacheHitRate,
      slowQueryRate: this.metrics.queriesExecuted > 0 ?
        (this.metrics.slowQueries / this.metrics.queriesExecuted) * 100 : 0
    };
  }

  /**
   * Force cache cleanup
   */
  clearCache() {
    this.queryCache.clear();
    this.executionPlans.clear();
  }

  /**
   * Shutdown optimizer
   */
  shutdown() {
    this.clearCache();
    console.log('✅ Time-slice optimizer shutdown complete');
  }
}

module.exports = { TimeSliceOptimizer };