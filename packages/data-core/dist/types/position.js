"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentType = exports.PositionAccuracy = exports.PositionSource = void 0;
var PositionSource;
(function (PositionSource) {
    PositionSource["ADS_B"] = "ads-b";
    PositionSource["MLAT"] = "mlat";
    PositionSource["RADAR"] = "radar";
    PositionSource["ESTIMATED"] = "estimated";
    PositionSource["MANUAL"] = "manual";
})(PositionSource || (exports.PositionSource = PositionSource = {}));
var PositionAccuracy;
(function (PositionAccuracy) {
    PositionAccuracy["HIGH"] = "high";
    PositionAccuracy["MEDIUM"] = "medium";
    PositionAccuracy["LOW"] = "low";
    PositionAccuracy["ESTIMATED"] = "estimated";
})(PositionAccuracy || (exports.PositionAccuracy = PositionAccuracy = {}));
var SegmentType;
(function (SegmentType) {
    SegmentType["OBSERVED"] = "observed";
    SegmentType["INTERPOLATED"] = "interpolated";
    SegmentType["ESTIMATED"] = "estimated";
    SegmentType["OUT_OF_COVERAGE"] = "out_of_coverage";
})(SegmentType || (exports.SegmentType = SegmentType = {}));
//# sourceMappingURL=position.js.map