/**
 * Privacy and PII Minimization Service
 * Handles GDPR compliance and data privacy controls
 */

const crypto = require('crypto');

class PrivacyService {
  constructor(auditLogger) {
    this.auditLogger = auditLogger;
    this.blockedAircraft = new Set();
    this.piiFields = [
      'registration', 'tail_number', 'owner', 'operator',
      'passenger_names', 'cargo_details', 'route_details'
    ];
    this.sensitivePatterns = [
      /^[A-Z]\d{4}[A-Z]$/, // US registration pattern
      /^[A-Z]{2}-[A-Z]{3}$/, // European registration pattern
      /^VP-[A-Z]{3}$/, // Bermuda registration pattern
    ];
  }

  /**
   * Check if aircraft should be blocked from public display
   */
  isAircraftBlocked(registration, icao24) {
    const identifiers = [registration, icao24].filter(Boolean);
    return identifiers.some(id => this.blockedAircraft.has(id.toUpperCase()));
  }

  /**
   * Add aircraft to blocked list (privacy mode)
   */
  async blockAircraft(identifier, reason, requesterId) {
    const normalizedId = identifier.toUpperCase();
    this.blockedAircraft.add(normalizedId);
    
    // Log privacy action
    this.auditLogger?.logPrivacyEvent('aircraft_blocked', requesterId, {
      aircraftId: normalizedId,
      reason,
      automated: false
    });

    // Store in database
    await this.persistBlockedAircraft(normalizedId, reason, requesterId);
    
    return { success: true, aircraftId: normalizedId };
  }

  /**
   * Remove aircraft from blocked list
   */
  async unblockAircraft(identifier, reason, requesterId) {
    const normalizedId = identifier.toUpperCase();
    this.blockedAircraft.delete(normalizedId);
    
    this.auditLogger?.logPrivacyEvent('aircraft_unblocked', requesterId, {
      aircraftId: normalizedId,
      reason,
      automated: false
    });

    await this.removeBlockedAircraft(normalizedId, requesterId);
    
    return { success: true, aircraftId: normalizedId };
  }

  /**
   * Sanitize flight data for public display
   */
  sanitizeFlightData(flightData, userTier = 'free', userId = null) {
    if (!flightData) return null;

    const sanitized = { ...flightData };
    
    // Check if aircraft is blocked
    if (this.isAircraftBlocked(sanitized.registration, sanitized.icao24)) {
      return this.createBlockedFlightData(sanitized);
    }

    // Apply tier-based data filtering
    switch (userTier) {
      case 'free':
        sanitized = this.applyFreeUserFiltering(sanitized);
        break;
      case 'plus':
        sanitized = this.applyPlusUserFiltering(sanitized);
        break;
      case 'pro':
      case 'business':
      case 'enterprise':
        // Premium users get full data (unless blocked)
        break;
    }

    // Apply PII minimization
    sanitized = this.minimizePII(sanitized, userTier);

    // Log data access
    this.auditLogger?.logDataAccess(
      userId,
      'flight_data',
      sanitized.id,
      'read',
      { tier: userTier, sanitized: true }
    );

    return sanitized;
  }

  /**
   * Create blocked aircraft placeholder data
   */
  createBlockedFlightData(originalData) {
    return {
      id: originalData.id,
      blocked: true,
      message: 'Aircraft data blocked for privacy',
      position: {
        // Keep general position but reduce precision
        latitude: this.reduceCoordinatePrecision(originalData.position?.latitude),
        longitude: this.reduceCoordinatePrecision(originalData.position?.longitude),
        altitude: Math.round((originalData.position?.altitude || 0) / 1000) * 1000,
      },
      // Remove all identifying information
      registration: null,
      icao24: null,
      callsign: null,
      aircraft: null,
      operator: null,
      route: null
    };
  }

  /**
   * Apply data filtering for free users
   */
  applyFreeUserFiltering(data) {
    return {
      ...data,
      // Limit historical data
      history: data.history?.slice(-48) || [], // Last 48 hours only
      // Remove detailed route information
      route: {
        origin: data.route?.origin,
        destination: data.route?.destination,
        // Remove intermediate waypoints
      },
      // Reduce position precision
      position: {
        ...data.position,
        latitude: this.reduceCoordinatePrecision(data.position?.latitude, 2),
        longitude: this.reduceCoordinatePrecision(data.position?.longitude, 2)
      }
    };
  }

  /**
   * Apply data filtering for Plus users
   */
  applyPlusUserFiltering(data) {
    return {
      ...data,
      // Limit to 30 days of history
      history: data.history?.slice(-720) || [], // 30 days at 1 hour intervals
      position: {
        ...data.position,
        latitude: this.reduceCoordinatePrecision(data.position?.latitude, 3),
        longitude: this.reduceCoordinatePrecision(data.position?.longitude, 3)
      }
    };
  }

  /**
   * Minimize PII in flight data
   */
  minimizePII(data, userTier) {
    const minimized = { ...data };

    // Hash sensitive identifiers for free/plus users
    if (['free', 'plus'].includes(userTier)) {
      if (minimized.registration) {
        minimized.registrationHash = this.hashIdentifier(minimized.registration);
        delete minimized.registration;
      }
      
      if (minimized.owner) {
        minimized.ownerHash = this.hashIdentifier(minimized.owner);
        delete minimized.owner;
      }
    }

    // Remove passenger/cargo details for non-business users
    if (!['business', 'enterprise'].includes(userTier)) {
      delete minimized.passengers;
      delete minimized.cargo;
      delete minimized.manifest;
    }

    return minimized;
  }

