export interface DataProviderConfig {
    opensky: {
        enabled: boolean;
        baseUrl: string;
        username?: string;
        password?: string;
        rateLimit: {
            requests: number;
            period: number;
        };
    };
    adsbExchange: {
        enabled: boolean;
        baseUrl: string;
        apiKey?: string;
        rateLimit: {
            requests: number;
            period: number;
        };
    };
}
export interface CacheConfig {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    redis?: {
        host: string;
        port: number;
        password?: string;
    };
}
export interface AppConfig {
    environment: 'development' | 'staging' | 'production';
    dataProviders: DataProviderConfig;
    cache: CacheConfig;
    features: {
        estimatedSegments: boolean;
        playbackMode: boolean;
        alerting: boolean;
        historicalData: boolean;
    };
    limits: {
        maxFlightsPerRequest: number;
        maxHistoryDays: number;
        maxAlertRules: number;
    };
}
export declare const defaultConfig: AppConfig;
export declare class ConfigManager {
    private static instance;
    private config;
    private constructor();
    static getInstance(): ConfigManager;
    getConfig(): AppConfig;
    updateConfig(updates: Partial<AppConfig>): void;
    isProviderEnabled(provider: 'opensky' | 'adsbExchange'): boolean;
    getProviderConfig(provider: 'opensky' | 'adsbExchange'): {
        enabled: boolean;
        baseUrl: string;
        username?: string;
        password?: string;
        rateLimit: {
            requests: number;
            period: number;
        };
    } | {
        enabled: boolean;
        baseUrl: string;
        apiKey?: string;
        rateLimit: {
            requests: number;
            period: number;
        };
    };
}
