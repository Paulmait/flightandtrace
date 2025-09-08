import { ExportOptions } from '../services/export-service';

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: number[] | number[][] | number[][][];
  };
  properties: { [key: string]: any };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata?: {
    generated: string;
    count: number;
    bounds?: [number, number, number, number];
    description?: string;
  };
}

export class GeoJSONFormatter {
  async format(data: any[], options?: ExportOptions): Promise<string> {
    if (data.length === 0) {
      return JSON.stringify(this.createEmptyFeatureCollection());
    }

    const sample = data[0];
    const isFlightData = sample.callsign !== undefined || sample.icao24 !== undefined;
    const isPositionData = sample.latitude !== undefined && sample.longitude !== undefined;
    const isAlertData = sample.ruleId !== undefined;

    let features: GeoJSONFeature[] = [];

    if (isFlightData) {
      features = this.formatFlightData(data, options);
    } else if (isPositionData) {
      features = this.formatPositionData(data, options);
    } else if (isAlertData) {
      features = this.formatAlertData(data, options);
    } else {
      features = this.formatGenericGeoData(data, options);
    }

    const featureCollection: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features
    };

    if (options?.includeMetadata) {
      featureCollection.metadata = {
        generated: new Date().toISOString(),
        count: features.length,
        bounds: this.calculateBounds(features),
        description: 'FlightTrace export data in GeoJSON format'
      };
    }

