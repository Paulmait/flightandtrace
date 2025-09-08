import { Flight, Position } from '../types';
import { backOff } from 'exponential-backoff';

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

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected requestQueue: Promise<any>[] = [];
  protected lastRequestTime: number = 0;
  protected requestCount: number = 0;
  protected rateLimitResetTime: number = 0;

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    return backOff(
      async () => {
        await this.enforceRateLimit();
        try {
          return await operation();
        } catch (error: any) {
          if (this.isRetryableError(error)) {
            console.warn(`Retryable error in ${context || 'operation'}:`, error.message);
            throw error;
          }
          throw new Error(`Non-retryable error: ${error.message}`);
        }
      },
      {
        numOfAttempts: this.config.maxRetries || 3,
        startingDelay: this.config.retryDelay || 1000,
        timeMultiple: 2,
        maxDelay: 30000,
        jitter: 'full',
        retry: (error: any) => {
          return this.isRetryableError(error);
        }
      }
    );
  }

  protected isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const status = error.response?.status || error.status;
    if (status) {
      return status === 429 || status === 503 || status >= 500;
    }
    
    const code = error.code;
    return code === 'ECONNRESET' || 
           code === 'ETIMEDOUT' || 
           code === 'ENOTFOUND' ||
           code === 'ECONNREFUSED';
  }

  protected async enforceRateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    const now = Date.now();
    const { requests, period } = this.config.rateLimit;

    if (now > this.rateLimitResetTime) {
      this.requestCount = 0;
      this.rateLimitResetTime = now + period;
    }

    if (this.requestCount >= requests) {
      const waitTime = this.rateLimitResetTime - now;
      if (waitTime > 0) {
        await this.sleep(waitTime);
        this.requestCount = 0;
        this.rateLimitResetTime = Date.now() + period;
      }
    }

    this.requestCount++;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected addJitter(baseDelay: number, maxJitter: number = 1000): number {
    return baseDelay + Math.random() * maxJitter;
  }

  abstract normalizeFlightData(rawData: any): Flight;
  abstract normalizePositionData(rawData: any): Position;
  abstract fetchFlights(options?: QueryOptions): Promise<Flight[]>;
  abstract fetchFlight(icao24: string): Promise<Flight | null>;
  abstract fetchPositions(icao24: string, start?: Date, end?: Date): Promise<Position[]>;
}