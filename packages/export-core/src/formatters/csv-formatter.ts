import { createObjectCsvWriter } from 'csv-writer';
import { ExportOptions } from '../services/export-service';

export class CSVFormatter {
  async format(data: any[], options?: ExportOptions): Promise<string> {
    if (data.length === 0) {
      return '';
    }

    const sample = data[0];
    const isFlightData = sample.callsign !== undefined || sample.icao24 !== undefined;
    const isPositionData = sample.latitude !== undefined && sample.longitude !== undefined;
    const isAlertData = sample.ruleId !== undefined;

    if (isFlightData) {
      return this.formatFlightData(data, options);
    } else if (isPositionData) {
      return this.formatPositionData(data, options);
    } else if (isAlertData) {
      return this.formatAlertData(data, options);
    } else {
      return this.formatGenericData(data, options);
    }
  }

  private async formatFlightData(data: any[], options?: ExportOptions): Promise<string> {
    const records: any[] = [];

    data.forEach(flight => {
      const baseRecord = {
        flight_id: flight.id,
        callsign: flight.callsign || '',
        registration: flight.registration || '',
        icao24: flight.icao24,
        operator: flight.operator || '',
        origin: flight.origin || '',
        destination: flight.destination || '',
        departure_time: this.formatTime(flight.departureTime, options?.timeFormat),
        arrival_time: this.formatTime(flight.arrivalTime, options?.timeFormat),
        status: flight.status,
        aircraft_type: flight.aircraft?.type || '',
        aircraft_manufacturer: flight.aircraft?.manufacturer || '',
        aircraft_model: flight.aircraft?.model || ''
      };

      if (options?.includeEmissions && flight.emissions) {
        baseRecord.fuel_consumption_kg = flight.emissions.fuelConsumption;
        baseRecord.co2_emissions_kg = flight.emissions.co2Emissions;
        baseRecord.emissions_per_km = flight.emissions.emissionsPerKm;
      }

      if (options?.includeCalculatedFields) {
        baseRecord.duration_minutes = this.calculateFlightDuration(flight);
        baseRecord.distance_km = this.calculateFlightDistance(flight);
        baseRecord.average_speed_kmh = this.calculateAverageSpeed(flight);
        baseRecord.max_altitude_ft = this.getMaxAltitude(flight);
      }

      if (flight.positions && flight.positions.length > 0 && options?.includeMetadata) {
        baseRecord.first_position_time = this.formatTime(flight.positions[0].timestamp, options?.timeFormat);
        baseRecord.last_position_time = this.formatTime(
          flight.positions[flight.positions.length - 1].timestamp, 
          options?.timeFormat
        );
        baseRecord.position_count = flight.positions.length;
      }

      records.push(baseRecord);
    });

    return this.convertToCSV(records);
  }

  private async formatPositionData(data: any[], options?: ExportOptions): Promise<string> {
    const records = data.map(position => {
      const record = {
        timestamp: this.formatTime(position.timestamp, options?.timeFormat),
        flight_id: position.flightId || position.flight?.id || '',
        callsign: position.flight?.callsign || '',
        icao24: position.flight?.icao24 || '',
        latitude: this.formatCoordinate(position.latitude, options?.coordinateSystem),
        longitude: this.formatCoordinate(position.longitude, options?.coordinateSystem),
        altitude_ft: position.altitude || null,
        speed_knots: position.speed || null,
        heading_degrees: position.heading || null,
        vertical_rate_fpm: position.verticalRate || null,
        on_ground: position.onGround || false,
        source: position.source || '',
        accuracy: position.accuracy || ''
      };

      if (options?.includeCalculatedFields) {
        record.altitude_m = position.altitude ? Math.round(position.altitude * 0.3048) : null;
        record.speed_kmh = position.speed ? Math.round(position.speed * 1.852) : null;
        record.speed_ms = position.speed ? Math.round(position.speed * 0.5144) : null;
      }

      return record;
    });

    return this.convertToCSV(records);
  }

  private async formatAlertData(data: any[], options?: ExportOptions): Promise<string> {
    const records = data.map(alert => ({
      alert_id: alert.id,
      rule_id: alert.ruleId,
      rule_name: alert.rule?.name || '',
      flight_id: alert.flightId,
      flight_callsign: alert.data?.flight?.callsign || '',
      flight_registration: alert.data?.flight?.registration || '',
      triggered_at: this.formatTime(alert.triggeredAt, options?.timeFormat),
      message: alert.message,
      status: alert.status,
      acknowledged: alert.acknowledged || false,
      acknowledged_at: this.formatTime(alert.acknowledgedAt, options?.timeFormat),
      trigger_latitude: alert.data?.context?.position?.latitude || null,
      trigger_longitude: alert.data?.context?.position?.longitude || null,
      trigger_altitude: alert.data?.context?.position?.altitude || null,
      previous_value: alert.data?.trigger?.previousValue || '',
      current_value: alert.data?.trigger?.currentValue || '',
      change_type: alert.data?.trigger?.changeType || ''
    }));

    return this.convertToCSV(records);
  }

  private async formatGenericData(data: any[], options?: ExportOptions): Promise<string> {
    // Flatten nested objects for CSV export
    const flattenedData = data.map(item => this.flattenObject(item));
    return this.convertToCSV(flattenedData);
  }

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          Object.assign(flattened, this.flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          flattened[newKey] = JSON.stringify(value);
        } else {
          flattened[newKey] = value;
        }
      }
    }

    return flattened;
  }

  private convertToCSV(records: any[]): string {
    if (records.length === 0) return '';

    // Get all unique keys from all records
    const headers = Array.from(
      new Set(records.flatMap(record => Object.keys(record)))
    );

    // Create CSV header
    let csv = headers.join(',') + '\n';

    // Add data rows
    records.forEach(record => {
      const row = headers.map(header => {
        const value = record[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        return stringValue;
      });
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  private formatTime(date: Date | string | null, format?: string): string {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    switch (format) {
      case 'unix':
        return Math.floor(d.getTime() / 1000).toString();
      case 'readable':
        return d.toLocaleString();
      case 'iso':
      default:
        return d.toISOString();
    }
  }

  private formatCoordinate(coord: number | null, system?: string): string | number | null {
    if (coord === null || coord === undefined) return null;
    
    switch (system) {
      case 'utm':
        // UTM conversion would be implemented here
        return coord; // Placeholder
      case 'wgs84':
      default:
        return Number(coord.toFixed(6));
    }
  }

  private calculateFlightDuration(flight: any): number | null {
    if (!flight.departureTime || !flight.arrivalTime) return null;
    
    const start = new Date(flight.departureTime);
    const end = new Date(flight.arrivalTime);
    
    return Math.round((end.getTime() - start.getTime()) / 60000); // minutes
  }

  private calculateFlightDistance(flight: any): number | null {
    if (!flight.positions || flight.positions.length < 2) return null;
    
    let totalDistance = 0;
    for (let i = 1; i < flight.positions.length; i++) {
      const prev = flight.positions[i - 1];
      const curr = flight.positions[i];
      totalDistance += this.haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
    
    return Math.round(totalDistance);
  }

  private calculateAverageSpeed(flight: any): number | null {
    const distance = this.calculateFlightDistance(flight);
    const duration = this.calculateFlightDuration(flight);
    
    if (!distance || !duration) return null;
    
    return Math.round((distance / duration) * 60); // km/h
  }

  private getMaxAltitude(flight: any): number | null {
    if (!flight.positions || flight.positions.length === 0) return null;
    
    return Math.max(...flight.positions.map((p: any) => p.altitude || 0));
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
}