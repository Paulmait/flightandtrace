# 💳 FlightTrace Stripe Subscription System

## 🎯 Competitor-Informed Pricing Strategy

Our pricing is strategically positioned against market leaders:

### **Market Analysis**
- **Flightradar24**: $0 (ads) → $3.99/mo (Gold) → $49.99/mo (Business)
- **FlightAware**: $0 (limited) → $39.95/mo (Premium) → $89.95/mo (Enterprise)
- **FlightTrace**: $0 (ads) → $4.99/mo (Plus) → $14.99/mo (Pro) → $39.99/mo (Business)

### **Our Competitive Advantage**
1. **Plus Tier ($4.99)**: Matches FR24 pricing but with better API access
2. **Pro Tier ($14.99)**: 62% cheaper than FlightAware Premium with more features
3. **Business Tier ($39.99)**: 55% cheaper than FlightAware Enterprise with team features

---

## 📊 Pricing Tiers Overview

### **Free Tier**
- Real-time flight tracking
- 24-48h flight history
- 2 alert rules
- Includes ads
- Perfect for casual users

### **Plus Tier - $4.99/mo or $39.99/yr** ⭐ Most Popular
- Ad-free experience
- 30-day flight history
- 20 alert rules
- Weather overlay
- Advanced filters
- 7-day free trial

### **Pro Tier - $14.99/mo or $119.99/yr**
- Everything in Plus
- 365-day flight history
- Unlimited alert rules
- 10,000 API calls/day
- CSV & XML export
- Priority support
- 7-day free trial

### **Business Tier - $39.99/mo or $349.99/yr**
- Everything in Pro
- 3-year flight history
- Team management & SSO
- Unlimited API access
- All export formats
- 99.9% SLA
- Dedicated support
- 14-day free trial

---

## 🛠️ Implementation Components

### **1. Pricing Configuration**
```javascript
// packages/billing-core/src/config/pricing-tiers.js
export const PRICING_TIERS = {
  FREE: { /* Basic features */ },
  PLUS: { /* $4.99/mo - Ad-free with weather */ },
  PRO: { /* $14.99/mo - Unlimited alerts + export */ },
  BUSINESS: { /* $39.99/mo - Enterprise features */ }
};
```

### **2. Stripe Integration**
- **Products**: Automatically created for each tier
- **Prices**: Monthly and yearly billing cycles
- **Webhooks**: Handle subscription lifecycle events
- **Checkout**: Seamless payment flow with trials

### **3. Feature Gating System**
```javascript
// Enforce subscription limits
const gate = new FeatureGate(userTier);
gate.canAccessWeatherLayer(); // Plus+ only
gate.canExportData('csv');     // Pro+ only
gate.canCreateAlert(current);  // Based on tier limits
```

### **4. React Components**
- **PricingPage**: Competitor comparison and features
- **FeatureGuard**: Conditional rendering based on tier
- **UsageIndicator**: Show limits and upgrade prompts

---

## 🚀 Deployment Checklist

### **Step 1: Install Dependencies**
```bash
npm install stripe
```

### **Step 2: Environment Variables**
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Use sk_live_ for production
STRIPE_PUBLISHABLE_KEY=pk_test_... # Use pk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_...

# Application URLs
REACT_APP_APP_URL=https://flightandtrace.com
REACT_APP_API_URL=https://flightandtrace.com/api
```

### **Step 3: Create Stripe Products**
```bash
cd C:\Users\maito\flight-tracker-project
node scripts/setup-stripe-products.js
```

This will create:
- ✅ 4 Products (Free, Plus, Pro, Business)
- ✅ 6 Prices (Monthly/Yearly for paid tiers)
- ✅ Proper metadata for tier identification

### **Step 4: Configure Webhooks**
In [Stripe Dashboard](https://dashboard.stripe.com/webhooks):

**Endpoint URL**: `https://flightandtrace.com/api/subscription/webhook`

