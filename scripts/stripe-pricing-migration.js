#!/usr/bin/env node
/**
 * Stripe Pricing Migration Script
 * Creates new optimized price IDs and products
 */

const Stripe = require('stripe');

// You'll need to run this with your actual Stripe secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const NEW_PRICING_STRATEGY = {
  plus: {
    name: 'FlightTrace Plus',
    monthly: 4.99,  // Keep same
    yearly: 39.99   // Keep same
  },
  pro: {
    name: 'FlightTrace Pro',
    monthly: 24.99, // INCREASE from $14.99 (+67%)
    yearly: 199.99  // INCREASE from $119.99 (+67%)
  },
  business: {
    name: 'FlightTrace Business',
    monthly: 89.99, // INCREASE from $39.99 (+125%)
    yearly: 799.99  // INCREASE from $349.99 (+129%)
  },
  enterprise: {
    name: 'FlightTrace Enterprise',
    monthly: 249.99, // NEW TIER
    yearly: 2399.99  // NEW TIER
  }
};

async function createNewPricing() {
  console.log('🚀 Creating optimized Stripe pricing...\n');

  const results = {
    products: {},
    prices: {},
    existingToKeep: {},
    newEnvironmentVariables: {}
  };

  for (const [tier, config] of Object.entries(NEW_PRICING_STRATEGY)) {
    console.log(`📦 Creating product for ${config.name}...`);

    try {
      // Create product
      const product = await stripe.products.create({
        id: `flighttrace_${tier}`,
        name: config.name,
        description: getProductDescription(tier),
        metadata: {
          tier: tier,
          features: JSON.stringify(getTierFeatures(tier))
        }
      });

      results.products[tier] = product;
      console.log(`   ✅ Product created: ${product.id}`);

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(config.monthly * 100),
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        nickname: `${config.name} Monthly`,
        metadata: {
          tier: tier,
          billing_cycle: 'monthly'
        }
      });

      results.prices[`${tier}_monthly`] = monthlyPrice;
      console.log(`   ✅ Monthly price created: ${monthlyPrice.id} ($${config.monthly})`);

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(config.yearly * 100),
        currency: 'usd',
        recurring: {
          interval: 'year'
        },
        nickname: `${config.name} Yearly`,
        metadata: {
          tier: tier,
          billing_cycle: 'yearly'
        }
      });

      results.prices[`${tier}_yearly`] = yearlyPrice;
      
      const monthlyCost = config.monthly * 12;
      const savings = monthlyCost - config.yearly;
      const savingsPercent = Math.round((savings / monthlyCost) * 100);
      
      console.log(`   ✅ Yearly price created: ${yearlyPrice.id} ($${config.yearly})`);
      console.log(`   💰 Yearly savings: $${savings.toFixed(2)} (${savingsPercent}%)\n`);

      // Map to environment variables
      results.newEnvironmentVariables[`STRIPE_${tier.toUpperCase()}_MONTHLY`] = monthlyPrice.id;
      results.newEnvironmentVariables[`STRIPE_${tier.toUpperCase()}_YEARLY`] = yearlyPrice.id;

    } catch (error) {
      console.error(`❌ Error creating ${tier}:`, error.message);
    }
  }

  // Note existing prices to keep
  results.existingToKeep = {
    STRIPE_PREMIUM_PRICE_ID: 'Keep for existing Plus monthly customers',
    STRIPE_PROFESSIONAL_PRICE_ID: 'Keep for existing Pro monthly customers (grandfathered)',
    FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY: 'Keep unchanged',
    FLIGHTTRACE_STRIPE_WEBHOOK_SECRET: 'Keep unchanged'
  };

  return results;
}

function getProductDescription(tier) {
  const descriptions = {
    plus: 'Ad-free flight tracking with unlimited session time and 30-day history',
    pro: 'Advanced analytics, unlimited alerts, and 365-day flight history for power users',
    business: 'Team solution with 3-year history, priority support, and business features',
    enterprise: 'Complete enterprise solution with SSO, unlimited history, and dedicated support'
  };
  return descriptions[tier] || '';
}

function getTierFeatures(tier) {
  const features = {
    plus: ['ad_free', 'unlimited_session', '30_day_history', 'weather_layer'],
    pro: ['unlimited_alerts', '365_day_history', 'advanced_analytics', 'csv_export', 'ooc_estimates'],
    business: ['team_management', '3_year_history', 'priority_support', 'sla', 'phone_support'],
    enterprise: ['sso', 'unlimited_history', 'dedicated_manager', 'custom_integration', 'on_premise']
  };
  return features[tier] || [];
}

