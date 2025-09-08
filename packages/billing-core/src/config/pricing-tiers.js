/**
 * FlightTrace Pricing Tiers Configuration
 * Competitor-informed packaging aligned with FR24 and FlightAware
 */

export const PRICING_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: {
      monthly: 0,
      yearly: 0
    },
    description: 'Basic flight tracking for casual users',
    features: {
      // Core Features
      basicMap: true,
      realTimeFlights: true,
      basicSearch: true,
      
      // History & Data
      historyDays: 2, // 24-48h history
      dataRetention: '48 hours',
      
      // Alerts
      alertRules: 2,
      alertTypes: ['basic'],
      
      // Limitations
      hasAds: true,
      weatherLayer: false,
      advancedFilters: false,
      csvExport: false,
      prioritySupport: false,
      
      // API Limits
      apiCallsPerDay: 100,
      concurrentConnections: 1,
      
      // Export
      exportFormats: [],
      bulkExport: false
    },
    limits: {
      maxSavedFlights: 10,
      maxActiveAlerts: 2,
      maxAPIRequests: 100,
      historicalDataDays: 2
    },
    trial: null,
    popular: false,
    color: '#6B7280'
  },

  PLUS: {
    id: 'plus',
    name: 'Plus',
    price: {
      monthly: 4.99,
      yearly: 39.99 // 33% savings
    },
    stripeIds: {
      monthly: process.env.STRIPE_PREMIUM_PRICE_ID, // Your existing Vercel variable
      yearly: 'price_plus_yearly'
    },
    description: 'Enhanced tracking with more history and no ads',
    features: {
      // Everything in Free
      basicMap: true,
      realTimeFlights: true,
      basicSearch: true,
      
      // Enhanced Features
      historyDays: 30, // 30-day history
      dataRetention: '30 days',
      
      // Alerts
      alertRules: 20,
      alertTypes: ['basic', 'advanced'],
      
      // Premium Features
      hasAds: false, // Ad-free experience
      weatherLayer: true,
      advancedFilters: true,
      csvExport: false, // Still limited
      prioritySupport: false,
      
      // API Limits
      apiCallsPerDay: 1000,
      concurrentConnections: 3,
      
      // Export
      exportFormats: ['json'],
      bulkExport: false
    },
    limits: {
      maxSavedFlights: 100,
      maxActiveAlerts: 20,
      maxAPIRequests: 1000,
      historicalDataDays: 30
    },
    trial: {
      days: 7,
      trialText: '7-day free trial'
    },
    popular: true,
    color: '#3B82F6'
  },

  PRO: {
    id: 'pro',
    name: 'Pro',
    price: {
      monthly: 14.99,
      yearly: 119.99 // 33% savings
    },
    stripeIds: {
      monthly: process.env.STRIPE_PROFESSIONAL_PRICE_ID, // Your existing Vercel variable
      yearly: 'price_pro_yearly'
    },
    description: 'Advanced analytics and unlimited alerts for serious users',
    features: {
      // Everything in Plus
      basicMap: true,
      realTimeFlights: true,
      basicSearch: true,
      weatherLayer: true,
      advancedFilters: true,
      hasAds: false,
      
      // Pro Features
      historyDays: 365, // 1-year history
      dataRetention: '365 days',
      
      // Unlimited Alerts
      alertRules: -1, // Unlimited
      alertTypes: ['basic', 'advanced', 'custom'],
      
      // Advanced Features
      csvExport: true,
      prioritySupport: true,
      advancedAnalytics: true,
      customDashboard: true,
      
      // API Access
      apiCallsPerDay: 10000,
      concurrentConnections: 10,
      
      // Export
      exportFormats: ['json', 'csv', 'xml'],
      bulkExport: true
    },
    limits: {
      maxSavedFlights: 1000,
      maxActiveAlerts: -1, // Unlimited
      maxAPIRequests: 10000,
      historicalDataDays: 365
    },
    trial: {
      days: 7,
      trialText: '7-day free trial'
    },
    popular: false,
    color: '#8B5CF6'
  },

  BUSINESS: {
    id: 'business',
    name: 'Business',
    price: {
      monthly: 39.99,
      yearly: 349.99, // 26% savings
      perSeat: true
    },
    stripeIds: {
      monthly: 'price_business_monthly',
      yearly: 'price_business_yearly'
    },
    description: 'Enterprise solution with team management and SLA',
    features: {
      // Everything in Pro
      basicMap: true,
      realTimeFlights: true,
      basicSearch: true,
      weatherLayer: true,
      advancedFilters: true,
      csvExport: true,
      advancedAnalytics: true,
      customDashboard: true,
      hasAds: false,
      
      // Business Features
      historyDays: 1095, // 3-year history
      dataRetention: '3 years',
      
      // Team Features
      teamSeats: true,
      sso: true, // Single Sign-On
      userManagement: true,
      roleBasedAccess: true,
      
      // Enterprise Support
      prioritySupport: true,
      sla: '99.9% uptime SLA',
      dedicatedManager: true,
      customIntegration: true,
      
      // Unlimited Everything
      alertRules: -1,
      alertTypes: ['basic', 'advanced', 'custom', 'enterprise'],
      
      // High-Volume API
      apiCallsPerDay: 100000,
      concurrentConnections: 50,
      
      // Advanced Export
      exportFormats: ['json', 'csv', 'xml', 'parquet'],
      bulkExport: true,
      scheduledExports: true
    },
    limits: {
      maxSavedFlights: -1, // Unlimited
      maxActiveAlerts: -1, // Unlimited
      maxAPIRequests: 100000,
      historicalDataDays: 1095,
      maxTeamMembers: 50
    },
    trial: {
      days: 14,
      trialText: '14-day free trial'
    },
    popular: false,
    color: '#EF4444',
    enterprise: true
  }
};

