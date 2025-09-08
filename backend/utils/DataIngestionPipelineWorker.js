/**
 * Worker Thread for Data Ingestion Pipeline
 * Handles batch processing in parallel threads
 */

const { parentPort } = require('worker_threads');
const { Pool } = require('pg');

class IngestionWorker {
  constructor() {
    this.dbPool = null;
    this.workerId = Math.floor(Math.random() * 10000);
    
    this.setupMessageHandler();
    this.reportReady();
  }

  /**
   * Setup message handling from main thread
   */
  setupMessageHandler() {
    parentPort.on('message', async (message) => {
      const { type, batch, dbConfig } = message;
      
      switch (type) {
        case 'process_batch':
          await this.processBatch(batch, dbConfig);
          break;
          
        case 'shutdown':
          await this.shutdown();
          break;
          
        default:
          console.warn(`Unknown message type: ${type}`);
      }
    });
  }

  /**
   * Report worker ready status
   */
  reportReady() {
    parentPort.postMessage({
      type: 'worker_ready',
      workerId: this.workerId
    });
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase(dbConfig) {
    if (!dbConfig || this.dbPool) return;
    
    try {
      this.dbPool = new Pool({
        ...dbConfig,
        max: 2, // Limit connections per worker
        min: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      
      // Optimize for write performance
      await this.dbPool.query(`
        SET synchronous_commit = off;
        SET wal_buffers = '32MB';
        SET work_mem = '64MB';
      `);
      
    } catch (error) {
      throw new Error(`Worker DB initialization failed: ${error.message}`);
    }
  }

  /**
   * Process a batch of flight records
   */
  async processBatch(batch, dbConfig) {
    const startTime = Date.now();
    
    try {
      await this.initializeDatabase(dbConfig);
      
      if (!this.dbPool) {
        throw new Error('Database pool not initialized');
      }
      
      const client = await this.dbPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Use bulk insert with prepared statements for performance
        await this.bulkInsertRecords(client, batch);
        
        await client.query('COMMIT');
        
        const processTime = Date.now() - startTime;
        
        parentPort.postMessage({
          type: 'batch_processed',
          data: {
            recordsProcessed: batch.length,
            processingTime: processTime,
            workerId: this.workerId,
            averageRecordTime: processTime / batch.length
          }
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      parentPort.postMessage({
        type: 'batch_error',
        error: error.message,
        workerId: this.workerId,
        batchSize: batch.length
      });
    }
  }

  /**
   * Perform bulk insert using optimized methods
   */
  async bulkInsertRecords(client, records) {
    // Group records by table/type for efficient insertion
    const flightPositions = [];
    const flightMetadata = [];
    const alerts = [];
    
    for (const record of records) {
      this.categorizeRecord(record, flightPositions, flightMetadata, alerts);
    }
    
    // Insert each category
    if (flightPositions.length > 0) {
      await this.insertFlightPositions(client, flightPositions);
    }
    
    if (flightMetadata.length > 0) {
      await this.insertFlightMetadata(client, flightMetadata);
    }
    
    if (alerts.length > 0) {
      await this.insertAlerts(client, alerts);
    }
  }

  /**
   * Categorize record into appropriate tables
   */
  categorizeRecord(record, flightPositions, flightMetadata, alerts) {
    // Basic position data
    if (record.latitude && record.longitude) {
      flightPositions.push({
        flight_id: record.flight_id || record.icao24 || record.callsign,
        callsign: record.callsign,
        icao24: record.icao24,
        latitude: parseFloat(record.latitude),
        longitude: parseFloat(record.longitude),
        altitude: record.altitude ? parseInt(record.altitude) : null,
        ground_speed: record.ground_speed ? parseFloat(record.ground_speed) : null,
        heading: record.heading ? parseFloat(record.heading) : null,
        vertical_speed: record.vertical_speed ? parseFloat(record.vertical_speed) : null,
        squawk: record.squawk,
        on_ground: Boolean(record.on_ground),
        timestamp: new Date(record.timestamp || Date.now()),
        ingestion_time: new Date(record.ingestionTime || Date.now())
      });
    }
    
    // Extended metadata (less frequent updates)
    if (record.aircraft_type || record.registration || record.origin || record.destination) {
      flightMetadata.push({
        flight_id: record.flight_id || record.icao24 || record.callsign,
        aircraft_type: record.aircraft_type,
        registration: record.registration,
        origin: record.origin,
        destination: record.destination,
        operator: record.operator,
        category: record.category,
        updated_at: new Date()
      });
    }
    
    // Emergency/alert conditions
    if (record.emergency || ['7700', '7600', '7500'].includes(record.squawk)) {
      alerts.push({
        flight_id: record.flight_id || record.icao24 || record.callsign,
        alert_type: record.emergency ? 'emergency' : 'squawk',
        alert_code: record.squawk,
        severity: this.calculateAlertSeverity(record),
        message: this.generateAlertMessage(record),
        latitude: parseFloat(record.latitude),
        longitude: parseFloat(record.longitude),
        altitude: record.altitude ? parseInt(record.altitude) : null,
        created_at: new Date()
      });
    }
  }

  /**
   * Insert flight position records using COPY
   */
  async insertFlightPositions(client, positions) {
    if (positions.length === 0) return;
    
    const copyQuery = `
      COPY flight_positions (
        flight_id, callsign, icao24, latitude, longitude, altitude,
        ground_speed, heading, vertical_speed, squawk, on_ground,
        timestamp, ingestion_time
      ) FROM STDIN WITH (FORMAT csv, NULL '')
    `;
    
    const copyStream = client.query(copyQuery);
    
    for (const pos of positions) {
      const values = [
        pos.flight_id,
        pos.callsign || '',
        pos.icao24 || '',
        pos.latitude,
        pos.longitude,
        pos.altitude || '',
        pos.ground_speed || '',
        pos.heading || '',
        pos.vertical_speed || '',
        pos.squawk || '',
        pos.on_ground,
        pos.timestamp.toISOString(),
        pos.ingestion_time.toISOString()
      ];
      
      copyStream.write(values.join(',') + '\n');
    }
    
    await copyStream.end();
  }

  /**
   * Insert flight metadata using batch INSERT
   */
  async insertFlightMetadata(client, metadata) {
    if (metadata.length === 0) return;
    
    const query = `
      INSERT INTO flight_metadata (
        flight_id, aircraft_type, registration, origin, destination,
        operator, category, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (flight_id) DO UPDATE SET
        aircraft_type = EXCLUDED.aircraft_type,
        registration = EXCLUDED.registration,
        origin = EXCLUDED.origin,
        destination = EXCLUDED.destination,
        operator = EXCLUDED.operator,
        category = EXCLUDED.category,
        updated_at = EXCLUDED.updated_at
    `;
    
    for (const meta of metadata) {
      await client.query(query, [
        meta.flight_id,
        meta.aircraft_type,
        meta.registration,
        meta.origin,
        meta.destination,
        meta.operator,
        meta.category,
        meta.updated_at
      ]);
    }
  }

  /**
   * Insert alert records
   */
  async insertAlerts(client, alerts) {
    if (alerts.length === 0) return;
    
    const query = `
      INSERT INTO flight_alerts (
        flight_id, alert_type, alert_code, severity, message,
        latitude, longitude, altitude, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    for (const alert of alerts) {
      await client.query(query, [
        alert.flight_id,
        alert.alert_type,
        alert.alert_code,
        alert.severity,
        alert.message,
        alert.latitude,
        alert.longitude,
        alert.altitude,
        alert.created_at
      ]);
    }
  }

  /**
   * Calculate alert severity
   */
  calculateAlertSeverity(record) {
    if (record.squawk === '7700') return 'critical'; // Emergency
    if (record.squawk === '7600') return 'high';     // Radio failure
    if (record.squawk === '7500') return 'critical'; // Hijack
    if (record.emergency) return 'high';
    return 'medium';
  }

  /**
   * Generate alert message
   */
  generateAlertMessage(record) {
    if (record.squawk === '7700') return 'Aircraft emergency declared';
    if (record.squawk === '7600') return 'Radio communication failure';
    if (record.squawk === '7500') return 'Aircraft hijacking or unlawful interference';
    if (record.emergency) return `Emergency condition: ${record.emergency}`;
    return 'Alert condition detected';
  }

  /**
   * Shutdown worker gracefully
   */
  async shutdown() {
    try {
      if (this.dbPool) {
        await this.dbPool.end();
      }
      process.exit(0);
    } catch (error) {
      console.error('Worker shutdown error:', error);
      process.exit(1);
    }
  }
}

// Initialize worker
const worker = new IngestionWorker();