// Core types
export * from './types/history';

// Services
export { RetentionService } from './services/retention-service';
export { ExportService } from './services/export-service';
export { PlaybackService } from './services/playback-service';

// Utilities
export { HistoryUtils } from './utils/history-utils';
export { RetentionPolicies } from './config/retention-policies';

// Default retention policies aligned with FR24
export const DEFAULT_RETENTION_POLICIES = {
  FREE: {
    tier: 'free',
    retentionDays: 2, // 24-48h
    maxExportsPerDay: 0,
    maxExportSizeMB: 0,
    exportFormats: [],
    playbackEnabled: false,
    historicalSearchEnabled: false
  },
  PREMIUM: {
    tier: 'premium', // Plus tier
    retentionDays: 30,
    maxExportsPerDay: 5,
    maxExportSizeMB: 50,
    exportFormats: ['CSV', 'JSON'],
    playbackEnabled: true,
    historicalSearchEnabled: true
  },
  PRO: {
    tier: 'pro',
    retentionDays: 365, // ≈ FR24 Gold
    maxExportsPerDay: 25,
    maxExportSizeMB: 250,
    exportFormats: ['CSV', 'JSON', 'GEOJSON', 'KML'],
    playbackEnabled: true,
    historicalSearchEnabled: true
  },
  BUSINESS: {
    tier: 'business',
    retentionDays: 1095, // 3 years ≈ FR24 Business
    maxExportsPerDay: 100,
    maxExportSizeMB: 1000,
    exportFormats: ['CSV', 'JSON', 'GEOJSON', 'KML', 'GPX'],
    playbackEnabled: true,
    historicalSearchEnabled: true
  }
} as const;