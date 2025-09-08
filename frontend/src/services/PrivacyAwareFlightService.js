/**
 * Privacy-Aware Flight Data Service
 * Handles blocked aircraft and privacy mode display
 */

import { PrivacyNotice } from '../components/attribution/AttributionFooter';

class PrivacyAwareFlightService {
  constructor(baseFlightService, privacyConfig = {}) {
    this.baseFlightService = baseFlightService;
    this.config = {
      showBlockedAircraft: privacyConfig.showBlockedAircraft || false,
      anonymizePositions: privacyConfig.anonymizePositions || true,
      coordinatePrecision: privacyConfig.coordinatePrecision || 2,
      showPrivacyNotices: privacyConfig.showPrivacyNotices || true,
      ...privacyConfig
    };
    
    this.blockedAircraft = new Set();
    this.privacyNotices = new Map();
  }

  /**
   * Get flights with privacy filtering applied
   */
  async getFlights(bounds, filters = {}) {
    try {
      const rawFlights = await this.baseFlightService.getFlights(bounds, filters);
      return this.applyPrivacyFiltering(rawFlights, filters.userTier);
    } catch (error) {
      console.error('Error fetching flights:', error);
      return [];
    }
  }

  /**
   * Apply privacy filtering to flight data
   */
  applyPrivacyFiltering(flights, userTier = 'free') {
    return flights.map(flight => {
      // Check if aircraft is blocked
      if (this.isAircraftBlocked(flight)) {
        return this.handleBlockedAircraft(flight, userTier);
      }

      // Apply tier-based privacy controls
      return this.applyTierPrivacyControls(flight, userTier);
    }).filter(Boolean);
  }

  /**
   * Check if aircraft is blocked from public display
   */
  isAircraftBlocked(flight) {
    const identifiers = [
      flight.registration,
      flight.icao24,
      flight.callsign
    ].filter(Boolean);

    return identifiers.some(id => 
      this.blockedAircraft.has(id.toUpperCase())
    );
  }

  /**
   * Handle blocked aircraft based on privacy settings
   */
  handleBlockedAircraft(flight, userTier) {
    if (!this.config.showBlockedAircraft) {
      return null; // Completely hide blocked aircraft
    }

    // Show privacy placeholder
    return {
      id: flight.id,
      blocked: true,
      privacyMode: true,
      position: this.anonymizePosition(flight.position),
      altitude: this.anonymizeAltitude(flight.altitude),
      heading: flight.heading, // Keep heading for general direction
      speed: null,
      // Remove all identifying information
      registration: null,
      icao24: null,
      callsign: null,
      aircraft: {
        type: 'BLOCKED',
        category: 'privacy'
      },
      operator: null,
      route: null,
      metadata: {
        privacyNotice: 'Aircraft data blocked for privacy protection',
        showPrivacyIcon: true
      }
    };
  }

  /**
   * Apply tier-based privacy controls
   */
  applyTierPrivacyControls(flight, userTier) {
    const tierControls = {
      free: {
        anonymizeOwner: true,
        reducePositionPrecision: true,
        limitRouteDetails: true,
        removePassengerInfo: true
      },
      plus: {
        anonymizeOwner: true,
        reducePositionPrecision: true,
        limitRouteDetails: false,
        removePassengerInfo: true
      },
      pro: {
        anonymizeOwner: false,
        reducePositionPrecision: false,
        limitRouteDetails: false,
        removePassengerInfo: true
      },
      business: {
        anonymizeOwner: false,
        reducePositionPrecision: false,
        limitRouteDetails: false,
        removePassengerInfo: false
      },
      enterprise: {
        anonymizeOwner: false,
        reducePositionPrecision: false,
        limitRouteDetails: false,
        removePassengerInfo: false
      }
    };

    const controls = tierControls[userTier] || tierControls.free;
    const processedFlight = { ...flight };

    // Apply position precision reduction
    if (controls.reducePositionPrecision) {
      processedFlight.position = this.reducePositionPrecision(
        flight.position,
        this.config.coordinatePrecision
      );
    }

    // Remove/anonymize owner information
    if (controls.anonymizeOwner && flight.owner) {
      processedFlight.ownerHash = this.hashIdentifier(flight.owner);
      delete processedFlight.owner;
    }

    // Limit route details
    if (controls.limitRouteDetails && flight.route) {
      processedFlight.route = {
        origin: flight.route.origin,
        destination: flight.route.destination
        // Remove waypoints and detailed routing
      };
    }

    // Remove passenger information
    if (controls.removePassengerInfo) {
      delete processedFlight.passengers;
      delete processedFlight.manifest;
      delete processedFlight.cargo;
    }

    // Add privacy metadata
    processedFlight.privacy = {
      tier: userTier,
      anonymized: controls.anonymizeOwner || controls.reducePositionPrecision,
      limited: controls.limitRouteDetails || controls.removePassengerInfo
    };

    return processedFlight;
  }

