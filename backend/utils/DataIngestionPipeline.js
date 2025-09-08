/**
 * High-Performance Data Ingestion Pipeline for FlightTrace
 * Optimized for write-heavy workloads at FlightRadar24 scale
 */

const { Worker } = require('worker_threads');
const EventEmitter = require('events');

class DataIngestionPipeline extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.batchSize = options.batchSize || 1000;
    this.flushInterval = options.flushInterval || 1000; // ms
    this.maxMemoryUsage = options.maxMemoryUsage || 500 * 1024 * 1024; // 500MB
    this.workerCount = options.workerCount || Math.min(4, require('os').cpus().length);
    this.compressionLevel = options.compressionLevel || 6;
    
    // Internal state
    this.incomingBuffer = [];
    this.processingBuffer = [];
    this.workers = [];
    this.isProcessing = false;
    this.lastFlush = Date.now();
    
    // Performance metrics
    this.metrics = {
      recordsReceived: 0,
      recordsProcessed: 0,
      recordsDropped: 0,
      batchesProcessed: 0,
      averageBatchSize: 0,
      averageProcessTime: 0,
      memoryUsage: 0,
      errorCount: 0
    };
    
    // Database connections pool
    this.dbPool = null;
    this.initializeDatabase(options.database);
    
    // Initialize workers
    this.initializeWorkers();
    
    // Start processing
    this.startProcessing();
  }

  /**
   * Initialize database connection pool
   */
  async initializeDatabase(dbConfig) {
    if (!dbConfig) return;
    
    try {
      // Example with PostgreSQL pool
      const { Pool } = require('pg');
      this.dbPool = new Pool({
        ...dbConfig,
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      
      // Optimize for write performance
      await this.dbPool.query(`
        SET synchronous_commit = off;
        SET wal_buffers = '64MB';
        SET checkpoint_completion_target = 0.9;
        SET max_wal_size = '4GB';
      `);
      
      console.log('✅ Database connection pool initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Initialize worker threads for parallel processing
   */
  initializeWorkers() {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(__filename.replace('.js', 'Worker.js'));
      
      worker.on('message', (message) => {
        this.handleWorkerMessage(message, worker);
      });
      
      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
        this.metrics.errorCount++;
        this.emit('workerError', error, i);
      });
      
      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker ${i} exited with code ${code}`);
          this.restartWorker(i);
        }
      });
      
      this.workers.push({
        worker,
        id: i,
        busy: false,
        processed: 0
      });
    }
    
    console.log(`✅ Initialized ${this.workerCount} worker threads`);
  }

  /**
   * Restart a failed worker
   */
  restartWorker(workerId) {
    const workerInfo = this.workers[workerId];
    if (workerInfo) {
      workerInfo.worker.terminate();
      
      const newWorker = new Worker(__filename.replace('.js', 'Worker.js'));
      workerInfo.worker = newWorker;
      workerInfo.busy = false;
      
      console.log(`🔄 Restarted worker ${workerId}`);
    }
  }

  /**
   * Handle messages from worker threads
   */
  handleWorkerMessage(message, worker) {
    const { type, data, error, workerId } = message;
    const workerInfo = this.workers.find(w => w.worker === worker);
    
    switch (type) {
      case 'batch_processed':
        if (workerInfo) {
          workerInfo.busy = false;
          workerInfo.processed += data.recordsProcessed;
        }
        
        this.metrics.recordsProcessed += data.recordsProcessed;
        this.metrics.batchesProcessed++;
        
        this.emit('batchProcessed', data);
        break;
        
      case 'batch_error':
        console.error('Batch processing error:', error);
        this.metrics.errorCount++;
        
        if (workerInfo) {
          workerInfo.busy = false;
        }
        
        this.emit('processingError', error);
        break;
        
      case 'worker_ready':
        console.log(`Worker ${workerId} ready`);
        break;
    }
  }

  /**
   * Add flight data record to ingestion pipeline
   */
  ingest(record) {
    if (!record || typeof record !== 'object') {
      this.metrics.recordsDropped++;
      return false;
    }
    
    // Memory pressure check
    if (this.getMemoryUsage() > this.maxMemoryUsage) {
      this.forceFlush();
      this.metrics.recordsDropped++;
      return false;
    }
    
    // Enrich record with metadata
    const enrichedRecord = {
      ...record,
      ingestionTime: Date.now(),
      processingPriority: this.calculatePriority(record)
    };
    
    this.incomingBuffer.push(enrichedRecord);
    this.metrics.recordsReceived++;
    
    // Trigger flush if batch is full
    if (this.incomingBuffer.length >= this.batchSize) {
      this.scheduleFlush();
    }
    
    return true;
  }

  /**
   * Calculate processing priority for records
   */
  calculatePriority(record) {
    let priority = 1;
    
    // Emergency situations = highest priority
    if (record.emergency || record.squawk === '7700' || record.squawk === '7600' || record.squawk === '7500') {
      priority = 10;
    }
    // Commercial flights = high priority
    else if (record.callsign && /^[A-Z]{3}\d+/.test(record.callsign)) {
      priority = 5;
    }
    // Military/special = medium priority
    else if (record.category && ['military', 'government'].includes(record.category.toLowerCase())) {
      priority = 3;
    }
    // General aviation = normal priority
    else {
      priority = 1;
    }
    
    return priority;
  }

  /**
   * Start the processing loop
   */
  startProcessing() {
    this.processingInterval = setInterval(() => {
      this.processBuffers();
    }, this.flushInterval);
    
    // Periodic memory cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 30000); // 30 seconds
  }

  /**
   * Process buffered data
   */
  async processBuffers() {
    if (this.isProcessing || this.incomingBuffer.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      // Move incoming to processing buffer
      this.processingBuffer = [...this.incomingBuffer];
      this.incomingBuffer = [];
      
      // Sort by priority
      this.processingBuffer.sort((a, b) => b.processingPriority - a.processingPriority);
      
      // Split into batches for workers
      const batches = this.createBatches(this.processingBuffer);
      
      // Distribute to available workers
      const processingPromises = [];
      for (const batch of batches) {
        const worker = this.getAvailableWorker();
        if (worker) {
          worker.busy = true;
          processingPromises.push(this.processBatchWithWorker(batch, worker));
        } else {
          // No workers available, process in main thread
          processingPromises.push(this.processBatchMainThread(batch));
        }
      }
      
      await Promise.allSettled(processingPromises);
      
      const processTime = Date.now() - startTime;
      this.updateMetrics(processTime, this.processingBuffer.length);
      
      this.processingBuffer = [];
      this.lastFlush = Date.now();
      
    } catch (error) {
      console.error('Processing error:', error);
      this.metrics.errorCount++;
      this.emit('error', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Create batches from processing buffer
   */
  createBatches(records) {
    const batches = [];
    for (let i = 0; i < records.length; i += this.batchSize) {
      batches.push(records.slice(i, i + this.batchSize));
    }
    return batches;
  }

  /**
   * Get available worker
   */
  getAvailableWorker() {
    return this.workers.find(w => !w.busy);
  }

  /**
   * Process batch with worker thread
   */
  async processBatchWithWorker(batch, workerInfo) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker timeout'));
      }, 30000); // 30 second timeout
      
      const handleMessage = (message) => {
        if (message.type === 'batch_processed' || message.type === 'batch_error') {
          clearTimeout(timeout);
          workerInfo.worker.off('message', handleMessage);
          
          if (message.type === 'batch_error') {
            reject(new Error(message.error));
          } else {
            resolve(message.data);
          }
        }
      };
      
      workerInfo.worker.on('message', handleMessage);
      workerInfo.worker.postMessage({
        type: 'process_batch',
        batch: batch,
        dbConfig: this.getDbConfig()
      });
    });
  }

  /**
   * Process batch in main thread (fallback)
   */
  async processBatchMainThread(batch) {
    if (!this.dbPool) {
      throw new Error('Database pool not initialized');
    }
    
    const client = await this.dbPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Bulk insert using COPY for maximum performance
      const values = batch.map(record => this.recordToValues(record));
      const copyQuery = `
        COPY flight_positions (
          flight_id, callsign, latitude, longitude, altitude, 
          ground_speed, heading, vertical_speed, squawk, 
          on_ground, timestamp, ingestion_time
        ) FROM STDIN WITH CSV
      `;
      
      const stream = client.query(copyQuery);
      for (const value of values) {
        stream.write(value.join(',') + '\n');
      }
      stream.end();
      
      await client.query('COMMIT');
      
      return {
        recordsProcessed: batch.length,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Convert record to database values
   */
  recordToValues(record) {
    return [
      record.flight_id || null,
      record.callsign || null,
      record.latitude || null,
      record.longitude || null,
      record.altitude || null,
      record.ground_speed || null,
      record.heading || null,
      record.vertical_speed || null,
      record.squawk || null,
      record.on_ground || false,
      new Date(record.timestamp || Date.now()).toISOString(),
      new Date(record.ingestionTime).toISOString()
    ];
  }

  /**
   * Update performance metrics
   */
  updateMetrics(processTime, recordCount) {
    this.metrics.averageProcessTime = 
      (this.metrics.averageProcessTime * (this.metrics.batchesProcessed - 1) + processTime) / 
      this.metrics.batchesProcessed;
    
    this.metrics.averageBatchSize = 
      (this.metrics.averageBatchSize * (this.metrics.batchesProcessed - 1) + recordCount) / 
      this.metrics.batchesProcessed;
    
    this.metrics.memoryUsage = this.getMemoryUsage();
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage() {
    const used = process.memoryUsage();
    return used.heapUsed + used.external;
  }

  /**
   * Schedule immediate flush
   */
  scheduleFlush() {
    if (!this.flushTimeout) {
      this.flushTimeout = setImmediate(() => {
        this.flushTimeout = null;
        this.processBuffers();
      });
    }
  }

  /**
   * Force immediate flush
   */
  async forceFlush() {
    if (this.flushTimeout) {
      clearImmediate(this.flushTimeout);
      this.flushTimeout = null;
    }
    
    await this.processBuffers();
  }

  /**
   * Perform periodic cleanup
   */
  performCleanup() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear old metrics
    if (this.metrics.batchesProcessed > 10000) {
      this.metrics = {
        ...this.metrics,
        recordsReceived: 0,
        recordsProcessed: 0,
        batchesProcessed: 0
      };
    }
  }

  /**
   * Get database configuration for workers
   */
  getDbConfig() {
    return this.dbPool ? this.dbPool.options : null;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const now = Date.now();
    
    return {
      ...this.metrics,
      bufferedRecords: this.incomingBuffer.length + this.processingBuffer.length,
      isProcessing: this.isProcessing,
      timeSinceLastFlush: now - this.lastFlush,
      workerStats: this.workers.map((w, i) => ({
        id: i,
        busy: w.busy,
        processed: w.processed
      })),
      throughput: this.metrics.recordsProcessed > 0 ? 
        this.metrics.recordsProcessed / (this.metrics.averageProcessTime / 1000) : 0,
      memoryUsagePercent: (this.metrics.memoryUsage / this.maxMemoryUsage) * 100
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down ingestion pipeline...');
    
    // Stop new processing
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Flush remaining data
    await this.forceFlush();
    
    // Terminate workers
    for (const workerInfo of this.workers) {
      await workerInfo.worker.terminate();
    }
    
    // Close database connections
    if (this.dbPool) {
      await this.dbPool.end();
    }
    
    console.log('✅ Pipeline shutdown complete');
  }
}

module.exports = { DataIngestionPipeline };