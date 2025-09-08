import { BaseProvider, ProviderConfig, QueryOptions } from '../base-provider';
import { Flight, Position } from '../../types';
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
export declare class OpenSkyProvider extends BaseProvider {
    private client;
    constructor(config?: Partial<ProviderConfig>);
    fetchFlights(options?: QueryOptions): Promise<Flight[]>;
    fetchFlight(icao24: string): Promise<Flight | null>;
    fetchPositions(icao24: string, start?: Date, end?: Date): Promise<Position[]>;
    normalizeFlightData(rawData: OpenSkyState): Flight;
    normalizePositionData(rawData: any): Position;
    private createPositionFromState;
    private getPositionSource;
    private getPositionAccuracy;
}
export {};
