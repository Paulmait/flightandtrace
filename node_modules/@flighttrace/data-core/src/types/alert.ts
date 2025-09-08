export interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldown: number;
  lastTriggered: Date | null;
}

export interface AlertCondition {
  type: ConditionType;
  operator: ConditionOperator;
  value: any;
  field: string;
}

export enum ConditionType {
  FLIGHT_STATUS = 'flight_status',
  POSITION = 'position',
  ALTITUDE = 'altitude',
  SPEED = 'speed',
  HEADING = 'heading',
  PROXIMITY = 'proximity',
  SCHEDULE = 'schedule',
  AIRCRAFT_TYPE = 'aircraft_type',
  OPERATOR = 'operator',
  ROUTE = 'route'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in',
  WITHIN_RADIUS = 'within_radius',
  OUTSIDE_RADIUS = 'outside_radius'
}

export interface AlertAction {
  type: ActionType;
  config: Record<string, any>;
}

export enum ActionType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH_NOTIFICATION = 'push_notification',
  WEBHOOK = 'webhook',
  LOG = 'log'
}

export interface Alert {
  id: string;
  ruleId: string;
  flightId: string | null;
  triggeredAt: Date;
  message: string;
  data: Record<string, any>;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
}