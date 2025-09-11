# 🔧 FINAL Environment Variables for Vercel

## ✅ Variables You Already Have (Good!)
- ✅ OPENSKY_USERNAME
- ✅ OPENSKY_PASSWORD  
- ✅ OPENWEATHER_API_KEY
- ✅ FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY
- ✅ FLIGHTTRACE_STRIPE_SECRET_KEY
- ✅ FLIGHTTRACE_STRIPE_WEBHOOK_SECRET
- ✅ STRIPE_PREMIUM_PRICE_ID
- ✅ STRIPE_PROFESSIONAL_PRICE_ID
- ✅ All Firebase variables
- ✅ All SendGrid variables

## 🔴 MISSING - Add These Now in Vercel Dashboard:

### 1. **JWT_SECRET** (CRITICAL - for authentication)
```
Variable Name: JWT_SECRET
Value: sKJ8n4Hs9Kd82nJs8Hd7nJs9Kdm3Hs8Jdn4Ksm9Hdn3Js8Kdm4Hsn9Jdk3Msn8
Environment: All (Production, Preview, Development)
```

### 2. **SESSION_SECRET** (CRITICAL - for sessions)
```
Variable Name: SESSION_SECRET
Value: pLm9Ks8Hdn3Js9Kdm4Hsn8Jdk3Msn9Hdk4Jsn8Kdm3Hsn9Jdk4Msn8Hdk3Jsn9
Environment: All
```

### 3. **INTERNAL_API_KEY** (CRITICAL - for internal API calls)
```
Variable Name: INTERNAL_API_KEY
Value: xKs8Hdn3Js9Kdm4Hsn8Jdk3Msn9Hdk4
Environment: All
```

### 4. **REACT_APP_CESIUM_TOKEN** (For 3D View - Optional but recommended)
```
Variable Name: REACT_APP_CESIUM_TOKEN
Value: [Get free token from https://cesium.com/ion/tokens]
Environment: All
```

How to get Cesium token:
1. Go to: https://cesium.com/ion/signup (free account)
2. After signup, go to: https://cesium.com/ion/tokens
3. Copy your default token or create new one
4. Add to Vercel as REACT_APP_CESIUM_TOKEN

### 5. **REDIS_URL** (Optional - for caching/performance)
```
Variable Name: REDIS_URL
Value: redis://default:[password]@[endpoint].upstash.io:[port]
Environment: All
```

How to get Redis URL:
1. Go to: https://upstash.com (free account)
2. Create new Redis database
3. Copy the connection string
4. Add to Vercel

## 📝 Notes on Your Existing Variables:

### Stripe Keys
The code is updated to use your existing variables:
- ✅ Using `FLIGHTTRACE_STRIPE_SECRET_KEY` (not STRIPE_SECRET_KEY)
- ✅ Using `FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY`
- ✅ Using `FLIGHTTRACE_STRIPE_WEBHOOK_SECRET`

### Firebase Keys
You have two sets:
- `REACT_APP_FIREBASE_*` - for frontend
- `FIREBASE_*` - for backend
Both are correct and will work.

## 🚀 After Adding Variables:

### IMPORTANT: Redeploy Required!
Environment variables only take effect after redeployment:

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to "Deployments" tab
4. Click ⋮ on latest deployment
5. Click "Redeploy"
6. Select "Use existing Build Cache"
7. Click "Redeploy"

## 🧪 Test After Redeploy:

```bash
# Check if environment variables loaded
curl https://flight-tracker-project.vercel.app/api/test

# Should show:
{
  "environment": {
    "hasOpenSkyConfig": true,  # ← Should be true
    "hasJWTSecret": true,       # ← Should be true
    "hasRedis": true/false,     # ← True if you added Redis
    "hasSupabase": false        # ← Optional
  }
}
```

## ✅ Complete Environment Variables List

Here's everything your app uses (✅ = you have it, ❌ = missing):

### Authentication & Security
- ❌ JWT_SECRET
- ❌ SESSION_SECRET  
- ❌ INTERNAL_API_KEY

### Flight Data
- ✅ OPENSKY_USERNAME
- ✅ OPENSKY_PASSWORD
- ✅ OPENWEATHER_API_KEY

### 3D Visualization
- ❌ REACT_APP_CESIUM_TOKEN

### Payments
- ✅ FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY
- ✅ FLIGHTTRACE_STRIPE_SECRET_KEY
- ✅ FLIGHTTRACE_STRIPE_WEBHOOK_SECRET
- ✅ STRIPE_PREMIUM_PRICE_ID
- ✅ STRIPE_PROFESSIONAL_PRICE_ID

### Database & Cache
- ❌ REDIS_URL (optional but recommended)
- ❌ REACT_APP_SUPABASE_URL (optional)
- ❌ REACT_APP_SUPABASE_ANON_KEY (optional)

### Email
- ✅ SENDGRID_API_KEY
- ✅ SENDGRID_FROM_EMAIL
- ✅ SENDGRID_FROM_NAME

### Analytics & Monitoring
- ✅ FIREBASE_MEASUREMENT_ID
- ❌ SENTRY_DSN (optional)
- ❌ GA_MEASUREMENT_ID (optional)

## 🎯 Priority Order:

1. **NOW**: Add JWT_SECRET, SESSION_SECRET, INTERNAL_API_KEY
2. **RECOMMENDED**: Add REACT_APP_CESIUM_TOKEN for 3D view
3. **NICE TO HAVE**: Add REDIS_URL for better performance
4. **LATER**: Add Supabase, Sentry for full features

---

**After adding the missing variables and redeploying, your app will be fully functional!**