**Events to Select**:
- `checkout.session.completed`
- `customer.subscription.created` 
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### **Step 5: Update Supabase Schema**
```sql
-- Add subscription columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
```

### **Step 6: Test Subscription Flow**
1. **Test Cards**: Use Stripe test cards (4242424242424242)
2. **Webhook Testing**: Use Stripe CLI for local testing
3. **Feature Gates**: Verify tier restrictions work
4. **Cancellation**: Test subscription cancellation flow

---

## 🧪 Testing Strategy

### **Stripe Test Cards**
```
Success: 4242424242424242
Declined: 4000000000000002
3D Secure: 4000000000003220
```

### **Test Scenarios**
- ✅ Free user signs up for Plus trial
- ✅ Plus user upgrades to Pro
- ✅ Pro user downgrades to Plus
- ✅ User cancels subscription (access until period end)
- ✅ Payment failure handling
- ✅ Feature access enforcement

### **Local Testing with Stripe CLI**
```bash
stripe login
stripe listen --forward-to localhost:3000/api/subscription/webhook
stripe trigger checkout.session.completed
```

---

## 📈 Business Metrics to Track

### **Subscription KPIs**
- **Trial to Paid Conversion**: Target >15%
- **Monthly Churn Rate**: Target <5%
- **Average Revenue Per User (ARPU)**
- **Customer Lifetime Value (CLV)**

### **Feature Usage Analysis**
- **Weather Layer Usage**: Plus+ feature adoption
- **Export Downloads**: Pro+ feature usage
- **API Call Patterns**: Pro/Business usage validation
- **Alert Rules Created**: Tier limit effectiveness

---

## 🔧 API Endpoints

### **Subscription Management**
- `POST /api/subscription/create-checkout` - Start subscription
- `POST /api/subscription/webhook` - Handle Stripe events
- `POST /api/subscription/cancel` - Cancel subscription
- `GET /api/subscription/status` - Get current subscription

### **Feature Gating**
- `GET /api/features/check/:feature` - Check feature access
- `GET /api/usage/current` - Get current usage stats
- `POST /api/features/gate` - Middleware for feature protection

---

## 💡 Growth Strategies

### **Conversion Optimization**
1. **Free Trial Value**: 7 days for Plus/Pro, 14 days for Business
2. **Feature Discovery**: Show locked features with upgrade prompts
3. **Usage Limits**: Gentle nudges when approaching limits
4. **Social Proof**: Customer testimonials and usage stats

### **Retention Tactics**
1. **Onboarding**: Guide new subscribers through key features
2. **Usage Insights**: Monthly reports showing value delivered
3. **Proactive Support**: Reach out before cancellation
4. **Win-back Campaigns**: Special offers for cancelled users

---

## 🚨 Production Considerations

### **Security**
- ✅ Webhook signature verification
- ✅ Environment variable protection
- ✅ Rate limiting on subscription endpoints
- ✅ User session validation

### **Monitoring**
- **Stripe Dashboard**: Payment and subscription metrics
- **Error Tracking**: Webhook failure monitoring
- **Usage Analytics**: Feature adoption tracking
- **Performance**: Subscription flow speed

### **Compliance**
- **GDPR**: User data handling and deletion
- **PCI DSS**: Stripe handles card data
- **Terms of Service**: Clear cancellation policy
- **Pricing Transparency**: No hidden fees

---

## 🎯 Success Metrics

### **Launch Goals (Month 1)**
- 100+ Plus subscribers ($499+ MRR)
- 20+ Pro subscribers ($299+ MRR) 
- 5+ Business subscribers ($199+ MRR)
- **Total Target**: $997+ MRR

### **Growth Goals (Month 6)**
- 500+ Plus subscribers ($2,495+ MRR)
- 100+ Pro subscribers ($1,499+ MRR)
- 25+ Business subscribers ($999+ MRR)  
- **Total Target**: $4,993+ MRR

---

**🚀 Ready to Launch**: The subscription system is production-ready with competitive pricing, robust feature gating, and seamless Stripe integration.