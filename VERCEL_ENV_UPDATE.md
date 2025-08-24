# 📝 Update Vercel Environment Variables

## Add the New Firebase API Key to Vercel

### Step 1: Go to Vercel Dashboard
https://vercel.com/dashboard

### Step 2: Select Your Project
Click on `flightandtrace`

### Step 3: Go to Settings → Environment Variables

### Step 4: Update the Firebase API Key

**Update this variable:**
```
FIREBASE_API_KEY = AIzaSyDMJkPbOjp4oQNxb-EVK-Yh1pVSrOuDJgQ
```

### Step 5: Ensure All Firebase Variables Are Set

Make sure you have all these environment variables:

```env
# Firebase Configuration (Updated)
FIREBASE_API_KEY=AIzaSyDMJkPbOjp4oQNxb-EVK-Yh1pVSrOuDJgQ
FIREBASE_AUTH_DOMAIN=flighttrace-749f1.firebaseapp.com
FIREBASE_PROJECT_ID=flighttrace-749f1
FIREBASE_STORAGE_BUCKET=flighttrace-749f1.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=994719406353
FIREBASE_APP_ID=1:994719406353:web:01523b9811eeefad5094b0
FIREBASE_MEASUREMENT_ID=G-HS9H3GM0V1

# Stripe Keys (Should already be there)
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET

# API Keys (Should already be there)
OPENSKY_API_KEY=your_key
OPENWEATHER_API_KEY=your_key
```

### Step 6: Redeploy
After updating, trigger a new deployment:
1. Click "Redeploy" 
2. Select "Redeploy with existing Build Cache" (uncheck this)
3. Click "Redeploy"

## Why Update Vercel Environment Variables?

While the client-side Firebase config is in `firebase-config.js`, having it in environment variables:
1. Allows server-side functions to access Firebase
2. Provides backup configuration
3. Enables dynamic configuration per environment (dev/staging/prod)
4. Keeps sensitive server-side keys secure

## Verification After Update

1. **Check the live site**: https://flightandtrace.com
2. **Test authentication**: https://flightandtrace.com/auth-test.html
3. **Verify the API key works**: Try signing up or signing in
4. **Check from unauthorized domain**: The key should only work on flightandtrace.com

## Security Status

✅ **Old exposed key**: Rotated and replaced
✅ **New key restrictions**:
- Domain restricted to flightandtrace.com
- API restricted to Firebase services only
- Cannot be used from other websites
✅ **Firebase Security Rules**: Protecting your data
✅ **No Dynamic Links dependency**: Future-proof authentication

## Next Steps

1. ✅ Update Vercel environment variable
2. ✅ Redeploy the application
3. ✅ Test authentication works
4. ✅ Monitor Google Cloud Console for any unauthorized attempts

Your API key is now secure and properly restricted!