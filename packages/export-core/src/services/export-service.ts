import { SubscriptionTier } from '@flighttrace/billing-core';
import { CSVFormatter } from '../formatters/csv-formatter';
import { GeoJSONFormatter } from '../formatters/geojson-formatter';
import { KMLFormatter } from '../formatters/kml-formatter';

export interface ExportRequest {
  userId: string;
  format: ExportFormat;
  data: ExportDataRequest;
  options?: ExportOptions;
}

export enum ExportFormat {
  CSV = 'csv',
  GEOJSON = 'geojson',
  KML = 'kml',
  JSON = 'json'
}

export interface ExportDataRequest {
  type: 'flights' | 'positions' | 'alerts' | 'analytics';
  filters?: {
    dateRange?: { start: Date; end: Date };
    flightIds?: string[];
    callsigns?: string[];
    operators?: string[];
    origins?: string[];
    destinations?: string[];
    aircraftTypes?: string[];
    bbox?: [number, number, number, number];
  };
  limit?: number;
}

export interface ExportOptions {
  includeMetadata?: boolean;
  includeCalculatedFields?: boolean;
  includeEmissions?: boolean;
  compressOutput?: boolean;
  filename?: string;
  timeFormat?: 'iso' | 'unix' | 'readable';
  coordinateSystem?: 'wgs84' | 'utm';
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  filename: string;
  size: number;
  recordCount: number;
  format: ExportFormat;
  expiresAt: Date;
  error?: string;
}

export interface ExportQuota {
  userId: string;
  tier: SubscriptionTier;
  dailyExports: number;
  maxDailyExports: number;
  maxFileSize: number; // MB
  maxRecords: number;
  supportedFormats: ExportFormat[];
  canExport: boolean;
  resetAt: Date;
}

export class ExportService {
  private database: any;
  private redis: any;
  private storage: any; // S3 or local storage
  private csvFormatter: CSVFormatter;
  private geoJSONFormatter: GeoJSONFormatter;
  private kmlFormatter: KMLFormatter;

  constructor(options: {
    database: any;
    redis: any;
    storage: any;
  }) {
    this.database = options.database;
    this.redis = options.redis;
    this.storage = options.storage;
    
    this.csvFormatter = new CSVFormatter();
    this.geoJSONFormatter = new GeoJSONFormatter();
    this.kmlFormatter = new KMLFormatter();
  }

  async getExportQuota(userId: string): Promise<ExportQuota> {
    const subscription = await this.database.subscriptions.findUnique({
      where: { userId }
    });

    if (!subscription) {
      throw new Error('User subscription not found');
    }

    const limits = this.getExportLimits(subscription.tier);
    const today = new Date().toISOString().split('T')[0];
    const dailyExports = await this.getDailyExportCount(userId, today);

    const resetAt = new Date();
    resetAt.setUTCHours(0, 0, 0, 0);
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);

