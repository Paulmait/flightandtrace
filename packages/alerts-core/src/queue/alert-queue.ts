import Queue from 'bull';
import { AlertEvaluator } from '../evaluators/alert-evaluator';
import { NotificationService } from '../notifications/notification-service';
import { 
  AlertRule, 
  AlertInstance, 
  AlertEvaluationContext,
  AlertInstanceStatus,
  AlertDeliveryAttempt,
  AlertActionType
} from '../types/alert';

export interface AlertQueueJob {
  type: 'evaluate' | 'notify' | 'cleanup';
  data: any;
}

export interface EvaluateJobData {
  flightUpdate: {
    flight: any;
    position: any;
    previousFlight?: any;
    previousPosition?: any;
  };
  rules: AlertRule[];
  context: Partial<AlertEvaluationContext>;
}

export interface NotifyJobData {
  alertInstance: AlertInstance;
  retryAttempt?: number;
}

export class AlertQueue {
  private evaluationQueue: Queue.Queue;
  private notificationQueue: Queue.Queue;
  private cleanupQueue: Queue.Queue;
  private evaluator: AlertEvaluator;
  private notificationService: NotificationService;
  private database: any;

  constructor(options: {
    redisConfig: any;
    database: any;
    notificationService: NotificationService;
  }) {
    const { redisConfig, database, notificationService } = options;
    
    this.database = database;
    this.notificationService = notificationService;
    this.evaluator = new AlertEvaluator();

    // Initialize queues with different priorities
    this.evaluationQueue = new Queue('alert evaluation', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.notificationQueue = new Queue('alert notification', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        delay: 1000 // Small delay to batch notifications
      }
    });

