import { FlightPosition, FlightTrack, BoundingBox, TrackStatistics, DataGap } from '../types/history';

export class HistoryUtils {
  /**
   * Calculate bounding box from flight positions
   */
  static calculateBoundingBox(positions: FlightPosition[]): BoundingBox {
    if (positions.length === 0) {
      return {
        north: 0, south: 0, east: 0, west: 0,
        maxAltitude: 0, minAltitude: 0
      };
    }

    let north = -90, south = 90, east = -180, west = 180;
    let maxAltitude = 0, minAltitude = Infinity;

    for (const pos of positions) {
      north = Math.max(north, pos.position.latitude);
      south = Math.min(south, pos.position.latitude);
      east = Math.max(east, pos.position.longitude);
      west = Math.min(west, pos.position.longitude);
      
      if (pos.position.altitude) {
        maxAltitude = Math.max(maxAltitude, pos.position.altitude);
        minAltitude = Math.min(minAltitude, pos.position.altitude);
      }
    }

    return {
      north, south, east, west,
      maxAltitude,
      minAltitude: minAltitude === Infinity ? 0 : minAltitude
    };
  }

  /**
   * Calculate track statistics from positions
   */
  static calculateTrackStatistics(positions: FlightPosition[]): TrackStatistics {
    if (positions.length === 0) {
      return {
        totalDistance: 0,
        maxAltitude: 0,
        maxGroundSpeed: 0,
        avgGroundSpeed: 0,
        totalDuration: 0,
        positionCount: 0,
        dataGaps: []
      };
    }

    let totalDistance = 0;
    let maxAltitude = 0;
    let maxGroundSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;
    const dataGaps: DataGap[] = [];

    // Sort positions by timestamp
    const sortedPositions = [...positions].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Calculate metrics
    for (let i = 0; i < sortedPositions.length; i++) {
      const pos = sortedPositions[i];
      
      // Altitude and speed tracking
      if (pos.position.altitude) {
        maxAltitude = Math.max(maxAltitude, pos.position.altitude);
      }
      
      if (pos.position.groundSpeed) {
        maxGroundSpeed = Math.max(maxGroundSpeed, pos.position.groundSpeed);
        speedSum += pos.position.groundSpeed;
        speedCount++;
      }

      // Distance calculation
      if (i > 0) {
        const prevPos = sortedPositions[i - 1];
        const distance = this.calculateDistance(
          prevPos.position.latitude, prevPos.position.longitude,
          pos.position.latitude, pos.position.longitude
        );
        totalDistance += distance;

        // Data gap detection (>5 minutes between positions)
        const timeDiff = pos.timestamp.getTime() - prevPos.timestamp.getTime();
        if (timeDiff > 5 * 60 * 1000) { // 5 minutes
          dataGaps.push({
            startTime: prevPos.timestamp,
            endTime: pos.timestamp,
            duration: timeDiff / 1000, // seconds
            estimatedPositions: Math.floor(timeDiff / (60 * 1000)) // rough estimate
          });
        }
      }
    }

    const totalDuration = sortedPositions.length > 1 
      ? (sortedPositions[sortedPositions.length - 1].timestamp.getTime() - 
         sortedPositions[0].timestamp.getTime()) / 1000
      : 0;

    return {
      totalDistance,
      maxAltitude,
      maxGroundSpeed,
      avgGroundSpeed: speedCount > 0 ? speedSum / speedCount : 0,
      totalDuration,
      positionCount: positions.length,
      dataGaps
    };
  }

  /**
   * Calculate distance between two coordinates in nautical miles
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Interpolate missing positions between two points
   */
  static interpolatePositions(
    startPos: FlightPosition, 
    endPos: FlightPosition, 
    intervalSeconds: number = 60
  ): FlightPosition[] {
    const interpolated: FlightPosition[] = [];
    
    const startTime = startPos.timestamp.getTime();
    const endTime = endPos.timestamp.getTime();
    const totalDuration = endTime - startTime;
    
    if (totalDuration <= intervalSeconds * 1000) {
      return []; // No interpolation needed
    }
    
    const steps = Math.floor(totalDuration / (intervalSeconds * 1000));
    
    for (let i = 1; i < steps; i++) {
      const ratio = i / steps;
      const timestamp = new Date(startTime + (totalDuration * ratio));
      
      // Linear interpolation of position
      const latitude = startPos.position.latitude + 
        (endPos.position.latitude - startPos.position.latitude) * ratio;
      const longitude = startPos.position.longitude + 
        (endPos.position.longitude - startPos.position.longitude) * ratio;
      
      // Interpolate other values
      const altitude = startPos.position.altitude && endPos.position.altitude
        ? Math.round(startPos.position.altitude + 
          (endPos.position.altitude - startPos.position.altitude) * ratio)
        : startPos.position.altitude || endPos.position.altitude;
        
      const groundSpeed = startPos.position.groundSpeed && endPos.position.groundSpeed
        ? Math.round(startPos.position.groundSpeed + 
          (endPos.position.groundSpeed - startPos.position.groundSpeed) * ratio)
        : startPos.position.groundSpeed || endPos.position.groundSpeed;

      interpolated.push({
        id: `${startPos.id}-interp-${i}`,
        flightId: startPos.flightId,
        timestamp,
        position: {
          latitude,
          longitude,
          altitude,
          groundSpeed,
          verticalRate: 0, // Cannot interpolate reliably
          heading: startPos.position.heading // Use start heading
        },
        source: 'ESTIMATED',
        quality: 'INTERPOLATED',
        interpolated: true,
        metadata: {
          interpolatedBetween: [startPos.id, endPos.id],
          interpolationRatio: ratio
        }
      });
    }
    
    return interpolated;
  }

