# 🔍 Vercel Environment Variables Audit

## ✅ **Current Vercel Variables** (Confirmed in Dashboard)

1. `PE_SECRET_KEY` ✅ - Security key
2. `STRIPE_PROFESSIONAL_PRICE_ID` ✅ - Pro tier monthly price
3. `STRIPE_PREMIUM_PRICE_ID` ✅ - Plus tier monthly price  
4. `FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY` ✅ - Client-side Stripe key
5. `FLIGHTTRACE_STRIPE_WEBHOOK_SECRET` ✅ - Webhook verification
6. `OPENSKY_PASSWORD` ✅ - Flight data API password
7. `OPENSKY_USERNAME` ✅ - Flight data API username
8. `OPENWEATHER_API_KEY` ✅ - Weather data API

## ⚠️ **Missing Variables** (Need to Add to Vercel)

### **Critical for Production**
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_PLUS_YEARLY=price_plus_yearly_id
STRIPE_PRO_YEARLY=price_pro_yearly_id  
STRIPE_BUSINESS_MONTHLY=price_business_monthly_id
STRIPE_BUSINESS_YEARLY=price_business_yearly_id

# Application URLs
REACT_APP_APP_URL=https://flightandtrace.com
REACT_APP_API_URL=https://flightandtrace.com/api

# Supabase Database
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### **Optional for Enhanced Features**
```env
# Email Service
SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@flightandtrace.com
SENDGRID_FROM_NAME=FlightTrace

# Analytics (already configured via Firebase)
GA_MEASUREMENT_ID=G-HS9H3GM0V1

# Node Environment
NODE_ENV=production
```

## 🔄 **Variable Mapping Updated**

### **Stripe Integration**
- ✅ `FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY` → Client-side payments
- ✅ `FLIGHTTRACE_STRIPE_WEBHOOK_SECRET` → Webhook verification  
- ✅ `STRIPE_PREMIUM_PRICE_ID` → Plus tier ($4.99/mo)
- ✅ `STRIPE_PROFESSIONAL_PRICE_ID` → Pro tier ($14.99/mo)
- ⚠️ Need: `STRIPE_SECRET_KEY` → Server-side Stripe operations
- ⚠️ Need: Business tier price IDs

### **Flight Data APIs**
- ✅ `OPENSKY_USERNAME` → guampaul@gmail.com-api-client
- ✅ `OPENSKY_PASSWORD` → Production API password
- ✅ `OPENWEATHER_API_KEY` → Weather overlay data

### **Security & Infrastructure**
- ✅ `PE_SECRET_KEY` → Application security
- ⚠️ Need: Supabase configuration for database

## 📝 **Action Items**

### **1. Add Missing Stripe Variables**
```bash
# In Vercel Dashboard → Settings → Environment Variables
STRIPE_SECRET_KEY=sk_live_your_actual_secret_key
STRIPE_PLUS_YEARLY=price_1234_yearly
STRIPE_PRO_YEARLY=price_5678_yearly
STRIPE_BUSINESS_MONTHLY=price_9012_monthly
STRIPE_BUSINESS_YEARLY=price_3456_yearly
```

### **2. Configure Supabase**
```bash
# Database configuration
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### **3. Set Application URLs**
```bash
# Production URLs
REACT_APP_APP_URL=https://flightandtrace.com
REACT_APP_API_URL=https://flightandtrace.com/api
```

## 🎯 **Tier Mapping Strategy**

Your existing variables map to our new tier system:

| Vercel Variable | New Tier | Monthly Price | Features |
|----------------|----------|---------------|----------|
| `STRIPE_PREMIUM_PRICE_ID` | **Plus** | $4.99 | Ad-free, 30-day history, weather |
| `STRIPE_PROFESSIONAL_PRICE_ID` | **Pro** | $14.99 | 365-day history, unlimited alerts |
| *(Need to add)* | **Business** | $39.99 | Teams, SSO, 3-year history |

## 🔒 **Security Best Practices**

### **✅ Already Following**
- Separate webhook secret (`FLIGHTTRACE_STRIPE_WEBHOOK_SECRET`)
- Production API credentials secured
- Environment-specific configuration

### **🎯 Recommendations**
1. **Rotate Keys Regularly**: Stripe and API keys every 90 days
2. **Monitor Usage**: Set up alerts for unusual API activity
3. **Backup Keys**: Store backup keys in secure location
4. **Test Environment**: Use separate test keys for development

## 🧪 **Testing Checklist**

After adding missing variables:

- [ ] Test Stripe checkout flow
- [ ] Verify webhook processing
- [ ] Test subscription upgrades/downgrades
- [ ] Validate feature gating
- [ ] Check API rate limits
- [ ] Test database connections

## 📊 **Environment Validation Script**

The codebase now includes `config/environment-mapping.js` which:
- ✅ Maps all your existing Vercel variables
- ✅ Validates required variables are present
- ✅ Provides fallbacks for optional variables
- ✅ Logs missing variables in development

Run validation with:
```javascript
const { validateEnvironment } = require('./config/environment-mapping');
validateEnvironment();
```

---

**🎯 Priority**: Add the missing Stripe secret key and Supabase configuration to complete the production deployment.