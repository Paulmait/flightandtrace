import { SubscriptionTier } from '@flighttrace/billing-core';
import { AlertQuota, AlertStats } from '../types/alert';

export class AlertQuotaService {
  private database: any;
  private redis: any;

  constructor(database: any, redis: any) {
    this.database = database;
    this.redis = redis;
  }

  private getAlertLimits(tier: SubscriptionTier): { max: number | 'unlimited'; features: string[] } {
    switch (tier) {
      case SubscriptionTier.FREE:
        return {
          max: 2,
          features: ['status_change', 'takeoff_landing']
        };

      case SubscriptionTier.PREMIUM:
        return {
          max: 10,
          features: [
            'status_change',
            'off_schedule',
            'taxi_status',
            'takeoff_landing',
            'gate_change',
            'altitude_band'
          ]
        };

      case SubscriptionTier.PRO:
        return {
          max: 'unlimited',
          features: [
            'status_change',
            'off_schedule',
            'taxi_status',
            'takeoff_landing',
            'diversion',
            'gate_change',
            'altitude_band',
            'speed_threshold',
            'route_deviation',
            'proximity'
          ]
        };

      case SubscriptionTier.BUSINESS:
        return {
          max: 'unlimited',
          features: [
            'status_change',
            'off_schedule',
            'taxi_status',
            'takeoff_landing',
            'diversion',
            'gate_change',
            'altitude_band',
            'speed_threshold',
            'route_deviation',
            'proximity',
            'team_collaboration',
            'advanced_conditions'
          ]
        };

      default:
        return { max: 0, features: [] };
    }
  }

