"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADSBExchangeProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const base_provider_1 = require("../base-provider");
const types_1 = require("../../types");
class ADSBExchangeProvider extends base_provider_1.BaseProvider {
    constructor(config = {}) {
        super({
            baseUrl: process.env.ADSB_EXCHANGE_BASE_URL || 'https://adsbexchange-com1.p.rapidapi.com/v2',
            rateLimit: {
                requests: 100,
                period: 60000
            },
            ...config
        });
        this.client = axios_1.default.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'X-RapidAPI-Key': process.env.ADSB_EXCHANGE_API_KEY || this.config.apiKey || '',
                'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com',
                'Accept': 'application/json'
            }
        });
    }
    async fetchFlights(options = {}) {
        return this.executeWithRetry(async () => {
            let endpoint = '/lat/{lat}/lon/{lon}/dist/{dist}/';
            const params = {};
            if (options.bbox) {
                const centerLat = (options.bbox[1] + options.bbox[3]) / 2;
                const centerLon = (options.bbox[0] + options.bbox[2]) / 2;
                const latDist = Math.abs(options.bbox[3] - options.bbox[1]) * 111;
                const lonDist = Math.abs(options.bbox[2] - options.bbox[0]) * 111 * Math.cos(centerLat * Math.PI / 180);
                const dist = Math.max(latDist, lonDist) / 2;
                endpoint = endpoint
                    .replace('{lat}', centerLat.toFixed(6))
                    .replace('{lon}', centerLon.toFixed(6))
                    .replace('{dist}', Math.min(250, Math.ceil(dist)).toString());
            }
            else {
                endpoint = endpoint
                    .replace('{lat}', '0')
                    .replace('{lon}', '0')
                    .replace('{dist}', '250');
            }
            const response = await this.client.get(endpoint, { params });
            if (!response.data.aircraft) {
                return [];
            }
            return response.data.aircraft
                .filter(aircraft => aircraft.lat !== undefined && aircraft.lon !== undefined)
                .map(aircraft => this.normalizeFlightData(aircraft));
        }, 'fetchFlights');
    }
    async fetchFlight(icao24) {
        return this.executeWithRetry(async () => {
            const endpoint = `/hex/${icao24.toLowerCase()}/`;
            const response = await this.client.get(endpoint);
            if (!response.data.aircraft || response.data.aircraft.length === 0) {
                return null;
            }
            return this.normalizeFlightData(response.data.aircraft[0]);
        }, 'fetchFlight');
    }
    async fetchPositions(icao24, start, end) {
        return this.executeWithRetry(async () => {
            const endpoint = `/hex/${icao24.toLowerCase()}/`;
            const response = await this.client.get(endpoint);
            if (!response.data.aircraft || response.data.aircraft.length === 0) {
                return [];
            }
            const aircraft = response.data.aircraft[0];
            return [this.normalizePositionData(aircraft)];
        }, 'fetchPositions');
    }
    normalizeFlightData(rawData) {
        const position = this.createPositionFromAircraft(rawData);
        return {
            id: `adsb_${rawData.hex}_${Date.now()}`,
            callsign: rawData.flight ? rawData.flight.trim() : null,
            registration: rawData.r || null,
            icao24: rawData.hex,
            origin: null,
            destination: null,
            departureTime: null,
            arrivalTime: null,
            status: this.determineFlightStatus(rawData),
            aircraft: null,
            positions: position ? [position] : [],
            lastUpdate: new Date(),
            source: types_1.DataSource.ADSB_EXCHANGE
        };
    }
    normalizePositionData(rawData) {
        const altitude = typeof rawData.alt_baro === 'number'
            ? rawData.alt_baro
            : (typeof rawData.alt_baro === 'string' && rawData.alt_baro !== 'ground'
                ? parseInt(rawData.alt_baro)
                : 0);
        return {
            timestamp: new Date(),
            latitude: rawData.lat,
            longitude: rawData.lon,
            altitude: altitude,
            heading: rawData.track,
            speed: rawData.gs ? rawData.gs * 0.514444 : null,
            verticalRate: rawData.baro_rate || null,
            onGround: rawData.alt_baro === 'ground',
            source: this.getPositionSource(rawData),
            accuracy: this.getPositionAccuracy(rawData)
        };
    }
    createPositionFromAircraft(aircraft) {
        if (aircraft.lat === undefined || aircraft.lon === undefined) {
            return null;
        }
        return this.normalizePositionData(aircraft);
    }
    determineFlightStatus(aircraft) {
        if (aircraft.alt_baro === 'ground') {
            return types_1.FlightStatus.LANDED;
        }
        if (aircraft.emergency && aircraft.emergency !== 'none') {
            return types_1.FlightStatus.UNKNOWN;
        }
        return types_1.FlightStatus.ACTIVE;
    }
    getPositionSource(aircraft) {
        if (aircraft.mlat && aircraft.mlat.length > 0) {
            return types_1.PositionSource.MLAT;
        }
        if (aircraft.tisb && aircraft.tisb.length > 0) {
            return types_1.PositionSource.ADS_B;
        }
        return types_1.PositionSource.ADS_B;
    }
    getPositionAccuracy(aircraft) {
        if (aircraft.nic >= 8) {
            return types_1.PositionAccuracy.HIGH;
        }
        else if (aircraft.nic >= 5) {
            return types_1.PositionAccuracy.MEDIUM;
        }
        else {
            return types_1.PositionAccuracy.LOW;
        }
    }
}
exports.ADSBExchangeProvider = ADSBExchangeProvider;
//# sourceMappingURL=adsb-exchange-provider.js.map