  /**
   * Anonymize position coordinates
   */
  anonymizePosition(position) {
    if (!position) return null;

    return {
      ...position,
      latitude: this.reduceCoordinatePrecision(position.latitude, 1),
      longitude: this.reduceCoordinatePrecision(position.longitude, 1)
    };
  }

  /**
   * Reduce coordinate precision for privacy
   */
  reduceCoordinatePrecision(coordinate, precision = 2) {
    if (typeof coordinate !== 'number') return coordinate;
    return parseFloat(coordinate.toFixed(precision));
  }

  /**
   * Reduce position precision based on tier
   */
  reducePositionPrecision(position, precision) {
    if (!position) return null;

    return {
      ...position,
      latitude: this.reduceCoordinatePrecision(position.latitude, precision),
      longitude: this.reduceCoordinatePrecision(position.longitude, precision)
    };
  }

  /**
   * Anonymize altitude information
   */
  anonymizeAltitude(altitude) {
    if (!altitude) return null;
    
    // Round to nearest 1000 feet for privacy
    return Math.round(altitude / 1000) * 1000;
  }

  /**
   * Hash identifier for anonymization
   */
  hashIdentifier(identifier) {
    // Simple hash for demo purposes
    // In production, use proper cryptographic hash with salt
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  /**
   * Add aircraft to blocked list
   */
  async blockAircraft(identifier, reason = 'Privacy request') {
    const normalizedId = identifier.toUpperCase();
    this.blockedAircraft.add(normalizedId);
    
    // Store privacy notice
    this.privacyNotices.set(normalizedId, {
      reason,
      blockedAt: new Date().toISOString(),
      type: 'blocked'
    });

    // Persist to backend
    try {
      await fetch('/api/privacy/block-aircraft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: normalizedId,
          reason
        })
      });
    } catch (error) {
      console.error('Error blocking aircraft:', error);
    }
  }

  /**
   * Remove aircraft from blocked list
   */
  async unblockAircraft(identifier) {
    const normalizedId = identifier.toUpperCase();
    this.blockedAircraft.delete(normalizedId);
    this.privacyNotices.delete(normalizedId);

    try {
      await fetch('/api/privacy/unblock-aircraft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: normalizedId
        })
      });
    } catch (error) {
      console.error('Error unblocking aircraft:', error);
    }
  }

  /**
   * Load blocked aircraft list from backend
   */
  async loadBlockedAircraft() {
    try {
      const response = await fetch('/api/privacy/blocked-aircraft');
      const blockedList = await response.json();
      
      this.blockedAircraft.clear();
      blockedList.forEach(item => {
        this.blockedAircraft.add(item.identifier.toUpperCase());
        this.privacyNotices.set(item.identifier.toUpperCase(), {
          reason: item.reason,
          blockedAt: item.createdAt,
          type: 'blocked'
        });
      });
    } catch (error) {
      console.error('Error loading blocked aircraft:', error);
    }
  }

  /**
   * Get privacy notice for aircraft
   */
  getPrivacyNotice(identifier) {
    const normalizedId = identifier.toUpperCase();
    return this.privacyNotices.get(normalizedId);
  }

  /**
   * Check if user can see full aircraft data
   */
  canSeeFullData(userTier, dataType) {
    const permissions = {
      owner: ['pro', 'business', 'enterprise'],
      passengers: ['business', 'enterprise'],
      detailedRoute: ['plus', 'pro', 'business', 'enterprise'],
      fullPosition: ['pro', 'business', 'enterprise']
    };

    return permissions[dataType]?.includes(userTier) || false;
  }

  /**
   * Update privacy configuration
   */
  updatePrivacyConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get privacy statistics for analytics
   */
  getPrivacyStats() {
    return {
      blockedAircraft: this.blockedAircraft.size,
      privacyNotices: this.privacyNotices.size,
      config: this.config
    };
  }
}

export default PrivacyAwareFlightService;