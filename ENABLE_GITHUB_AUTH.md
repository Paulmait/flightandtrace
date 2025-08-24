# 🔐 Enable GitHub Authentication for FlightTrace

## Why Google/GitHub Sign-In Isn't Working

The authentication buttons don't work because:
1. **GitHub provider not enabled** in Firebase Console
2. **Google provider needs configuration** update

## Quick Fix Instructions

### Step 1: Enable GitHub Authentication

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/flighttrace-749f1/authentication/providers

2. **Click on GitHub** in the providers list

3. **Toggle Enable** to ON

4. **You need GitHub OAuth App credentials:**
   
   a. Go to GitHub Settings: https://github.com/settings/developers
   
   b. Click **"New OAuth App"**
   
   c. Fill in:
   - **Application name:** FlightTrace
   - **Homepage URL:** https://flightandtrace.com
   - **Authorization callback URL:** Copy from Firebase Console (it will show you)
   
   d. Click **"Register application"**
   
   e. Copy the **Client ID** and **Client Secret**

5. **Back in Firebase Console:**
   - Paste **Client ID**
   - Paste **Client Secret**
   - Click **Save**

### Step 2: Verify Google Sign-In

1. In Firebase Console, click on **Google** provider
2. Make sure it's **Enabled**
3. Check that **Project support email** is set
4. Click **Save**

### Step 3: Fix Domain Issue

You're currently on a preview deployment. To use the production site:

1. **Go to:** https://flightandtrace.com (NOT the vercel preview URL)
2. **Why?** The API key is restricted to flightandtrace.com domain only

## Testing Authentication

After enabling providers:

1. Visit: https://flightandtrace.com/login.html
2. Click "Sign up for free"
3. Try Google or GitHub sign-in
4. Should redirect to /live.html after successful login

## Troubleshooting

### "This operation is not allowed"
- Provider not enabled in Firebase Console
- Enable the provider following steps above

### "Popup was blocked"
- Browser blocking popups
- Allow popups for flightandtrace.com

### "API key not valid"
- You're on preview URL instead of production
- Use https://flightandtrace.com

### Nothing happens when clicking Google/GitHub
- Check browser console (F12) for errors
- Make sure you're on the production domain
- Verify providers are enabled in Firebase

## Live Tracking Issue (Only 20 Flights)

The live tracking is showing limited flights because:
- OpenSky Network API requires authentication for more data
- Currently using sample/fallback data

To fix:
1. Sign up for OpenSky Network account: https://opensky-network.org/register
2. Add credentials to Vercel environment variables:
   ```
   OPENSKY_USERNAME=your_username
   OPENSKY_PASSWORD=your_password
   ```

## Summary

✅ **Do This Now:**
1. Enable GitHub provider in Firebase Console
2. Verify Google provider is enabled
3. Use https://flightandtrace.com (not preview URL)
4. Test authentication

Your authentication will work once providers are enabled!