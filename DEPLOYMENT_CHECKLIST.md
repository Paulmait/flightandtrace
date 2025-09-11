# 🚀 Deployment Checklist & Troubleshooting

## Current Status
The APIs are returning 404 errors. This usually means:
1. The API routes are not properly configured
2. The build is failing on Vercel
3. Environment variables are missing

## 🔧 Step-by-Step Fix

### 1. Check Vercel Dashboard
Go to: https://vercel.com/dashboard

Look for:
- ❌ Build errors (red X)
- ⚠️ Function errors
- 📝 Missing environment variables

### 2. Add MINIMUM Required Environment Variables

Go to: Settings → Environment Variables

Add these NOW (minimum to get working):

```env
# OpenSky API (REQUIRED - or app won't work)
OPENSKY_USERNAME=your_opensky_username
OPENSKY_PASSWORD=your_opensky_password

# Security (REQUIRED - generate random strings)
JWT_SECRET=any64characterrandomstringhereuseapasswordgeneratorplease123456
SESSION_SECRET=different64characterrandomstringhereforsessionsecurity12345678
INTERNAL_API_KEY=32characterrandomstringforapi12
```

**To Generate Random Strings:**
- Go to: https://passwordsgenerator.net/
- Set length: 64 characters
- Include: All character types
- Copy and use

### 3. Fix API Routes

The issue might be that Vercel can't find the API files. Check:

1. **Vercel Build Output**
   - Go to your deployment
   - Click on "Function" tab
   - Should show: `/api/flights`, `/api/airports`, etc.

2. **If APIs are missing**, the issue is likely:
   - Files are in wrong location
   - Build command is incorrect
   - vercel.json configuration issue

### 4. Quick Fix for API Routes

Create a simple test API to verify Vercel is working:

```javascript
// api/test.js
export default function handler(req, res) {
  res.status(200).json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
}
```

Then test: `https://flightandtrace.vercel.app/api/test`

### 5. Database Setup (Can be done later)

For full features, set up Supabase:

1. Go to https://supabase.com
2. Create new project (free)
3. Go to Settings → API
4. Copy these to Vercel:

```env
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Redis Cache (Optional but recommended)

For better performance:

1. Go to https://upstash.com
2. Create Redis database (free)
3. Copy connection string to Vercel:

```env
REDIS_URL=redis://default:password@endpoint.upstash.io:port
```

## 🔍 Debugging Steps

### Check Build Logs
1. Go to Vercel dashboard
2. Click on your deployment
3. Click "View Function Logs" or "View Build Logs"
4. Look for errors like:
   - `Module not found`
   - `Cannot find package`
   - `Build failed`

### Common Errors and Fixes

#### "MODULE_NOT_FOUND"
```bash
# Missing dependencies - add to package.json:
"dependencies": {
  "ioredis": "^5.3.2",
  "jsonwebtoken": "^9.0.2",
  "express-rate-limit": "^7.1.5"
}
```

#### "Cannot read environment variables"
- Environment variables not set in Vercel
- Go to Settings → Environment Variables
- Add all required variables

#### "Build failed"
- Check `vercel.json` configuration
- Ensure `buildCommand` and `outputDirectory` are correct

## 📋 Complete Environment Variables List

### Critical (Add First)
```env
OPENSKY_USERNAME=xxx
OPENSKY_PASSWORD=xxx
JWT_SECRET=xxx
```

### Important (Add Soon)
```env
REDIS_URL=xxx
OPENWEATHER_API_KEY=xxx
REACT_APP_SUPABASE_URL=xxx
REACT_APP_SUPABASE_ANON_KEY=xxx
```

### Optional (Add Later)
```env
STRIPE_PUBLISHABLE_KEY=xxx
STRIPE_SECRET_KEY=xxx
SENDGRID_API_KEY=xxx
SENTRY_DSN=xxx
GA_MEASUREMENT_ID=xxx
```

## 🧪 Test After Deployment

### 1. Test Basic API
```bash
curl https://flightandtrace.vercel.app/api/test
```

### 2. Test Flight API
```bash
curl "https://flightandtrace.vercel.app/api/flights?bbox=-10,40,10,60"
```

### 3. Test Frontend
Visit: https://flightandtrace.vercel.app

Should see:
- Map loading
- Flight data (if API works)
- No errors in console

## 🚨 If Still Not Working

### Option 1: Redeploy
```bash
# From your local machine
git add .
git commit -m "Fix deployment issues"
git push origin master
```

### Option 2: Manual Redeploy
1. Go to Vercel dashboard
2. Click "Redeploy"
3. Choose "Redeploy with existing Build Cache"

### Option 3: Check Function Logs
1. Go to Functions tab in Vercel
2. Click on any function (e.g., flights)
3. View real-time logs
4. Look for error messages

## 📞 Getting Help

### Vercel Support
- Documentation: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions
- Status: https://www.vercel-status.com/

### Common Issues
- API returns 404: Files not in `/api` folder
- API returns 500: Missing environment variables
- Build fails: Check `package.json` dependencies
- CORS errors: Update `vercel.json` headers

## ✅ Success Indicators

You'll know it's working when:
1. `https://flightandtrace.vercel.app/api/flights` returns JSON data
2. The map shows live aircraft
3. No errors in browser console
4. Test suite passes: `node test-backend.js https://flightandtrace.vercel.app`

---

**Remember**: After adding environment variables, you MUST redeploy for changes to take effect!