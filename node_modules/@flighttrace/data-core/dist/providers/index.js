"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADSBExchangeProvider = exports.OpenSkyProvider = exports.BaseProvider = void 0;
var base_provider_1 = require("./base-provider");
Object.defineProperty(exports, "BaseProvider", { enumerable: true, get: function () { return base_provider_1.BaseProvider; } });
var opensky_provider_1 = require("./opensky/opensky-provider");
Object.defineProperty(exports, "OpenSkyProvider", { enumerable: true, get: function () { return opensky_provider_1.OpenSkyProvider; } });
var adsb_exchange_provider_1 = require("./adsb-exchange/adsb-exchange-provider");
Object.defineProperty(exports, "ADSBExchangeProvider", { enumerable: true, get: function () { return adsb_exchange_provider_1.ADSBExchangeProvider; } });
//# sourceMappingURL=index.js.map