    return {
      userId,
      tier: subscription.tier,
      dailyExports,
      maxDailyExports: limits.maxDailyExports,
      maxFileSize: limits.maxFileSize,
      maxRecords: limits.maxRecords,
      supportedFormats: limits.supportedFormats,
      canExport: dailyExports < limits.maxDailyExports,
      resetAt
    };
  }

  async exportData(request: ExportRequest): Promise<ExportResult> {
    // Check quota and permissions
    const quota = await this.getExportQuota(request.userId);
    
    if (!quota.canExport) {
      return {
        success: false,
        filename: '',
        size: 0,
        recordCount: 0,
        format: request.format,
        expiresAt: new Date(),
        error: 'Daily export limit exceeded'
      };
    }

    if (!quota.supportedFormats.includes(request.format)) {
      return {
        success: false,
        filename: '',
        size: 0,
        recordCount: 0,
        format: request.format,
        expiresAt: new Date(),
        error: `Export format '${request.format}' not available in your subscription tier`
      };
    }

    try {
      // Fetch data based on request
      const data = await this.fetchExportData(request);
      
      if (data.length > quota.maxRecords) {
        return {
          success: false,
          filename: '',
          size: 0,
          recordCount: 0,
          format: request.format,
          expiresAt: new Date(),
          error: `Export exceeds maximum record limit (${quota.maxRecords})`
        };
      }

      // Format data
      const formatted = await this.formatData(data, request.format, request.options);
      
      if (formatted.size > quota.maxFileSize * 1024 * 1024) {
        return {
          success: false,
          filename: '',
          size: formatted.size,
          recordCount: data.length,
          format: request.format,
          expiresAt: new Date(),
          error: `Export exceeds maximum file size (${quota.maxFileSize} MB)`
        };
      }

      // Store file and create download URL
      const filename = this.generateFilename(request, data.length);
      const downloadUrl = await this.storeExportFile(formatted.content, filename);
      
      // Record export
      await this.recordExport(request.userId, {
        filename,
        format: request.format,
        recordCount: data.length,
        fileSize: formatted.size
      });

      // Increment daily count
      await this.incrementDailyExportCount(request.userId);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

      return {
        success: true,
        downloadUrl,
        filename,
        size: formatted.size,
        recordCount: data.length,
        format: request.format,
        expiresAt
      };

    } catch (error) {
      console.error('Export error:', error);
      return {
        success: false,
        filename: '',
        size: 0,
        recordCount: 0,
        format: request.format,
        expiresAt: new Date(),
        error: error.message
      };
    }
  }

  private getExportLimits(tier: SubscriptionTier): {
    maxDailyExports: number;
    maxFileSize: number;
    maxRecords: number;
    supportedFormats: ExportFormat[];
  } {
    switch (tier) {
      case SubscriptionTier.FREE:
        return {
          maxDailyExports: 0,
          maxFileSize: 0,
          maxRecords: 0,
          supportedFormats: []
        };

      case SubscriptionTier.PREMIUM:
        return {
          maxDailyExports: 0, // No exports for Premium
          maxFileSize: 0,
          maxRecords: 0,
          supportedFormats: []
        };

      case SubscriptionTier.PRO:
        return {
          maxDailyExports: 10,
          maxFileSize: 100, // 100MB
          maxRecords: 50000,
          supportedFormats: [ExportFormat.CSV, ExportFormat.GEOJSON, ExportFormat.JSON]
        };

      case SubscriptionTier.BUSINESS:
        return {
          maxDailyExports: 50,
          maxFileSize: 500, // 500MB
          maxRecords: 1000000,
          supportedFormats: [ExportFormat.CSV, ExportFormat.GEOJSON, ExportFormat.KML, ExportFormat.JSON]
        };

      default:
        return {
          maxDailyExports: 0,
          maxFileSize: 0,
          maxRecords: 0,
          supportedFormats: []
        };
    }
  }

  private async fetchExportData(request: ExportRequest): Promise<any[]> {
    const { type, filters, limit } = request.data;

    let query: any = {};
    let include: any = {};

    // Add filters
    if (filters) {
      if (filters.dateRange) {
        query.createdAt = {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        };
      }

      if (filters.flightIds?.length) {
        query.id = { in: filters.flightIds };
      }

      if (filters.callsigns?.length) {
        query.callsign = { in: filters.callsigns };
      }

      if (filters.operators?.length) {
        query.operator = { in: filters.operators };
      }

      if (filters.origins?.length) {
        query.origin = { in: filters.origins };
      }

      if (filters.destinations?.length) {
        query.destination = { in: filters.destinations };
      }

      if (filters.aircraftTypes?.length) {
        query.aircraftType = { in: filters.aircraftTypes };
      }
    }

    // Fetch data based on type
    switch (type) {
      case 'flights':
        include = {
          positions: filters?.bbox ? {
            where: {
              latitude: {
                gte: filters.bbox[1],
                lte: filters.bbox[3]
              },
              longitude: {
                gte: filters.bbox[0],
                lte: filters.bbox[2]
              }
            }
          } : true,
          aircraft: true,
          emissions: true
        };
        
        return await this.database.flights.findMany({
          where: query,
          include,
          take: limit || 10000,
          orderBy: { createdAt: 'desc' }
        });

      case 'positions':
        if (filters?.bbox) {
          query = {
            ...query,
            latitude: {
              gte: filters.bbox[1],
              lte: filters.bbox[3]
            },
            longitude: {
              gte: filters.bbox[0],
              lte: filters.bbox[2]
            }
          };
        }

        return await this.database.positions.findMany({
          where: query,
          include: { flight: true },
          take: limit || 50000,
          orderBy: { timestamp: 'desc' }
        });

      case 'alerts':
        return await this.database.alertInstances.findMany({
          where: {
            userId: request.userId,
            ...query
          },
          include: { rule: true },
          take: limit || 5000,
          orderBy: { triggeredAt: 'desc' }
        });

      default:
        throw new Error(`Unsupported export type: ${type}`);
    }
  }

  private async formatData(
    data: any[], 
    format: ExportFormat, 
    options?: ExportOptions
  ): Promise<{ content: Buffer | string; size: number }> {
    let content: Buffer | string;

    switch (format) {
      case ExportFormat.CSV:
        content = await this.csvFormatter.format(data, options);
        break;

      case ExportFormat.GEOJSON:
        content = await this.geoJSONFormatter.format(data, options);
        break;

      case ExportFormat.KML:
        content = await this.kmlFormatter.format(data, options);
        break;

      case ExportFormat.JSON:
        content = JSON.stringify(data, null, options?.includeMetadata ? 2 : 0);
        break;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const size = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8');

    return { content, size };
  }

  private generateFilename(request: ExportRequest, recordCount: number): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const userId = request.userId.substring(0, 8);
    
    return request.options?.filename || 
           `flighttrace_${request.data.type}_${recordCount}_${userId}_${timestamp}.${request.format}`;
  }

  private async storeExportFile(content: Buffer | string, filename: string): Promise<string> {
    // Implementation depends on storage provider (S3, GCS, local filesystem)
    // This is a placeholder for the storage logic
    
    const key = `exports/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;
    
    // Store file using configured storage provider
    await this.storage.putObject({
      Key: key,
      Body: content,
      ContentType: this.getContentType(filename),
      Expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    // Generate signed URL for download
    return this.storage.getSignedUrl('getObject', {
      Key: key,
      Expires: 7 * 24 * 60 * 60 // 7 days
    });
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      case 'geojson': return 'application/geo+json';
      case 'kml': return 'application/vnd.google-earth.kml+xml';
      default: return 'application/octet-stream';
    }
  }

  private async getDailyExportCount(userId: string, date: string): Promise<number> {
    const key = `export_count:${userId}:${date}`;
    const count = await this.redis.get(key);
    return count ? parseInt(count) : 0;
  }

  private async incrementDailyExportCount(userId: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const key = `export_count:${userId}:${date}`;
    
    await this.redis.incr(key);
    await this.redis.expireAt(key, Math.floor(Date.now() / 1000) + 86400); // Expire at end of day
  }

  private async recordExport(userId: string, exportData: {
    filename: string;
    format: ExportFormat;
    recordCount: number;
    fileSize: number;
  }): Promise<void> {
    await this.database.exportHistory.create({
      data: {
        userId,
        ...exportData,
        exportedAt: new Date()
      }
    });
  }

  async getExportHistory(userId: string, limit = 20): Promise<any[]> {
    return await this.database.exportHistory.findMany({
      where: { userId },
      take: limit,
      orderBy: { exportedAt: 'desc' }
    });
  }

  async cleanupExpiredExports(): Promise<void> {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 7);

    // Get expired export records
    const expiredExports = await this.database.exportHistory.findMany({
      where: {
        exportedAt: { lt: expiredDate }
      }
    });

    // Delete files from storage
    for (const exportRecord of expiredExports) {
      try {
        const key = this.getStorageKey(exportRecord.filename);
        await this.storage.deleteObject({ Key: key });
      } catch (error) {
        console.error(`Failed to delete export file ${exportRecord.filename}:`, error);
      }
    }

    // Delete database records
    await this.database.exportHistory.deleteMany({
      where: {
        exportedAt: { lt: expiredDate }
      }
    });

    console.log(`Cleaned up ${expiredExports.length} expired exports`);
  }

  private getStorageKey(filename: string): string {
    const date = filename.match(/_(\d{4}-\d{2}-\d{2})\./);
    if (date) {
      const [year, month] = date[1].split('-');
      return `exports/${year}/${month}/${filename}`;
    }
    return `exports/legacy/${filename}`;
  }
}