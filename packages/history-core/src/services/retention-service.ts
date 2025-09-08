import { Pool } from 'pg';
import { Redis } from 'redis';
import { SubscriptionTier } from '@flighttrace/billing-core';
import { RetentionPolicy } from '../types/history';

export class RetentionService {
  private db: Pool;
  private redis: Redis;

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
  }

  /**
   * Get retention policy for a user's subscription tier
   */
  async getRetentionPolicy(tier: SubscriptionTier): Promise<RetentionPolicy> {
    const cacheKey = `retention:policy:${tier}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const result = await this.db.query(
      'SELECT * FROM retention_policies WHERE tier = $1',
      [tier]
    );

    if (result.rows.length === 0) {
      throw new Error(`No retention policy found for tier: ${tier}`);
    }

    const policy: RetentionPolicy = {
      tier: result.rows[0].tier,
      retentionDays: result.rows[0].retention_days,
      maxExportsPerDay: result.rows[0].max_exports_per_day,
      maxExportSizeMB: result.rows[0].max_export_size_mb,
      exportFormats: result.rows[0].export_formats,
      playbackEnabled: result.rows[0].playback_enabled,
      historicalSearchEnabled: result.rows[0].historical_search_enabled
    };

    // Cache for 1 hour
    await this.redis.setEx(cacheKey, 3600, JSON.stringify(policy));

    return policy;
  }

  /**
   * Check if user can access data from a specific time period
   */
  async canAccessHistoricalData(
    userId: string, 
    tier: SubscriptionTier, 
    requestedTime: Date
  ): Promise<boolean> {
    const policy = await this.getRetentionPolicy(tier);
    
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - policy.retentionDays);

    return requestedTime >= retentionCutoff;
  }

  /**
   * Get available date range for a user based on their tier
   */
  async getAvailableDateRange(tier: SubscriptionTier): Promise<{
    earliestDate: Date;
    latestDate: Date;
  }> {
    const policy = await this.getRetentionPolicy(tier);
    
    const earliestDate = new Date();
    earliestDate.setDate(earliestDate.getDate() - policy.retentionDays);
    
    const latestDate = new Date();

    return {
      earliestDate,
      latestDate
    };
  }

  /**
   * Cleanup old flight positions based on retention policies
   */
  async cleanupExpiredData(): Promise<{
    deletedPositions: number;
    deletedTracks: number;
    cleanupTime: number;
  }> {
    const startTime = Date.now();
    let totalDeletedPositions = 0;
    let totalDeletedTracks = 0;

    // Get all retention policies
    const policies = await this.db.query(
      'SELECT tier, retention_days FROM retention_policies ORDER BY retention_days'
    );

    for (const policy of policies.rows) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

      // In a real implementation, this would need to consider user subscriptions
      // For now, we'll use the shortest retention period as the global cutoff
      if (policy.tier === 'free') {
        // Delete positions older than free tier retention
        const deletePositionsResult = await this.db.query(`
          DELETE FROM flight_positions 
          WHERE timestamp < $1
          AND flight_id IN (
            SELECT DISTINCT fp.flight_id 
            FROM flight_positions fp
            JOIN flight_tracks ft ON fp.flight_id = ft.flight_id
            WHERE fp.timestamp < $1
            -- In practice, join with user subscriptions here
          )
        `, [cutoffDate]);

        totalDeletedPositions += deletePositionsResult.rowCount || 0;

        // Delete tracks that no longer have any positions
        const deleteTracksResult = await this.db.query(`
          DELETE FROM flight_tracks 
          WHERE id NOT IN (
            SELECT DISTINCT flight_id 
            FROM flight_positions
          )
        `);

        totalDeletedTracks += deleteTracksResult.rowCount || 0;
      }
    }

    const cleanupTime = Date.now() - startTime;

    // Log cleanup results
    console.log(`Data cleanup completed: ${totalDeletedPositions} positions, ${totalDeletedTracks} tracks in ${cleanupTime}ms`);

    return {
      deletedPositions: totalDeletedPositions,
      deletedTracks: totalDeletedTracks,
      cleanupTime
    };
  }

  /**
   * Advanced cleanup with user-specific retention
   */
  async cleanupUserSpecificData(userId: string, tier: SubscriptionTier): Promise<void> {
    const policy = await this.getRetentionPolicy(tier);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // This would require tracking which flights belong to which users
    // For now, this is a placeholder for user-specific cleanup logic
    await this.db.query(`
      DELETE FROM flight_positions fp
      USING flight_tracks ft
      WHERE fp.flight_id = ft.flight_id
      AND fp.timestamp < $1
      -- AND ft.user_id = $2  -- Would need user_id in flight_tracks
    `, [cutoffDate]);
  }

  /**
   * Get retention statistics
   */
  async getRetentionStatistics(): Promise<{
    totalPositions: number;
    totalTracks: number;
    oldestPosition: Date | null;
    newestPosition: Date | null;
    positionsByTier: Record<string, number>;
    storageUsageMB: number;
  }> {
    // Get overall statistics
    const statsQuery = await this.db.query(`
      SELECT 
        COUNT(fp.id) as total_positions,
        COUNT(DISTINCT fp.flight_id) as total_tracks,
        MIN(fp.timestamp) as oldest_position,
        MAX(fp.timestamp) as newest_position,
        pg_size_pretty(pg_total_relation_size('flight_positions')) as storage_size
      FROM flight_positions fp
    `);

    const stats = statsQuery.rows[0];

    // Get positions by tier (approximation)
    const tierStats = await this.db.query(`
      SELECT 
        rp.tier,
        COUNT(fp.id) as position_count
      FROM retention_policies rp
      CROSS JOIN flight_positions fp
      WHERE fp.timestamp >= (NOW() - (rp.retention_days || ' days')::INTERVAL)
      GROUP BY rp.tier
      ORDER BY rp.retention_days
    `);

    const positionsByTier: Record<string, number> = {};
    for (const row of tierStats.rows) {
      positionsByTier[row.tier] = parseInt(row.position_count);
    }

    return {
      totalPositions: parseInt(stats.total_positions) || 0,
      totalTracks: parseInt(stats.total_tracks) || 0,
      oldestPosition: stats.oldest_position ? new Date(stats.oldest_position) : null,
      newestPosition: stats.newest_position ? new Date(stats.newest_position) : null,
      positionsByTier,
      storageUsageMB: this.parseStorageSize(stats.storage_size) || 0
    };
  }

  /**
   * Schedule automatic cleanup
   */
  async scheduleCleanup(): Promise<void> {
    // This would integrate with a job scheduler like Bull or node-cron
    // For now, it's a manual trigger
    await this.cleanupExpiredData();
  }

  /**
   * Update retention policies
   */
  async updateRetentionPolicy(
    tier: SubscriptionTier, 
    updates: Partial<RetentionPolicy>
  ): Promise<void> {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (updates.retentionDays !== undefined) {
      setClause.push(`retention_days = $${paramCount++}`);
      values.push(updates.retentionDays);
    }

    if (updates.maxExportsPerDay !== undefined) {
      setClause.push(`max_exports_per_day = $${paramCount++}`);
      values.push(updates.maxExportsPerDay);
    }

    if (updates.maxExportSizeMB !== undefined) {
      setClause.push(`max_export_size_mb = $${paramCount++}`);
      values.push(updates.maxExportSizeMB);
    }

    if (updates.exportFormats !== undefined) {
      setClause.push(`export_formats = $${paramCount++}`);
      values.push(updates.exportFormats);
    }

    if (updates.playbackEnabled !== undefined) {
      setClause.push(`playback_enabled = $${paramCount++}`);
      values.push(updates.playbackEnabled);
    }

    if (updates.historicalSearchEnabled !== undefined) {
      setClause.push(`historical_search_enabled = $${paramCount++}`);
      values.push(updates.historicalSearchEnabled);
    }

    if (setClause.length === 0) {
      return; // No updates to make
    }

    setClause.push(`updated_at = NOW()`);
    values.push(tier);

    await this.db.query(`
      UPDATE retention_policies 
      SET ${setClause.join(', ')}
      WHERE tier = $${paramCount}
    `, values);

    // Clear cache
    await this.redis.del(`retention:policy:${tier}`);
  }

  private parseStorageSize(sizeString: string): number {
    if (!sizeString) return 0;
    
    const match = sizeString.match(/^([\d.]+)\s*(\w+)$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    const multipliers: Record<string, number> = {
      'BYTES': 1 / 1024 / 1024,
      'KB': 1 / 1024,
      'MB': 1,
      'GB': 1024,
      'TB': 1024 * 1024
    };
    
    return value * (multipliers[unit] || 0);
  }
}