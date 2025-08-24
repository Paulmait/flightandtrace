# 🔑 Environment Variables Setup Guide

## ✅ CORRECT SETUP: You DON'T need .env.production!

### For Local Development
**File:** `.env.local` (create this file, it's gitignored)
```bash
# Copy the template
cp .env.example .env.local

# Edit .env.local and add your ACTUAL keys
```

### For Production (Vercel)
**Location:** Vercel Dashboard → Settings → Environment Variables
- Add your production keys directly in Vercel dashboard
- NO .env.production file needed
- Vercel manages production environment securely

## 📁 Environment Files Explained

| File | Purpose | Git Status | Where to Use |
|------|---------|------------|--------------|
| `.env.example` | Template with all keys (no values) | ✅ Committed | Reference only |
| `.env.local` | Your local development keys | ❌ Gitignored | Local testing |
| `.env.production` | NOT NEEDED | ❌ Don't create | Use Vercel Dashboard |
| `.env` | NOT NEEDED | ❌ Don't create | - |

## 🚀 Step-by-Step Setup

### 1. Local Development Setup
```bash
# 1. Create your local env file
cp .env.example .env.local

# 2. Edit .env.local
nano .env.local  # or use any text editor

# 3. Add your TEST keys (not production!)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG...
# etc...

# 4. Test locally
vercel dev
```

### 2. Production Setup (Vercel Dashboard)
1. Go to: https://vercel.com/dashboard
2. Select your project: `flighttrace`
3. Go to: Settings → Environment Variables
4. Add each variable:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_live_...` (your LIVE key)
   - Environment: ✅ Production
5. Repeat for all variables

### 3. Variables to Add

#### 🔴 Critical (Required for Launch)
```bash
# Stripe - Payment Processing
STRIPE_PUBLISHABLE_KEY=pk_live_...  # From Stripe Dashboard
STRIPE_SECRET_KEY=sk_live_...       # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_...     # From Stripe Webhooks

# SendGrid - Email Service
SENDGRID_API_KEY=SG...              # From SendGrid Settings
SENDGRID_FROM_EMAIL=noreply@flightandtrace.com
SENDGRID_FROM_NAME=FlightTrace

# Google Analytics
GA_MEASUREMENT_ID=G-...             # From GA4 Admin
```

#### 🟡 Recommended (For Full Features)
```bash
# OpenWeatherMap - Weather Data
OPENWEATHER_API_KEY=...             # From OpenWeatherMap

# OpenSky Network - More API Calls (Optional)
OPENSKY_USERNAME=...                # If you have an account
OPENSKY_PASSWORD=...                # For 4000 requests/day
```

#### 🟢 Optional (Post-Launch)
```bash
# Error Tracking
SENTRY_DSN=https://...@sentry.io/...

# Redis Cache (Use Upstash)
REDIS_URL=redis://...

# Advanced APIs
ADSBX_API_KEY=...                   # ADS-B Exchange
AVIATION_EDGE_KEY=...               # Aviation Edge
```

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T DO THIS:
- Don't create `.env.production` file
- Don't commit `.env.local` to git
- Don't put production keys in `.env.local`
- Don't share your API keys

### ✅ DO THIS:
- Use `.env.local` for local development only
- Use Vercel Dashboard for production keys
- Use test keys (pk_test_, sk_test_) locally
- Keep `.env.example` as reference

## 🧹 Files You Can Delete

These documentation files can be consolidated or removed after reading:
- `DEPLOYMENT.md` - Redundant with DEPLOY_TO_VERCEL.md
- `DEPLOYMENT_GUIDE.md` - Redundant with DEPLOY_TO_VERCEL.md
- `GODADDY_DNS_SETUP.md` - Already completed
- `DOMAIN_SETUP_GUIDE.md` - Already completed
- `EXPO_SETUP.md` - Only needed for mobile app

Keep these essential docs:
- `API_SETUP_GUIDE.md` - API integration reference
- `LAUNCH_CHECKLIST.md` - Launch tasks
- `PRICING_STRATEGY.md` - Business reference
- `COMPETITIVE_ANALYSIS.md` - Market reference

## 🔍 Verify Your Setup

### Test Local Environment:
```bash
# Check if variables are loaded
vercel env pull
vercel dev

# Test API endpoints
curl http://localhost:3000/api/health
```

### Test Production:
```bash
# After adding to Vercel Dashboard
vercel --prod

# Test live endpoints
curl https://flightandtrace.com/api/health
```

## 📝 Quick Reference

### What Goes Where?
```
LOCAL TESTING (.env.local):
- Test API keys (pk_test_, sk_test_)
- Development endpoints
- Debug flags

PRODUCTION (Vercel Dashboard):
- Live API keys (pk_live_, sk_live_)
- Production endpoints
- Real email service keys
```

### File Structure:
```
flighttrace/
├── .env.example        ✅ Keep (template)
├── .env.local          ✅ Create (your keys, gitignored)
├── .env.production     ❌ Don't create
├── .gitignore          ✅ Already excludes .env files
└── vercel.json         ✅ Routes configured
```

## 🚨 Security Notes

1. **Never commit real API keys**
2. **Use different keys for dev/prod**
3. **Rotate keys every 90 days**
4. **Monitor API usage for anomalies**
5. **Use Vercel's encrypted storage**

## ✅ You're Done When:

- [ ] `.env.local` created with test keys
- [ ] All production keys added to Vercel Dashboard
- [ ] Test endpoints working locally
- [ ] Production endpoints working on flightandtrace.com
- [ ] Removed unnecessary .env files

Remember: **NO .env.production file needed!** Vercel handles it.