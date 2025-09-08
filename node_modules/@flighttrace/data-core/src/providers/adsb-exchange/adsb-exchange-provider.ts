import axios, { AxiosInstance } from 'axios';
import { BaseProvider, ProviderConfig, QueryOptions } from '../base-provider';
import { 
  Flight, 
  FlightStatus, 
  DataSource, 
  Position, 
  PositionSource, 
  PositionAccuracy 
} from '../../types';

interface ADSBExchangeAircraft {
  hex: string;
  type: string;
  flight: string | null;
  r: string | null;
  t: string | null;
  alt_baro: number | string;
  alt_geom: number;
  gs: number;
  track: number;
  baro_rate: number;
  squawk: string;
  emergency: string;
  category: string;
  nav_qnh: number;
  nav_altitude_mcp: number;
  nav_heading: number;
  lat: number;
  lon: number;
  nic: number;
  rc: number;
  seen_pos: number;
  version: number;
  nic_baro: number;
  nac_p: number;
  nac_v: number;
  sil: number;
  sil_type: string;
  gva: number;
  sda: number;
  mlat: any[];
  tisb: any[];
  messages: number;
  seen: number;
  rssi: number;
  dst: number;
  dir: number;
  nav_modes: string[];
}

interface ADSBExchangeResponse {
  now: number;
  messages: number;
  aircraft: ADSBExchangeAircraft[];
}

export class ADSBExchangeProvider extends BaseProvider {
  private client: AxiosInstance;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({
      baseUrl: process.env.ADSB_EXCHANGE_BASE_URL || 'https://adsbexchange-com1.p.rapidapi.com/v2',
      rateLimit: {
        requests: 100,
        period: 60000
      },
      ...config
    });

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'X-RapidAPI-Key': process.env.ADSB_EXCHANGE_API_KEY || this.config.apiKey || '',
        'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com',
        'Accept': 'application/json'
      }
    });
  }

  async fetchFlights(options: QueryOptions = {}): Promise<Flight[]> {
    return this.executeWithRetry(async () => {
      let endpoint = '/lat/{lat}/lon/{lon}/dist/{dist}/';
      const params: any = {};

      if (options.bbox) {
        const centerLat = (options.bbox[1] + options.bbox[3]) / 2;
        const centerLon = (options.bbox[0] + options.bbox[2]) / 2;
        const latDist = Math.abs(options.bbox[3] - options.bbox[1]) * 111;
        const lonDist = Math.abs(options.bbox[2] - options.bbox[0]) * 111 * Math.cos(centerLat * Math.PI / 180);
        const dist = Math.max(latDist, lonDist) / 2;

        endpoint = endpoint
          .replace('{lat}', centerLat.toFixed(6))
          .replace('{lon}', centerLon.toFixed(6))
          .replace('{dist}', Math.min(250, Math.ceil(dist)).toString());
      } else {
        endpoint = endpoint
          .replace('{lat}', '0')
          .replace('{lon}', '0')
          .replace('{dist}', '250');
      }

      const response = await this.client.get<ADSBExchangeResponse>(endpoint, { params });

      if (!response.data.aircraft) {
        return [];
      }

      return response.data.aircraft
        .filter(aircraft => aircraft.lat !== undefined && aircraft.lon !== undefined)
        .map(aircraft => this.normalizeFlightData(aircraft));
    }, 'fetchFlights');
  }

  async fetchFlight(icao24: string): Promise<Flight | null> {
    return this.executeWithRetry(async () => {
      const endpoint = `/hex/${icao24.toLowerCase()}/`;
      const response = await this.client.get<ADSBExchangeResponse>(endpoint);

      if (!response.data.aircraft || response.data.aircraft.length === 0) {
        return null;
      }

      return this.normalizeFlightData(response.data.aircraft[0]);
    }, 'fetchFlight');
  }

  async fetchPositions(icao24: string, start?: Date, end?: Date): Promise<Position[]> {
    return this.executeWithRetry(async () => {
      const endpoint = `/hex/${icao24.toLowerCase()}/`;
      const response = await this.client.get<ADSBExchangeResponse>(endpoint);

      if (!response.data.aircraft || response.data.aircraft.length === 0) {
        return [];
      }

      const aircraft = response.data.aircraft[0];
      return [this.normalizePositionData(aircraft)];
    }, 'fetchPositions');
  }

  normalizeFlightData(rawData: ADSBExchangeAircraft): Flight {
    const position = this.createPositionFromAircraft(rawData);
    
    return {
      id: `adsb_${rawData.hex}_${Date.now()}`,
      callsign: rawData.flight ? rawData.flight.trim() : null,
      registration: rawData.r || null,
      icao24: rawData.hex,
      origin: null,
      destination: null,
      departureTime: null,
      arrivalTime: null,
      status: this.determineFlightStatus(rawData),
      aircraft: null,
      positions: position ? [position] : [],
      lastUpdate: new Date(),
      source: DataSource.ADSB_EXCHANGE
    };
  }

  normalizePositionData(rawData: ADSBExchangeAircraft): Position {
    const altitude = typeof rawData.alt_baro === 'number' 
      ? rawData.alt_baro 
      : (typeof rawData.alt_baro === 'string' && rawData.alt_baro !== 'ground' 
        ? parseInt(rawData.alt_baro) 
        : 0);

    return {
      timestamp: new Date(),
      latitude: rawData.lat,
      longitude: rawData.lon,
      altitude: altitude,
      heading: rawData.track,
      speed: rawData.gs ? rawData.gs * 0.514444 : null,
      verticalRate: rawData.baro_rate || null,
      onGround: rawData.alt_baro === 'ground',
      source: this.getPositionSource(rawData),
      accuracy: this.getPositionAccuracy(rawData)
    };
  }

  private createPositionFromAircraft(aircraft: ADSBExchangeAircraft): Position | null {
    if (aircraft.lat === undefined || aircraft.lon === undefined) {
      return null;
    }

    return this.normalizePositionData(aircraft);
  }

  private determineFlightStatus(aircraft: ADSBExchangeAircraft): FlightStatus {
    if (aircraft.alt_baro === 'ground') {
      return FlightStatus.LANDED;
    }
    
    if (aircraft.emergency && aircraft.emergency !== 'none') {
      return FlightStatus.UNKNOWN;
    }

    return FlightStatus.ACTIVE;
  }

  private getPositionSource(aircraft: ADSBExchangeAircraft): PositionSource {
    if (aircraft.mlat && aircraft.mlat.length > 0) {
      return PositionSource.MLAT;
    }
    
    if (aircraft.tisb && aircraft.tisb.length > 0) {
      return PositionSource.ADS_B;
    }

    return PositionSource.ADS_B;
  }

  private getPositionAccuracy(aircraft: ADSBExchangeAircraft): PositionAccuracy {
    if (aircraft.nic >= 8) {
      return PositionAccuracy.HIGH;
    } else if (aircraft.nic >= 5) {
      return PositionAccuracy.MEDIUM;
    } else {
      return PositionAccuracy.LOW;
    }
  }
}