# 🔐 FlightTrace Vercel Environment Variables Setup Guide

## 📋 Complete List of Environment Variables for Production

Add these to your Vercel Dashboard: **Settings → Environment Variables**

### 1. 🛩️ **OpenSky Network API** (Flight Data)
```
OPENSKY_USERNAME=guampaul@gmail.com-api-client
OPENSKY_PASSWORD=your_opensky_password_here
```
- **Purpose:** Real-time flight tracking data
- **Credits:** 4000 credits with OPENSKY_API_DEFAULT role
- **Get it from:** https://opensky-network.org/my-opensky
- **Note:** The username is your Client ID

### 2. 🌤️ **OpenWeatherMap API** (Weather Data)
```
OPENWEATHER_API_KEY=your_openweather_api_key_here
```
- **Purpose:** Weather overlays, airport weather, wind conditions
- **Get it from:** https://openweathermap.org/api
- **Free tier:** 1,000 calls/day

### 3. 💳 **Stripe API** (Payment Processing)
```
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
```
- **Purpose:** Subscription management, payment processing
- **Get it from:** https://dashboard.stripe.com/apikeys
- **Webhook setup:** https://dashboard.stripe.com/webhooks
- **Webhook endpoint:** `https://flightandtrace.com/api/subscription/webhook`

### 4. 📧 **SendGrid API** (Email Service)
```
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@flightandtrace.com
SENDGRID_FROM_NAME=FlightTrace
```
- **Purpose:** Transactional emails, notifications, password resets
- **Get it from:** https://app.sendgrid.com/settings/api_keys
- **Free tier:** 100 emails/day

### 5. 🔒 **Supabase** (Database & Authentication) - Optional
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
```
- **Purpose:** User authentication, database storage
- **Get it from:** https://app.supabase.com/project/settings/api
- **Note:** Only if using Supabase for backend

### 6. 📊 **Google Analytics** (Analytics)
```
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```
- **Purpose:** User analytics, traffic tracking
- **Get it from:** https://analytics.google.com/
- **Implementation:** Add to HTML pages

### 7. 🗺️ **Mapbox** (Advanced Maps) - Optional
```
MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
```
- **Purpose:** Enhanced map features, 3D terrain
- **Get it from:** https://account.mapbox.com/access-tokens/
- **Free tier:** 50,000 loads/month

### 8. 🔐 **Security & Session**
```
JWT_SECRET=your_random_jwt_secret_here_minimum_32_chars
SESSION_SECRET=your_random_session_secret_here_minimum_32_chars
```
- **Purpose:** JWT token signing, session management
- **Generate:** Use a secure random string generator
- **Example generator:** `openssl rand -base64 32`

### 9. 🚀 **Application Settings**
```
NODE_ENV=production
API_BASE_URL=https://flightandtrace.com
FUEL_ESTIMATES_ENABLED=true
API_RATE_LIMIT=100
CORS_ORIGIN=https://flightandtrace.com
```
- **Purpose:** Application configuration
- **Note:** These are already in vercel.json but can be overridden

### 10. 🔔 **Discord/Slack Webhooks** (Optional - for monitoring)
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```
- **Purpose:** Error alerts, system monitoring
- **Get Discord webhook:** Server Settings → Integrations → Webhooks
- **Get Slack webhook:** https://api.slack.com/messaging/webhooks

## 📝 How to Add to Vercel

1. Go to https://vercel.com/dashboard
2. Select your `flightandtrace` project
3. Click **Settings** → **Environment Variables**
4. For each variable:
   - Click **Add New**
   - Enter the **Key** (e.g., `OPENSKY_USERNAME`)
   - Enter the **Value** (your actual API key/secret)
   - Select environments: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**

## 🔒 Security Best Practices

1. **Never commit API keys to Git**
2. **Use different keys for development and production**
3. **Rotate keys regularly** (every 90 days recommended)
4. **Set up API key restrictions** where possible:
   - IP restrictions for server-side keys
   - Domain restrictions for client-side keys
5. **Monitor API usage** for unusual activity

## 🧪 Testing Your Configuration

After adding all environment variables, test each integration:

```bash
# Test OpenSky API
curl https://flightandtrace.com/api/flights-live/area?lamin=40&lomin=-74&lamax=41&lomax=-73

# Test Weather API
curl https://flightandtrace.com/api/weather/current?lat=40.7&lon=-74.0

# Test Health Check
curl https://flightandtrace.com/api/health
```

## 📊 Priority Levels

### 🔴 **Critical** (Required for basic functionality)
1. `OPENSKY_USERNAME` & `OPENSKY_PASSWORD` - Flight data
2. `OPENWEATHER_API_KEY` - Weather data

### 🟡 **Important** (For full features)
3. `STRIPE_SECRET_KEY` & related - Payment processing
4. `SENDGRID_API_KEY` & related - Email notifications
5. `JWT_SECRET` & `SESSION_SECRET` - Security

### 🟢 **Optional** (Enhancements)
6. `SUPABASE_*` - If using Supabase
7. `GA_MEASUREMENT_ID` - Analytics
8. `MAPBOX_ACCESS_TOKEN` - Advanced maps
9. `DISCORD_WEBHOOK_URL` / `SLACK_WEBHOOK_URL` - Monitoring

## 🚨 Common Issues & Solutions

### Issue: "API key not configured"
**Solution:** Ensure the environment variable name matches exactly (case-sensitive)

### Issue: "Unauthorized" errors
**Solution:** Check that API keys are for production, not test/sandbox

### Issue: Changes not taking effect
**Solution:** Vercel may need a redeployment after adding env vars:
```bash
vercel --prod --force
```

## 📞 Support Contacts

- **OpenSky Network:** https://opensky-network.org/contact
- **OpenWeatherMap:** https://openweathermap.org/support
- **Stripe:** https://support.stripe.com/
- **SendGrid:** https://support.sendgrid.com/
- **Vercel:** https://vercel.com/support

---

**Last Updated:** August 24, 2025
**Maintained by:** FlightTrace Team