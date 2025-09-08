import { Pool } from 'pg';
import { Redis } from 'redis';
import { EventEmitter } from 'events';
import { 
  PlaybackSession, 
  PlaybackStatus, 
  PlaybackSettings, 
  FlightPosition,
  FlightTrack 
} from '../types/history';

export class PlaybackService extends EventEmitter {
  private db: Pool;
  private redis: Redis;
  private activeSessions: Map<string, PlaybackSession> = new Map();
  private playbackIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(db: Pool, redis: Redis) {
    super();
    this.db = db;
    this.redis = redis;
  }

  /**
   * Create a new playback session
   */
  async createPlaybackSession(
    userId: string,
    flightId: string,
    settings: Partial<PlaybackSettings> = {}
  ): Promise<PlaybackSession> {
    // Get flight track info
    const track = await this.getFlightTrack(flightId);
    if (!track) {
      throw new Error(`Flight not found: ${flightId}`);
    }

    // Create session
    const sessionId = await this.createSession(userId, flightId, track, settings);
    
    // Load session data
    const session = await this.getPlaybackSession(sessionId);
    
    // Cache active session
    this.activeSessions.set(sessionId, session);
    
    return session;
  }

  /**
   * Start or resume playback
   */
  async startPlayback(sessionId: string): Promise<void> {
    const session = await this.getPlaybackSession(sessionId);
    
    if (session.status === PlaybackStatus.COMPLETED) {
      throw new Error('Playback already completed');
    }

    // Update status
    await this.updateSessionStatus(sessionId, PlaybackStatus.PLAYING);
    session.status = PlaybackStatus.PLAYING;
    
    // Start playback loop
    await this.startPlaybackLoop(session);
    
    this.emit('playbackStarted', { sessionId, userId: session.userId });
  }

  /**
   * Pause playback
   */
  async pausePlayback(sessionId: string): Promise<void> {
    const session = await this.getPlaybackSession(sessionId);
    
    if (session.status !== PlaybackStatus.PLAYING) {
      throw new Error('Playback is not currently playing');
    }

    // Stop the playback loop
    this.stopPlaybackLoop(sessionId);
    
    // Update status
    await this.updateSessionStatus(sessionId, PlaybackStatus.PAUSED);
    
    this.emit('playbackPaused', { sessionId, userId: session.userId });
  }

  /**
   * Stop playback
   */
  async stopPlayback(sessionId: string): Promise<void> {
    const session = await this.getPlaybackSession(sessionId);
    
    // Stop the playback loop
    this.stopPlaybackLoop(sessionId);
    
    // Reset to beginning
    await this.updateSessionPosition(sessionId, 0);
    await this.updateSessionStatus(sessionId, PlaybackStatus.STOPPED);
    
    this.emit('playbackStopped', { sessionId, userId: session.userId });
  }

  /**
   * Seek to specific position in playback
   */
  async seekToPosition(sessionId: string, position: number): Promise<void> {
    const session = await this.getPlaybackSession(sessionId);
    const track = await this.getFlightTrack(session.flightId);
    
    if (position < 0 || position >= track.totalPositions) {
      throw new Error(`Invalid position: ${position}. Valid range: 0-${track.totalPositions - 1}`);
    }

    // Update position
    await this.updateSessionPosition(sessionId, position);
    
    // If playing, restart playback loop
    if (session.status === PlaybackStatus.PLAYING) {
      this.stopPlaybackLoop(sessionId);
      session.currentPosition = position;
      await this.startPlaybackLoop(session);
    }

    this.emit('playbackSeeked', { 
      sessionId, 
      userId: session.userId, 
      position,
      timestamp: await this.getPositionTimestamp(session.flightId, position)
    });
  }

  /**
   * Update playback speed
   */
  async updatePlaybackSpeed(sessionId: string, speed: number): Promise<void> {
    if (speed <= 0 || speed > 100) {
      throw new Error('Playback speed must be between 0.1 and 100');
    }

    await this.db.query(
      'UPDATE playback_sessions SET playback_speed = $1, updated_at = NOW() WHERE id = $2',
      [speed, sessionId]
    );

    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.speed = speed;
      
      // Restart playback loop with new speed if playing
      if (session.status === PlaybackStatus.PLAYING) {
        this.stopPlaybackLoop(sessionId);
        await this.startPlaybackLoop(session);
      }
    }

