import { SubscriptionPlan, SubscriptionTier } from '../types/subscription';

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  [SubscriptionTier.FREE]: {
    id: 'free',
    tier: SubscriptionTier.FREE,
    name: 'Free',
    description: 'Basic flight tracking for hobbyists',
    stripePriceId: {
      monthly: '',
      yearly: ''
    },
    price: {
      monthly: 0,
      yearly: 0
    },
    features: {
      realTimeData: false,
      dataDelay: 300,
      historyDays: 7,
      maxAlerts: 2,
      weatherOverlay: false,
      apiCalls: {
        daily: 0,
        rateLimitPerMinute: 0
      },
      adsEnabled: true,
      export: {
        csv: false,
        geoJson: false,
        api: false
      },
      sso: false,
      sla: false
    }
  },
  
  [SubscriptionTier.PREMIUM]: {
    id: 'premium',
    tier: SubscriptionTier.PREMIUM,
    name: 'Premium',
    description: 'Real-time tracking with weather and API access',
    stripePriceId: {
      monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly',
      yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly'
    },
    price: {
      monthly: 7.99,
      yearly: 79.99
    },
    features: {
      realTimeData: true,
      dataDelay: 0,
      historyDays: 90,
      maxAlerts: 10,
      weatherOverlay: true,
      apiCalls: {
        daily: 1000,
        rateLimitPerMinute: 60
      },
      adsEnabled: false,
      export: {
        csv: false,
        geoJson: false,
        api: true
      },
      sso: false,
      sla: false
    },
    trialDays: 7,
    popular: true
  },

  [SubscriptionTier.PRO]: {
    id: 'pro',
    tier: SubscriptionTier.PRO,
    name: 'Pro',
    description: 'Extended history and unlimited alerts with data export',
    stripePriceId: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
      yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly'
    },
    price: {
      monthly: 24.99,
      yearly: 249.99
    },
    features: {
      realTimeData: true,
      dataDelay: 0,
      historyDays: 365,
      maxAlerts: 'unlimited',
      weatherOverlay: true,
      apiCalls: {
        daily: 10000,
        rateLimitPerMinute: 120
      },
      adsEnabled: false,
      export: {
        csv: true,
        geoJson: true,
        api: true
      },
      sso: false,
      sla: false
    },
    trialDays: 7
  },

  [SubscriptionTier.BUSINESS]: {
    id: 'business',
    tier: SubscriptionTier.BUSINESS,
    name: 'Business',
    description: 'Enterprise features with team collaboration and SLA',
    stripePriceId: {
      monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || 'price_business_monthly',
      yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID || 'price_business_yearly'
    },
    price: {
      monthly: 99.99,
      yearly: 999.99
    },
    features: {
      realTimeData: true,
      dataDelay: 0,
      historyDays: 1095,
      maxAlerts: 'unlimited',
      weatherOverlay: true,
      apiCalls: {
        daily: 'unlimited',
        rateLimitPerMinute: 300
      },
      adsEnabled: false,
      export: {
        csv: true,
        geoJson: true,
        api: true
      },
      teamSeats: 'unlimited',
      sso: true,
      sla: true
    }
  }
};

export const getStripePriceId = (tier: SubscriptionTier, interval: 'monthly' | 'yearly'): string => {
  const plan = SUBSCRIPTION_PLANS[tier];
  return plan.stripePriceId[interval];
};

export const getPlanByTier = (tier: SubscriptionTier): SubscriptionPlan => {
  return SUBSCRIPTION_PLANS[tier];
};

export const getAllPlans = (): SubscriptionPlan[] => {
  return Object.values(SUBSCRIPTION_PLANS);
};

export const getTrialEligiblePlans = (): SubscriptionPlan[] => {
  return Object.values(SUBSCRIPTION_PLANS).filter(plan => plan.trialDays && plan.trialDays > 0);
};