// Revenue analysis function
function analyzeRevenueImpact() {
  console.log('\n📊 REVENUE IMPACT ANALYSIS');
  console.log('==========================\n');

  const current = {
    plus: 4.99,
    pro: 14.99,
    business: 39.99
  };

  const optimized = {
    plus: 4.99,      // Same
    pro: 24.99,      // +$10.00 (+67%)
    business: 89.99, // +$50.00 (+125%)
    enterprise: 249.99 // New tier
  };

  console.log('💰 PER-CUSTOMER REVENUE INCREASE:');
  console.log(`   Pro users: +$${(optimized.pro - current.pro).toFixed(2)}/month (${Math.round((optimized.pro - current.pro) / current.pro * 100)}% increase)`);
  console.log(`   Business users: +$${(optimized.business - current.business).toFixed(2)}/month (${Math.round((optimized.business - current.business) / current.business * 100)}% increase)`);
  console.log(`   New Enterprise tier: +$${optimized.enterprise}/month (completely new revenue stream)\n`);

  console.log('📈 EXAMPLE REVENUE SCENARIOS:');
  console.log('   With 100 Pro users:');
  console.log(`     Current: $${(current.pro * 100).toLocaleString()}/month`);
  console.log(`     Optimized: $${(optimized.pro * 100).toLocaleString()}/month`);
  console.log(`     Increase: +$${((optimized.pro - current.pro) * 100).toLocaleString()}/month\n`);

  console.log('   With 50 Business users:');
  console.log(`     Current: $${(current.business * 50).toLocaleString()}/month`);
  console.log(`     Optimized: $${(optimized.business * 50).toLocaleString()}/month`);
  console.log(`     Increase: +$${((optimized.business - current.business) * 50).toLocaleString()}/month\n`);

  console.log('   With 10 Enterprise users (new):');
  console.log(`     New Revenue: +$${(optimized.enterprise * 10).toLocaleString()}/month\n`);

  console.log('🏆 COMPETITIVE POSITIONING:');
  console.log('   Plus $4.99 vs FlightRadar24 Silver $3.99 → Premium positioning');
  console.log('   Pro $24.99 vs FlightAware Basic $39.95 → Better value');
  console.log('   Business $89.99 vs FlightAware Premium $89.95 → Competitive');
  console.log('   Enterprise $249.99 vs FlightAware Enterprise $199.95 → Premium for premium features\n');
}

// Main execution
async function main() {
  console.log('💡 FLIGHTTRACE PRICING OPTIMIZATION');
  console.log('====================================\n');

  console.log('🎯 STRATEGY: Revenue optimization based on feature superiority\n');

  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('⚠️  To create actual Stripe products, set STRIPE_SECRET_KEY environment variable');
    console.log('   For now, showing what would be created...\n');
    
    analyzeRevenueImpact();
    showImplementationGuide();
    return;
  }

  try {
    const results = await createNewPricing();
    
    console.log('\n✅ SUCCESS! New Stripe pricing created.');
    console.log('\n🔧 NEW ENVIRONMENT VARIABLES TO ADD TO VERCEL:');
    console.log('==============================================');
    
    for (const [key, value] of Object.entries(results.newEnvironmentVariables)) {
      console.log(`${key}=${value}`);
    }

    console.log('\n📋 EXISTING VARIABLES TO KEEP:');
    console.log('==============================');
    for (const [key, note] of Object.entries(results.existingToKeep)) {
      console.log(`${key} - ${note}`);
    }

    analyzeRevenueImpact();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function showImplementationGuide() {
  console.log('\n📋 IMPLEMENTATION GUIDE');
  console.log('=======================\n');

  console.log('1️⃣ CREATE IN STRIPE DASHBOARD:');
  console.log('   → Products & Prices section');
  console.log('   → Create each product with monthly/yearly prices');
  console.log('   → Copy the price IDs for environment variables\n');

  console.log('2️⃣ ADD TO VERCEL ENVIRONMENT VARIABLES:');
  console.log('   STRIPE_PRO_MONTHLY_NEW=price_xxxxx');
  console.log('   STRIPE_PRO_YEARLY_NEW=price_xxxxx');
  console.log('   STRIPE_BUSINESS_MONTHLY_NEW=price_xxxxx');
  console.log('   STRIPE_BUSINESS_YEARLY_NEW=price_xxxxx');
  console.log('   STRIPE_ENTERPRISE_MONTHLY_NEW=price_xxxxx');
  console.log('   STRIPE_ENTERPRISE_YEARLY_NEW=price_xxxxx\n');

  console.log('3️⃣ GRADUAL MIGRATION STRATEGY:');
  console.log('   → Keep existing prices for current customers (grandfathered)');
  console.log('   → Use new prices for new signups');
  console.log('   → Offer migration incentives for existing customers\n');

  console.log('4️⃣ UPDATE PRICING PAGE:');
  console.log('   → Update pricing-tiers.js to use new prices');
  console.log('   → Add value-focused messaging');
  console.log('   → Highlight competitive advantages\n');

  console.log('5️⃣ RECOMMENDED ROLLOUT:');
  console.log('   Week 1: Create new Stripe products');
  console.log('   Week 2: A/B test new pricing with 25% of traffic');
  console.log('   Week 3: Monitor conversion rates and adjust');
  console.log('   Week 4: Full rollout if metrics are positive\n');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createNewPricing, analyzeRevenueImpact };