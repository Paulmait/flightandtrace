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

export const defaultConfig: AppConfig = {
  environment: (process.env.NODE_ENV as any) || 'development',
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

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = defaultConfig;
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
  }

  isProviderEnabled(provider: 'opensky' | 'adsbExchange'): boolean {
    return this.config.dataProviders[provider].enabled;
  }

  getProviderConfig(provider: 'opensky' | 'adsbExchange') {
    return this.config.dataProviders[provider];
  }
}