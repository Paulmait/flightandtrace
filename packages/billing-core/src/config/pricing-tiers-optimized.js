/**
 * OPTIMIZED FlightTrace Pricing Tiers Configuration
 * Revenue-optimized pricing based on feature superiority vs competitors
 */

export const PRICING_TIERS_OPTIMIZED = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: {
      monthly: 0,
      yearly: 0
    },
    description: 'Basic flight tracking with session limits',
    features: {
      // Core Features (Limited)
      basicMap: true,
      realTimeFlights: true,
      basicSearch: true,
      sessionTimeoutMins: 30, // Key limitation
      
      // History & Data
      historyDays: 2,
      dataRetention: '48 hours',
      
      // Alerts
      alertRules: 1, // Reduced from 2
      alertTypes: ['basic'],
      
      // Major Limitations
      hasAds: true,
      weatherLayer: false,
      advancedFilters: false,
      csvExport: false,
      prioritySupport: false,
      
      // API Limits
      apiCallsPerDay: 50, // Reduced from 100
      concurrentConnections: 1,
      
      // Export
      exportFormats: [],
      bulkExport: false
    },
    limits: {
      maxSavedFlights: 5, // Reduced from 10
      maxActiveAlerts: 1,
      maxAPIRequests: 50,
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
      monthly: 4.99, // Keep entry price point
      yearly: 39.99 // 33% savings
    },
    stripeIds: {
      monthly: process.env.STRIPE_PREMIUM_PRICE_ID, // Your existing
      yearly: 'price_plus_yearly_new'
    },
    description: 'Ad-free tracking with unlimited session time',
    features: {
      // Everything in Free
      basicMap: true,
      realTimeFlights: true,
      basicSearch: true,
      sessionTimeoutMins: -1, // UNLIMITED - Key upgrade driver
      
      // Enhanced Features
      historyDays: 30,
      dataRetention: '30 days',
      
      // Alerts
      alertRules: 10, // Reduced from 20
      alertTypes: ['basic', 'advanced'],
      
      // Premium Features
      hasAds: false, // Major upgrade benefit
      weatherLayer: true,
      advancedFilters: true,
      csvExport: false, // Still limited
      prioritySupport: false,
      
      // API Limits
      apiCallsPerDay: 500, // Reduced from 1000
      concurrentConnections: 3,
      
      // Export
      exportFormats: ['json'],
      bulkExport: false
    },
    limits: {
      maxSavedFlights: 50, // Reduced from 100
      maxActiveAlerts: 10,
      maxAPIRequests: 500,
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
      monthly: 24.99, // ⬆️ INCREASED from $14.99 (67% increase)
      yearly: 199.99 // 33% savings, was $119.99
    },
    stripeIds: {
      monthly: 'price_pro_monthly_new', // New price needed
      yearly: 'price_pro_yearly_new'
    },
    description: 'Advanced analytics, unlimited everything, 365-day history',
    features: {
      // Everything in Plus
      basicMap: true,
      realTimeFlights: true,
      basicSearch: true,
      weatherLayer: true,
      advancedFilters: true,
      hasAds: false,
      sessionTimeoutMins: -1,
      
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
      oocEstimates: true, // Out of coverage estimates
      
      // API Access
      apiCallsPerDay: 10000,
      concurrentConnections: 10,
      
      // Export
      exportFormats: ['json', 'csv', 'xml'],
      bulkExport: true
    },
    limits: {
      maxSavedFlights: -1, // Unlimited
      maxActiveAlerts: -1,
      maxAPIRequests: 10000,
      historicalDataDays: 365
    },
    trial: {
      days: 14, // Longer trial for higher price
      trialText: '14-day free trial'
    },
    popular: false,
    color: '#8B5CF6'
  },

  BUSINESS: {
    id: 'business',
    name: 'Business',
    price: {
      monthly: 89.99, // ⬆️ INCREASED from $39.99 (125% increase)
      yearly: 799.99, // 26% savings, was $349.99
      perSeat: false // Flat rate, not per seat
    },
    stripeIds: {
      monthly: 'price_business_monthly_new', // New price needed
      yearly: 'price_business_yearly_new'
    },
    description: 'Team solution with 3-year history and priority support',
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
      sessionTimeoutMins: -1,
      oocEstimates: true,
      
      // Business Features
      historyDays: 1095, // 3-year history
      dataRetention: '3 years',
      
      // Team Features
      teamSeats: 10, // Up to 10 seats included
      sso: false, // Reserved for Enterprise
      userManagement: true,
      roleBasedAccess: true,
      
      // Business Support
      prioritySupport: true,
      sla: '99.5% uptime SLA',
      phoneSupport: true,
      
      // Unlimited Everything
      alertRules: -1,
      alertTypes: ['basic', 'advanced', 'custom', 'business'],
      
      // High-Volume API
      apiCallsPerDay: 50000,
      concurrentConnections: 25,
      
      // Advanced Export
      exportFormats: ['json', 'csv', 'xml', 'parquet'],
      bulkExport: true,
      scheduledExports: true
    },
    limits: {
      maxSavedFlights: -1,
      maxActiveAlerts: -1,
      maxAPIRequests: 50000,
      historicalDataDays: 1095,
      maxTeamMembers: 10
    },
    trial: {
      days: 14,
      trialText: '14-day free trial'
    },
    popular: false,
    color: '#EF4444'
  },

  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: {
      monthly: 249.99, // ⬆️ NEW TIER
      yearly: 2399.99, // 20% savings
      perSeat: true, // Per seat pricing (max 25 seats)
      customPricing: true
    },
    stripeIds: {
      monthly: 'price_enterprise_monthly_new',
      yearly: 'price_enterprise_yearly_new'
    },
    description: 'Complete enterprise solution with SSO, unlimited history, and dedicated support',
    features: {
      // Everything in Business
      basicMap: true,
      realTimeFlights: true,
      basicSearch: true,
      weatherLayer: true,
      advancedFilters: true,
      csvExport: true,
      advancedAnalytics: true,
      customDashboard: true,
      hasAds: false,
      sessionTimeoutMins: -1,
      oocEstimates: true,
      userManagement: true,
      roleBasedAccess: true,
      phoneSupport: true,
      
      // Enterprise Features
      historyDays: -1, // Unlimited history
      dataRetention: 'Unlimited',
      
      // Enterprise Team
      teamSeats: 25, // Limited to 25 seats maximum
      sso: true, // SSO integration
      ldapIntegration: true,
      
      // Enterprise Support
      prioritySupport: true,
      sla: '99.9% uptime SLA',
      dedicatedManager: true,
      customIntegration: true,
      onPremiseOption: true,
      
      // Unlimited Everything
      alertRules: -1,
      alertTypes: ['basic', 'advanced', 'custom', 'enterprise'],
      
      // Enterprise API
      apiCallsPerDay: -1, // Unlimited
      concurrentConnections: -1, // Unlimited
      
      // Enterprise Export
      exportFormats: ['json', 'csv', 'xml', 'parquet', 'custom'],
      bulkExport: true,
      scheduledExports: true,
      realtimeStreaming: true
    },
    limits: {
      maxSavedFlights: -1,
      maxActiveAlerts: -1,
      maxAPIRequests: -1,
      historicalDataDays: -1,
      maxTeamMembers: 25 // Limited to 25 team members
    },
    trial: {
      days: 30, // Extended trial for enterprise
      trialText: '30-day free trial'
    },
    popular: false,
    color: '#1F2937',
    enterprise: true
  }
};

