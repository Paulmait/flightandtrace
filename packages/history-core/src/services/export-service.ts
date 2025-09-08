import { Pool } from 'pg';
import { Redis } from 'redis';
import * as fs from 'fs/promises';
import * as path from 'path';
import archiver from 'archiver';
import { createObjectCsvWriter } from 'csv-writer';
import { SubscriptionTier } from '@flighttrace/billing-core';
import { 
  ExportRequest, 
  ExportJob, 
  ExportStatus, 
  ExportFormat,
  FlightPosition,
  FlightTrack,
  HistoryQuery
} from '../types/history';
import { RetentionService } from './retention-service';

export class ExportService {
  private db: Pool;
  private redis: Redis;
  private retentionService: RetentionService;
  private exportDir: string;

  constructor(db: Pool, redis: Redis, retentionService: RetentionService) {
    this.db = db;
    this.redis = redis;
    this.retentionService = retentionService;
    this.exportDir = process.env.EXPORT_DIR || './exports';
  }

  /**
   * Request a new export job
   */
  async requestExport(
    userId: string, 
    tier: SubscriptionTier, 
    request: ExportRequest
  ): Promise<ExportJob> {
    // Check if user can export
    await this.checkExportEligibility(userId, tier);
    
    // Validate query against retention policy
    await this.validateExportQuery(tier, request.query);

    // Estimate export size
    const estimatedSize = await this.estimateExportSize(request.query);
    const policy = await this.retentionService.getRetentionPolicy(tier);
    
    if (estimatedSize > policy.maxExportSizeMB) {
      throw new Error(`Export size (${estimatedSize}MB) exceeds limit (${policy.maxExportSizeMB}MB)`);
    }

    // Create export job
    const jobId = await this.createExportJob(userId, request, estimatedSize);
    
    // Queue for processing
    await this.queueExportJob(jobId);
    
    // Update user quota
    await this.updateUserQuota(userId);

    // Return job details
    return await this.getExportJob(jobId);
  }

  /**
   * Process an export job
   */
  async processExportJob(jobId: string): Promise<void> {
    let job: ExportJob;
    
    try {
      job = await this.getExportJob(jobId);
      
      // Update status to processing
      await this.updateJobStatus(jobId, ExportStatus.PROCESSING, 0);
      
      // Fetch data
      const data = await this.fetchExportData(job.request.query);
      
      // Generate export file
      const exportPath = await this.generateExportFile(job, data);
      
      // Upload to storage (S3/etc) and get signed URL
      const resultUrl = await this.uploadExportFile(exportPath, jobId);
      
      // Calculate final file size
      const stats = await fs.stat(exportPath);
      const fileSizeMB = stats.size / 1024 / 1024;
      
      // Mark as completed
      await this.completeExportJob(jobId, resultUrl, fileSizeMB, data.length);
      
      // Cleanup local file
      await fs.unlink(exportPath);
      
    } catch (error) {
      console.error(`Export job ${jobId} failed:`, error);
      await this.failExportJob(jobId, error.message);
    }
  }

