# Vercel Environment Variables - Verification Checklist

## ✅ Your Current Variables (Good Setup!)

Based on your list, you have these variables configured:

### Core Variables ✅
- `NODE_ENV` = production ✅
- `REACT_APP_MAPTILER_KEY` ✅ (Frontend can access this)

### Firebase Variables ✅
- `REACT_APP_FIREBASE_API_KEY` ✅ (Frontend accessible)
- `REACT_APP_FIREBASE_AUTH_DOMAIN` ✅ (Frontend accessible)
- `FIREBASE_PROJECT_ID` ❌ (Should be `REACT_APP_FIREBASE_PROJECT_ID`)
- `FIREBASE_STORAGE_BUCKET` ❌ (Should be `REACT_APP_FIREBASE_STORAGE_BUCKET`)
- `FIREBASE_MESSAGING_SENDER_ID` ❌ (Should be `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`)
- `FIREBASE_APP_ID` ❌ (Should be `REACT_APP_FIREBASE_APP_ID`)
- `FIREBASE_MEASUREMENT_ID` ❌ (Should be `REACT_APP_FIREBASE_MEASUREMENT_ID`)

### Supabase Variables ⚠️
- `SUPABASE_URL` ❌ (Should be `REACT_APP_SUPABASE_URL` for frontend)
- `SUPABASE_ANON_KEY` ❌ (Should be `REACT_APP_SUPABASE_ANON_KEY` for frontend)
- `SUPABASE_SERVICE_KEY` ✅ (Backend only, correct as is)
- `DATABASE_URL` ✅ (Backend only, correct as is)

### Stripe Variables ⚠️
- `FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY` ❌ (Should be `REACT_APP_STRIPE_PUBLISHABLE_KEY`)
- `FLIGHTTRACE_STRIPE_SECRET_KEY` ✅ (Backend only, correct as is)
- `FLIGHTTRACE_STRIPE_WEBHOOK_SECRET` ✅ (Backend only, correct as is)
- `STRIPE_PREMIUM_PRICE_ID` ❌ (Should be `REACT_APP_STRIPE_PREMIUM_PRICE_ID`)
- `STRIPE_PROFESSIONAL_PRICE_ID` ❌ (Should be `REACT_APP_STRIPE_PROFESSIONAL_PRICE_ID`)

### API Variables ✅
- `OPENSKY_USERNAME` ✅ (Backend only)
- `OPENSKY_PASSWORD` ✅ (Backend only)
- `OPENWEATHER_API_KEY` ✅ (Backend only)
- `SENDGRID_API_KEY` ✅ (Backend only)
- `SENDGRID_FROM_EMAIL` ✅ (Backend only)
- `SENDGRID_FROM_NAME` ✅ (Backend only)

## 🔧 Variables That Need Renaming

**IMPORTANT**: Frontend (React) can only access variables prefixed with `REACT_APP_`

### Add these new variables (keep the old ones too):
```
REACT_APP_SUPABASE_URL = [copy value from SUPABASE_URL]
REACT_APP_SUPABASE_ANON_KEY = [copy value from SUPABASE_ANON_KEY]
REACT_APP_FIREBASE_PROJECT_ID = [copy value from FIREBASE_PROJECT_ID]
REACT_APP_FIREBASE_STORAGE_BUCKET = [copy value from FIREBASE_STORAGE_BUCKET]
REACT_APP_FIREBASE_MESSAGING_SENDER_ID = [copy value from FIREBASE_MESSAGING_SENDER_ID]
REACT_APP_FIREBASE_APP_ID = [copy value from FIREBASE_APP_ID]
REACT_APP_FIREBASE_MEASUREMENT_ID = [copy value from FIREBASE_MEASUREMENT_ID]
REACT_APP_STRIPE_PUBLISHABLE_KEY = [copy value from FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY]
```

## 🎯 Minimum Required for Basic Operation

These are the ONLY variables needed for basic flight tracking:

1. `NODE_ENV` = production ✅ (You have this)
2. `REACT_APP_MAPTILER_KEY` ✅ (You have this, but map uses OSM now so not critical)

## 📝 How to Add/Update Variables

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with the `REACT_APP_` prefix for frontend access
5. Click "Save"
6. **IMPORTANT**: Redeploy for changes to take effect

## 🚨 Current Status

Your app is working with:
- ✅ Flight data loading (828 aircraft)
- ✅ API endpoints functioning
- ⚠️ Map display issue (being fixed with SimpleMap component)
- ✅ Basic functionality operational

The white screen is a map rendering issue, not an environment variable issue!