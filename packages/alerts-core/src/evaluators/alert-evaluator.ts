import { DateTime } from 'luxon';
import {
  AlertRule,
  AlertRuleType,
  AlertCondition,
  ConditionField,
  ConditionOperator,
  AlertEvaluationContext,
  AlertInstanceData
} from '../types/alert';

export class AlertEvaluator {
  private ruleEvaluators: Map<AlertRuleType, (rule: AlertRule, context: AlertEvaluationContext) => boolean>;

  constructor() {
    this.ruleEvaluators = new Map([
      [AlertRuleType.STATUS_CHANGE, this.evaluateStatusChange.bind(this)],
      [AlertRuleType.OFF_SCHEDULE, this.evaluateOffSchedule.bind(this)],
      [AlertRuleType.TAXI_STATUS, this.evaluateTaxiStatus.bind(this)],
      [AlertRuleType.TAKEOFF_LANDING, this.evaluateTakeoffLanding.bind(this)],
      [AlertRuleType.DIVERSION, this.evaluateDiversion.bind(this)],
      [AlertRuleType.GATE_CHANGE, this.evaluateGateChange.bind(this)],
      [AlertRuleType.ALTITUDE_BAND, this.evaluateAltitudeBand.bind(this)],
      [AlertRuleType.SPEED_THRESHOLD, this.evaluateSpeedThreshold.bind(this)],
      [AlertRuleType.ROUTE_DEVIATION, this.evaluateRouteDeviation.bind(this)],
      [AlertRuleType.PROXIMITY, this.evaluateProximity.bind(this)]
    ]);
  }

  async evaluateRule(rule: AlertRule, context: AlertEvaluationContext): Promise<{
    triggered: boolean;
    data?: AlertInstanceData;
    message?: string;
  }> {
    try {
      // Check if rule is enabled and not in cooldown
      if (!rule.enabled) {
        return { triggered: false };
      }

      if (this.isInCooldown(rule)) {
        return { triggered: false };
      }

      // Check all conditions are met
      const conditionsResult = this.evaluateConditions(rule.conditions, context);
      if (!conditionsResult.allMet) {
        return { triggered: false };
      }

      // Evaluate specific rule type
      const evaluator = this.ruleEvaluators.get(rule.ruleType);
      if (!evaluator) {
        throw new Error(`No evaluator found for rule type: ${rule.ruleType}`);
      }

      const ruleTriggered = evaluator(rule, context);
      if (!ruleTriggered) {
        return { triggered: false };
      }

      // Generate alert data and message
      const data = this.generateAlertData(rule, context, conditionsResult.triggeringCondition);
      const message = this.generateAlertMessage(rule, context, data);

      return {
        triggered: true,
        data,
        message
      };

    } catch (error) {
      console.error(`Error evaluating alert rule ${rule.id}:`, error);
      return { triggered: false };
    }
  }