  /**
   * Smooth noisy position data
   */
  static smoothPositions(positions: FlightPosition[], windowSize: number = 5): FlightPosition[] {
    if (positions.length < windowSize) {
      return positions;
    }

    const smoothed: FlightPosition[] = [];
    
    for (let i = 0; i < positions.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(positions.length - 1, i + Math.floor(windowSize / 2));
      
      const window = positions.slice(start, end + 1);
      
      // Calculate weighted averages
      let totalWeight = 0;
      let weightedLat = 0;
      let weightedLon = 0;
      let weightedAlt = 0;
      let weightedSpeed = 0;
      
      window.forEach((pos, idx) => {
        // Give more weight to positions closer to center
        const distance = Math.abs(idx - (window.length / 2));
        const weight = 1 / (1 + distance);
        
        totalWeight += weight;
        weightedLat += pos.position.latitude * weight;
        weightedLon += pos.position.longitude * weight;
        
        if (pos.position.altitude) {
          weightedAlt += pos.position.altitude * weight;
        }
        
        if (pos.position.groundSpeed) {
          weightedSpeed += pos.position.groundSpeed * weight;
        }
      });
      
      smoothed.push({
        ...positions[i],
        position: {
          ...positions[i].position,
          latitude: weightedLat / totalWeight,
          longitude: weightedLon / totalWeight,
          altitude: Math.round(weightedAlt / totalWeight),
          groundSpeed: Math.round(weightedSpeed / totalWeight)
        },
        metadata: {
          ...positions[i].metadata,
          smoothed: true,
          smoothingWindow: windowSize
        }
      });
    }
    
    return smoothed;
  }

  /**
   * Detect outlier positions
   */
  static detectOutliers(positions: FlightPosition[]): FlightPosition[] {
    if (positions.length < 3) {
      return [];
    }

    const outliers: FlightPosition[] = [];
    const sorted = [...positions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (let i = 1; i < sorted.length - 1; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      const next = sorted[i + 1];
      
      // Calculate speeds to/from this position
      const speedToCurrent = this.calculateGroundSpeed(prev, current);
      const speedFromCurrent = this.calculateGroundSpeed(current, next);
      
      // Detect unrealistic speeds (>2000 kts)
      if (speedToCurrent > 2000 || speedFromCurrent > 2000) {
        outliers.push(current);
        continue;
      }
      
      // Detect altitude jumps (>10,000ft in <60s)
      const timeDiff = (current.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
      if (timeDiff < 60 && current.position.altitude && prev.position.altitude) {
        const altDiff = Math.abs(current.position.altitude - prev.position.altitude);
        if (altDiff > 10000) {
          outliers.push(current);
        }
      }
    }
    
    return outliers;
  }

  /**
   * Calculate ground speed between two positions
   */
  private static calculateGroundSpeed(pos1: FlightPosition, pos2: FlightPosition): number {
    const distance = this.calculateDistance(
      pos1.position.latitude, pos1.position.longitude,
      pos2.position.latitude, pos2.position.longitude
    );
    
    const timeDiff = (pos2.timestamp.getTime() - pos1.timestamp.getTime()) / 1000; // seconds
    const timeHours = timeDiff / 3600; // hours
    
    return timeHours > 0 ? distance / timeHours : 0; // knots
  }

  /**
   * Group positions by flight phase (takeoff, climb, cruise, descent, landing)
   */
  static groupByFlightPhase(positions: FlightPosition[]): Map<string, FlightPosition[]> {
    const phases = new Map<string, FlightPosition[]>();
    const sorted = [...positions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (const pos of sorted) {
      let phase = 'unknown';
      
      if (pos.position.altitude) {
        if (pos.position.altitude < 1000) {
          phase = pos.position.groundSpeed && pos.position.groundSpeed > 50 
            ? (pos.position.verticalRate && pos.position.verticalRate > 100 ? 'takeoff' : 'taxi')
            : 'ground';
        } else if (pos.position.altitude < 10000) {
          phase = pos.position.verticalRate && pos.position.verticalRate > 500 
            ? 'climb' 
            : (pos.position.verticalRate && pos.position.verticalRate < -500 ? 'descent' : 'low_altitude');
        } else {
          phase = pos.position.verticalRate && Math.abs(pos.position.verticalRate) < 300 
            ? 'cruise' 
            : (pos.position.verticalRate > 0 ? 'climb' : 'descent');
        }
      }
      
      if (!phases.has(phase)) {
        phases.set(phase, []);
      }
      phases.get(phase)!.push(pos);
    }
    
    return phases;
  }

  /**
   * Calculate flight efficiency metrics
   */
  static calculateEfficiencyMetrics(positions: FlightPosition[]): {
    directDistance: number;
    actualDistance: number;
    efficiencyRatio: number;
    excessDistance: number;
  } {
    if (positions.length < 2) {
      return { directDistance: 0, actualDistance: 0, efficiencyRatio: 0, excessDistance: 0 };
    }
    
    const sorted = [...positions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const start = sorted[0];
    const end = sorted[sorted.length - 1];
    
    // Direct distance between start and end
    const directDistance = this.calculateDistance(
      start.position.latitude, start.position.longitude,
      end.position.latitude, end.position.longitude
    );
    
    // Actual distance traveled
    let actualDistance = 0;
    for (let i = 1; i < sorted.length; i++) {
      actualDistance += this.calculateDistance(
        sorted[i-1].position.latitude, sorted[i-1].position.longitude,
        sorted[i].position.latitude, sorted[i].position.longitude
      );
    }
    
    const efficiencyRatio = directDistance > 0 ? directDistance / actualDistance : 0;
    const excessDistance = actualDistance - directDistance;
    
    return {
      directDistance,
      actualDistance,
      efficiencyRatio,
      excessDistance
    };
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}