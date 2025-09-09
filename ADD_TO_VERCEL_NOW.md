# 🚨 ADD THESE TO VERCEL RIGHT NOW

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

## 1. MapTiler (REQUIRED FOR MAP)

Sign up FREE at https://www.maptiler.com/cloud/register/

Add this variable:
```
REACT_APP_MAPTILER_KEY = [your-maptiler-key-here]
```

## 2. Firebase Variables (ADD REACT_APP_ PREFIX)

Since you already have Firebase variables without the prefix, ADD these new ones:

```
REACT_APP_FIREBASE_API_KEY = [You need to get this from Firebase Console]
REACT_APP_FIREBASE_AUTH_DOMAIN = [Copy value from your existing FIREBASE_AUTH_DOMAIN]
REACT_APP_FIREBASE_PROJECT_ID = [Copy value from your existing FIREBASE_PROJECT_ID]
REACT_APP_FIREBASE_STORAGE_BUCKET = [Copy value from your existing FIREBASE_STORAGE_BUCKET]
REACT_APP_FIREBASE_MESSAGING_SENDER_ID = [Copy value from your existing FIREBASE_MESSAGING_SENDER_ID]
REACT_APP_FIREBASE_APP_ID = [Copy value from your existing FIREBASE_APP_ID]
REACT_APP_FIREBASE_MEASUREMENT_ID = [Copy value from your existing FIREBASE_MEASUREMENT_ID]
```

### Where to find Firebase API Key:
1. Go to https://console.firebase.google.com/
2. Select your project
3. Click the gear icon → Project settings
4. Under "Your apps" → Find your web app
5. Copy the `apiKey` value

## 3. Stripe (For Frontend)

Add this for payment UI:
```
REACT_APP_STRIPE_PUBLISHABLE_KEY = [Copy value from your existing FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY]
```

## ✅ Variables You Already Have (Working)
- OPENSKY_USERNAME ✅
- OPENSKY_PASSWORD ✅  
- OPENWEATHER_API_KEY ✅
- All other Stripe variables ✅

## After Adding Variables:

1. Click "Save" in Vercel
2. Your app will auto-redeploy
3. Wait 1-2 minutes
4. Check your live site

## You Should See:
- 🟢 LIVE status (not error)
- Real aircraft count (50-200+ aircraft)
- Beautiful map tiles (not demo)
- Aircraft moving on the map

## Still Not Working?

Check browser console (F12) for errors.
Most common issue: Missing REACT_APP_MAPTILER_KEY