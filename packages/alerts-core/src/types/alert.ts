export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  enabled: boolean;
  ruleType: AlertRuleType;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownMinutes: number;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export enum AlertRuleType {
  STATUS_CHANGE = 'status_change',
  OFF_SCHEDULE = 'off_schedule',
  TAXI_STATUS = 'taxi_status',
  TAKEOFF_LANDING = 'takeoff_landing',
  DIVERSION = 'diversion',
  GATE_CHANGE = 'gate_change',
  ALTITUDE_BAND = 'altitude_band',
  SPEED_THRESHOLD = 'speed_threshold',
  ROUTE_DEVIATION = 'route_deviation',
  PROXIMITY = 'proximity'
}

export interface AlertCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: any;
  caseSensitive?: boolean;
}

export enum ConditionField {
  // Flight identification
  CALLSIGN = 'callsign',
  REGISTRATION = 'registration',
  ICAO24 = 'icao24',
  OPERATOR = 'operator',
  
  // Flight status
  STATUS = 'status',
  PHASE = 'phase',
  
  // Location and movement
  LATITUDE = 'latitude',
  LONGITUDE = 'longitude',
  ALTITUDE = 'altitude',
  SPEED = 'speed',
  HEADING = 'heading',
  VERTICAL_RATE = 'vertical_rate',
  
  // Schedule
  DEPARTURE_TIME = 'departureTime',
  ARRIVAL_TIME = 'arrivalTime',
  SCHEDULE_DEVIATION = 'scheduleDeviation',
  
  // Airport and route
  ORIGIN = 'origin',
  DESTINATION = 'destination',
  GATE = 'gate',
  RUNWAY = 'runway',
  
  // Aircraft type
  AIRCRAFT_TYPE = 'aircraftType',
  AIRCRAFT_CATEGORY = 'aircraftCategory'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  IN_LIST = 'in_list',
  NOT_IN_LIST = 'not_in_list',
  WITHIN_RADIUS = 'within_radius',
  OUTSIDE_RADIUS = 'outside_radius',
  CHANGED = 'changed',
  UNCHANGED = 'unchanged'
}

export interface AlertAction {
  type: AlertActionType;
  config: AlertActionConfig;
  enabled: boolean;
}

export enum AlertActionType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH_NOTIFICATION = 'push_notification',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app'
}

export interface AlertActionConfig {
  // Email config
  to?: string[];
  cc?: string[];
  subject?: string;
  template?: string;
  
  // SMS config
  phoneNumbers?: string[];
  message?: string;
  
  // Push notification config
  title?: string;
  body?: string;
  icon?: string;
  
  // Webhook config
  url?: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: Record<string, any>;
  
  // Common config
  customMessage?: string;
  includeFlightData?: boolean;
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  userId: string;
  flightId: string;
  triggeredAt: Date;
  message: string;
  data: AlertInstanceData;
  status: AlertInstanceStatus;
  attempts: AlertDeliveryAttempt[];
  acknowledged?: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface AlertInstanceData {
  flight: {
    id: string;
    callsign?: string;
    registration?: string;
    icao24: string;
    operator?: string;
    origin?: string;
    destination?: string;
  };
  trigger: {
    condition: AlertCondition;
    previousValue?: any;
    currentValue: any;
    changeType?: string;
  };
  context: {
    timestamp: Date;
    position?: {
      latitude: number;
      longitude: number;
      altitude?: number;
    };
    metadata?: Record<string, any>;
  };
}

export enum AlertInstanceStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  ACKNOWLEDGED = 'acknowledged',
  EXPIRED = 'expired'
}

export interface AlertDeliveryAttempt {
  id: string;
  actionType: AlertActionType;
  attemptedAt: Date;
  success: boolean;
  error?: string;
  responseData?: any;
  retryCount: number;
}

export interface AlertEvaluationContext {
  flight: any;
  previousFlight?: any;
  position: any;
  previousPosition?: any;
  schedule?: any;
  airport?: any;
  weather?: any;
  metadata: Record<string, any>;
}

export interface AlertQuota {
  userId: string;
  tier: string;
  maxRules: number | 'unlimited';
  currentRules: number;
  canCreateMore: boolean;
  nextResetAt?: Date;
}

export interface AlertStats {
  userId: string;
  totalRules: number;
  activeRules: number;
  triggeredToday: number;
  deliveredToday: number;
  failedToday: number;
  period: {
    start: Date;
    end: Date;
  };
}