    this.emit('playbackSpeedChanged', { sessionId, speed });
  }

  /**
   * Update playback settings
   */
  async updatePlaybackSettings(
    sessionId: string, 
    settings: Partial<PlaybackSettings>
  ): Promise<void> {
    await this.db.query(
      'UPDATE playback_sessions SET settings = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(settings), sessionId]
    );

    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.settings = { ...session.settings, ...settings };
    }

    this.emit('playbackSettingsChanged', { sessionId, settings });
  }

  /**
   * Get playback session
   */
  async getPlaybackSession(sessionId: string): Promise<PlaybackSession> {
    // Try cache first
    const cached = this.activeSessions.get(sessionId);
    if (cached) {
      return cached;
    }

    // Query database
    const result = await this.db.query(
      'SELECT * FROM playback_sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Playback session not found: ${sessionId}`);
    }

    const row = result.rows[0];
    const session: PlaybackSession = {
      id: row.id,
      userId: row.user_id,
      flightId: row.flight_id,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      speed: parseFloat(row.playback_speed),
      currentPosition: row.current_position,
      status: row.status,
      settings: row.settings || {}
    };

    // Cache if active
    if (session.status === PlaybackStatus.PLAYING || session.status === PlaybackStatus.PAUSED) {
      this.activeSessions.set(sessionId, session);
    }

    return session;
  }

  /**
   * Get current playback position data
   */
  async getCurrentPositionData(sessionId: string): Promise<{
    position: FlightPosition | null;
    progress: number;
    timeRemaining: number;
  }> {
    const session = await this.getPlaybackSession(sessionId);
    const track = await this.getFlightTrack(session.flightId);
    
    if (!track || track.totalPositions === 0) {
      return { position: null, progress: 0, timeRemaining: 0 };
    }

    // Get current position
    const position = await this.getPositionAtIndex(session.flightId, session.currentPosition);
    
    // Calculate progress
    const progress = (session.currentPosition / track.totalPositions) * 100;
    
    // Calculate time remaining
    const remainingPositions = track.totalPositions - session.currentPosition;
    const timeRemaining = (remainingPositions / session.speed) * 1000; // milliseconds

    return {
      position,
      progress,
      timeRemaining
    };
  }

  /**
   * Get playback trail positions (for map display)
   */
  async getPlaybackTrail(sessionId: string): Promise<FlightPosition[]> {
    const session = await this.getPlaybackSession(sessionId);
    
    if (!session.settings.showTrail) {
      return [];
    }

    const trailLength = session.settings.trailLength || 50;
    const startPosition = Math.max(0, session.currentPosition - trailLength);
    
    return await this.getPositionRange(
      session.flightId,
      startPosition,
      session.currentPosition
    );
  }

  /**
   * Get user's playback sessions
   */
  async getUserPlaybackSessions(userId: string, limit: number = 20): Promise<PlaybackSession[]> {
    const result = await this.db.query(`
      SELECT * FROM playback_sessions 
      WHERE user_id = $1 
      ORDER BY updated_at DESC 
      LIMIT $2
    `, [userId, limit]);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      flightId: row.flight_id,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      speed: parseFloat(row.playback_speed),
      currentPosition: row.current_position,
      status: row.status,
      settings: row.settings || {}
    }));
  }

  /**
   * Delete playback session
   */
  async deletePlaybackSession(sessionId: string): Promise<void> {
    // Stop playback if active
    this.stopPlaybackLoop(sessionId);
    this.activeSessions.delete(sessionId);
    
    // Delete from database
    await this.db.query('DELETE FROM playback_sessions WHERE id = $1', [sessionId]);
    
    this.emit('playbackSessionDeleted', { sessionId });
  }

  private async createSession(
    userId: string,
    flightId: string,
    track: FlightTrack,
    settings: Partial<PlaybackSettings>
  ): Promise<string> {
    const defaultSettings: PlaybackSettings = {
      showTrail: true,
      trailLength: 50,
      showEstimatedSegments: false,
      interpolateGaps: true,
      focusOnAircraft: true,
      showTelemetry: true,
      ...settings
    };

    const result = await this.db.query(`
      INSERT INTO playback_sessions (
        user_id, flight_id, start_time, end_time, settings
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      userId,
      flightId,
      track.startTime,
      track.endTime || new Date(),
      JSON.stringify(defaultSettings)
    ]);

    return result.rows[0].id;
  }

  private async startPlaybackLoop(session: PlaybackSession): Promise<void> {
    const track = await this.getFlightTrack(session.flightId);
    if (!track) return;

    // Calculate interval based on playback speed
    // Assume 1-second intervals in real data, adjust by playback speed
    const intervalMs = Math.max(50, 1000 / session.speed); // Min 50ms for performance

    const playbackInterval = setInterval(async () => {
      try {
        // Check if session is still playing
        const currentSession = await this.getPlaybackSession(session.id);
        if (currentSession.status !== PlaybackStatus.PLAYING) {
          this.stopPlaybackLoop(session.id);
          return;
        }

        // Advance position
        const newPosition = session.currentPosition + 1;
        
        if (newPosition >= track.totalPositions) {
          // Playback completed
          await this.updateSessionStatus(session.id, PlaybackStatus.COMPLETED);
          this.stopPlaybackLoop(session.id);
          this.emit('playbackCompleted', { 
            sessionId: session.id, 
            userId: session.userId 
          });
          return;
        }

        // Update position
        await this.updateSessionPosition(session.id, newPosition);
        session.currentPosition = newPosition;

        // Get current position data
        const positionData = await this.getCurrentPositionData(session.id);
        
        // Emit position update
        this.emit('playbackPositionUpdate', {
          sessionId: session.id,
          userId: session.userId,
          position: positionData.position,
          progress: positionData.progress,
          currentIndex: newPosition
        });

        // Emit trail update if enabled
        if (session.settings.showTrail) {
          const trail = await this.getPlaybackTrail(session.id);
          this.emit('playbackTrailUpdate', {
            sessionId: session.id,
            userId: session.userId,
            trail
          });
        }

      } catch (error) {
        console.error(`Playback error for session ${session.id}:`, error);
        this.stopPlaybackLoop(session.id);
        await this.updateSessionStatus(session.id, PlaybackStatus.STOPPED);
        this.emit('playbackError', { 
          sessionId: session.id, 
          userId: session.userId, 
          error: error.message 
        });
      }
    }, intervalMs);

    this.playbackIntervals.set(session.id, playbackInterval);
  }

  private stopPlaybackLoop(sessionId: string): void {
    const interval = this.playbackIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.playbackIntervals.delete(sessionId);
    }
  }

  private async updateSessionStatus(sessionId: string, status: PlaybackStatus): Promise<void> {
    await this.db.query(
      'UPDATE playback_sessions SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, sessionId]
    );

    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = status;
    }
  }

  private async updateSessionPosition(sessionId: string, position: number): Promise<void> {
    await this.db.query(
      'UPDATE playback_sessions SET current_position = $1, updated_at = NOW() WHERE id = $2',
      [position, sessionId]
    );

    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.currentPosition = position;
    }
  }

  private async getFlightTrack(flightId: string): Promise<FlightTrack | null> {
    const result = await this.db.query(
      'SELECT * FROM flight_tracks WHERE flight_id = $1',
      [flightId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      flightId: row.flight_id,
      callsign: row.callsign,
      registration: row.registration,
      icao24: row.icao24,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : null,
      positions: [], // Loaded separately
      totalPositions: row.position_count,
      boundingBox: row.bounding_box ? {
        north: row.bounding_box.coordinates[0][2][1],
        south: row.bounding_box.coordinates[0][0][1],
        east: row.bounding_box.coordinates[0][1][0],
        west: row.bounding_box.coordinates[0][0][0],
        maxAltitude: row.max_altitude,
        minAltitude: row.min_altitude
      } : {
        north: 0, south: 0, east: 0, west: 0,
        maxAltitude: 0, minAltitude: 0
      },
      statistics: {
        totalDistance: parseFloat(row.total_distance) || 0,
        maxAltitude: row.max_altitude || 0,
        maxGroundSpeed: row.max_ground_speed || 0,
        avgGroundSpeed: parseFloat(row.avg_ground_speed) || 0,
        totalDuration: row.total_duration || 0,
        positionCount: row.position_count || 0,
        dataGaps: row.data_gaps || []
      }
    };
  }

  private async getPositionAtIndex(flightId: string, index: number): Promise<FlightPosition | null> {
    const result = await this.db.query(`
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
      WHERE fp.flight_id = $1
      ORDER BY fp.timestamp ASC
      LIMIT 1 OFFSET $2
    `, [flightId, index]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
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
    };
  }

  private async getPositionRange(
    flightId: string, 
    startIndex: number, 
    endIndex: number
  ): Promise<FlightPosition[]> {
    const result = await this.db.query(`
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
      WHERE fp.flight_id = $1
      ORDER BY fp.timestamp ASC
      LIMIT $2 OFFSET $3
    `, [flightId, endIndex - startIndex + 1, startIndex]);

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

  private async getPositionTimestamp(flightId: string, index: number): Promise<Date | null> {
    const result = await this.db.query(`
      SELECT timestamp
      FROM flight_positions
      WHERE flight_id = $1
      ORDER BY timestamp ASC
      LIMIT 1 OFFSET $2
    `, [flightId, index]);

    return result.rows.length > 0 ? new Date(result.rows[0].timestamp) : null;
  }

  /**
   * Cleanup inactive sessions
   */
  async cleanupInactiveSessions(): Promise<number> {
    // Remove sessions that haven't been accessed in 24 hours
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    const result = await this.db.query(`
      DELETE FROM playback_sessions 
      WHERE last_accessed_at < $1 
      AND status IN ('STOPPED', 'COMPLETED')
      RETURNING id
    `, [cutoffTime]);

    // Clean up any active intervals for deleted sessions
    for (const row of result.rows) {
      this.stopPlaybackLoop(row.id);
      this.activeSessions.delete(row.id);
    }

    return result.rowCount || 0;
  }
}