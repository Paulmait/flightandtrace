export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  PRO = 'pro',
  BUSINESS = 'business'
}

export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  stripePriceId: {
    monthly: string;
    yearly: string;
  };
  price: {
    monthly: number;
    yearly: number;
  };
  features: PlanFeatures;
  trialDays?: number;
  popular?: boolean;
}

export interface PlanFeatures {
  realTimeData: boolean;
  dataDelay: number;
  historyDays: number;
  maxAlerts: number | 'unlimited';
  weatherOverlay: boolean;
  apiCalls: {
    daily: number | 'unlimited';
    rateLimitPerMinute: number;
  };
  adsEnabled: boolean;
  export: {
    csv: boolean;
    geoJson: boolean;
    api: boolean;
  };
  teamSeats?: number | 'unlimited';
  sso: boolean;
  sla: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingInterval?: BillingInterval;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired'
}

export interface ApiUsage {
  userId: string;
  date: string;
  calls: number;
  tier: SubscriptionTier;
  limit: number;
  resetAt: Date;
}

export interface FeatureGate {
  userId: string;
  tier: SubscriptionTier;
  features: PlanFeatures;
  usage: {
    apiCalls: number;
    alerts: number;
  };
  limits: {
    apiCallsRemaining: number;
    alertsRemaining: number | 'unlimited';
  };
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
}