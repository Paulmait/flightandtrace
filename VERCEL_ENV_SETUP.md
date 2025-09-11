# 🔧 Vercel Environment Variables Setup Guide

## CRITICAL: Add These to Vercel Dashboard Now

Go to: https://vercel.com/[your-username]/[your-project]/settings/environment-variables

## 🔴 REQUIRED - App Won't Work Without These

### 1. OpenSky Network API (Flight Data)
```
OPENSKY_USERNAME=your_actual_username
OPENSKY_PASSWORD=your_actual_password
```
⚠️ **GET THESE**: https://opensky-network.org/register (Free account)

### 2. Security Keys (Generate Random Strings)
```
JWT_SECRET=generate_64_character_random_string_here_use_password_generator
SESSION_SECRET=another_64_character_random_string_here_different_from_jwt
INTERNAL_API_KEY=third_random_string_32_chars_for_internal_api_calls
```
🔐 **GENERATE**: Use https://passwordsgenerator.net/ (64 chars, all characters)

## 🟡 HIGHLY RECOMMENDED - For Full Features

### 3. Redis Cache (For Performance)
```
REDIS_URL=redis://default:your_password@your-endpoint.upstash.io:port
REDIS_PASSWORD=your_redis_password
```
📦 **GET THESE**: 
1. Go to https://upstash.com
2. Create free account
3. Create Redis database
4. Copy the connection string

### 4. Weather Data
```
OPENWEATHER_API_KEY=your_openweather_api_key
```
🌤️ **GET THIS**: https://openweathermap.org/api (Free tier available)

### 5. Database (Supabase)
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```
🗄️ **GET THESE**:
1. Go to https://supabase.com
2. Create new project
3. Go to Settings > API
4. Copy URL and keys

## 🟢 OPTIONAL - For Premium Features

### 6. Payment Processing (Stripe)
```
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```
💳 **GET THESE**: https://dashboard.stripe.com/apikeys

### 7. Email Service (SendGrid)
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=FlightTrace
```
📧 **GET THESE**: https://sendgrid.com

### 8. Error Tracking (Sentry)
```
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
```
🐛 **GET THIS**: https://sentry.io

### 9. Additional Data Sources
```
ADSB_EXCHANGE_API_KEY=your_adsb_key
```
✈️ **GET THIS**: https://rapidapi.com/adsbx/api/adsbexchange-com1

### 10. Analytics
```
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```
📊 **GET THIS**: Google Analytics

## 📋 Quick Copy-Paste List for Vercel

Copy these and add to Vercel (replace with your actual values):

```env
# REQUIRED
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
JWT_SECRET=your_64_char_random_string
SESSION_SECRET=another_64_char_random_string
INTERNAL_API_KEY=32_char_random_string

# RECOMMENDED
REDIS_URL=redis://default:password@endpoint.upstash.io:port
OPENWEATHER_API_KEY=your_api_key
REACT_APP_SUPABASE_URL=https://project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# OPTIONAL
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
SENDGRID_API_KEY=SG.xxxxx
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 🚀 Application Settings

These are already set in vercel.json but add if needed:

```env
NODE_ENV=production
REACT_APP_API_URL=https://yourdomain.vercel.app/api
REACT_APP_APP_URL=https://yourdomain.vercel.app
REACT_APP_WS_URL=wss://yourdomain.vercel.app
```

## ⚙️ Cache Settings (Optional)

```env
CACHE_TTL_FLIGHTS=30
CACHE_TTL_WEATHER=300
CACHE_TTL_STATIC=3600
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🔒 How to Add in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. For each variable:
   - Add the KEY (e.g., `OPENSKY_USERNAME`)
   - Add the VALUE (e.g., `your_actual_username`)
   - Select environments: ✅ Production, ✅ Preview, ✅ Development
   - Click "Save"

## 🧪 Test After Adding Variables

1. **Trigger Redeployment**:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

2. **Test Endpoints**:
   ```bash
   # Test flight API
   curl https://yourdomain.vercel.app/api/flights
   
   # Test aircraft database
   curl https://yourdomain.vercel.app/api/aircraft-database?icao24=4b1805
   
   # Test airports
   curl https://yourdomain.vercel.app/api/airports?code=KJFK
   ```

## ⚠️ Common Issues

### "Application error"
- Missing required environment variables
- Check Vercel Function logs

### "No flights showing"
- OPENSKY_USERNAME or OPENSKY_PASSWORD incorrect
- API rate limit reached

### "Slow performance"
- REDIS_URL not configured
- Add Redis for caching

## 📝 Minimum Variables to Get Started

If you want to test quickly, add just these:

```env
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
JWT_SECRET=any_long_random_string_here_64_chars_recommended
```

## 🎯 Priority Order

1. **NOW**: Add OPENSKY credentials + JWT_SECRET
2. **SOON**: Add Redis for caching
3. **LATER**: Add Stripe for payments
4. **OPTIONAL**: Add analytics and monitoring

---

**IMPORTANT**: After adding variables, redeploy from Vercel dashboard for changes to take effect!

Your deployment URL will be: https://[project-name].vercel.app