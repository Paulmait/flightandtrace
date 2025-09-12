# Vercel Environment Variables Checklist

## ✅ REQUIRED (Must Add to Vercel Dashboard)

These variables MUST be added in Vercel Dashboard → Settings → Environment Variables:

### 🗺️ Map Provider (CRITICAL - App won't work without this)
```
REACT_APP_MAPTILER_KEY=your_maptiler_key_here
```
**Get your free key at:** https://cloud.maptiler.com/account/keys/
- Free tier: 100,000 requests/month
- No credit card required

### 🔧 Basic Configuration
```
NODE_ENV=production
```

## 📦 OPTIONAL (For Enhanced Features)

### Supabase (User Authentication & Data Storage)
```
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJxxxxx...
```
**Get free at:** https://supabase.com (Free tier available)

### OpenSky Network (Better Flight Data)
```
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
```
**Register free at:** https://opensky-network.org/register
- Provides better rate limits when authenticated
- Works without these (uses anonymous access)

### Firebase (Alternative Auth - Already has defaults)
```
# These are OPTIONAL - app has working defaults
REACT_APP_FIREBASE_API_KEY=AIzaSyDMJkPbOjp4oQNxb-EVK-Yh1pVSrOuDJgQ
REACT_APP_FIREBASE_PROJECT_ID=flighttrace-749f1
```

### Stripe (Payment Processing - Future)
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
```

### Sentry (Error Tracking - Future)
```
REACT_APP_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

## 🚀 Quick Setup Steps

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your project

2. **Navigate to Settings → Environment Variables**

3. **Add the REQUIRED variables:**
   - Click "Add New"
   - Name: `REACT_APP_MAPTILER_KEY`
   - Value: Your MapTiler key
   - Environment: ✅ Production, ✅ Preview, ✅ Development
   - Click "Save"

4. **Add NODE_ENV:**
   - Name: `NODE_ENV`
   - Value: `production`
   - Environment: ✅ Production
   - Click "Save"

5. **Redeploy your application:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Select "Redeploy"

## 🔍 How to Verify Variables are Working

After deployment, check:

1. **Map is displaying:** If you see the map, MapTiler key is working
2. **Flights are loading:** Check browser console for any API errors
3. **No CORS errors:** Check Network tab in browser DevTools

## 🆘 Troubleshooting

### Map not showing?
- Check `REACT_APP_MAPTILER_KEY` is set correctly
- Verify key is active in MapTiler dashboard

### Flights not loading?
- The app works with anonymous OpenSky access by default
- Add OpenSky credentials for better performance

### Build still failing?
- Make sure you've pulled latest changes: `git pull`
- Check Node.js version in Vercel (should use 20.x)

## 📝 Environment Variable Notes

- Variables starting with `REACT_APP_` are available in the frontend
- Variables without this prefix are only available in API functions
- Vercel automatically injects these during build and runtime
- Changes require redeployment to take effect

## 🔒 Security Notes

- Never commit `.env` files to Git
- Use Vercel's environment variables for all secrets
- Rotate API keys regularly
- Use different keys for development/production

---

**Need help?** Check deployment logs in Vercel Dashboard → Functions → Logs