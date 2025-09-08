/**
 * Stripe Webhook Handler for FlightTrace Subscriptions
 * Handles subscription lifecycle events and updates user records
 */

const StripeService = require('../../../packages/billing-core/src/services/stripe-service');
const { supabaseHelpers } = require('../../../frontend/src/lib/supabase');
const { getConfig } = require('../../../config/environment-mapping');

const stripeConfig = getConfig('stripe');
const stripeService = new StripeService(stripeConfig.secretKey);

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'];
  const payload = req.body;

  try {
    // Verify and handle webhook
    const result = await stripeService.handleWebhook(payload, signature);
    
    // Process the webhook result
    await processWebhookResult(result);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Process webhook result and update user records
 */
async function processWebhookResult(result) {
  const handlers = {
    subscription_started: handleSubscriptionStarted,
    subscription_created: handleSubscriptionCreated,
    subscription_updated: handleSubscriptionUpdated,
    subscription_cancelled: handleSubscriptionCancelled,
    payment_succeeded: handlePaymentSucceeded,
    payment_failed: handlePaymentFailed
  };

  const handler = handlers[result.action];
  if (handler) {
    await handler(result);
  }
}

/**
 * Webhook Event Handlers
 */
async function handleSubscriptionStarted(data) {
  const { userId, customerId, subscriptionId } = data;
  
  try {
    // Get full subscription details
    const subscription = await stripeService.getSubscription(subscriptionId);
    
    // Update user subscription in Supabase
    await supabaseHelpers.updateProfile(userId, {
      stripe_customer_id: customerId,
      subscription_tier: subscription.tier,
      subscription_status: subscription.status,
      subscription_id: subscriptionId,
      billing_cycle: subscription.billingCycle,
      current_period_start: subscription.currentPeriodStart,
      current_period_end: subscription.currentPeriodEnd,
      updated_at: new Date().toISOString()
    });

    console.log(`✅ User ${userId} subscription started: ${subscription.tier}`);
  } catch (error) {
    console.error('Error handling subscription started:', error);
  }
}

async function handleSubscriptionCreated(data) {
  const { customerId, subscriptionId, tier, billingCycle, status, currentPeriodStart, currentPeriodEnd } = data;
  
  try {
    // Find user by customer ID (you may need to implement this lookup)
    const userId = await getUserIdByCustomerId(customerId);
    
    if (userId) {
      await supabaseHelpers.updateProfile(userId, {
        subscription_tier: tier,
        subscription_status: status,
        subscription_id: subscriptionId,
        billing_cycle: billingCycle,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      });
    }

    console.log(`✅ Subscription created: ${subscriptionId} for tier ${tier}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(data) {
  const { subscriptionId, status, cancelAtPeriodEnd, currentPeriodEnd } = data;
  
  try {
    const userId = await getUserIdBySubscriptionId(subscriptionId);
    
    if (userId) {
      const updates = {
        subscription_status: status,
        cancel_at_period_end: cancelAtPeriodEnd,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      };

      // If subscription is being cancelled, note when it ends
      if (cancelAtPeriodEnd) {
        updates.cancellation_date = currentPeriodEnd;
      }

      await supabaseHelpers.updateProfile(userId, updates);
    }

    console.log(`✅ Subscription updated: ${subscriptionId} - ${status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCancelled(data) {
  const { subscriptionId } = data;
  
  try {
    const userId = await getUserIdBySubscriptionId(subscriptionId);
    
    if (userId) {
      await supabaseHelpers.updateProfile(userId, {
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        subscription_id: null,
        cancellation_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    console.log(`✅ Subscription cancelled: ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

async function handlePaymentSucceeded(data) {
  const { subscriptionId, amountPaid, currency } = data;
  
  try {
    const userId = await getUserIdBySubscriptionId(subscriptionId);
    
    if (userId) {
      // Log successful payment (you might want to track this)
      console.log(`💳 Payment succeeded: ${amountPaid} ${currency.toUpperCase()} for user ${userId}`);
      
      // Update last payment date
      await supabaseHelpers.updateProfile(userId, {
        last_payment_date: new Date().toISOString(),
        last_payment_amount: amountPaid,
        updated_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(data) {
  const { subscriptionId, attemptCount } = data;
  
  try {
    const userId = await getUserIdBySubscriptionId(subscriptionId);
    
    if (userId) {
      console.log(`❌ Payment failed: Attempt ${attemptCount} for user ${userId}`);
      
      // Update payment failure info
      await supabaseHelpers.updateProfile(userId, {
        payment_failed_at: new Date().toISOString(),
        payment_attempt_count: attemptCount,
        updated_at: new Date().toISOString()
      });

      // If it's the final attempt, you might want to send an email or take action
      if (attemptCount >= 4) {
        console.log(`🚨 Final payment attempt failed for user ${userId}`);
        // TODO: Send email notification, downgrade to free tier, etc.
      }
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

/**
 * Helper functions to find users
 */
async function getUserIdByCustomerId(customerId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    return error ? null : data?.id;
  } catch (error) {
    console.error('Error finding user by customer ID:', error);
    return null;
  }
}

async function getUserIdBySubscriptionId(subscriptionId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .single();
    
    return error ? null : data?.id;
  } catch (error) {
    console.error('Error finding user by subscription ID:', error);
    return null;
  }
}