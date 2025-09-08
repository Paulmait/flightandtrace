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

interface OpenSkyState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  time_position: number | null;
  last_contact: number;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  sensors: number[] | null;
  geo_altitude: number | null;
  squawk: string | null;
  spi: boolean;
  position_source: number;
}

interface OpenSkyResponse {
  time: number;
  states: OpenSkyState[] | null;
}

export class OpenSkyProvider extends BaseProvider {
  private client: AxiosInstance;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({
      baseUrl: process.env.OPENSKY_BASE_URL || 'https://opensky-network.org/api',
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
        'Accept': 'application/json'
      }
    });

    if (this.config.apiKey) {
      this.client.defaults.auth = {
        username: process.env.OPENSKY_USERNAME || '',
        password: process.env.OPENSKY_PASSWORD || ''
      };
    }
  }

  async fetchFlights(options: QueryOptions = {}): Promise<Flight[]> {
    return this.executeWithRetry(async () => {
      const params: any = {};

      if (options.bbox) {
        params.lamin = options.bbox[1];
        params.lomin = options.bbox[0];
        params.lamax = options.bbox[3];
        params.lomax = options.bbox[2];
      }

      if (options.icao24) {
        params.icao24 = options.icao24.toLowerCase();
      }

      if (options.time) {
        params.time = Math.floor(options.time.getTime() / 1000);
      }

      const response = await this.client.get<OpenSkyResponse>('/states/all', { params });
      
      if (!response.data.states) {
        return [];
      }

      return response.data.states
        .filter(state => state.latitude !== null && state.longitude !== null)
        .map(state => this.normalizeFlightData(state));
    }, 'fetchFlights');
  }

  async fetchFlight(icao24: string): Promise<Flight | null> {
    return this.executeWithRetry(async () => {
      const response = await this.client.get<OpenSkyResponse>('/states/all', {
        params: { icao24: icao24.toLowerCase() }
      });

      if (!response.data.states || response.data.states.length === 0) {
        return null;
      }

      return this.normalizeFlightData(response.data.states[0]);
    }, 'fetchFlight');
  }

  async fetchPositions(icao24: string, start?: Date, end?: Date): Promise<Position[]> {
    return this.executeWithRetry(async () => {
      const params: any = {
        icao24: icao24.toLowerCase()
      };

      if (start && end) {
        params.begin = Math.floor(start.getTime() / 1000);
        params.end = Math.floor(end.getTime() / 1000);
      }

      const response = await this.client.get<any>('/tracks/all', { params });

      if (!response.data || !response.data.path) {
        return [];
      }

      return response.data.path.map((point: any[]) => 
        this.normalizePositionData({
          time: point[0],
          latitude: point[1],
          longitude: point[2],
          baro_altitude: point[3],
          true_track: point[4],
          on_ground: point[5]
        })
      );
    }, 'fetchPositions');
  }

  normalizeFlightData(rawData: OpenSkyState): Flight {
    const position = this.createPositionFromState(rawData);
    
    return {
      id: `opensky_${rawData.icao24}_${rawData.last_contact}`,
      callsign: rawData.callsign ? rawData.callsign.trim() : null,
      registration: null,
      icao24: rawData.icao24,
      origin: null,
      destination: null,
      departureTime: null,
      arrivalTime: null,
      status: rawData.on_ground ? FlightStatus.LANDED : FlightStatus.ACTIVE,
      aircraft: null,
      positions: position ? [position] : [],
      lastUpdate: new Date(rawData.last_contact * 1000),
      source: DataSource.OPENSKY
    };
  }

  normalizePositionData(rawData: any): Position {
    return {
      timestamp: new Date(rawData.time * 1000),
      latitude: rawData.latitude,
      longitude: rawData.longitude,
      altitude: rawData.baro_altitude,
      heading: rawData.true_track,
      speed: rawData.velocity || null,
      verticalRate: rawData.vertical_rate || null,
      onGround: rawData.on_ground || false,
      source: this.getPositionSource(rawData.position_source),
      accuracy: this.getPositionAccuracy(rawData.position_source)
    };
  }

  private createPositionFromState(state: OpenSkyState): Position | null {
    if (state.latitude === null || state.longitude === null) {
      return null;
    }

    return {
      timestamp: new Date(state.last_contact * 1000),
      latitude: state.latitude,
      longitude: state.longitude,
      altitude: state.baro_altitude,
      heading: state.true_track,
      speed: state.velocity,
      verticalRate: state.vertical_rate,
      onGround: state.on_ground,
      source: this.getPositionSource(state.position_source),
      accuracy: this.getPositionAccuracy(state.position_source)
    };
  }

  private getPositionSource(source: number): PositionSource {
    switch (source) {
      case 0:
        return PositionSource.ADS_B;
      case 1:
        return PositionSource.ADS_B;
      case 2:
        return PositionSource.MLAT;
      case 3:
        return PositionSource.RADAR;
      default:
        return PositionSource.ADS_B;
    }
  }

  private getPositionAccuracy(source: number): PositionAccuracy {
    switch (source) {
      case 0:
      case 1:
        return PositionAccuracy.HIGH;
      case 2:
        return PositionAccuracy.MEDIUM;
      case 3:
        return PositionAccuracy.LOW;
      default:
        return PositionAccuracy.MEDIUM;
    }
  }
}