import { Position } from '@flighttrace/data-core';

export interface FlightPosition {
  id: string;
  flightId: string;
  timestamp: Date;
  position: Position;
  source: DataSource;
  quality: DataQuality;
  interpolated: boolean;
  metadata?: Record<string, any>;
}

export interface FlightTrack {
  flightId: string;
  callsign: string | null;
  registration: string | null;
  icao24: string;
  startTime: Date;
  endTime: Date | null;
  positions: FlightPosition[];
  totalPositions: number;
  boundingBox: BoundingBox;
  statistics: TrackStatistics;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
  maxAltitude: number;
  minAltitude: number;
}

export interface TrackStatistics {
  totalDistance: number; // nautical miles
  maxAltitude: number;
  maxGroundSpeed: number;
  avgGroundSpeed: number;
  totalDuration: number; // seconds
  positionCount: number;
  dataGaps: DataGap[];
}

export interface DataGap {
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  estimatedPositions: number;
}

export enum DataSource {
  ADS_B = 'ADS-B',
  MLAT = 'MLAT', 
  RADAR = 'RADAR',
  SATELLITE = 'SATELLITE',
  ESTIMATED = 'ESTIMATED'
}

export enum DataQuality {
  HIGH = 'HIGH',      // < 30s intervals, good signal
  MEDIUM = 'MEDIUM',  // 30s-2min intervals
  LOW = 'LOW',        // > 2min intervals
  INTERPOLATED = 'INTERPOLATED'
}

export interface RetentionPolicy {
  tier: string;
  retentionDays: number;
  maxExportsPerDay: number;
  maxExportSizeMB: number;
  exportFormats: ExportFormat[];
  playbackEnabled: boolean;
  historicalSearchEnabled: boolean;
}

export enum ExportFormat {
  CSV = 'CSV',
  GEOJSON = 'GEOJSON',
  KML = 'KML',
  JSON = 'JSON',
  GPX = 'GPX'
}

export interface PlaybackSession {
  id: string;
  userId: string;
  flightId: string;
  startTime: Date;
  endTime: Date;
  speed: number; // playback speed multiplier
  currentPosition: number;
  status: PlaybackStatus;
  settings: PlaybackSettings;
}

export enum PlaybackStatus {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  COMPLETED = 'COMPLETED'
}

export interface PlaybackSettings {
  showTrail: boolean;
  trailLength: number; // number of positions
  showEstimatedSegments: boolean;
  interpolateGaps: boolean;
  focusOnAircraft: boolean;
  showTelemetry: boolean;
}

export interface HistoryQuery {
  flightId?: string;
  callsign?: string;
  registration?: string;
  icao24?: string;
  startTime?: Date;
  endTime?: Date;
  boundingBox?: BoundingBox;
  minAltitude?: number;
  maxAltitude?: number;
  dataSource?: DataSource[];
  limit?: number;
  offset?: number;
}

export interface ExportRequest {
  userId: string;
  query: HistoryQuery;
  format: ExportFormat;
  includeMetadata: boolean;
  compression: boolean;
  filename?: string;
}

export interface ExportJob {
  id: string;
  userId: string;
  request: ExportRequest;
  status: ExportStatus;
  progress: number;
  resultUrl?: string;
  resultSizeMB: number;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  error?: string;
}

export enum ExportStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED'
}