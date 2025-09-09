# ⚠️ IMPORTANT: Update Environment Variables in Vercel

## You need to ADD or RENAME these variables in Vercel Dashboard:

### 1. Firebase Variables (ADD REACT_APP_ prefix)
Your current variables need the REACT_APP_ prefix to work in React:

```
REACT_APP_FIREBASE_API_KEY=(add your Firebase API key)
REACT_APP_FIREBASE_AUTH_DOMAIN=(copy from FIREBASE_AUTH_DOMAIN)
REACT_APP_FIREBASE_PROJECT_ID=(copy from FIREBASE_PROJECT_ID)
REACT_APP_FIREBASE_STORAGE_BUCKET=(copy from FIREBASE_STORAGE_BUCKET)
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=(copy from FIREBASE_MESSAGING_SENDER_ID)
REACT_APP_FIREBASE_APP_ID=(copy from FIREBASE_APP_ID)
REACT_APP_FIREBASE_MEASUREMENT_ID=(copy from FIREBASE_MEASUREMENT_ID)
```

### 2. Stripe Variables (ADD REACT_APP_ prefix for frontend)
Add these for the frontend to use:

```
REACT_APP_STRIPE_PUBLISHABLE_KEY=(copy from FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY)
```

### 3. Map Tiles (REQUIRED - Choose One)

#### Option A: MapTiler (Recommended)
```
REACT_APP_MAPTILER_KEY=(get from https://www.maptiler.com/)
```

#### Option B: Mapbox
```
REACT_APP_MAPBOX_TOKEN=(get from https://www.mapbox.com/)
```

### 4. Already Working ✅
These are already set up correctly:
- OPENSKY_USERNAME ✅
- OPENSKY_PASSWORD ✅
- OPENWEATHER_API_KEY ✅
- FLIGHTTRACE_STRIPE_SECRET_KEY ✅ (backend only)
- STRIPE_PREMIUM_PRICE_ID ✅
- STRIPE_PROFESSIONAL_PRICE_ID ✅

## How to Add in Vercel:

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable above
5. Click "Save"
6. **IMPORTANT**: Redeploy after adding variables

## Quick Test After Adding:

The app should show:
- 🟢 LIVE status with real flight count
- Actual aircraft on the map
- Better map tiles (if you added MapTiler key)

## Still showing errors?

Check browser console (F12) for specific errors.
Most likely missing: REACT_APP_MAPTILER_KEY