/**
 * Updated Competitor Comparison with New Pricing
 */
export const COMPETITOR_COMPARISON_UPDATED = {
  flighttrace: {
    plus: { price: 4.99, history: '30 days', alerts: '10 rules', ads: false },
    pro: { price: 24.99, history: '365 days', alerts: 'Unlimited', advanced: true },
    business: { price: 89.99, history: '3 years', team: '10 seats', sla: true },
    enterprise: { price: 249.99, history: 'Unlimited', sso: true, dedicated: true }
  },
  flightradar24: {
    silver: { price: 3.99, history: '90 days', alerts: 'Basic' },
    gold: { price: 7.99, history: '365 days', alerts: 'Unlimited' },
    business: { price: 49.99, history: 'Custom', api: true }
  },
  flightaware: {
    basic: { price: 39.95, history: '6 months', alerts: 'Basic' },
    premium: { price: 89.95, history: '2 years', alerts: 'Unlimited' },
    enterprise: { price: 199.95, history: '5 years', api: true }
  }
};

/**
 * Revenue Impact Analysis
 */
export const REVENUE_ANALYSIS = {
  currentMonthly: {
    plus: 4.99,
    pro: 14.99,
    business: 39.99,
    total: 59.97
  },
  optimizedMonthly: {
    plus: 4.99,    // Same
    pro: 24.99,    // +$10.00 (67% increase)
    business: 89.99, // +$50.00 (125% increase)
    enterprise: 249.99, // +$249.99 (new)
    total: 369.96
  },
  revenueIncrease: {
    percentage: 517, // 517% increase in potential revenue
    additionalPerCustomer: 309.99, // $309.99 more per full customer set
    proIncreaseOnly: 10.00, // Just Pro increase = +$10/month per Pro user
    businessIncreaseOnly: 50.00 // Just Business increase = +$50/month per Business user
  }
};

export default PRICING_TIERS_OPTIMIZED;