  /**
   * Get export job status
   */
  async getExportJob(jobId: string): Promise<ExportJob> {
    const result = await this.db.query(
      'SELECT * FROM export_jobs WHERE id = $1',
      [jobId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Export job not found: ${jobId}`);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      request: {
        userId: row.user_id,
        query: row.query_params,
        format: row.export_format,
        includeMetadata: row.include_metadata,
        compression: row.compression,
        filename: row.filename
      },
      status: row.status,
      progress: row.progress,
      resultUrl: row.result_url,
      resultSizeMB: parseFloat(row.result_size_mb) || 0,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      expiresAt: new Date(row.expires_at),
      error: row.error_message
    };
  }

  /**
   * Get user's export history
   */
  async getUserExports(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{
    exports: ExportJob[];
    total: number;
  }> {
    const [exportsResult, countResult] = await Promise.all([
      this.db.query(`
        SELECT * FROM export_jobs 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]),
      
      this.db.query(
        'SELECT COUNT(*) FROM export_jobs WHERE user_id = $1',
        [userId]
      )
    ]);

    const exports = exportsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      request: {
        userId: row.user_id,
        query: row.query_params,
        format: row.export_format,
        includeMetadata: row.include_metadata,
        compression: row.compression,
        filename: row.filename
      },
      status: row.status,
      progress: row.progress,
      resultUrl: row.result_url,
      resultSizeMB: parseFloat(row.result_size_mb) || 0,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      expiresAt: new Date(row.expires_at),
      error: row.error_message
    }));

    return {
      exports,
      total: parseInt(countResult.rows[0].count)
    };
  }

  private async checkExportEligibility(userId: string, tier: SubscriptionTier): Promise<void> {
    const policy = await this.retentionService.getRetentionPolicy(tier);
    
    if (policy.maxExportsPerDay === 0) {
      throw new Error('Export feature not available for your plan');
    }

    // Check daily quota
    const quotaResult = await this.db.query(
      'SELECT daily_exports_used, daily_quota_reset_at FROM user_export_quotas WHERE user_id = $1',
      [userId]
    );

    if (quotaResult.rows.length === 0) {
      // Initialize quota for new user
      await this.db.query(`
        INSERT INTO user_export_quotas (user_id, tier) 
        VALUES ($1, $2)
      `, [userId, tier]);
      return;
    }

    const quota = quotaResult.rows[0];
    
    // Reset quota if needed
    if (new Date(quota.daily_quota_reset_at) <= new Date()) {
      await this.db.query(`
        UPDATE user_export_quotas 
        SET daily_exports_used = 0, 
            daily_quota_reset_at = CURRENT_DATE + INTERVAL '1 day'
        WHERE user_id = $1
      `, [userId]);
    } else if (quota.daily_exports_used >= policy.maxExportsPerDay) {
      throw new Error(`Daily export limit reached (${policy.maxExportsPerDay}). Resets at midnight UTC.`);
    }
  }

  private async validateExportQuery(tier: SubscriptionTier, query: HistoryQuery): Promise<void> {
    const dateRange = await this.retentionService.getAvailableDateRange(tier);
    
    if (query.startTime && query.startTime < dateRange.earliestDate) {
      throw new Error(`Start time is outside retention period. Earliest available: ${dateRange.earliestDate.toISOString()}`);
    }
    
    if (query.endTime && query.endTime > dateRange.latestDate) {
      throw new Error(`End time is in the future. Latest available: ${dateRange.latestDate.toISOString()}`);
    }

    // Limit query scope for performance
    if (query.startTime && query.endTime) {
      const daysDiff = Math.abs(query.endTime.getTime() - query.startTime.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        throw new Error('Query range cannot exceed 365 days');
      }
    }
  }

  private async estimateExportSize(query: HistoryQuery): Promise<number> {
    const countQuery = this.buildCountQuery(query);
    const result = await this.db.query(countQuery.sql, countQuery.params);
    const recordCount = parseInt(result.rows[0].count);
    
    // Estimate ~1KB per position record (with metadata)
    const estimatedSizeMB = (recordCount * 1024) / 1024 / 1024;
    return Math.ceil(estimatedSizeMB);
  }

  private async fetchExportData(query: HistoryQuery): Promise<FlightPosition[]> {
    const dataQuery = this.buildDataQuery(query);
    const result = await this.db.query(dataQuery.sql, dataQuery.params);
    
    return result.rows.map(row => ({
      id: row.id,
      flightId: row.flight_id,
      timestamp: new Date(row.timestamp),
      position: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        altitude: row.altitude,
        groundSpeed: row.ground_speed,
        verticalRate: row.vertical_rate,
        heading: row.heading
      },
      source: row.source,
      quality: row.quality,
      interpolated: row.interpolated,
      metadata: row.metadata || {}
    }));
  }

  private buildCountQuery(query: HistoryQuery): { sql: string; params: any[] } {
    let sql = 'SELECT COUNT(*) FROM flight_positions fp';
    const params: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    if (query.flightId) {
      conditions.push(`fp.flight_id = $${paramCount++}`);
      params.push(query.flightId);
    }

    if (query.startTime) {
      conditions.push(`fp.timestamp >= $${paramCount++}`);
      params.push(query.startTime);
    }

    if (query.endTime) {
      conditions.push(`fp.timestamp <= $${paramCount++}`);
      params.push(query.endTime);
    }

    if (query.boundingBox) {
      conditions.push(`ST_Within(fp.location, ST_MakeEnvelope($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, 4326))`);
      params.push(query.boundingBox.west, query.boundingBox.south, query.boundingBox.east, query.boundingBox.north);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    return { sql, params };
  }

  private buildDataQuery(query: HistoryQuery): { sql: string; params: any[] } {
    let sql = `
      SELECT 
        fp.id,
        fp.flight_id,
        fp.timestamp,
        ST_Y(fp.location::geometry) as latitude,
        ST_X(fp.location::geometry) as longitude,
        fp.altitude,
        fp.ground_speed,
        fp.vertical_rate,
        fp.heading,
        fp.source,
        fp.quality,
        fp.interpolated,
        fp.metadata
      FROM flight_positions fp
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    // Add WHERE conditions (same as count query)
    if (query.flightId) {
      conditions.push(`fp.flight_id = $${paramCount++}`);
      params.push(query.flightId);
    }

    if (query.startTime) {
      conditions.push(`fp.timestamp >= $${paramCount++}`);
      params.push(query.startTime);
    }

    if (query.endTime) {
      conditions.push(`fp.timestamp <= $${paramCount++}`);
      params.push(query.endTime);
    }

    if (query.boundingBox) {
      conditions.push(`ST_Within(fp.location, ST_MakeEnvelope($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, 4326))`);
      params.push(query.boundingBox.west, query.boundingBox.south, query.boundingBox.east, query.boundingBox.north);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY fp.timestamp ASC';

    if (query.limit) {
      sql += ` LIMIT $${paramCount++}`;
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ` OFFSET $${paramCount++}`;
      params.push(query.offset);
    }

    return { sql, params };
  }

  private async generateExportFile(job: ExportJob, data: FlightPosition[]): Promise<string> {
    const filename = job.request.filename || `export_${job.id}`;
    const exportPath = path.join(this.exportDir, `${filename}.${job.request.format.toLowerCase()}`);
    
    // Ensure export directory exists
    await fs.mkdir(this.exportDir, { recursive: true });

    switch (job.request.format) {
      case ExportFormat.CSV:
        await this.generateCsvFile(exportPath, data, job.request.includeMetadata);
        break;
      case ExportFormat.GEOJSON:
        await this.generateGeoJsonFile(exportPath, data, job.request.includeMetadata);
        break;
      case ExportFormat.KML:
        await this.generateKmlFile(exportPath, data, job.request.includeMetadata);
        break;
      case ExportFormat.JSON:
        await this.generateJsonFile(exportPath, data, job.request.includeMetadata);
        break;
      default:
        throw new Error(`Unsupported export format: ${job.request.format}`);
    }

    // Compress if requested
    if (job.request.compression) {
      const compressedPath = `${exportPath}.zip`;
      await this.compressFile(exportPath, compressedPath);
      await fs.unlink(exportPath); // Remove uncompressed file
      return compressedPath;
    }

    return exportPath;
  }

  private async generateCsvFile(filePath: string, data: FlightPosition[], includeMetadata: boolean): Promise<void> {
    const headers = [
      { id: 'timestamp', title: 'Timestamp' },
      { id: 'flightId', title: 'Flight ID' },
      { id: 'latitude', title: 'Latitude' },
      { id: 'longitude', title: 'Longitude' },
      { id: 'altitude', title: 'Altitude (ft)' },
      { id: 'groundSpeed', title: 'Ground Speed (kts)' },
      { id: 'verticalRate', title: 'Vertical Rate (ft/min)' },
      { id: 'heading', title: 'Heading (°)' },
      { id: 'source', title: 'Data Source' },
      { id: 'quality', title: 'Data Quality' },
      { id: 'interpolated', title: 'Interpolated' }
    ];

    if (includeMetadata) {
      headers.push({ id: 'metadata', title: 'Metadata' });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    const records = data.map(pos => ({
      timestamp: pos.timestamp.toISOString(),
      flightId: pos.flightId,
      latitude: pos.position.latitude,
      longitude: pos.position.longitude,
      altitude: pos.position.altitude,
      groundSpeed: pos.position.groundSpeed,
      verticalRate: pos.position.verticalRate,
      heading: pos.position.heading,
      source: pos.source,
      quality: pos.quality,
      interpolated: pos.interpolated,
      metadata: includeMetadata ? JSON.stringify(pos.metadata) : undefined
    }));

    await csvWriter.writeRecords(records);
  }

  private async generateGeoJsonFile(filePath: string, data: FlightPosition[], includeMetadata: boolean): Promise<void> {
    const features = data.map(pos => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [pos.position.longitude, pos.position.latitude, pos.position.altitude]
      },
      properties: {
        timestamp: pos.timestamp.toISOString(),
        flightId: pos.flightId,
        altitude: pos.position.altitude,
        groundSpeed: pos.position.groundSpeed,
        verticalRate: pos.position.verticalRate,
        heading: pos.position.heading,
        source: pos.source,
        quality: pos.quality,
        interpolated: pos.interpolated,
        ...(includeMetadata ? pos.metadata : {})
      }
    }));

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    await fs.writeFile(filePath, JSON.stringify(geojson, null, 2));
  }

  private async generateKmlFile(filePath: string, data: FlightPosition[], includeMetadata: boolean): Promise<void> {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Flight Track Export</name>
`;

    for (const pos of data) {
      kml += `
    <Placemark>
      <name>${pos.flightId}</name>
      <description>
        Timestamp: ${pos.timestamp.toISOString()}<br/>
        Altitude: ${pos.position.altitude} ft<br/>
        Ground Speed: ${pos.position.groundSpeed} kts<br/>
        Source: ${pos.source}<br/>
        Quality: ${pos.quality}
        ${includeMetadata ? '<br/>Metadata: ' + JSON.stringify(pos.metadata) : ''}
      </description>
      <Point>
        <coordinates>${pos.position.longitude},${pos.position.latitude},${pos.position.altitude}</coordinates>
      </Point>
    </Placemark>`;
    }

    kml += `
  </Document>
</kml>`;

    await fs.writeFile(filePath, kml);
  }

  private async generateJsonFile(filePath: string, data: FlightPosition[], includeMetadata: boolean): Promise<void> {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalRecords: data.length,
      positions: data.map(pos => ({
        timestamp: pos.timestamp.toISOString(),
        flightId: pos.flightId,
        position: pos.position,
        source: pos.source,
        quality: pos.quality,
        interpolated: pos.interpolated,
        ...(includeMetadata ? { metadata: pos.metadata } : {})
      }))
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
  }

  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(inputPath, { name: path.basename(inputPath) });
      archive.finalize();
    });
  }

  private async uploadExportFile(filePath: string, jobId: string): Promise<string> {
    // In production, upload to S3/GCS and return signed URL
    // For now, return a placeholder URL
    return `https://exports.flightandtrace.com/${jobId}/${path.basename(filePath)}`;
  }

  private async createExportJob(
    userId: string, 
    request: ExportRequest, 
    estimatedSizeMB: number
  ): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiration

    const result = await this.db.query(`
      INSERT INTO export_jobs (
        user_id, query_params, export_format, include_metadata, 
        compression, filename, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      userId,
      JSON.stringify(request.query),
      request.format,
      request.includeMetadata,
      request.compression,
      request.filename,
      expiresAt
    ]);

    return result.rows[0].id;
  }

  private async queueExportJob(jobId: string): Promise<void> {
    // Add to Redis queue for background processing
    await this.redis.lpush('export_queue', jobId);
  }

  private async updateJobStatus(
    jobId: string, 
    status: ExportStatus, 
    progress: number
  ): Promise<void> {
    await this.db.query(`
      UPDATE export_jobs 
      SET status = $1, progress = $2, updated_at = NOW()
      WHERE id = $3
    `, [status, progress, jobId]);
  }

  private async completeExportJob(
    jobId: string, 
    resultUrl: string, 
    sizeMB: number, 
    recordCount: number
  ): Promise<void> {
    await this.db.query(`
      UPDATE export_jobs 
      SET status = 'COMPLETED', progress = 100, result_url = $1, 
          result_size_mb = $2, record_count = $3, completed_at = NOW()
      WHERE id = $4
    `, [resultUrl, sizeMB, recordCount, jobId]);
  }

  private async failExportJob(jobId: string, errorMessage: string): Promise<void> {
    await this.db.query(`
      UPDATE export_jobs 
      SET status = 'FAILED', error_message = $1, updated_at = NOW()
      WHERE id = $2
    `, [errorMessage, jobId]);
  }

  private async updateUserQuota(userId: string): Promise<void> {
    await this.db.query(`
      UPDATE user_export_quotas 
      SET daily_exports_used = daily_exports_used + 1,
          last_export_at = NOW(),
          total_exports_lifetime = total_exports_lifetime + 1
      WHERE user_id = $1
    `, [userId]);
  }
}