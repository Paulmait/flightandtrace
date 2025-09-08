/**
 * Create Stripe Checkout Session for FlightTrace Subscriptions
 */

const StripeService = require('../../../packages/billing-core/src/services/stripe-service');
const { PRICING_TIERS, getTier } = require('../../../packages/billing-core/src/config/pricing-tiers');
const { getConfig } = require('../../../config/environment-mapping');

const stripeConfig = getConfig('stripe');
const stripeService = new StripeService(stripeConfig.secretKey);

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tierId, billingCycle, userId, userEmail } = req.body;

  // Validate input
  if (!tierId || !billingCycle || !userId || !userEmail) {
    return res.status(400).json({ 
      error: 'Missing required fields: tierId, billingCycle, userId, userEmail' 
    });
  }

  // Get tier configuration
  const tier = getTier(tierId);
  if (!tier || tier.id === 'free') {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  // Validate billing cycle
  if (!['monthly', 'yearly'].includes(billingCycle)) {
    return res.status(400).json({ error: 'Invalid billing cycle' });
  }

  try {
    // Get the correct Stripe price ID
    const priceId = tier.stripeIds?.[billingCycle];
    if (!priceId) {
      return res.status(400).json({ 
        error: `No Stripe price ID configured for ${tier.name} ${billingCycle}` 
      });
    }

    // Create checkout session
    const session = await stripeService.createCheckoutSession({
      priceId,
      userId,
      userEmail,
      successUrl: `${process.env.REACT_APP_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.REACT_APP_APP_URL}/pricing`,
      trialDays: tier.trial?.days || 0
    });

    res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};