  async getUserAlertQuota(userId: string): Promise<AlertQuota> {
    const cacheKey = `alert_quota:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get user subscription
    const subscription = await this.database.subscriptions.findUnique({
      where: { userId }
    });

    if (!subscription) {
      throw new Error('User subscription not found');
    }

    const limits = this.getAlertLimits(subscription.tier);
    const currentRules = await this.database.alertRules.count({
      where: {
        userId,
        enabled: true
      }
    });

    const quota: AlertQuota = {
      userId,
      tier: subscription.tier,
      maxRules: limits.max,
      currentRules,
      canCreateMore: limits.max === 'unlimited' || currentRules < limits.max,
      nextResetAt: limits.max !== 'unlimited' ? undefined : undefined
    };

    // Cache for 5 minutes
    await this.redis.setEx(cacheKey, 300, JSON.stringify(quota));

    return quota;
  }

  async canCreateAlert(userId: string, ruleType: string): Promise<{
    allowed: boolean;
    reason?: string;
    quota: AlertQuota;
  }> {
    const quota = await this.getUserAlertQuota(userId);

    if (!quota.canCreateMore) {
      return {
        allowed: false,
        reason: `Alert limit reached (${quota.currentRules}/${quota.maxRules})`,
        quota
      };
    }

    // Check if rule type is supported for this tier
    const subscription = await this.database.subscriptions.findUnique({
      where: { userId }
    });

    const limits = this.getAlertLimits(subscription.tier);
    if (!limits.features.includes(ruleType)) {
      const suggestedTier = this.getSuggestedTierForRuleType(ruleType);
      return {
        allowed: false,
        reason: `Alert type '${ruleType}' not available in ${subscription.tier} plan. Upgrade to ${suggestedTier} required.`,
        quota
      };
    }

    return {
      allowed: true,
      quota
    };
  }

  async incrementAlertUsage(userId: string): Promise<void> {
    const cacheKey = `alert_quota:${userId}`;
    await this.redis.del(cacheKey); // Invalidate cache
    
    // Update current count will be recalculated on next quota check
  }

  async decrementAlertUsage(userId: string): Promise<void> {
    const cacheKey = `alert_quota:${userId}`;
    await this.redis.del(cacheKey); // Invalidate cache
  }

  async getAlertStats(userId: string): Promise<AlertStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalRules, activeRules, triggeredToday, deliveredToday, failedToday] = await Promise.all([
      this.database.alertRules.count({
        where: { userId }
      }),
      
      this.database.alertRules.count({
        where: {
          userId,
          enabled: true
        }
      }),
      
      this.database.alertInstances.count({
        where: {
          userId,
          triggeredAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      this.database.alertInstances.count({
        where: {
          userId,
          triggeredAt: {
            gte: today,
            lt: tomorrow
          },
          status: 'delivered'
        }
      }),
      
      this.database.alertInstances.count({
        where: {
          userId,
          triggeredAt: {
            gte: today,
            lt: tomorrow
          },
          status: 'failed'
        }
      })
    ]);

    return {
      userId,
      totalRules,
      activeRules,
      triggeredToday,
      deliveredToday,
      failedToday,
      period: {
        start: today,
        end: tomorrow
      }
    };
  }

  async enforceAlertQuotas(): Promise<void> {
    // Disable excess alert rules for users who have downgraded
    const users = await this.database.subscriptions.findMany({
      where: {
        tier: {
          in: [SubscriptionTier.FREE, SubscriptionTier.PREMIUM]
        }
      }
    });

    for (const user of users) {
      const limits = this.getAlertLimits(user.tier);
      if (limits.max === 'unlimited') continue;

      const activeRules = await this.database.alertRules.findMany({
        where: {
          userId: user.userId,
          enabled: true
        },
        orderBy: {
          lastTriggered: 'desc'
        }
      });

      if (activeRules.length > limits.max) {
        const excessRules = activeRules.slice(limits.max);
        const ruleIds = excessRules.map(rule => rule.id);

        await this.database.alertRules.updateMany({
          where: {
            id: { in: ruleIds }
          },
          data: {
            enabled: false,
            updatedAt: new Date()
          }
        });

        console.log(`Disabled ${excessRules.length} excess rules for user ${user.userId}`);
      }

      // Also check for unsupported rule types
      const unsupportedRules = activeRules.filter(rule => 
        !limits.features.includes(rule.ruleType)
      );

      if (unsupportedRules.length > 0) {
        const unsupportedIds = unsupportedRules.map(rule => rule.id);

        await this.database.alertRules.updateMany({
          where: {
            id: { in: unsupportedIds }
          },
          data: {
            enabled: false,
            updatedAt: new Date()
          }
        });

        console.log(`Disabled ${unsupportedRules.length} unsupported rule types for user ${user.userId}`);
      }

      // Invalidate cache
      await this.redis.del(`alert_quota:${user.userId}`);
    }
  }

  async bulkCheckAlertRules(userId: string, ruleTypes: string[]): Promise<{
    [ruleType: string]: {
      allowed: boolean;
      reason?: string;
      suggestedTier?: string;
    };
  }> {
    const subscription = await this.database.subscriptions.findUnique({
      where: { userId }
    });

    const limits = this.getAlertLimits(subscription.tier);
    const results: any = {};

    for (const ruleType of ruleTypes) {
      if (!limits.features.includes(ruleType)) {
        results[ruleType] = {
          allowed: false,
          reason: `Alert type not available in ${subscription.tier} plan`,
          suggestedTier: this.getSuggestedTierForRuleType(ruleType)
        };
      } else {
        results[ruleType] = {
          allowed: true
        };
      }
    }

    return results;
  }

  private getSuggestedTierForRuleType(ruleType: string): string {
    const premiumFeatures = ['off_schedule', 'taxi_status', 'gate_change', 'altitude_band'];
    const proFeatures = ['diversion', 'speed_threshold', 'route_deviation', 'proximity'];

    if (premiumFeatures.includes(ruleType)) {
      return 'Premium';
    } else if (proFeatures.includes(ruleType)) {
      return 'Pro';
    } else {
      return 'Business';
    }
  }

  async getAlertQuotaForAllUsers(): Promise<Map<string, AlertQuota>> {
    const subscriptions = await this.database.subscriptions.findMany();
    const quotas = new Map<string, AlertQuota>();

    for (const subscription of subscriptions) {
      try {
        const quota = await this.getUserAlertQuota(subscription.userId);
        quotas.set(subscription.userId, quota);
      } catch (error) {
        console.error(`Error getting quota for user ${subscription.userId}:`, error);
      }
    }

    return quotas;
  }

  async getUserTierCapabilities(userId: string): Promise<{
    tier: SubscriptionTier;
    maxAlerts: number | 'unlimited';
    supportedRuleTypes: string[];
    upgradeRequired: string[];
  }> {
    const subscription = await this.database.subscriptions.findUnique({
      where: { userId }
    });

    if (!subscription) {
      throw new Error('User subscription not found');
    }

    const limits = this.getAlertLimits(subscription.tier);
    const allRuleTypes = [
      'status_change',
      'off_schedule',
      'taxi_status',
      'takeoff_landing',
      'diversion',
      'gate_change',
      'altitude_band',
      'speed_threshold',
      'route_deviation',
      'proximity'
    ];

    const upgradeRequired = allRuleTypes.filter(type => !limits.features.includes(type));

    return {
      tier: subscription.tier,
      maxAlerts: limits.max,
      supportedRuleTypes: limits.features,
      upgradeRequired
    };
  }
}