  /**
   * Reduce coordinate precision for privacy
   */
  reduceCoordinatePrecision(coordinate, decimalPlaces = 1) {
    if (typeof coordinate !== 'number') return coordinate;
    return parseFloat(coordinate.toFixed(decimalPlaces));
  }

  /**
   * Hash identifier for anonymization
   */
  hashIdentifier(identifier) {
    return crypto.createHash('sha256')
      .update(identifier + process.env.PRIVACY_SALT)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Anonymize user data for analytics
   */
  anonymizeUserData(userData) {
    return {
      userId: this.hashIdentifier(userData.id),
      tier: userData.subscription?.tier,
      country: userData.country,
      // Remove all PII
      registrationDate: userData.createdAt?.toISOString()?.substring(0, 7), // Month precision
      lastActive: userData.lastActive?.toISOString()?.substring(0, 7)
    };
  }

  /**
   * Handle data deletion request (GDPR Right to be Forgotten)
   */
  async handleDataDeletion(userId, requestType = 'full') {
    const deletionId = crypto.randomUUID();
    
    this.auditLogger?.logPrivacyEvent('data_deletion_started', userId, {
      requestId: deletionId,
      requestType,
      automated: false
    });

    try {
      switch (requestType) {
        case 'full':
          await this.fullDataDeletion(userId);
          break;
        case 'profile_only':
          await this.profileDeletion(userId);
          break;
        case 'activity_only':
          await this.activityDeletion(userId);
          break;
      }

      this.auditLogger?.logPrivacyEvent('data_deletion_completed', userId, {
        requestId: deletionId,
        requestType,
        success: true
      });

      return { success: true, requestId: deletionId };
      
    } catch (error) {
      this.auditLogger?.logPrivacyEvent('data_deletion_failed', userId, {
        requestId: deletionId,
        requestType,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Full user data deletion
   */
  async fullDataDeletion(userId) {
    // Delete from all tables
    const deletionPromises = [
      this.deleteUserProfile(userId),
      this.deleteUserSubscriptions(userId),
      this.deleteUserAlerts(userId),
      this.deleteUserSavedItems(userId),
      this.deleteUserSessions(userId),
      this.anonymizeUserLogs(userId)
    ];

    await Promise.all(deletionPromises);
  }

  /**
   * Generate data export for user (GDPR Right to Access)
   */
  async generateDataExport(userId) {
    const exportId = crypto.randomUUID();
    
    this.auditLogger?.logPrivacyEvent('data_export_requested', userId, {
      requestId: exportId
    });

    try {
      const userData = await this.collectUserData(userId);
      const exportData = {
        exportId,
        userId,
        generatedAt: new Date().toISOString(),
        data: userData,
        retentionInfo: {
          profile: '2 years from last login',
          subscriptions: '7 years for tax purposes',
          alerts: '1 year from creation',
          logs: '1 year from creation'
        }
      };

      this.auditLogger?.logPrivacyEvent('data_export_completed', userId, {
        requestId: exportId,
        recordsExported: Object.keys(userData).length
      });

      return exportData;
      
    } catch (error) {
      this.auditLogger?.logPrivacyEvent('data_export_failed', userId, {
        requestId: exportId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Apply data retention policy
   */
  async applyRetentionPolicy() {
    const policies = {
      user_profiles: 730, // 2 years
      user_sessions: 90,  // 3 months
      audit_logs: 365,    // 1 year
      flight_history: {
        free: 2,          // 2 days
        plus: 30,         // 30 days
        pro: 365,         // 1 year
        business: 1095,   // 3 years
        enterprise: -1    // Unlimited
      }
    };

    this.auditLogger?.logComplianceEvent('retention_policy_applied', {
      policies,
      automated: true
    });

    const results = {};
    
    for (const [dataType, retentionDays] of Object.entries(policies)) {
      if (typeof retentionDays === 'number' && retentionDays > 0) {
        results[dataType] = await this.cleanupExpiredData(dataType, retentionDays);
      }
    }

    return results;
  }

  /**
   * Validate aircraft registration patterns
   */
  isSensitiveRegistration(registration) {
    if (!registration) return false;
    
    return this.sensitivePatterns.some(pattern => 
      pattern.test(registration.toUpperCase())
    );
  }

  /**
   * Create privacy-friendly search results
   */
  sanitizeSearchResults(results, userTier, userId) {
    return results.map(result => {
      if (result.type === 'aircraft' && this.isAircraftBlocked(result.registration, result.icao24)) {
        return null; // Exclude blocked aircraft from search
      }
      
      return this.sanitizeFlightData(result, userTier, userId);
    }).filter(Boolean);
  }

  // Database operations (implement based on your database)
  async persistBlockedAircraft(aircraftId, reason, requesterId) {
    // Implementation depends on your database
  }

  async removeBlockedAircraft(aircraftId, requesterId) {
    // Implementation depends on your database
  }

  async deleteUserProfile(userId) {
    // Implementation depends on your database
  }

  async deleteUserSubscriptions(userId) {
    // Implementation depends on your database
  }

  async deleteUserAlerts(userId) {
    // Implementation depends on your database
  }

  async deleteUserSavedItems(userId) {
    // Implementation depends on your database
  }

  async deleteUserSessions(userId) {
    // Implementation depends on your database
  }

  async anonymizeUserLogs(userId) {
    // Replace user ID with anonymous hash in logs
  }

  async collectUserData(userId) {
    // Collect all user data for export
    return {};
  }

  async cleanupExpiredData(dataType, retentionDays) {
    // Clean up data older than retention period
    return { cleaned: 0 };
  }
}

module.exports = PrivacyService;