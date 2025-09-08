"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = exports.defaultConfig = void 0;
exports.defaultConfig = {
    environment: process.env.NODE_ENV || 'development',
    dataProviders: {
        opensky: {
            enabled: true,
            baseUrl: process.env.OPENSKY_BASE_URL || 'https://opensky-network.org/api',
            username: process.env.OPENSKY_USERNAME,
            password: process.env.OPENSKY_PASSWORD,
            rateLimit: {
                requests: 100,
                period: 60000
            }
        },
        adsbExchange: {
            enabled: !!process.env.ADSB_EXCHANGE_API_KEY,
            baseUrl: process.env.ADSB_EXCHANGE_BASE_URL || 'https://adsbexchange-com1.p.rapidapi.com/v2',
            apiKey: process.env.ADSB_EXCHANGE_API_KEY,
            rateLimit: {
                requests: 100,
                period: 60000
            }
        }
    },
    cache: {
        enabled: true,
        ttl: 300000,
        maxSize: 1000,
        redis: process.env.REDIS_HOST ? {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD
        } : undefined
    },
    features: {
        estimatedSegments: true,
        playbackMode: true,
        alerting: true,
        historicalData: true
    },
    limits: {
        maxFlightsPerRequest: 500,
        maxHistoryDays: 7,
        maxAlertRules: 50
    }
};
class ConfigManager {
    constructor() {
        this.config = exports.defaultConfig;
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    getConfig() {
        return this.config;
    }
    updateConfig(updates) {
        this.config = {
            ...this.config,
            ...updates
        };
    }
    isProviderEnabled(provider) {
        return this.config.dataProviders[provider].enabled;
    }
    getProviderConfig(provider) {
        return this.config.dataProviders[provider];
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=index.js.map