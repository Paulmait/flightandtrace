"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSource = exports.FlightStatus = void 0;
var FlightStatus;
(function (FlightStatus) {
    FlightStatus["SCHEDULED"] = "scheduled";
    FlightStatus["ACTIVE"] = "active";
    FlightStatus["LANDED"] = "landed";
    FlightStatus["CANCELLED"] = "cancelled";
    FlightStatus["UNKNOWN"] = "unknown";
})(FlightStatus || (exports.FlightStatus = FlightStatus = {}));
var DataSource;
(function (DataSource) {
    DataSource["OPENSKY"] = "opensky";
    DataSource["ADSB_EXCHANGE"] = "adsb_exchange";
    DataSource["MANUAL"] = "manual";
    DataSource["ESTIMATED"] = "estimated";
})(DataSource || (exports.DataSource = DataSource = {}));
//# sourceMappingURL=flight.js.map