    this.cleanupQueue = new Queue('alert cleanup', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 2,
        repeat: { cron: '0 2 * * *' } // Daily at 2 AM
      }
    });

    this.setupProcessors();
    this.setupEventHandlers();
  }

  private setupProcessors(): void {
    // Process flight updates for alert evaluation
    this.evaluationQueue.process('evaluate-flight', 10, this.processFlightEvaluation.bind(this));
    
    // Process notification delivery
    this.notificationQueue.process('deliver-notification', 5, this.processNotificationDelivery.bind(this));
    
    // Process cleanup tasks
    this.cleanupQueue.process('cleanup-expired', 1, this.processCleanup.bind(this));
  }

  private setupEventHandlers(): void {
    this.evaluationQueue.on('completed', (job, result) => {
      if (result.alertsTriggered > 0) {
        console.log(`Evaluation job ${job.id} triggered ${result.alertsTriggered} alerts`);
      }
    });

    this.evaluationQueue.on('failed', (job, err) => {
      console.error(`Evaluation job ${job.id} failed:`, err.message);
    });

    this.notificationQueue.on('completed', (job) => {
      console.log(`Notification delivered for job ${job.id}`);
    });

    this.notificationQueue.on('failed', (job, err) => {
      console.error(`Notification job ${job.id} failed:`, err.message);
      this.handleNotificationFailure(job.data, err);
    });
  }

  async queueFlightEvaluation(data: EvaluateJobData): Promise<void> {
    await this.evaluationQueue.add('evaluate-flight', data, {
      priority: this.getFlightPriority(data.flightUpdate.flight),
      delay: this.getEvaluationDelay(data.flightUpdate.flight)
    });
  }

  async queueNotification(alertInstance: AlertInstance): Promise<void> {
    await this.notificationQueue.add('deliver-notification', {
      alertInstance
    }, {
      priority: this.getNotificationPriority(alertInstance),
      delay: this.getNotificationDelay(alertInstance)
    });
  }

  private async processFlightEvaluation(job: Queue.Job<EvaluateJobData>): Promise<any> {
    const { flightUpdate, rules, context } = job.data;
    const triggeredAlerts: AlertInstance[] = [];

    try {
      const evaluationContext: AlertEvaluationContext = {
        flight: flightUpdate.flight,
        previousFlight: flightUpdate.previousFlight,
        position: flightUpdate.position,
        previousPosition: flightUpdate.previousPosition,
        metadata: context.metadata || {},
        ...context
      };

      // Evaluate each rule
      for (const rule of rules) {
        try {
          const result = await this.evaluator.evaluateRule(rule, evaluationContext);
          
          if (result.triggered && result.data && result.message) {
            const alertInstance = await this.createAlertInstance(
              rule,
              flightUpdate.flight.id,
              result.data,
              result.message
            );

            triggeredAlerts.push(alertInstance);
            
            // Update rule last triggered time
            await this.updateRuleLastTriggered(rule.id);
            
            // Queue notification delivery
            await this.queueNotification(alertInstance);
          }
        } catch (error) {
          console.error(`Error evaluating rule ${rule.id}:`, error);
          continue;
        }
      }

      return {
        alertsTriggered: triggeredAlerts.length,
        alerts: triggeredAlerts.map(a => a.id)
      };

    } catch (error) {
      console.error('Error in flight evaluation job:', error);
      throw error;
    }
  }

  private async processNotificationDelivery(job: Queue.Job<NotifyJobData>): Promise<void> {
    const { alertInstance, retryAttempt = 0 } = job.data;

    try {
      // Get the alert rule to determine actions
      const rule = await this.database.alertRules.findUnique({
        where: { id: alertInstance.ruleId }
      });

      if (!rule || !rule.enabled) {
        console.log(`Skipping notification for disabled rule ${alertInstance.ruleId}`);
        return;
      }

      // Process each action
      for (const action of rule.actions) {
        if (!action.enabled) continue;

        try {
          const attempt = await this.deliverNotification(alertInstance, action, retryAttempt);
          await this.recordDeliveryAttempt(alertInstance.id, attempt);

          if (!attempt.success && retryAttempt < 3) {
            // Schedule retry with exponential backoff
            const delay = Math.pow(2, retryAttempt) * 5000; // 5s, 10s, 20s
            await this.notificationQueue.add('deliver-notification', {
              alertInstance,
              retryAttempt: retryAttempt + 1
            }, { delay });
          }
        } catch (error) {
          console.error(`Failed to deliver notification for alert ${alertInstance.id}:`, error);
        }
      }

      // Update alert status
      await this.updateAlertStatus(alertInstance.id, AlertInstanceStatus.DELIVERED);

    } catch (error) {
      console.error('Error in notification delivery job:', error);
      await this.updateAlertStatus(alertInstance.id, AlertInstanceStatus.FAILED);
      throw error;
    }
  }

  private async processCleanup(job: Queue.Job): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days retention

      // Clean up old alert instances
      const deletedCount = await this.database.alertInstances.deleteMany({
        where: {
          triggeredAt: {
            lt: cutoffDate
          },
          status: {
            in: [AlertInstanceStatus.DELIVERED, AlertInstanceStatus.EXPIRED, AlertInstanceStatus.FAILED]
          }
        }
      });

      console.log(`Cleaned up ${deletedCount} old alert instances`);

      // Clean up failed jobs
      await this.cleanupFailedJobs();

    } catch (error) {
      console.error('Error in cleanup job:', error);
      throw error;
    }
  }

  private async deliverNotification(
    alertInstance: AlertInstance, 
    action: any, 
    retryAttempt: number
  ): Promise<AlertDeliveryAttempt> {
    const attempt: AlertDeliveryAttempt = {
      id: `${alertInstance.id}_${action.type}_${Date.now()}`,
      actionType: action.type,
      attemptedAt: new Date(),
      success: false,
      retryCount: retryAttempt
    };

    try {
      let result: any;

      switch (action.type) {
        case AlertActionType.EMAIL:
          result = await this.notificationService.sendEmail({
            to: action.config.to,
            cc: action.config.cc,
            subject: this.renderTemplate(action.config.subject, alertInstance),
            body: this.renderTemplate(action.config.template, alertInstance),
            alertData: action.config.includeFlightData ? alertInstance.data : undefined
          });
          break;

        case AlertActionType.SMS:
          result = await this.notificationService.sendSMS({
            phoneNumbers: action.config.phoneNumbers,
            message: this.renderTemplate(action.config.message, alertInstance)
          });
          break;

        case AlertActionType.PUSH_NOTIFICATION:
          result = await this.notificationService.sendPushNotification({
            userId: alertInstance.userId,
            title: this.renderTemplate(action.config.title, alertInstance),
            body: this.renderTemplate(action.config.body, alertInstance),
            icon: action.config.icon,
            data: alertInstance.data
          });
          break;

        case AlertActionType.WEBHOOK:
          result = await this.notificationService.sendWebhook({
            url: action.config.url,
            method: action.config.method || 'POST',
            headers: action.config.headers,
            body: {
              ...action.config.body,
              alert: alertInstance,
              ...(action.config.includeFlightData ? { flightData: alertInstance.data } : {})
            }
          });
          break;

        case AlertActionType.IN_APP:
          result = await this.notificationService.sendInAppNotification({
            userId: alertInstance.userId,
            title: this.renderTemplate(action.config.title, alertInstance),
            message: this.renderTemplate(action.config.customMessage, alertInstance),
            data: alertInstance.data
          });
          break;

        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      attempt.success = true;
      attempt.responseData = result;

    } catch (error) {
      attempt.success = false;
      attempt.error = error.message;
      console.error(`Notification delivery failed:`, error);
    }

    return attempt;
  }

  private renderTemplate(template: string, alertInstance: AlertInstance): string {
    if (!template) return alertInstance.message;

    return template
      .replace(/\{\{flight\.callsign\}\}/g, alertInstance.data.flight.callsign || 'Unknown')
      .replace(/\{\{flight\.registration\}\}/g, alertInstance.data.flight.registration || 'Unknown')
      .replace(/\{\{flight\.operator\}\}/g, alertInstance.data.flight.operator || 'Unknown')
      .replace(/\{\{flight\.origin\}\}/g, alertInstance.data.flight.origin || 'Unknown')
      .replace(/\{\{flight\.destination\}\}/g, alertInstance.data.flight.destination || 'Unknown')
      .replace(/\{\{alert\.message\}\}/g, alertInstance.message)
      .replace(/\{\{alert\.time\}\}/g, alertInstance.triggeredAt.toLocaleString());
  }

  private getFlightPriority(flight: any): number {
    // Higher priority for emergency, VIP, or specific airline flights
    if (flight.emergency) return 1;
    if (flight.operator?.includes('EMERGENCY')) return 2;
    if (flight.category === 'VIP') return 3;
    return 5; // Normal priority
  }

  private getEvaluationDelay(flight: any): number {
    // Immediate evaluation for critical flights
    if (flight.emergency || flight.operator?.includes('EMERGENCY')) return 0;
    return 1000; // 1 second delay for batching
  }

  private getNotificationPriority(alertInstance: AlertInstance): number {
    // Higher priority for emergency or safety-related alerts
    if (alertInstance.message.toLowerCase().includes('emergency')) return 1;
    if (alertInstance.message.toLowerCase().includes('diversion')) return 2;
    return 5;
  }

  private getNotificationDelay(alertInstance: AlertInstance): number {
    // Immediate delivery for critical alerts
    if (alertInstance.message.toLowerCase().includes('emergency')) return 0;
    return 2000; // 2 second delay for batching
  }

  private async createAlertInstance(
    rule: AlertRule, 
    flightId: string, 
    data: any, 
    message: string
  ): Promise<AlertInstance> {
    const alertInstance: AlertInstance = {
      id: `alert_${rule.id}_${flightId}_${Date.now()}`,
      ruleId: rule.id,
      userId: rule.userId,
      flightId,
      triggeredAt: new Date(),
      message,
      data,
      status: AlertInstanceStatus.PENDING,
      attempts: []
    };

    await this.database.alertInstances.create({
      data: alertInstance
    });

    return alertInstance;
  }

  private async updateRuleLastTriggered(ruleId: string): Promise<void> {
    await this.database.alertRules.update({
      where: { id: ruleId },
      data: { lastTriggered: new Date() }
    });
  }

  private async recordDeliveryAttempt(alertInstanceId: string, attempt: AlertDeliveryAttempt): Promise<void> {
    await this.database.alertInstances.update({
      where: { id: alertInstanceId },
      data: {
        attempts: {
          push: attempt
        }
      }
    });
  }

  private async updateAlertStatus(alertInstanceId: string, status: AlertInstanceStatus): Promise<void> {
    await this.database.alertInstances.update({
      where: { id: alertInstanceId },
      data: { status }
    });
  }

  private async handleNotificationFailure(jobData: NotifyJobData, error: Error): Promise<void> {
    console.error(`Notification permanently failed for alert ${jobData.alertInstance.id}:`, error);
    await this.updateAlertStatus(jobData.alertInstance.id, AlertInstanceStatus.FAILED);
  }

  private async cleanupFailedJobs(): Promise<void> {
    // Clean up failed jobs older than 7 days
    const failed = await this.notificationQueue.getFailed();
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const job of failed) {
      if (job.timestamp < cutoff) {
        await job.remove();
      }
    }
  }

  async getQueueStats(): Promise<any> {
    return {
      evaluation: {
        waiting: await this.evaluationQueue.getWaiting(),
        active: await this.evaluationQueue.getActive(),
        completed: await this.evaluationQueue.getCompleted(),
        failed: await this.evaluationQueue.getFailed()
      },
      notification: {
        waiting: await this.notificationQueue.getWaiting(),
        active: await this.notificationQueue.getActive(),
        completed: await this.notificationQueue.getCompleted(),
        failed: await this.notificationQueue.getFailed()
      }
    };
  }

  async close(): Promise<void> {
    await Promise.all([
      this.evaluationQueue.close(),
      this.notificationQueue.close(),
      this.cleanupQueue.close()
    ]);
  }
}