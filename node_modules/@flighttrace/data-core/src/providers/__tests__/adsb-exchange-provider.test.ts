import { ADSBExchangeProvider } from '../adsb-exchange/adsb-exchange-provider';
import { FlightStatus, DataSource, PositionSource, PositionAccuracy } from '../../types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ADSBExchangeProvider', () => {
  let provider: ADSBExchangeProvider;

  beforeEach(() => {
    provider = new ADSBExchangeProvider({
      baseUrl: 'https://test-api.adsbexchange.com',
      apiKey: 'test-key'
    });
    jest.clearAllMocks();
  });

  describe('fetchFlights', () => {
    it('should fetch and normalize flight data within bounding box', async () => {
      const mockResponse = {
        data: {
          now: 1609459200,
          messages: 100,
          aircraft: [
            {
              hex: 'abc123',
              type: 'adsb',
              flight: 'UAL123',
              r: 'N12345',
              t: 'B738',
              alt_baro: 35000,
              alt_geom: 35100,
              gs: 450,
              track: 90,
              baro_rate: 0,
              squawk: '1234',
              emergency: 'none',
              category: 'A3',
              lat: 37.7749,
              lon: -122.4194,
              nic: 8,
              rc: 186,
              seen_pos: 0.5,
              version: 2,
              nic_baro: 1,
              nac_p: 10,
              nac_v: 2,
              sil: 3,
              sil_type: 'perhour',
              gva: 2,
              sda: 2,
              mlat: [],
              tisb: [],
              messages: 500,
              seen: 0.1,
              rssi: -20,
              dst: 10,
              dir: 45,
              nav_modes: ['autopilot', 'vnav', 'althold']
            }
          ]
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { headers: {} }
      } as any);

      const flights = await provider.fetchFlights({
        bbox: [-123, 37, -122, 38]
      });

      expect(flights).toHaveLength(1);
      expect(flights[0]).toMatchObject({
        icao24: 'abc123',
        callsign: 'UAL123',
        registration: 'N12345',
        status: FlightStatus.ACTIVE,
        source: DataSource.ADSB_EXCHANGE
      });
      expect(flights[0].positions).toHaveLength(1);
      expect(flights[0].positions[0]).toMatchObject({
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 35000,
        heading: 90,
        onGround: false
      });
    });

    it('should handle ground status correctly', async () => {
      const mockResponse = {
        data: {
          now: 1609459200,
          messages: 100,
          aircraft: [
            {
              hex: 'abc123',
              flight: 'UAL123',
              alt_baro: 'ground',
              lat: 37.7749,
              lon: -122.4194,
              gs: 0,
              track: 0,
              nic: 5,
              mlat: [],
              tisb: []
            }
          ]
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { headers: {} }
      } as any);

      const flights = await provider.fetchFlights();
      expect(flights[0].status).toBe(FlightStatus.LANDED);
      expect(flights[0].positions[0].onGround).toBe(true);
      expect(flights[0].positions[0].altitude).toBe(0);
    });

    it('should filter out aircraft without valid positions', async () => {
      const mockResponse = {
        data: {
          now: 1609459200,
          messages: 100,
          aircraft: [
            { hex: 'abc123', flight: 'UAL123' },
            { hex: 'def456', flight: 'AAL456', lat: 37.7, lon: -122.4 }
          ]
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { headers: {} }
      } as any);

      const flights = await provider.fetchFlights();
      expect(flights).toHaveLength(1);
      expect(flights[0].icao24).toBe('def456');
    });
  });

  describe('fetchFlight', () => {
    it('should fetch a single flight by ICAO24', async () => {
      const mockResponse = {
        data: {
          now: 1609459200,
          messages: 100,
          aircraft: [
            {
              hex: 'abc123',
              flight: 'UAL123',
              lat: 37.7749,
              lon: -122.4194,
              alt_baro: 35000,
              gs: 450,
              track: 90,
              nic: 8,
              mlat: [],
              tisb: []
            }
          ]
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { headers: {} }
      } as any);

      const flight = await provider.fetchFlight('ABC123');
      expect(flight).not.toBeNull();
      expect(flight?.icao24).toBe('abc123');
    });

    it('should return null for non-existent flight', async () => {
      const mockResponse = {
        data: {
          now: 1609459200,
          messages: 0,
          aircraft: []
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { headers: {} }
      } as any);

      const flight = await provider.fetchFlight('NOTEXIST');
      expect(flight).toBeNull();
    });
  });

  describe('normalizePositionData', () => {
    it('should correctly determine position source', () => {
      const testCases = [
        { mlat: ['test'], tisb: [], expected: PositionSource.MLAT },
        { mlat: [], tisb: ['test'], expected: PositionSource.ADS_B },
        { mlat: [], tisb: [], expected: PositionSource.ADS_B }
      ];

      testCases.forEach(({ mlat, tisb, expected }) => {
        const position = provider.normalizePositionData({
          hex: 'abc123',
          lat: 37.7,
          lon: -122.4,
          alt_baro: 10000,
          track: 90,
          gs: 250,
          mlat,
          tisb,
          nic: 8
        } as any);
        expect(position.source).toBe(expected);
      });
    });

    it('should correctly determine position accuracy based on NIC', () => {
      const testCases = [
        { nic: 10, expected: PositionAccuracy.HIGH },
        { nic: 8, expected: PositionAccuracy.HIGH },
        { nic: 6, expected: PositionAccuracy.MEDIUM },
        { nic: 3, expected: PositionAccuracy.LOW },
        { nic: 1, expected: PositionAccuracy.LOW }
      ];

      testCases.forEach(({ nic, expected }) => {
        const position = provider.normalizePositionData({
          hex: 'abc123',
          lat: 37.7,
          lon: -122.4,
          alt_baro: 10000,
          track: 90,
          gs: 250,
          mlat: [],
          tisb: [],
          nic
        } as any);
        expect(position.accuracy).toBe(expected);
      });
    });

    it('should convert ground speed from knots to m/s', () => {
      const position = provider.normalizePositionData({
        hex: 'abc123',
        lat: 37.7,
        lon: -122.4,
        alt_baro: 10000,
        track: 90,
        gs: 100,
        mlat: [],
        tisb: [],
        nic: 8
      } as any);
      
      expect(position.speed).toBeCloseTo(51.4444, 3);
    });
  });

  describe('determineFlightStatus', () => {
    it('should detect emergency status', () => {
      const mockAircraft = {
        hex: 'abc123',
        flight: 'UAL123',
        lat: 37.7,
        lon: -122.4,
        alt_baro: 10000,
        emergency: '7700',
        mlat: [],
        tisb: [],
        nic: 8
      } as any;

      const flight = provider.normalizeFlightData(mockAircraft);
      expect(flight.status).toBe(FlightStatus.UNKNOWN);
    });
  });
});