/**
 * Billing Cycles Configuration
 */
export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

/**
 * Feature Categories for UI Display
 */
export const FEATURE_CATEGORIES = {
  CORE: {
    name: 'Core Features',
    features: [
      { key: 'basicMap', label: 'Real-time Flight Map' },
      { key: 'realTimeFlights', label: 'Live Flight Tracking' },
      { key: 'basicSearch', label: 'Flight Search' }
    ]
  },
  HISTORY: {
    name: 'Historical Data',
    features: [
      { key: 'historyDays', label: 'Flight History', format: (days) => days > 0 ? `${days} days` : 'None' },
      { key: 'dataRetention', label: 'Data Retention' }
    ]
  },
  ALERTS: {
    name: 'Alerts & Notifications',
    features: [
      { key: 'alertRules', label: 'Alert Rules', format: (count) => count === -1 ? 'Unlimited' : count },
      { key: 'alertTypes', label: 'Alert Types', format: (types) => types.length }
    ]
  },
  PREMIUM: {
    name: 'Premium Features',
    features: [
      { key: 'hasAds', label: 'Ad-free Experience', format: (hasAds) => !hasAds ? '✓' : '✗' },
      { key: 'weatherLayer', label: 'Weather Layer' },
      { key: 'advancedFilters', label: 'Advanced Filters' },
      { key: 'csvExport', label: 'Data Export' }
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise Features',
    features: [
      { key: 'teamSeats', label: 'Team Management' },
      { key: 'sso', label: 'Single Sign-On' },
      { key: 'prioritySupport', label: 'Priority Support' },
      { key: 'sla', label: 'SLA Guarantee' }
    ]
  }
};

/**
 * Competitor Analysis Reference
 */
export const COMPETITOR_COMPARISON = {
  flightradar24: {
    free: { price: 0, history: '7 days', alerts: 'Basic' },
    silver: { price: 1.99, history: '90 days', alerts: 'More filters' },
    gold: { price: 3.99, history: '365 days', alerts: 'Unlimited' },
    business: { price: 49.99, history: 'Custom', alerts: 'API Access' }
  },
  flightaware: {
    basic: { price: 0, history: 'Limited', alerts: 'Basic' },
    premium: { price: 39.95, history: '6 months', alerts: 'Unlimited' },
    enterprise: { price: 89.95, history: '2 years', alerts: 'API + Custom' }
  }
};

/**
 * Get tier by ID
 */
export function getTier(tierId) {
  return Object.values(PRICING_TIERS).find(tier => tier.id === tierId) || PRICING_TIERS.FREE;
}

/**
 * Get feature value for tier
 */
export function getFeature(tierId, featureKey) {
  const tier = getTier(tierId);
  return tier.features[featureKey];
}

/**
 * Check if tier has feature
 */
export function hasFeature(tierId, featureKey) {
  const value = getFeature(tierId, featureKey);
  return Boolean(value);
}

/**
 * Get all tiers as array
 */
export function getAllTiers() {
  return Object.values(PRICING_TIERS);
}

/**
 * Calculate savings for yearly billing
 */
export function calculateYearlySavings(tierId) {
  const tier = getTier(tierId);
  if (!tier.price.yearly || !tier.price.monthly) return 0;
  
  const monthlyTotal = tier.price.monthly * 12;
  const yearlyPrice = tier.price.yearly;
  const savings = monthlyTotal - yearlyPrice;
  const percentage = Math.round((savings / monthlyTotal) * 100);
  
  return { savings, percentage };
}

export default PRICING_TIERS;