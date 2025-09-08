import { Aircraft } from './aircraft';
import { Position } from './position';
export interface Flight {
    id: string;
    callsign: string | null;
    registration: string | null;
    icao24: string;
    origin: string | null;
    destination: string | null;
    departureTime: Date | null;
    arrivalTime: Date | null;
    status: FlightStatus;
    aircraft: Aircraft | null;
    positions: Position[];
    lastUpdate: Date;
    source: DataSource;
}
export declare enum FlightStatus {
    SCHEDULED = "scheduled",
    ACTIVE = "active",
    LANDED = "landed",
    CANCELLED = "cancelled",
    UNKNOWN = "unknown"
}
export declare enum DataSource {
    OPENSKY = "opensky",
    ADSB_EXCHANGE = "adsb_exchange",
    MANUAL = "manual",
    ESTIMATED = "estimated"
}
