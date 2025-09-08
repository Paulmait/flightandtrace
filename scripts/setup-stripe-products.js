#!/usr/bin/env node
/**
 * Setup Stripe Products and Prices for FlightTrace
 * Run this script to create products in your Stripe dashboard
 */

require('dotenv').config();
const StripeService = require('../packages/billing-core/src/services/stripe-service');
const { PRICING_TIERS } = require('../packages/billing-core/src/config/pricing-tiers');

const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY);

async function main() {
  console.log('🚀 Setting up FlightTrace Stripe Products...');
  console.log('=====================================');

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY environment variable not set');
    console.log('Set your Stripe secret key in .env file');
    process.exit(1);
  }

  try {
    const products = await stripeService.createStripeProducts();
    
    console.log('\n✅ Successfully created Stripe products!');
    console.log('\n📋 Product Summary:');
    console.log('===================');
    
    for (const [tierId, tierData] of Object.entries(products)) {
      const tier = PRICING_TIERS[tierId.toUpperCase()];
      
      console.log(`\n${tier.name} (${tierId}):`);
      console.log(`  Product ID: ${tierData.product.id}`);
      
      if (tierData.prices.monthly) {
        console.log(`  Monthly Price ID: ${tierData.prices.monthly.id}`);
        console.log(`  Monthly Amount: $${tier.price.monthly}/month`);
      }
      
      if (tierData.prices.yearly) {
        console.log(`  Yearly Price ID: ${tierData.prices.yearly.id}`);
        console.log(`  Yearly Amount: $${tier.price.yearly}/year`);
      }
    }

    console.log('\n🔧 Environment Variables to Update:');
    console.log('===================================');
    console.log('Add these to your .env and Vercel environment variables:');
    console.log('');

    for (const [tierId, tierData] of Object.entries(products)) {
      if (tierData.prices.monthly) {
        console.log(`STRIPE_PRICE_${tierId.toUpperCase()}_MONTHLY=${tierData.prices.monthly.id}`);
      }
      if (tierData.prices.yearly) {
        console.log(`STRIPE_PRICE_${tierId.toUpperCase()}_YEARLY=${tierData.prices.yearly.id}`);
      }
    }

    console.log('\n📝 Next Steps:');
    console.log('==============');
    console.log('1. Copy the price IDs above to your environment variables');
    console.log('2. Update your pricing-tiers.js config with the correct Stripe IDs');
    console.log('3. Set up webhook endpoint in Stripe Dashboard:');
    console.log('   https://dashboard.stripe.com/webhooks');
    console.log('   Endpoint URL: https://your-domain.com/api/subscription/webhook');
    console.log('   Events to select:');
    console.log('   - checkout.session.completed');
    console.log('   - customer.subscription.created');
    console.log('   - customer.subscription.updated');
    console.log('   - customer.subscription.deleted');
    console.log('   - invoice.payment_succeeded');
    console.log('   - invoice.payment_failed');
    console.log('4. Test your integration with Stripe test cards');

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error.message);
    
    if (error.message.includes('No such product')) {
      console.log('\n💡 This might mean products already exist.');
      console.log('Check your Stripe Dashboard or delete existing products first.');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;