  private evaluateConditions(conditions: AlertCondition[], context: AlertEvaluationContext): {
    allMet: boolean;
    triggeringCondition?: AlertCondition;
  } {
    if (conditions.length === 0) {
      return { allMet: true };
    }

    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return { allMet: false };
      }
    }

    return { allMet: true, triggeringCondition: conditions[0] };
  }

  private evaluateCondition(condition: AlertCondition, context: AlertEvaluationContext): boolean {
    const currentValue = this.extractFieldValue(condition.field, context);
    const conditionValue = condition.value;
    const operator = condition.operator;

    switch (operator) {
      case ConditionOperator.EQUALS:
        return this.compareValues(currentValue, conditionValue, 'equals', condition.caseSensitive);
      
      case ConditionOperator.NOT_EQUALS:
        return !this.compareValues(currentValue, conditionValue, 'equals', condition.caseSensitive);
      
      case ConditionOperator.CONTAINS:
        return this.compareValues(currentValue, conditionValue, 'contains', condition.caseSensitive);
      
      case ConditionOperator.NOT_CONTAINS:
        return !this.compareValues(currentValue, conditionValue, 'contains', condition.caseSensitive);
      
      case ConditionOperator.STARTS_WITH:
        return this.compareValues(currentValue, conditionValue, 'starts_with', condition.caseSensitive);
      
      case ConditionOperator.ENDS_WITH:
        return this.compareValues(currentValue, conditionValue, 'ends_with', condition.caseSensitive);
      
      case ConditionOperator.GREATER_THAN:
        return Number(currentValue) > Number(conditionValue);
      
      case ConditionOperator.LESS_THAN:
        return Number(currentValue) < Number(conditionValue);
      
      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        return Number(currentValue) >= Number(conditionValue);
      
      case ConditionOperator.LESS_THAN_OR_EQUAL:
        return Number(currentValue) <= Number(conditionValue);
      
      case ConditionOperator.IN_LIST:
        return Array.isArray(conditionValue) && conditionValue.includes(currentValue);
      
      case ConditionOperator.NOT_IN_LIST:
        return Array.isArray(conditionValue) && !conditionValue.includes(currentValue);
      
      case ConditionOperator.WITHIN_RADIUS:
        return this.isWithinRadius(currentValue, conditionValue);
      
      case ConditionOperator.OUTSIDE_RADIUS:
        return !this.isWithinRadius(currentValue, conditionValue);
      
      case ConditionOperator.CHANGED:
        return this.hasValueChanged(condition.field, context);
      
      case ConditionOperator.UNCHANGED:
        return !this.hasValueChanged(condition.field, context);
      
      default:
        return false;
    }
  }

  private extractFieldValue(field: ConditionField, context: AlertEvaluationContext): any {
    const { flight, position, schedule, airport } = context;

    switch (field) {
      case ConditionField.CALLSIGN:
        return flight?.callsign;
      case ConditionField.REGISTRATION:
        return flight?.registration;
      case ConditionField.ICAO24:
        return flight?.icao24;
      case ConditionField.OPERATOR:
        return flight?.operator;
      case ConditionField.STATUS:
        return flight?.status;
      case ConditionField.PHASE:
        return flight?.phase;
      case ConditionField.LATITUDE:
        return position?.latitude;
      case ConditionField.LONGITUDE:
        return position?.longitude;
      case ConditionField.ALTITUDE:
        return position?.altitude;
      case ConditionField.SPEED:
        return position?.speed;
      case ConditionField.HEADING:
        return position?.heading;
      case ConditionField.VERTICAL_RATE:
        return position?.verticalRate;
      case ConditionField.DEPARTURE_TIME:
        return schedule?.departureTime;
      case ConditionField.ARRIVAL_TIME:
        return schedule?.arrivalTime;
      case ConditionField.SCHEDULE_DEVIATION:
        return this.calculateScheduleDeviation(schedule, flight);
      case ConditionField.ORIGIN:
        return flight?.origin;
      case ConditionField.DESTINATION:
        return flight?.destination;
      case ConditionField.GATE:
        return flight?.gate || airport?.gate;
      case ConditionField.RUNWAY:
        return flight?.runway || airport?.runway;
      case ConditionField.AIRCRAFT_TYPE:
        return flight?.aircraft?.type;
      case ConditionField.AIRCRAFT_CATEGORY:
        return flight?.aircraft?.category;
      default:
        return null;
    }
  }

  private compareValues(current: any, expected: any, type: string, caseSensitive = false): boolean {
    if (current == null || expected == null) return false;

    const currentStr = String(current);
    const expectedStr = String(expected);
    
    const a = caseSensitive ? currentStr : currentStr.toLowerCase();
    const b = caseSensitive ? expectedStr : expectedStr.toLowerCase();

    switch (type) {
      case 'equals':
        return a === b;
      case 'contains':
        return a.includes(b);
      case 'starts_with':
        return a.startsWith(b);
      case 'ends_with':
        return a.endsWith(b);
      default:
        return false;
    }
  }

  private isWithinRadius(currentPos: any, radiusConfig: any): boolean {
    if (!currentPos?.latitude || !currentPos?.longitude || 
        !radiusConfig?.latitude || !radiusConfig?.longitude || !radiusConfig?.radius) {
      return false;
    }

    const distance = this.calculateDistance(
      currentPos.latitude, currentPos.longitude,
      radiusConfig.latitude, radiusConfig.longitude
    );

    return distance <= radiusConfig.radius;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private hasValueChanged(field: ConditionField, context: AlertEvaluationContext): boolean {
    const currentValue = this.extractFieldValue(field, context);
    const previousValue = this.extractFieldValue(field, {
      ...context,
      flight: context.previousFlight,
      position: context.previousPosition
    });

    return currentValue !== previousValue;
  }

  private calculateScheduleDeviation(schedule: any, flight: any): number {
    if (!schedule?.departureTime || !flight?.actualDepartureTime) {
      return 0;
    }

    const scheduled = DateTime.fromJSDate(schedule.departureTime);
    const actual = DateTime.fromJSDate(flight.actualDepartureTime);
    
    return actual.diff(scheduled, 'minutes').minutes;
  }

  private isInCooldown(rule: AlertRule): boolean {
    if (!rule.lastTriggered || rule.cooldownMinutes <= 0) {
      return false;
    }

    const cooldownEnd = DateTime.fromJSDate(rule.lastTriggered)
      .plus({ minutes: rule.cooldownMinutes });
    
    return DateTime.now() < cooldownEnd;
  }

  // Rule type specific evaluators
  private evaluateStatusChange(rule: AlertRule, context: AlertEvaluationContext): boolean {
    return this.hasValueChanged(ConditionField.STATUS, context);
  }

  private evaluateOffSchedule(rule: AlertRule, context: AlertEvaluationContext): boolean {
    const deviation = this.calculateScheduleDeviation(context.schedule, context.flight);
    const threshold = rule.metadata?.thresholdMinutes || 15;
    return Math.abs(deviation) >= threshold;
  }

  private evaluateTaxiStatus(rule: AlertRule, context: AlertEvaluationContext): boolean {
    const currentPhase = context.flight?.phase;
    const previousPhase = context.previousFlight?.phase;
    
    const taxiPhases = ['taxi_out', 'taxi_in'];
    return !taxiPhases.includes(previousPhase) && taxiPhases.includes(currentPhase);
  }

  private evaluateTakeoffLanding(rule: AlertRule, context: AlertEvaluationContext): boolean {
    const currentPhase = context.flight?.phase;
    const previousPhase = context.previousFlight?.phase;
    
    const targetPhases = ['takeoff', 'landing', 'landed'];
    return !targetPhases.includes(previousPhase) && targetPhases.includes(currentPhase);
  }

  private evaluateDiversion(rule: AlertRule, context: AlertEvaluationContext): boolean {
    const currentDestination = context.flight?.destination;
    const originalDestination = context.flight?.originalDestination || context.schedule?.destination;
    
    return currentDestination && originalDestination && currentDestination !== originalDestination;
  }

  private evaluateGateChange(rule: AlertRule, context: AlertEvaluationContext): boolean {
    return this.hasValueChanged(ConditionField.GATE, context);
  }

  private evaluateAltitudeBand(rule: AlertRule, context: AlertEvaluationContext): boolean {
    const currentAltitude = context.position?.altitude;
    const previousAltitude = context.previousPosition?.altitude;
    const bandConfig = rule.metadata?.altitudeBand;
    
    if (!bandConfig || !currentAltitude) return false;

    const { min, max } = bandConfig;
    const wasInBand = previousAltitude >= min && previousAltitude <= max;
    const isInBand = currentAltitude >= min && currentAltitude <= max;
    
    // Trigger on entering or exiting the band
    return (wasInBand && !isInBand) || (!wasInBand && isInBand);
  }

  private evaluateSpeedThreshold(rule: AlertRule, context: AlertEvaluationContext): boolean {
    const currentSpeed = context.position?.speed;
    const threshold = rule.metadata?.speedThreshold;
    const operator = rule.metadata?.operator || 'greater_than';
    
    if (!currentSpeed || !threshold) return false;

    switch (operator) {
      case 'greater_than':
        return currentSpeed > threshold;
      case 'less_than':
        return currentSpeed < threshold;
      default:
        return false;
    }
  }

  private evaluateRouteDeviation(rule: AlertRule, context: AlertEvaluationContext): boolean {
    const currentPos = context.position;
    const flightPlan = context.flight?.flightPlan;
    
    if (!currentPos || !flightPlan?.waypoints) return false;

    const deviationThreshold = rule.metadata?.deviationThresholdKm || 50;
    const nearestWaypoint = this.findNearestWaypoint(currentPos, flightPlan.waypoints);
    
    if (!nearestWaypoint) return false;

    const distance = this.calculateDistance(
      currentPos.latitude, currentPos.longitude,
      nearestWaypoint.latitude, nearestWaypoint.longitude
    );
    
    return distance > deviationThreshold;
  }

  private evaluateProximity(rule: AlertRule, context: AlertEvaluationContext): boolean {
    const proximityConfig = rule.metadata?.proximity;
    if (!proximityConfig) return false;

    return this.isWithinRadius(context.position, proximityConfig);
  }

  private findNearestWaypoint(position: any, waypoints: any[]): any {
    if (!waypoints.length) return null;

    let nearest = waypoints[0];
    let minDistance = this.calculateDistance(
      position.latitude, position.longitude,
      nearest.latitude, nearest.longitude
    );

    for (let i = 1; i < waypoints.length; i++) {
      const distance = this.calculateDistance(
        position.latitude, position.longitude,
        waypoints[i].latitude, waypoints[i].longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = waypoints[i];
      }
    }

    return nearest;
  }

  private generateAlertData(rule: AlertRule, context: AlertEvaluationContext, triggeringCondition?: AlertCondition): AlertInstanceData {
    return {
      flight: {
        id: context.flight.id,
        callsign: context.flight.callsign,
        registration: context.flight.registration,
        icao24: context.flight.icao24,
        operator: context.flight.operator,
        origin: context.flight.origin,
        destination: context.flight.destination
      },
      trigger: {
        condition: triggeringCondition!,
        currentValue: triggeringCondition ? this.extractFieldValue(triggeringCondition.field, context) : null,
        previousValue: triggeringCondition && context.previousFlight ? 
          this.extractFieldValue(triggeringCondition.field, {
            ...context,
            flight: context.previousFlight,
            position: context.previousPosition
          }) : null,
        changeType: rule.ruleType
      },
      context: {
        timestamp: new Date(),
        position: context.position ? {
          latitude: context.position.latitude,
          longitude: context.position.longitude,
          altitude: context.position.altitude
        } : undefined,
        metadata: context.metadata
      }
    };
  }

  private generateAlertMessage(rule: AlertRule, context: AlertEvaluationContext, data: AlertInstanceData): string {
    const flight = data.flight;
    const flightId = flight.callsign || flight.registration || flight.icao24;
    
    const baseMessage = `Alert: ${rule.name} - Flight ${flightId}`;
    
    switch (rule.ruleType) {
      case AlertRuleType.STATUS_CHANGE:
        return `${baseMessage} status changed to ${data.trigger.currentValue}`;
      
      case AlertRuleType.OFF_SCHEDULE:
        const deviation = Math.abs(Number(data.trigger.currentValue));
        const direction = Number(data.trigger.currentValue) > 0 ? 'delayed' : 'early';
        return `${baseMessage} is ${deviation} minutes ${direction}`;
      
      case AlertRuleType.TAKEOFF_LANDING:
        return `${baseMessage} ${data.trigger.currentValue}`;
      
      case AlertRuleType.DIVERSION:
        return `${baseMessage} diverted to ${data.trigger.currentValue}`;
      
      case AlertRuleType.GATE_CHANGE:
        return `${baseMessage} gate changed to ${data.trigger.currentValue}`;
      
      case AlertRuleType.ALTITUDE_BAND:
        const altitude = data.context.position?.altitude;
        return `${baseMessage} altitude ${altitude}ft entered/exited monitored band`;
      
      default:
        return `${baseMessage} triggered`;
    }
  }
}