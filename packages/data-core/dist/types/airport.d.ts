export interface Airport {
    icao: string;
    iata: string | null;
    name: string;
    city: string | null;
    country: string;
    latitude: number;
    longitude: number;
    altitude: number | null;
    timezone: string | null;
    type: AirportType;
    runways: Runway[];
    frequencies: Frequency[];
}
export declare enum AirportType {
    LARGE_AIRPORT = "large_airport",
    MEDIUM_AIRPORT = "medium_airport",
    SMALL_AIRPORT = "small_airport",
    HELIPORT = "heliport",
    SEAPLANE_BASE = "seaplane_base",
    BALLOON_PORT = "balloon_port",
    CLOSED = "closed"
}
export interface Runway {
    id: string;
    length: number | null;
    width: number | null;
    surface: string | null;
    lighted: boolean;
    closed: boolean;
    leIdent: string | null;
    leLatitude: number | null;
    leLongitude: number | null;
    leElevation: number | null;
    leHeading: number | null;
    heIdent: string | null;
    heLatitude: number | null;
    heLongitude: number | null;
    heElevation: number | null;
    heHeading: number | null;
}
export interface Frequency {
    type: string;
    description: string | null;
    frequency: number;
}