    return JSON.stringify(featureCollection, null, 2);
  }

  private formatFlightData(data: any[], options?: ExportOptions): GeoJSONFeature[] {
    const features: GeoJSONFeature[] = [];

    data.forEach(flight => {
      // Create flight path as LineString if positions available
      if (flight.positions && flight.positions.length >= 2) {
        const coordinates = flight.positions
          .filter((pos: any) => pos.latitude && pos.longitude)
          .map((pos: any) => [
            pos.longitude, 
            pos.latitude, 
            ...(options?.includeCalculatedFields && pos.altitude ? [pos.altitude * 0.3048] : [])
          ]);

        if (coordinates.length >= 2) {
          const properties: any = {
            type: 'flight_path',
            flight_id: flight.id,
            callsign: flight.callsign || null,
            registration: flight.registration || null,
            icao24: flight.icao24,
            operator: flight.operator || null,
            origin: flight.origin || null,
            destination: flight.destination || null,
            departure_time: flight.departureTime?.toISOString() || null,
            arrival_time: flight.arrivalTime?.toISOString() || null,
            status: flight.status,
            aircraft_type: flight.aircraft?.type || null
          };

          if (options?.includeEmissions && flight.emissions) {
            properties.fuel_consumption_kg = flight.emissions.fuelConsumption;
            properties.co2_emissions_kg = flight.emissions.co2Emissions;
            properties.emissions_per_km = flight.emissions.emissionsPerKm;
          }

          if (options?.includeCalculatedFields) {
            properties.distance_km = this.calculatePathDistance(coordinates);
            properties.duration_seconds = this.calculateDuration(flight);
            properties.max_altitude_m = this.getMaxAltitude(coordinates);
            properties.min_altitude_m = this.getMinAltitude(coordinates);
          }

          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates
            },
            properties
          });
        }
      }

      // Add origin and destination points if available
      if (flight.origin && flight.originAirport?.latitude && flight.originAirport?.longitude) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [flight.originAirport.longitude, flight.originAirport.latitude]
          },
          properties: {
            type: 'origin',
            airport_code: flight.origin,
            airport_name: flight.originAirport.name || null,
            flight_id: flight.id,
            callsign: flight.callsign || null,
            departure_time: flight.departureTime?.toISOString() || null
          }
        });
      }

      if (flight.destination && flight.destinationAirport?.latitude && flight.destinationAirport?.longitude) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [flight.destinationAirport.longitude, flight.destinationAirport.latitude]
          },
          properties: {
            type: 'destination',
            airport_code: flight.destination,
            airport_name: flight.destinationAirport.name || null,
            flight_id: flight.id,
            callsign: flight.callsign || null,
            arrival_time: flight.arrivalTime?.toISOString() || null
          }
        });
      }

      // Add current position if available
      if (flight.positions && flight.positions.length > 0) {
        const lastPos = flight.positions[flight.positions.length - 1];
        if (lastPos.latitude && lastPos.longitude) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [
                lastPos.longitude, 
                lastPos.latitude,
                ...(lastPos.altitude ? [lastPos.altitude * 0.3048] : [])
              ]
            },
            properties: {
              type: 'current_position',
              flight_id: flight.id,
              callsign: flight.callsign || null,
              timestamp: lastPos.timestamp?.toISOString() || null,
              altitude_ft: lastPos.altitude,
              speed_knots: lastPos.speed,
              heading: lastPos.heading,
              on_ground: lastPos.onGround || false
            }
          });
        }
      }
    });

    return features;
  }

  private formatPositionData(data: any[], options?: ExportOptions): GeoJSONFeature[] {
    return data
      .filter(pos => pos.latitude && pos.longitude)
      .map(pos => {
        const coordinates = [
          pos.longitude, 
          pos.latitude,
          ...(options?.includeCalculatedFields && pos.altitude ? [pos.altitude * 0.3048] : [])
        ];

        const properties: any = {
          type: 'position',
          timestamp: pos.timestamp?.toISOString() || null,
          flight_id: pos.flightId || pos.flight?.id || null,
          callsign: pos.flight?.callsign || null,
          icao24: pos.flight?.icao24 || null,
          altitude_ft: pos.altitude,
          speed_knots: pos.speed,
          heading: pos.heading,
          vertical_rate_fpm: pos.verticalRate,
          on_ground: pos.onGround || false,
          source: pos.source || null,
          accuracy: pos.accuracy || null
        };

        if (options?.includeCalculatedFields) {
          properties.altitude_m = pos.altitude ? Math.round(pos.altitude * 0.3048) : null;
          properties.speed_kmh = pos.speed ? Math.round(pos.speed * 1.852) : null;
          properties.speed_ms = pos.speed ? Math.round(pos.speed * 0.5144) : null;
        }

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates
          },
          properties
        };
      });
  }

  private formatAlertData(data: any[], options?: ExportOptions): GeoJSONFeature[] {
    return data
      .filter(alert => alert.data?.context?.position?.latitude && alert.data?.context?.position?.longitude)
      .map(alert => {
        const pos = alert.data.context.position;
        const coordinates = [
          pos.longitude, 
          pos.latitude,
          ...(pos.altitude ? [pos.altitude * 0.3048] : [])
        ];

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates
          },
          properties: {
            type: 'alert',
            alert_id: alert.id,
            rule_id: alert.ruleId,
            rule_name: alert.rule?.name || null,
            flight_id: alert.flightId,
            flight_callsign: alert.data?.flight?.callsign || null,
            flight_registration: alert.data?.flight?.registration || null,
            triggered_at: alert.triggeredAt?.toISOString() || null,
            message: alert.message,
            status: alert.status,
            acknowledged: alert.acknowledged || false,
            trigger_altitude_ft: pos.altitude,
            previous_value: alert.data?.trigger?.previousValue || null,
            current_value: alert.data?.trigger?.currentValue || null,
            change_type: alert.data?.trigger?.changeType || null
          }
        };
      });
  }

  private formatGenericGeoData(data: any[], options?: ExportOptions): GeoJSONFeature[] {
    return data
      .filter(item => {
        // Try to find lat/lng in various common field names
        return this.extractCoordinates(item) !== null;
      })
      .map(item => {
        const coords = this.extractCoordinates(item)!;
        const properties = { ...item };
        
        // Remove coordinate fields from properties
        delete properties.latitude;
        delete properties.longitude;
        delete properties.lat;
        delete properties.lng;
        delete properties.coordinates;

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: coords
          },
          properties
        };
      });
  }

  private extractCoordinates(item: any): [number, number] | [number, number, number] | null {
    // Try different common coordinate field combinations
    if (item.longitude !== undefined && item.latitude !== undefined) {
      return item.altitude !== undefined ? 
        [item.longitude, item.latitude, item.altitude] :
        [item.longitude, item.latitude];
    }
    
    if (item.lng !== undefined && item.lat !== undefined) {
      return [item.lng, item.lat];
    }
    
    if (Array.isArray(item.coordinates) && item.coordinates.length >= 2) {
      return item.coordinates as [number, number] | [number, number, number];
    }
    
    return null;
  }

  private calculateBounds(features: GeoJSONFeature[]): [number, number, number, number] | undefined {
    if (features.length === 0) return undefined;

    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;

    features.forEach(feature => {
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      } else if (feature.geometry.type === 'LineString') {
        (feature.geometry.coordinates as number[][]).forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });
      }
    });

    return minLng === Infinity ? undefined : [minLng, minLat, maxLng, maxLat];
  }

  private calculatePathDistance(coordinates: number[][]): number {
    if (coordinates.length < 2) return 0;

    let distance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lng1, lat1] = coordinates[i - 1];
      const [lng2, lat2] = coordinates[i];
      distance += this.haversineDistance(lat1, lng1, lat2, lng2);
    }

    return Math.round(distance);
  }

  private calculateDuration(flight: any): number | null {
    if (!flight.departureTime || !flight.arrivalTime) return null;
    
    const start = new Date(flight.departureTime);
    const end = new Date(flight.arrivalTime);
    
    return Math.round((end.getTime() - start.getTime()) / 1000); // seconds
  }

  private getMaxAltitude(coordinates: number[][]): number | null {
    const altitudes = coordinates
      .filter(coord => coord.length > 2)
      .map(coord => coord[2]);
    
    return altitudes.length > 0 ? Math.max(...altitudes) : null;
  }

  private getMinAltitude(coordinates: number[][]): number | null {
    const altitudes = coordinates
      .filter(coord => coord.length > 2)
      .map(coord => coord[2]);
    
    return altitudes.length > 0 ? Math.min(...altitudes) : null;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private createEmptyFeatureCollection(): GeoJSONFeatureCollection {
    return {
      type: 'FeatureCollection',
      features: [],
      metadata: {
        generated: new Date().toISOString(),
        count: 0,
        description: 'Empty FlightTrace export'
      }
    };
  }
}