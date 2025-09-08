import { Flight, Position } from '../types';
export interface ProviderConfig {
    apiKey?: string;
    baseUrl: string;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    rateLimit?: {
        requests: number;
        period: number;
    };
}
export interface QueryOptions {
    bbox?: [number, number, number, number];
    icao24?: string;
    callsign?: string;
    time?: Date;
    limit?: number;
}
export declare abstract class BaseProvider {
    protected config: ProviderConfig;
    protected requestQueue: Promise<any>[];
    protected lastRequestTime: number;
    protected requestCount: number;
    protected rateLimitResetTime: number;
    constructor(config: ProviderConfig);
    protected executeWithRetry<T>(operation: () => Promise<T>, context?: string): Promise<T>;
    protected isRetryableError(error: any): boolean;
    protected enforceRateLimit(): Promise<void>;
    protected sleep(ms: number): Promise<void>;
    protected addJitter(baseDelay: number, maxJitter?: number): number;
    abstract normalizeFlightData(rawData: any): Flight;
    abstract normalizePositionData(rawData: any): Position;
    abstract fetchFlights(options?: QueryOptions): Promise<Flight[]>;
    abstract fetchFlight(icao24: string): Promise<Flight | null>;
    abstract fetchPositions(icao24: string, start?: Date, end?: Date): Promise<Position[]>;
}
