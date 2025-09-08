# 🚀 FlightTrace - Vercel Deployment Guide

## Environment Variables Required for Vercel

Based on the production FlightTrace configuration, these environment variables must be set in the Vercel Dashboard:

### **Critical - Required for Basic Functionality**

```env
# OpenSky Network API - Flight Data
OPENSKY_USERNAME=guampaul@gmail.com-api-client
OPENSKY_PASSWORD=your_actual_password_here

# Supabase Database
REACT_APP_SUPABASE_URL=https://your-supabase-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
SUPABASE_SERVICE_KEY=your_actual_supabase_service_key

# Firebase Authentication (Existing Integration)
FIREBASE_API_KEY=AIzaSyDMJkPbOjp4oQNxb-EVK-Yh1pVSrOuDJgQ
FIREBASE_AUTH_DOMAIN=flighttrace-749f1.firebaseapp.com
FIREBASE_PROJECT_ID=flighttrace-749f1
FIREBASE_STORAGE_BUCKET=flighttrace-749f1.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=994719406353
FIREBASE_APP_ID=1:994719406353:web:01523b9811eeefad5094b0
```

### **Important - For Full Features**

```env
# Stripe Payment Processing
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_key
STRIPE_SECRET_KEY=sk_live_your_actual_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret

# SendGrid Email Service
SENDGRID_API_KEY=SG.your_actual_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@flightandtrace.com
SENDGRID_FROM_NAME=FlightTrace

# OpenWeatherMap API
OPENWEATHER_API_KEY=your_actual_weather_api_key

# Google Analytics
GA_MEASUREMENT_ID=G-HS9H3GM0V1
```

### **Application Configuration**

```env
# Application URLs
NODE_ENV=production
REACT_APP_API_URL=https://flightandtrace.com/api
REACT_APP_APP_URL=https://flightandtrace.com

# Feature Flags
REACT_APP_ENABLE_PREMIUM_FEATURES=true
REACT_APP_ENABLE_3D_VIEW=false
REACT_APP_ENABLE_WEATHER_OVERLAY=true
REACT_APP_ENABLE_FLIGHT_ALERTS=true

# System Configuration
FUEL_ESTIMATES_ENABLED=true
API_RATE_LIMIT=100
```

---

## 📋 Step-by-Step Vercel Deployment

### 1. **Prepare Project for Deployment**

```bash
# Build the frontend
cd frontend
npm run build

# Verify build output
ls -la build/
```

### 2. **Set Up Vercel Project**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

### 3. **Configure Environment Variables**

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

**For each environment variable above:**
1. Click "Add New"
2. Enter the Key (e.g., `OPENSKY_USERNAME`)
3. Enter the actual Value (replace placeholder values)
4. Select: ✅ Production, ✅ Preview, ✅ Development
5. Click "Save"

### 4. **Deploy**

```bash
# Deploy to production
vercel --prod

# Or deploy preview
vercel
```

---

## 🔐 Critical Security Checklist

### **API Key Security**
- ✅ **Firebase API Key**: Already domain-restricted to flightandtrace.com
- ⚠️ **OpenSky Password**: Ensure this is your actual password, not placeholder
- ⚠️ **Stripe Keys**: Use `pk_live_` and `sk_live_` for production
- ⚠️ **Supabase Keys**: Get actual keys from your Supabase dashboard

### **Domain Configuration**
- ✅ **Firebase**: Already configured for flightandtrace.com
- ⚠️ **Stripe**: Set webhook endpoint to `https://flightandtrace.com/api/subscription/webhook`
- ⚠️ **Supabase**: Update redirect URLs in auth settings

---

## 📊 Vercel Configuration Features

The `vercel.json` includes:

### **Build Configuration**
- Frontend: Static build deployment
- Backend: Node.js API functions
- React build optimization

### **Routing**
- API endpoints properly mapped
- Static assets served efficiently
- SPA routing handled

### **Performance**
- Asset caching (1 year for images)
- CDN distribution (IAD1 region)
- Optimized headers

---

## 🧪 Post-Deployment Testing

### **Test Core Features**
```bash
# Test API health
curl https://flightandtrace.com/api/health

# Test flight data
curl https://flightandtrace.com/api/flights-live/area?lamin=40&lomin=-74&lamax=41&lomax=-73

# Test authentication
# Visit: https://flightandtrace.com/auth-test.html
```

### **Verify Integrations**
1. **Authentication**: Test Firebase login/signup
2. **Database**: Check Supabase connection
3. **Payments**: Verify Stripe integration
4. **Email**: Test SendGrid notifications
5. **Maps**: Confirm MapLibre GL displays

---

## 🔄 Continuous Deployment

### **GitHub Integration**
The project is configured for automatic deployments:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests
- **Development**: Feature branches

### **Environment Syncing**
```bash
# Pull environment variables locally
vercel env pull .env.local

# Update specific environment variable
vercel env add OPENSKY_PASSWORD
```

---

## 🚨 Troubleshooting

### **Common Issues**

1. **Build Failures**
   - Check Node.js version (requires 18.x+)
   - Verify all dependencies installed
   - Check for TypeScript errors

2. **Environment Variables Not Working**
   - Ensure exact key names (case-sensitive)
   - Check all environments are selected
   - Redeploy after adding variables

3. **API Errors**
   - Verify API endpoints in vercel.json
   - Check function timeouts
   - Monitor Vercel function logs

### **Getting Help**
- Vercel Logs: `vercel logs --follow`
- Function Logs: Dashboard → Functions → View Logs
- Support: https://vercel.com/support

---

**🎯 Ready to Deploy**: Follow this guide step-by-step for a successful FlightTrace deployment with all existing integrations working seamlessly.