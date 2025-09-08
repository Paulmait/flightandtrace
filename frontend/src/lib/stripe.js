/**
 * Stripe Client Configuration for FlightTrace
 * Uses your existing Vercel environment variables
 */

import { loadStripe } from '@stripe/stripe-js';

// Use your existing Vercel environment variable
const stripePublishableKey = process.env.REACT_APP_FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY || 
                             process.env.FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('⚠️ Stripe publishable key not found in environment variables');
}

// Initialize Stripe
const stripePromise = loadStripe(stripePublishableKey);

export default stripePromise;

/**
 * Stripe Configuration Helper
 */
export const stripeConfig = {
  publishableKey: stripePublishableKey,
  
  // Price IDs from your Vercel environment
  priceIds: {
    premium: process.env.REACT_APP_STRIPE_PREMIUM_PRICE_ID,
    professional: process.env.REACT_APP_STRIPE_PROFESSIONAL_PRICE_ID,
    
    // Additional price IDs (when you add them to Vercel)
    plusMonthly: process.env.REACT_APP_STRIPE_PLUS_MONTHLY,
    plusYearly: process.env.REACT_APP_STRIPE_PLUS_YEARLY,
    proMonthly: process.env.REACT_APP_STRIPE_PRO_MONTHLY,
    proYearly: process.env.REACT_APP_STRIPE_PRO_YEARLY,
    businessMonthly: process.env.REACT_APP_STRIPE_BUSINESS_MONTHLY,
    businessYearly: process.env.REACT_APP_STRIPE_BUSINESS_YEARLY
  },
  
  // Application URLs
  successUrl: `${process.env.REACT_APP_APP_URL}/subscription/success`,
  cancelUrl: `${process.env.REACT_APP_APP_URL}/pricing`
};

/**
 * Get price ID for a specific tier and billing cycle
 */
export function getPriceId(tier, cycle = 'monthly') {
  const mapping = {
    // Map your existing variables to the new tier structure
    plus: {
      monthly: stripeConfig.priceIds.premium, // Using your existing STRIPE_PREMIUM_PRICE_ID
      yearly: stripeConfig.priceIds.plusYearly
    },
    pro: {
      monthly: stripeConfig.priceIds.professional, // Using your existing STRIPE_PROFESSIONAL_PRICE_ID
      yearly: stripeConfig.priceIds.proYearly
    },
    business: {
      monthly: stripeConfig.priceIds.businessMonthly,
      yearly: stripeConfig.priceIds.businessYearly
    }
  };

  return mapping[tier]?.[cycle];
}

/**
 * Validate Stripe configuration
 */
export function validateStripeConfig() {
  const issues = [];
  
  if (!stripePublishableKey) {
    issues.push('Missing FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY');
  }
  
  if (!stripeConfig.priceIds.premium) {
    issues.push('Missing STRIPE_PREMIUM_PRICE_ID');
  }
  
  if (!stripeConfig.priceIds.professional) {
    issues.push('Missing STRIPE_PROFESSIONAL_PRICE_ID');
  }
  
  if (issues.length > 0) {
    console.warn('⚠️ Stripe configuration issues:', issues);
    return false;
  }
  
  console.log('✅ Stripe configuration validated');
  return true;
}