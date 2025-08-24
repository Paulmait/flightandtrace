# 🧹 Codebase Cleanup Guide

## Files You Can Safely Delete

### 1. Redundant Documentation (Already Completed Tasks)
```bash
# These guides are for completed tasks
rm DOMAIN_SETUP_GUIDE.md      # Domain already set up
rm GODADDY_DNS_SETUP.md       # DNS already configured
rm DEPLOYMENT.md              # Redundant with DEPLOY_TO_VERCEL.md
rm DEPLOYMENT_GUIDE.md        # Redundant with DEPLOY_TO_VERCEL.md
rm EXPO_SETUP.md              # Only needed when building mobile app
```

### 2. Duplicate Files
```bash
# The api/ version is the correct one
rm backend/subscription.py    # Old version, use api/subscription.py
```

### 3. Test Files (Keep for Development)
```bash
# Keep these - they're useful for testing
backend/test_*.py            # Keep for testing
backend/tests/               # Keep test suite
```

### 4. Old/Unused Frontend Files
```bash
# These are React Native files, not needed for web
# But keep them if you plan to build mobile app later
frontend/                    # Keep if building mobile app
```

## Files to KEEP (Essential)

### Core Application Files
```
✅ /api/                     # All API endpoints (Vercel serverless)
  ├── flights_live.py        # OpenSky integration
  ├── subscription.py        # Stripe payments
  ├── email_service.py       # SendGrid emails
  ├── weather.py            # Weather data
  ├── health.py             # Health check
  └── requirements.txt      # Python dependencies

✅ /public/                  # Web interface
  ├── index.html            # Homepage
  ├── live.html             # Live tracker
  ├── track.html            # Flight search
  └── analytics.html        # GA setup guide

✅ Configuration Files
  ├── vercel.json           # Deployment config
  ├── .env.example          # Environment template
  ├── .gitignore            # Git exclusions
  └── package.json          # Node dependencies
```

### Important Documentation
```
✅ Keep These Docs:
  ├── API_SETUP_GUIDE.md        # API integration guide
  ├── ENVIRONMENT_SETUP.md      # Environment variables guide
  ├── LAUNCH_CHECKLIST.md        # Launch tasks
  ├── PRICING_STRATEGY.md        # Pricing reference
  ├── COMPETITIVE_ANALYSIS.md   # Market analysis
  └── LAUNCH_SUMMARY.md          # Launch readiness
```

### Backend Modules (Keep for future use)
```
✅ /backend/src/core/           # Advanced features
  ├── stripe_payment.py         # Payment processing
  ├── enhanced_rate_limiter.py  # Rate limiting
  ├── auth.py                   # Authentication
  └── ...                       # Other modules
```

## Cleanup Commands

### Option 1: Conservative Cleanup (Recommended)
```bash
# Remove only redundant docs
rm DOMAIN_SETUP_GUIDE.md GODADDY_DNS_SETUP.md
rm DEPLOYMENT.md DEPLOYMENT_GUIDE.md
rm backend/subscription.py

# Result: Saves ~50KB
```

### Option 2: Aggressive Cleanup (If not building mobile)
```bash
# Remove React Native frontend
rm -rf frontend/

# Remove backend test files
rm backend/test_*.py

# Result: Saves ~10MB+ (mostly node_modules)
```

### Option 3: Production Only (Minimal)
Keep only:
```
/api/           # API endpoints
/public/        # Web files
vercel.json     # Config
.env.example    # Template
```

## File Structure After Cleanup

### Recommended Structure:
```
flighttrace/
├── api/                    # ✅ Serverless functions
│   ├── flights_live.py
│   ├── subscription.py
│   ├── email_service.py
│   ├── weather.py
│   └── requirements.txt
├── public/                 # ✅ Static web files
│   ├── index.html
│   ├── live.html
│   └── track.html
├── backend/src/core/       # ✅ Keep for advanced features
├── docs/                   # ✅ Essential docs only
│   ├── API_SETUP_GUIDE.md
│   └── LAUNCH_CHECKLIST.md
├── .env.example           # ✅ Environment template
├── .gitignore             # ✅ Git config
├── vercel.json            # ✅ Deployment config
└── package.json           # ✅ Dependencies
```

## Summary

### Must Keep:
- `/api/` - All your serverless functions
- `/public/` - Your web interface
- `vercel.json` - Deployment configuration
- `.env.example` - Environment template

### Can Delete:
- Redundant deployment guides
- `backend/subscription.py` (old version)
- Domain setup guides (already done)

### Optional Delete:
- `/frontend/` - If not building mobile app
- `/backend/tests/` - If not running tests
- Old markdown guides for completed tasks

## Clean Codebase Benefits
- ✅ Faster deployments
- ✅ Easier navigation
- ✅ Clear structure
- ✅ No confusion about which files to use
- ✅ Smaller repository size

## Final Checklist
- [ ] Delete redundant documentation
- [ ] Remove `backend/subscription.py`
- [ ] Keep all `/api/` files
- [ ] Keep all `/public/` files
- [ ] Verify site still works after cleanup