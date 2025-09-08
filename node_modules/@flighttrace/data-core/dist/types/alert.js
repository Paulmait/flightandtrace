"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionType = exports.ConditionOperator = exports.ConditionType = void 0;
var ConditionType;
(function (ConditionType) {
    ConditionType["FLIGHT_STATUS"] = "flight_status";
    ConditionType["POSITION"] = "position";
    ConditionType["ALTITUDE"] = "altitude";
    ConditionType["SPEED"] = "speed";
    ConditionType["HEADING"] = "heading";
    ConditionType["PROXIMITY"] = "proximity";
    ConditionType["SCHEDULE"] = "schedule";
    ConditionType["AIRCRAFT_TYPE"] = "aircraft_type";
    ConditionType["OPERATOR"] = "operator";
    ConditionType["ROUTE"] = "route";
})(ConditionType || (exports.ConditionType = ConditionType = {}));
var ConditionOperator;
(function (ConditionOperator) {
    ConditionOperator["EQUALS"] = "equals";
    ConditionOperator["NOT_EQUALS"] = "not_equals";
    ConditionOperator["GREATER_THAN"] = "greater_than";
    ConditionOperator["LESS_THAN"] = "less_than";
    ConditionOperator["GREATER_THAN_OR_EQUAL"] = "greater_than_or_equal";
    ConditionOperator["LESS_THAN_OR_EQUAL"] = "less_than_or_equal";
    ConditionOperator["CONTAINS"] = "contains";
    ConditionOperator["NOT_CONTAINS"] = "not_contains";
    ConditionOperator["IN"] = "in";
    ConditionOperator["NOT_IN"] = "not_in";
    ConditionOperator["WITHIN_RADIUS"] = "within_radius";
    ConditionOperator["OUTSIDE_RADIUS"] = "outside_radius";
})(ConditionOperator || (exports.ConditionOperator = ConditionOperator = {}));
var ActionType;
(function (ActionType) {
    ActionType["EMAIL"] = "email";
    ActionType["SMS"] = "sms";
    ActionType["PUSH_NOTIFICATION"] = "push_notification";
    ActionType["WEBHOOK"] = "webhook";
    ActionType["LOG"] = "log";
})(ActionType || (exports.ActionType = ActionType = {}));
//# sourceMappingURL=alert.js.map