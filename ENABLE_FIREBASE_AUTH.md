# 🔐 Enable Firebase Authentication Providers

## Quick Setup Guide

### Step 1: Access Firebase Console
Go to: https://console.firebase.google.com/project/flighttrace-749f1/authentication/providers

### Step 2: Enable Email/Password
1. Click on **Email/Password**
2. Toggle **Enable** to ON
3. Toggle **Email link (passwordless sign-in)** to OFF (we're not using Dynamic Links)
4. Click **Save**

### Step 3: Enable Google Sign-In
1. Click on **Google**
2. Toggle **Enable** to ON
3. Set **Project public-facing name**: FlightTrace
4. Set **Project support email**: Your email address
5. Click **Save**

### Step 4: (Optional) Enable Additional Providers

#### GitHub
1. Click on **GitHub**
2. You'll need:
   - Client ID from GitHub OAuth App
   - Client Secret from GitHub OAuth App
3. Create GitHub OAuth App at: https://github.com/settings/applications/new
   - Application name: FlightTrace
   - Homepage URL: https://flightandtrace.com
   - Authorization callback URL: Copy from Firebase Console

#### Microsoft
1. Click on **Microsoft**
2. You'll need:
   - Application ID from Azure
   - Application Secret from Azure
3. Register at: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps

#### Apple (Requires Apple Developer Account)
1. Click on **Apple**
2. Requires Apple Developer Program membership ($99/year)

## Test Your Configuration

### Live Test Page
Visit: https://flightandtrace.com/auth-test.html

### Local Testing
1. Open the test file locally:
   ```
   C:\Users\maito\flighttrace\public\auth-test.html
   ```

2. Test each authentication method:
   - Email/Password sign up and sign in
   - Google OAuth
   - Password reset
   - Session management

## Verification Checklist

✅ **Email/Password**
- [ ] Sign up creates new user
- [ ] Sign in works with correct credentials
- [ ] Wrong password shows error
- [ ] Password reset email sends

✅ **Google OAuth**
- [ ] Google popup appears
- [ ] Successfully signs in with Google account
- [ ] User info displays correctly

✅ **Future-Proof Features**
- [ ] No dependency on Dynamic Links
- [ ] Session timeout works (24 hours)
- [ ] Persistence settings work
- [ ] Stripe customer creation on signup

## Security Rules (Already Set)

Your Firebase project has these security rules configured:

```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /subscriptions/{subId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.token.admin == true);
    }
  }
}
```

## Environment Variables (Already in Vercel)

Your Vercel deployment has these Firebase variables:
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

## Troubleshooting

### "This operation is not allowed"
- Make sure you've enabled the authentication method in Firebase Console

### "Popup was blocked"
- Allow popups for flightandtrace.com in your browser

### "Network error"
- Check your internet connection
- Verify Firebase project is active

### "Invalid API key"
- Verify the API key in your Firebase configuration
- Check that the domain is authorized in Firebase Console

## Next Steps

1. **Enable providers** in Firebase Console (Email/Password and Google minimum)
2. **Test authentication** at https://flightandtrace.com/auth-test.html
3. **Monitor usage** in Firebase Console Analytics
4. **Consider adding** more providers for user convenience

## Support

- Firebase Documentation: https://firebase.google.com/docs/auth
- FlightTrace Issues: Contact support through the app
- Firebase Status: https://status.firebase.google.com

---

Your authentication system is future-proof and will continue working after Firebase Dynamic Links shutdown on August 25, 2025!