# 🔒 URGENT: Secure Your Firebase API Key

## Immediate Actions Required

### Step 1: Restrict Your Current API Key (5 minutes)

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials?project=flighttrace-749f1

2. **Find your API key:** `AIzaSyAzOLlHRbCDRHEDOqS2rHrgjN5ETAaRA-4`

3. **Click on the API key name** to edit it

4. **Set Application Restrictions:**
   - Select: **HTTP referrers (websites)**
   - Add these referrers:
     ```
     https://flightandtrace.com/*
     https://*.flightandtrace.com/*
     http://localhost:*/*
     http://127.0.0.1:*/*
     ```

5. **Set API Restrictions:**
   - Select: **Restrict key**
   - Enable only these APIs:
     - ✅ Identity Toolkit API
     - ✅ Firebase Installations API
     - ✅ FCM Registration API (if using push notifications)
     - ✅ Cloud Firestore API (if using Firestore)

6. **Click SAVE**

### Step 2: Create a New Restricted API Key (Recommended)

1. **In Google Cloud Console**, click **+ CREATE CREDENTIALS** > **API key**

2. **Immediately restrict the new key** with the same settings as above

3. **Name it:** `flighttrace-web-restricted`

4. **Update your code** with the new key

### Step 3: Delete or Regenerate the Exposed Key

Since your key was exposed on GitHub:

1. **Option A: Regenerate** (Recommended)
   - Click on the exposed key
   - Click **REGENERATE KEY**
   - Update your code with the new key

2. **Option B: Delete and Create New**
   - Delete the exposed key
   - Create a new restricted key
   - Update all references

### Step 4: Update Your Code

After restricting/regenerating your key:

1. Update `public/firebase-config.js`:
```javascript
return {
    apiKey: "YOUR_NEW_RESTRICTED_KEY", // Replace with new key
    authDomain: "flighttrace-749f1.firebaseapp.com",
    // ... rest of config
};
```

2. Commit and push the changes

## Why This Happened

Firebase API keys are meant to be public for client-side apps, BUT they should always be:
- **Domain restricted** (only work on your domains)
- **API restricted** (only work with specific Firebase services)

## Security Best Practices

### ✅ API Key Restrictions (What We're Doing)
- Domain restrictions prevent other websites from using your key
- API restrictions limit which services can be accessed
- Regular key rotation (every 90 days recommended)

### ✅ Firebase Security Rules (Already Configured)
Your Firebase Security Rules already protect your data:
```javascript
// Only authenticated users can access their own data
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### ✅ Additional Security Measures

1. **Enable App Check** (Advanced Protection)
   - Go to Firebase Console > App Check
   - Enable for your web app
   - This ensures only your app can access Firebase services

2. **Monitor Usage**
   - Check Firebase Console > Usage tab
   - Set up billing alerts
   - Monitor for unusual activity

3. **Use Environment Variables for Sensitive Keys**
   - Stripe keys (already in Vercel env vars) ✅
   - Server-side API keys (already secured) ✅
   - Firebase Admin SDK (server-side only) ✅

## Verification Checklist

After completing the steps:

- [ ] API key is restricted to your domains
- [ ] API key only works with Firebase services
- [ ] Old exposed key is regenerated or deleted
- [ ] New key works on flightandtrace.com
- [ ] Authentication still works correctly
- [ ] No errors in browser console

## Testing After Restriction

1. **Test on your live site:** https://flightandtrace.com/auth-test.html
   - Should work normally ✅

2. **Test from a different domain:**
   - Should get "API key not valid" error ✅

3. **Check Google Cloud Console:**
   - Monitor API usage
   - Check for any blocked requests

## FAQ

**Q: Will restricting the key break my app?**
A: No, if you add all your domains (including localhost for development)

**Q: Is my data compromised?**
A: No, Firebase Security Rules protect your data even with exposed keys

**Q: How often should I rotate keys?**
A: Every 90 days for production keys, immediately if exposed

**Q: Can I use environment variables for client-side keys?**
A: Client-side keys are always visible in browser code. The solution is restriction, not hiding.

## Important Notes

- **Firebase API keys are designed to be public** but must be restricted
- **Never commit Firebase Admin SDK credentials** (service account keys)
- **Always use Firebase Security Rules** to protect data
- **Enable Firebase App Check** for additional protection

## Support

- [Firebase API Key Best Practices](https://firebase.google.com/docs/projects/api-keys)
- [Google Cloud API Key Restrictions](https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

---

⚠️ **Action Required: Complete Step 1 immediately to secure your API key**