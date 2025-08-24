# 💳 Stripe Setup Guide for FlightTrace

## 📋 Step-by-Step Stripe Configuration

### Step 1: Create Stripe Account
1. Go to https://stripe.com
2. Click "Start now" 
3. Create account with your business email
4. Verify your email

### Step 2: Complete Business Profile
1. Go to https://dashboard.stripe.com/settings/business
2. Fill in:
   - Business name: **Cien Rios LLC** (or your business name)
   - Business type: **Company** or **Individual**
   - Address: Your business address
   - Website: **https://flightandtrace.com**

### Step 3: Create Products in Stripe Dashboard

Go to https://dashboard.stripe.com/products and create these products:

#### Product 1: FlightTrace Premium
```
Name: FlightTrace Premium
Description: Advanced flight tracking with fuel estimation and weather overlays
Pricing:
- Price: $7.99
- Billing period: Monthly
- Price ID: Save this (looks like: price_1234567890abcdef)
```

**Features to add in metadata:**
- Unlimited flight tracking
- Fuel consumption estimates
- CO2 emissions tracking
- Weather overlays
- Email notifications
- CSV export
- 30-day history

#### Product 2: FlightTrace Professional
```
Name: FlightTrace Professional  
Description: Professional aviation tools with API access and priority support
Pricing:
- Price: $24.99
- Billing period: Monthly
- Price ID: Save this (looks like: price_1234567890abcdef)
```

**Features to add in metadata:**
- Everything in Premium
- API access (10,000 calls/month)
- Real-time alerts
- 365-day history
- Priority support
- Custom integrations
- Bulk export
- Team sharing (5 users)

### Step 4: Get Your API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy these keys:

**For Testing (use first):**
```
STRIPE_PUBLISHABLE_KEY=pk_test_51.....
STRIPE_SECRET_KEY=sk_test_51.....
```

**For Production (when ready to accept real payments):**
```
STRIPE_PUBLISHABLE_KEY=pk_live_51.....
STRIPE_SECRET_KEY=sk_live_51.....
```

### Step 5: Set Up Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://flightandtrace.com/api/subscription/webhook`
4. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.updated`
   - ✅ `payment_method.attached`

5. After creating, copy the **Signing secret** (starts with `whsec_`)

### Step 6: Create Customer Portal Configuration

1. Go to https://dashboard.stripe.com/settings/billing/portal
2. Enable Customer Portal
3. Configure:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to switch plans
   - ✅ Allow customers to view invoices
4. Set redirect URL: `https://flightandtrace.com/account`

### Step 7: Configure Tax Settings (Optional)

1. Go to https://dashboard.stripe.com/settings/tax
2. Enable tax calculation if needed
3. Add tax rates for your jurisdictions

### Step 8: Add to Vercel Environment Variables

Add these to your Vercel Dashboard:

**For Testing:**
```
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PREMIUM_PRICE_ID=price_YOUR_PREMIUM_PRICE_ID
STRIPE_PROFESSIONAL_PRICE_ID=price_YOUR_PROFESSIONAL_PRICE_ID
```

**For Production (when ready):**
```
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PREMIUM_PRICE_ID=price_YOUR_PREMIUM_PRICE_ID
STRIPE_PROFESSIONAL_PRICE_ID=price_YOUR_PROFESSIONAL_PRICE_ID
```

## 🧪 Testing Your Integration

### Test Card Numbers
Use these in test mode:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

Any expiry date in the future and any 3-digit CVC.

### Test Webhook Locally
```bash
# Install Stripe CLI
# Download from: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/subscription/webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```

## 📊 Stripe Dashboard URLs

- **Home**: https://dashboard.stripe.com
- **Payments**: https://dashboard.stripe.com/payments
- **Customers**: https://dashboard.stripe.com/customers
- **Subscriptions**: https://dashboard.stripe.com/subscriptions
- **Products**: https://dashboard.stripe.com/products
- **Invoices**: https://dashboard.stripe.com/invoices
- **Webhook logs**: https://dashboard.stripe.com/webhooks
- **API logs**: https://dashboard.stripe.com/logs

## 🔧 Code Integration Points

Your app already has Stripe integrated in these files:

1. **Backend API**: `/api/subscription.py`
   - Handles checkout sessions
   - Manages subscriptions
   - Processes webhooks
   - Handles cancellations

2. **Frontend Pages**:
   - `/public/pricing.html` - Pricing display
   - `/public/login.html` - Account management

3. **Features Enabled**:
   - ✅ Subscription creation
   - ✅ Payment processing
   - ✅ Auto-renewal
   - ✅ One-click cancellation
   - ✅ Pro-rated refunds
   - ✅ Plan switching
   - ✅ Payment method updates
   - ✅ Invoice history

## 💰 Pricing Strategy

Your competitive pricing:
- **FlightTrace Premium**: $7.99/month (80% cheaper than FlightRadar24)
- **FlightTrace Professional**: $24.99/month (40% cheaper than FlightAware)

## 🚀 Go-Live Checklist

Before accepting real payments:

- [ ] Complete Stripe identity verification
- [ ] Add bank account for payouts
- [ ] Set up tax collection (if required)
- [ ] Test full payment flow with test cards
- [ ] Test subscription cancellation
- [ ] Test webhook handling
- [ ] Review and accept Stripe's Terms of Service
- [ ] Switch from test keys to live keys in Vercel
- [ ] Update webhook endpoint to use live endpoint
- [ ] Test with a real card (small amount)

## 📈 Revenue Projections

Based on typical SaaS conversion rates:
- Free users: 85%
- Premium subscribers: 12% × $7.99 = $0.96 per user
- Professional subscribers: 3% × $24.99 = $0.75 per user
- **Average Revenue Per User (ARPU)**: ~$1.71

With 1,000 users:
- 120 Premium × $7.99 = $958.80/month
- 30 Professional × $24.99 = $749.70/month
- **Total MRR**: $1,708.50/month

## 🆘 Common Issues

### "No such price"
- Make sure you're using the correct price ID from Stripe Dashboard
- Ensure you're using test keys with test price IDs (or live with live)

### "Webhook signature verification failed"
- Check that `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint signing secret
- Ensure the webhook URL is exactly: `https://flightandtrace.com/api/subscription/webhook`

### "Customer not found"
- Make sure customer creation is happening before subscription
- Check that email is being passed correctly

## 📞 Support

- **Stripe Support**: https://support.stripe.com
- **Documentation**: https://stripe.com/docs
- **API Reference**: https://stripe.com/docs/api
- **Status Page**: https://status.stripe.com

---

**Created**: August 24, 2025
**For**: FlightTrace (flightandtrace.com)
**By**: FlightTrace Development Team