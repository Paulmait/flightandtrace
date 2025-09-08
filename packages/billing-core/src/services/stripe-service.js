/**
 * Stripe Service for FlightTrace Subscriptions
 * Handles subscription management, webhooks, and billing
 */

import { PRICING_TIERS, BILLING_CYCLES } from '../config/pricing-tiers.js';

class StripeService {
  constructor(stripeSecretKey) {
    this.stripe = null;
    this.webhookSecret = process.env.FLIGHTTRACE_STRIPE_WEBHOOK_SECRET;
    
    // Initialize Stripe in environment that supports it
    if (typeof window === 'undefined') {
      // Server-side
      const Stripe = require('stripe');
      this.stripe = new Stripe(stripeSecretKey);
    }
  }

  /**
   * Create Stripe Products and Prices
   * Run this once to set up your Stripe catalog
   */
  async createStripeProducts() {
    if (!this.stripe) {
      throw new Error('Stripe not initialized - server-side only');
    }

    const products = {};

    for (const [tierKey, tier] of Object.entries(PRICING_TIERS)) {
      if (tier.id === 'free') continue; // Skip free tier

      try {
        // Create product
        const product = await this.stripe.products.create({
          id: `flighttrace_${tier.id}`,
          name: `FlightTrace ${tier.name}`,
          description: tier.description,
          metadata: {
            tier: tier.id,
            features: JSON.stringify(Object.keys(tier.features).filter(key => tier.features[key]))
          }
        });

        products[tier.id] = { product, prices: {} };

        // Create monthly price
        if (tier.price.monthly) {
          const monthlyPrice = await this.stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(tier.price.monthly * 100), // Convert to cents
            currency: 'usd',
            recurring: {
              interval: 'month'
            },
            nickname: `${tier.name} Monthly`,
            metadata: {
              tier: tier.id,
              billing_cycle: 'monthly'
            }
          });

          products[tier.id].prices.monthly = monthlyPrice;
        }

        // Create yearly price
        if (tier.price.yearly) {
          const yearlyPrice = await this.stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(tier.price.yearly * 100), // Convert to cents
            currency: 'usd',
            recurring: {
              interval: 'year'
            },
            nickname: `${tier.name} Yearly`,
            metadata: {
              tier: tier.id,
              billing_cycle: 'yearly'
            }
          });

          products[tier.id].prices.yearly = yearlyPrice;
        }

        console.log(`✅ Created Stripe product for ${tier.name}`);

      } catch (error) {
        console.error(`❌ Error creating product for ${tier.name}:`, error.message);
      }
    }

    return products;
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession({ 
    priceId, 
    userId, 
    userEmail, 
    successUrl, 
    cancelUrl,
    trialDays = null 
  }) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized - server-side only');
    }

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: userEmail,
      metadata: {
        userId: userId
      },
      subscription_data: {
        metadata: {
          userId: userId
        }
      }
    };

    // Add trial if specified
    if (trialDays && trialDays > 0) {
      sessionParams.subscription_data.trial_period_days = trialDays;
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    return session;
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(customerId, returnUrl) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized - server-side only');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized - server-side only');
    }

    if (cancelAtPeriodEnd) {
      // Cancel at period end
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      return subscription;
    } else {
      // Cancel immediately
      const subscription = await this.stripe.subscriptions.del(subscriptionId);
      return subscription;
    }
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized - server-side only');
    }

    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });
    return subscription;
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId, newPriceId) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized - server-side only');
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
    });

    return updatedSubscription;
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(payload, signature) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized - server-side only');
    }

    let event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }

    const handlers = {
      'checkout.session.completed': this.handleCheckoutCompleted.bind(this),
      'customer.subscription.created': this.handleSubscriptionCreated.bind(this),
      'customer.subscription.updated': this.handleSubscriptionUpdated.bind(this),
      'customer.subscription.deleted': this.handleSubscriptionDeleted.bind(this),
      'invoice.payment_succeeded': this.handlePaymentSucceeded.bind(this),
      'invoice.payment_failed': this.handlePaymentFailed.bind(this),
    };

    const handler = handlers[event.type];
    if (handler) {
      await handler(event.data.object);
    } else {
      console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { received: true, type: event.type };
  }

  /**
   * Webhook Handlers
   */
  async handleCheckoutCompleted(session) {
    console.log('Checkout completed:', session.id);
    
    // Extract user ID and subscription details
    const userId = session.client_reference_id;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    return {
      userId,
      customerId,
      subscriptionId,
      action: 'subscription_started'
    };
  }

  async handleSubscriptionCreated(subscription) {
    console.log('Subscription created:', subscription.id);
    
    const priceId = subscription.items.data[0].price.id;
    const customerId = subscription.customer;
    
    // Determine tier from price metadata
    const price = await this.stripe.prices.retrieve(priceId);
    const tier = price.metadata.tier;
    const billingCycle = price.metadata.billing_cycle;

    return {
      customerId,
      subscriptionId: subscription.id,
      tier,
      billingCycle,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      action: 'subscription_created'
    };
  }

  async handleSubscriptionUpdated(subscription) {
    console.log('Subscription updated:', subscription.id);
    
    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      action: 'subscription_updated'
    };
  }

  async handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);
    
    return {
      subscriptionId: subscription.id,
      action: 'subscription_cancelled'
    };
  }

  async handlePaymentSucceeded(invoice) {
    console.log('Payment succeeded:', invoice.id);
    
    return {
      subscriptionId: invoice.subscription,
      amountPaid: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      action: 'payment_succeeded'
    };
  }

  async handlePaymentFailed(invoice) {
    console.log('Payment failed:', invoice.id);
    
    return {
      subscriptionId: invoice.subscription,
      attemptCount: invoice.attempt_count,
      action: 'payment_failed'
    };
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized - server-side only');
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const price = await this.stripe.prices.retrieve(subscription.items.data[0].price.id);
    
    return {
      id: subscription.id,
      status: subscription.status,
      tier: price.metadata.tier,
      billingCycle: price.metadata.billing_cycle,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    };
  }
}

export default StripeService;