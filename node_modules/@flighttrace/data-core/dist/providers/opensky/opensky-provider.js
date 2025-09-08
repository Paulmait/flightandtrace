"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenSkyProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const base_provider_1 = require("../base-provider");
const types_1 = require("../../types");
class OpenSkyProvider extends base_provider_1.BaseProvider {
    constructor(config = {}) {
        super({
            baseUrl: process.env.OPENSKY_BASE_URL || 'https://opensky-network.org/api',
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
                'Accept': 'application/json'
            }
        });
        if (this.config.apiKey) {
            this.client.defaults.auth = {
                username: process.env.OPENSKY_USERNAME || '',
                password: process.env.OPENSKY_PASSWORD || ''
            };
        }
    }
    async fetchFlights(options = {}) {
        return this.executeWithRetry(async () => {
            const params = {};
            if (options.bbox) {
                params.lamin = options.bbox[1];
                params.lomin = options.bbox[0];
                params.lamax = options.bbox[3];
                params.lomax = options.bbox[2];
            }
            if (options.icao24) {
                params.icao24 = options.icao24.toLowerCase();
            }
            if (options.time) {
                params.time = Math.floor(options.time.getTime() / 1000);
            }
            const response = await this.client.get('/states/all', { params });
            if (!response.data.states) {
                return [];
            }
            return response.data.states
                .filter(state => state.latitude !== null && state.longitude !== null)
                .map(state => this.normalizeFlightData(state));
        }, 'fetchFlights');
    }
    async fetchFlight(icao24) {
        return this.executeWithRetry(async () => {
            const response = await this.client.get('/states/all', {
                params: { icao24: icao24.toLowerCase() }
            });
            if (!response.data.states || response.data.states.length === 0) {
                return null;
            }
            return this.normalizeFlightData(response.data.states[0]);
        }, 'fetchFlight');
    }
    async fetchPositions(icao24, start, end) {
        return this.executeWithRetry(async () => {
            const params = {
                icao24: icao24.toLowerCase()
            };
            if (start && end) {
                params.begin = Math.floor(start.getTime() / 1000);
                params.end = Math.floor(end.getTime() / 1000);
            }
            const response = await this.client.get('/tracks/all', { params });
            if (!response.data || !response.data.path) {
                return [];
            }
            return response.data.path.map((point) => this.normalizePositionData({
                time: point[0],
                latitude: point[1],
                longitude: point[2],
                baro_altitude: point[3],
                true_track: point[4],
                on_ground: point[5]
            }));
        }, 'fetchPositions');
    }
    normalizeFlightData(rawData) {
        const position = this.createPositionFromState(rawData);
        return {
            id: `opensky_${rawData.icao24}_${rawData.last_contact}`,
            callsign: rawData.callsign ? rawData.callsign.trim() : null,
            registration: null,
            icao24: rawData.icao24,
            origin: null,
            destination: null,
            departureTime: null,
            arrivalTime: null,
            status: rawData.on_ground ? types_1.FlightStatus.LANDED : types_1.FlightStatus.ACTIVE,
            aircraft: null,
            positions: position ? [position] : [],
            lastUpdate: new Date(rawData.last_contact * 1000),
            source: types_1.DataSource.OPENSKY
        };
    }
    normalizePositionData(rawData) {
        return {
            timestamp: new Date(rawData.time * 1000),
            latitude: rawData.latitude,
            longitude: rawData.longitude,
            altitude: rawData.baro_altitude,
            heading: rawData.true_track,
            speed: rawData.velocity || null,
            verticalRate: rawData.vertical_rate || null,
            onGround: rawData.on_ground || false,
            source: this.getPositionSource(rawData.position_source),
            accuracy: this.getPositionAccuracy(rawData.position_source)
        };
    }
    createPositionFromState(state) {
        if (state.latitude === null || state.longitude === null) {
            return null;
        }
        return {
            timestamp: new Date(state.last_contact * 1000),
            latitude: state.latitude,
            longitude: state.longitude,
            altitude: state.baro_altitude,
            heading: state.true_track,
            speed: state.velocity,
            verticalRate: state.vertical_rate,
            onGround: state.on_ground,
            source: this.getPositionSource(state.position_source),
            accuracy: this.getPositionAccuracy(state.position_source)
        };
    }
    getPositionSource(source) {
        switch (source) {
            case 0:
                return types_1.PositionSource.ADS_B;
            case 1:
                return types_1.PositionSource.ADS_B;
            case 2:
                return types_1.PositionSource.MLAT;
            case 3:
                return types_1.PositionSource.RADAR;
            default:
                return types_1.PositionSource.ADS_B;
        }
    }
    getPositionAccuracy(source) {
        switch (source) {
            case 0:
            case 1:
                return types_1.PositionAccuracy.HIGH;
            case 2:
                return types_1.PositionAccuracy.MEDIUM;
            case 3:
                return types_1.PositionAccuracy.LOW;
            default:
                return types_1.PositionAccuracy.MEDIUM;
        }
    }
}
exports.OpenSkyProvider = OpenSkyProvider;
//# sourceMappingURL=opensky-provider.js.map