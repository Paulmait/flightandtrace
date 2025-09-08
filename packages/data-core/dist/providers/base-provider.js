"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProvider = void 0;
const exponential_backoff_1 = require("exponential-backoff");
class BaseProvider {
    constructor(config) {
        this.requestQueue = [];
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.rateLimitResetTime = 0;
        this.config = {
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
    }
    async executeWithRetry(operation, context) {
        return (0, exponential_backoff_1.backOff)(async () => {
            await this.enforceRateLimit();
            try {
                return await operation();
            }
            catch (error) {
                if (this.isRetryableError(error)) {
                    console.warn(`Retryable error in ${context || 'operation'}:`, error.message);
                    throw error;
                }
                throw new Error(`Non-retryable error: ${error.message}`);
            }
        }, {
            numOfAttempts: this.config.maxRetries || 3,
            startingDelay: this.config.retryDelay || 1000,
            timeMultiple: 2,
            maxDelay: 30000,
            jitter: 'full',
            retry: (error) => {
                return this.isRetryableError(error);
            }
        });
    }
    isRetryableError(error) {
        if (!error)
            return false;
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
    async enforceRateLimit() {
        if (!this.config.rateLimit)
            return;
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    addJitter(baseDelay, maxJitter = 1000) {
        return baseDelay + Math.random() * maxJitter;
    }
}
exports.BaseProvider = BaseProvider;
//# sourceMappingURL=base-provider.js.map