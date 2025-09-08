import { OpenSkyProvider } from '../opensky/opensky-provider';
import { FlightStatus, DataSource, PositionSource, PositionAccuracy } from '../../types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenSkyProvider', () => {
  let provider: OpenSkyProvider;

  beforeEach(() => {
    provider = new OpenSkyProvider({
      baseUrl: 'https://test-api.opensky-network.org',
      apiKey: 'test-key'
    });
    jest.clearAllMocks();
  });

  describe('fetchFlights', () => {
    it('should fetch and normalize flight data', async () => {
      const mockResponse = {
        data: {
          time: 1609459200,
          states: [
            [
              'abc123',
              'UAL123  ',
              'United States',
              1609459195,
              1609459195,
              -122.4194,
              37.7749,
              10000,
              false,
              250,
              90,
              5,
              null,
              10100,
              '1234',
              false,
              0
            ]
          ]
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { auth: {} }
      } as any);

      const flights = await provider.fetchFlights({
        bbox: [-123, 37, -122, 38]
      });

      expect(flights).toHaveLength(1);
      expect(flights[0]).toMatchObject({
        icao24: 'abc123',
        callsign: 'UAL123',
        status: FlightStatus.ACTIVE,
        source: DataSource.OPENSKY
      });
      expect(flights[0].positions).toHaveLength(1);
      expect(flights[0].positions[0]).toMatchObject({
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 10000,
        heading: 90,
        speed: 250,
        onGround: false
      });
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        data: {
          time: 1609459200,
          states: null
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { auth: {} }
      } as any);

      const flights = await provider.fetchFlights();
      expect(flights).toHaveLength(0);
    });

    it('should filter out flights without valid positions', async () => {
      const mockResponse = {
        data: {
          time: 1609459200,
          states: [
            ['abc123', 'UAL123', 'US', null, 1609459195, null, null, null, false, null, null, null, null, null, null, false, 0],
            ['def456', 'AAL456', 'US', null, 1609459195, -122.4, 37.7, 10000, false, 250, 90, 5, null, 10100, null, false, 0]
          ]
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { auth: {} }
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
          time: 1609459200,
          states: [
            ['abc123', 'UAL123', 'US', null, 1609459195, -122.4, 37.7, 10000, false, 250, 90, 5, null, 10100, null, false, 0]
          ]
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { auth: {} }
      } as any);

      const flight = await provider.fetchFlight('ABC123');
      expect(flight).not.toBeNull();
      expect(flight?.icao24).toBe('abc123');
    });

    it('should return null for non-existent flight', async () => {
      const mockResponse = {
        data: {
          time: 1609459200,
          states: null
        }
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        defaults: { auth: {} }
      } as any);

      const flight = await provider.fetchFlight('NOTEXIST');
      expect(flight).toBeNull();
    });
  });

  describe('normalizeFlightData', () => {
    it('should correctly determine flight status', () => {
      const groundedState = {
        icao24: 'abc123',
        callsign: 'UAL123',
        origin_country: 'US',
        time_position: 1609459195,
        last_contact: 1609459195,
        longitude: -122.4,
        latitude: 37.7,
        baro_altitude: 0,
        on_ground: true,
        velocity: 0,
        true_track: 0,
        vertical_rate: 0,
        sensors: null,
        geo_altitude: 0,
        squawk: null,
        spi: false,
        position_source: 0
      };

      const flight = provider.normalizeFlightData(groundedState);
      expect(flight.status).toBe(FlightStatus.LANDED);
    });

    it('should handle null callsign', () => {
      const state = {
        icao24: 'abc123',
        callsign: null,
        origin_country: 'US',
        time_position: 1609459195,
        last_contact: 1609459195,
        longitude: -122.4,
        latitude: 37.7,
        baro_altitude: 10000,
        on_ground: false,
        velocity: 250,
        true_track: 90,
        vertical_rate: 5,
        sensors: null,
        geo_altitude: 10100,
        squawk: null,
        spi: false,
        position_source: 0
      };

      const flight = provider.normalizeFlightData(state);
      expect(flight.callsign).toBeNull();
    });
  });

  describe('normalizePositionData', () => {
    it('should correctly map position source', () => {
      const testCases = [
        { source: 0, expected: PositionSource.ADS_B },
        { source: 1, expected: PositionSource.ADS_B },
        { source: 2, expected: PositionSource.MLAT },
        { source: 3, expected: PositionSource.RADAR }
      ];

      testCases.forEach(({ source, expected }) => {
        const position = provider.normalizePositionData({
          time: 1609459195,
          latitude: 37.7,
          longitude: -122.4,
          baro_altitude: 10000,
          true_track: 90,
          on_ground: false,
          position_source: source
        });
        expect(position.source).toBe(expected);
      });
    });

    it('should correctly map position accuracy', () => {
      const testCases = [
        { source: 0, expected: PositionAccuracy.HIGH },
        { source: 1, expected: PositionAccuracy.HIGH },
        { source: 2, expected: PositionAccuracy.MEDIUM },
        { source: 3, expected: PositionAccuracy.LOW }
      ];

      testCases.forEach(({ source, expected }) => {
        const position = provider.normalizePositionData({
          time: 1609459195,
          latitude: 37.7,
          longitude: -122.4,
          baro_altitude: 10000,
          true_track: 90,
          on_ground: false,
          position_source: source
        });
        expect(position.accuracy).toBe(expected);
      });
    });
  });
});