export interface PlaybackSlice {
  timestamp: Date;
  flights: PlaybackFlight[];
  duration: number;
  source: DataSource;
}

export interface PlaybackFlight {
  flightId: string;
  position: Position;
  metadata: FlightMetadata;
}

export interface FlightMetadata {
  callsign: string | null;
  registration: string | null;
  origin: string | null;
  destination: string | null;
  aircraft: AircraftSummary | null;
  operator: string | null;
}

export interface AircraftSummary {
  type: string | null;
  registration: string | null;
  model: string | null;
}

export interface PlaybackSession {
  id: string;
  startTime: Date;
  endTime: Date;
  currentTime: Date;
  speed: number;
  paused: boolean;
  loop: boolean;
  filters: PlaybackFilter[];
  slices: PlaybackSlice[];
}

export interface PlaybackFilter {
  type: FilterType;
  value: any;
  enabled: boolean;
}

export enum FilterType {
  CALLSIGN = 'callsign',
  REGISTRATION = 'registration',
  ICAO24 = 'icao24',
  OPERATOR = 'operator',
  AIRCRAFT_TYPE = 'aircraft_type',
  ALTITUDE_RANGE = 'altitude_range',
  SPEED_RANGE = 'speed_range',
  GEOGRAPHIC_AREA = 'geographic_area',
  ORIGIN = 'origin',
  DESTINATION = 'destination'
}

export enum DataSource {
  OPENSKY = 'opensky',
  ADSB_EXCHANGE = 'adsb_exchange',
  MANUAL = 'manual',
  ESTIMATED = 'estimated'
}