import Stripe from 'stripe';
import { createClient } from 'redis';
import { 
  UserSubscription, 
  SubscriptionStatus, 
  SubscriptionTier, 
  FeatureGate,
  ApiUsage
} from '../types/subscription';
import { getPlanByTier } from '../stripe/plans';

export class SubscriptionService {
  private stripe: Stripe;
  private redis: ReturnType<typeof createClient>;
  private db: any;

  constructor(options: {
    stripeSecretKey: string;
    redisUrl?: string;
    database: any;
  }) {
    this.stripe = new Stripe(options.stripeSecretKey);
    this.redis = createClient({ url: options.redisUrl });
    this.db = options.database;
    
    this.redis.connect().catch(console.error);
  }

  async createCustomer(userId: string, email: string, name?: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
      name
    });

    await this.db.users.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id }
    });

    return customer.id;
  }

  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    trialDays?: number
  ): Promise<Stripe.Checkout.Session> {
    const user = await this.db.users.findUnique({ where: { id: userId } });
    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      customerId = await this.createCustomer(userId, user.email, user.name);
    }

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId
      }
    };

    if (trialDays && trialDays > 0) {
      sessionData.subscription_data = {
        trial_period_days: trialDays
      };
    }

    return await this.stripe.checkout.sessions.create(sessionData);
  }

  async getUserSubscription(userId: string): Promise<UserSubscription> {
    const cached = await this.redis.get(`subscription:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    let subscription = await this.db.subscriptions.findUnique({
      where: { userId }
    });

    if (!subscription) {
      subscription = await this.createFreeSubscription(userId);
    }

    await this.redis.setEx(`subscription:${userId}`, 300, JSON.stringify(subscription));
    return subscription;
  }

  async getFeatureGate(userId: string): Promise<FeatureGate> {
    const subscription = await this.getUserSubscription(userId);
    const plan = getPlanByTier(subscription.tier);
    const usage = await this.getUsageStats(userId);

    const apiCallsRemaining = plan.features.apiCalls.daily === 'unlimited' 
      ? 'unlimited' as any
      : Math.max(0, plan.features.apiCalls.daily - usage.apiCalls);

    const alertsRemaining = plan.features.maxAlerts === 'unlimited'
      ? 'unlimited' as any
      : Math.max(0, plan.features.maxAlerts - usage.alerts);

    return {
      userId,
      tier: subscription.tier,
      features: plan.features,
      usage,
      limits: {
        apiCallsRemaining,
        alertsRemaining
      }
    };
  }

  async checkApiLimit(userId: string, tier: SubscriptionTier): Promise<boolean> {
    const plan = getPlanByTier(tier);
    if (plan.features.apiCalls.daily === 'unlimited') {
      return true;
    }

    const today = new Date().toISOString().split('T')[0];
    const usage = await this.getApiUsage(userId, today);
    
    return usage.calls < plan.features.apiCalls.daily;
  }

  async incrementApiUsage(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `api_usage:${userId}:${today}`;
    
    await this.redis.incr(key);
    await this.redis.expireAt(key, Math.floor(Date.now() / 1000) + 86400);
  }

  async updateSubscriptionFromWebhook(event: Stripe.Event): Promise<void> {
    const { type, data } = event;
    const subscription = data.object as Stripe.Subscription;

    switch (type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscriptionFromStripe(subscription);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancellation(subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(data.object as Stripe.Invoice);
        break;
    }
  }

  async cancelSubscription(userId: string, cancelAtPeriodEnd = true): Promise<void> {
    const userSubscription = await this.getUserSubscription(userId);
    
    if (userSubscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(userSubscription.stripeSubscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd
      });
    }

    if (!cancelAtPeriodEnd) {
      await this.db.subscriptions.update({
        where: { userId },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          updatedAt: new Date()
        }
      });

      await this.redis.del(`subscription:${userId}`);
    }
  }

  async reactivateSubscription(userId: string): Promise<void> {
    const userSubscription = await this.getUserSubscription(userId);
    
    if (userSubscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(userSubscription.stripeSubscriptionId, {
        cancel_at_period_end: false
      });
    }

    await this.redis.del(`subscription:${userId}`);
  }

  private async createFreeSubscription(userId: string): Promise<UserSubscription> {
    const now = new Date();
    const subscription: UserSubscription = {
      id: `free_${userId}_${Date.now()}`,
      userId,
      stripeCustomerId: '',
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getFullYear() + 10, now.getMonth(), now.getDate()),
      createdAt: now,
      updatedAt: now
    };

    await this.db.subscriptions.create({ data: subscription });
    return subscription;
  }

  private async syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> {
    const userId = stripeSubscription.metadata.userId;
    if (!userId) return;

    const tier = this.getTierFromPriceId(stripeSubscription.items.data[0].price.id);
    const status = this.mapStripeStatus(stripeSubscription.status);

    const subscriptionData = {
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      tier,
      status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialStart: stripeSubscription.trial_start 
        ? new Date(stripeSubscription.trial_start * 1000) 
        : undefined,
      trialEnd: stripeSubscription.trial_end 
        ? new Date(stripeSubscription.trial_end * 1000) 
        : undefined,
      updatedAt: new Date()
    };

    await this.db.subscriptions.upsert({
      where: { userId },
      create: { userId, ...subscriptionData, createdAt: new Date() },
      update: subscriptionData
    });

    await this.redis.del(`subscription:${userId}`);
  }

  private async handleSubscriptionCancellation(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) return;

    await this.createFreeSubscription(userId);
    await this.redis.del(`subscription:${userId}`);
  }

  private async handlePaymentSuccess(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const subscription = await this.stripe.subscriptions.retrieve(
        invoice.subscription as string
      );
      await this.syncSubscriptionFromStripe(subscription);
    }
  }

  private async handlePaymentFailure(invoice: Stripe.Invoice): Promise<void> {
    const userId = invoice.metadata?.userId;
    if (!userId) return;

    await this.db.subscriptions.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        updatedAt: new Date()
      }
    });

    await this.redis.del(`subscription:${userId}`);
  }

  private getTierFromPriceId(priceId: string): SubscriptionTier {
    if (priceId.includes('premium')) return SubscriptionTier.PREMIUM;
    if (priceId.includes('pro')) return SubscriptionTier.PRO;
    if (priceId.includes('business')) return SubscriptionTier.BUSINESS;
    return SubscriptionTier.FREE;
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active': return SubscriptionStatus.ACTIVE;
      case 'trialing': return SubscriptionStatus.TRIALING;
      case 'past_due': return SubscriptionStatus.PAST_DUE;
      case 'canceled': return SubscriptionStatus.CANCELED;
      case 'unpaid': return SubscriptionStatus.UNPAID;
      case 'incomplete': return SubscriptionStatus.INCOMPLETE;
      case 'incomplete_expired': return SubscriptionStatus.INCOMPLETE_EXPIRED;
      default: return SubscriptionStatus.ACTIVE;
    }
  }

  private async getApiUsage(userId: string, date: string): Promise<ApiUsage> {
    const key = `api_usage:${userId}:${date}`;
    const calls = await this.redis.get(key) || '0';
    const subscription = await this.getUserSubscription(userId);
    const plan = getPlanByTier(subscription.tier);

    return {
      userId,
      date,
      calls: parseInt(calls),
      tier: subscription.tier,
      limit: plan.features.apiCalls.daily as number,
      resetAt: new Date(Date.now() + 86400000)
    };
  }

  private async getUsageStats(userId: string): Promise<{ apiCalls: number; alerts: number }> {
    const today = new Date().toISOString().split('T')[0];
    const apiUsage = await this.getApiUsage(userId, today);
    
    const alertCount = await this.db.alerts.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    return {
      apiCalls: apiUsage.calls,
      alerts: alertCount || 0
    };
  }
}