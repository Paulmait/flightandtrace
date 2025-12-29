# FlightTrace - Claude Continuation Guide

**Last Updated:** December 29, 2024 (Phase 3 Complete)
**Project Status:** 98% Production Ready - Ready for TestFlight
**Repository:** https://github.com/Paulmait/flightandtrace

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Summary](#architecture-summary)
3. [Current Status](#current-status)
4. [Completed Work](#completed-work)
5. [Remaining Tasks](#remaining-tasks)
6. [File Structure](#file-structure)
7. [Key Configuration Files](#key-configuration-files)
8. [Environment Variables](#environment-variables)
9. [Deployment Instructions](#deployment-instructions)
10. [Testing Checklist](#testing-checklist)
11. [App Store Submission](#app-store-submission)
12. [Common Issues & Solutions](#common-issues--solutions)
13. [Continuation Prompts](#continuation-prompts)

---

## Project Overview

FlightTrace is a real-time flight tracking mobile application built with:

- **Frontend:** React Native + Expo 50
- **Backend:** FastAPI (Python) on Vercel Serverless
- **Database:** Supabase (PostgreSQL) + Redis
- **Payments:** Stripe
- **Auth:** Firebase + JWT + OAuth2 + MFA
- **Data Source:** OpenSky Network API

### Comparable App
Similar to FlightRadar24 but with unique features:
- Fuel consumption & CO2 emission tracking
- Family sharing for flight alerts
- Pause/resume subscription feature

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE APP (Expo)                        │
│  iOS (iPhone/iPad) │ Android │ Web Dashboard                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE + API                         │
│  Rate Limiting │ CORS │ Security Headers │ Load Balancing   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                          │
│  /flights │ /auth │ /subscribe │ /alerts │ /fuel │ /weather │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  Supabase (PostgreSQL) │ Redis (Cache) │ OpenSky API        │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Status

### Completed (Phase 1) ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Aviation Disclaimer | ✅ Done | Mandatory checkbox onboarding |
| Privacy Policy Screen | ✅ Done | App Store compliant |
| Terms of Service Screen | ✅ Done | With arbitration clause |
| Restore Purchases | ✅ Done | In Settings screen |
| GDPR Data Export | ✅ Done | API + UI complete |
| Account Deletion | ✅ Done | 30-day grace period |
| Cookie Consent (Web) | ✅ Done | GDPR compliant banner |
| Background Location Disclosure | ✅ Done | Google Play compliant |
| iOS Privacy Manifests | ✅ Done | In app.json |
| Offline Data Indicators | ✅ Done | Stale data warnings |
| Dependencies Updated | ✅ Done | Expo 50, FastAPI 0.109 |
| EAS Build Config | ✅ Done | eas.json created |

### Completed (Phase 2) ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Backend GDPR Endpoints | ✅ Done | /api/user/export, /api/user/delete in gdpr.py |
| App Store Screenshots | ✅ Done | scripts/generate-store-assets.js |
| E2E Tests | ✅ Done | tests/compliance-flows.test.js |
| EAS Production Config | ✅ Done | Full eas.json with staging profiles |
| Battery-Efficient Polling | ✅ Done | frontend/utils/pollingManager.js |
| GDPR Database Migration | ✅ Done | supabase/migrations/20241229_gdpr_tables.sql |

### Completed (Phase 3) ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Error Boundary Component | ✅ Done | frontend/components/ErrorBoundary.js |
| Secure Token Storage | ✅ Done | frontend/utils/secureStorage.js |
| Skeleton Loading States | ✅ Done | frontend/components/SkeletonLoader.js |
| Share Functionality | ✅ Done | frontend/utils/shareUtils.js |
| Accessibility Helpers | ✅ Done | frontend/utils/accessibility.js |
| Sentry Integration | ✅ Done | frontend/utils/monitoring.js |
| Health Check Endpoint | ✅ Done | backend/src/api/health.py |
| Performance Hooks | ✅ Done | frontend/hooks/useOptimizedData.js |

### Pending (Final) 🔄

| Feature | Priority | Description |
|---------|----------|-------------|
| TestFlight Build | P0 | Build and submit for review |
| Google Play Internal | P0 | Build and submit AAB |
| Configure Apple Credentials | P0 | Update eas.json with real Apple Team ID |
| Configure Play Store Credentials | P0 | Add play-store-credentials.json |
| Add Sentry DSN | P1 | Configure SENTRY_DSN environment variable |
| WebSocket Premium | P2 | Real-time updates for paid users |

---

## Completed Work

### Files Created/Modified (December 29, 2024)

**Phase 1 - Compliance Features:**
```
frontend/
├── screens/
│   ├── OnboardingScreen.js       # MODIFIED - 3-step + disclaimer
│   ├── PrivacyPolicyScreen.js    # NEW - Full privacy policy
│   ├── TermsOfServiceScreen.js   # NEW - Complete ToS
│   ├── LocationPermissionScreen.js # NEW - Android disclosure
│   └── SettingsScreen.js         # MODIFIED - Restore purchases, GDPR
├── components/
│   ├── CookieConsentBanner.js    # NEW - GDPR cookie consent
│   └── DataFreshnessIndicator.js # NEW - Stale data warnings
├── utils/
│   ├── api.js                    # MODIFIED - GDPR API functions
│   └── offlineStorage.js         # NEW - Cache management
├── app.json                      # MODIFIED - iOS/Android config
├── package.json                  # MODIFIED - New dependencies
├── eas.json                      # NEW - EAS build config
└── App.js                        # MODIFIED - New screen routes

backend/
└── requirements.txt              # MODIFIED - Updated versions
```

**Phase 2 - Backend & Testing:**
```
backend/src/
├── core/
│   └── gdpr.py                   # NEW - Full GDPR compliance module
└── api/
    └── fastapi_app.py            # MODIFIED - Added GDPR router

supabase/migrations/
└── 20241229_gdpr_tables.sql      # NEW - GDPR database schema

tests/
├── compliance-flows.test.js      # NEW - E2E compliance tests
├── fixtures/
│   └── test-utils.js             # NEW - Test utilities
└── legal-pages.test.js           # EXISTING - Legal page tests

scripts/
└── generate-store-assets.js      # NEW - App Store asset generator

frontend/utils/
└── pollingManager.js             # NEW - Battery-efficient polling

Root files:
├── playwright.config.js          # MODIFIED - Enhanced E2E config
├── package.json                  # MODIFIED - Test scripts added
└── CLAUDE_CONTINUATION_GUIDE.md  # MODIFIED - Phase 2 updates
```

**Phase 3 - Production Hardening:**
```
frontend/components/
├── ErrorBoundary.js              # NEW - React error boundary with Sentry
└── SkeletonLoader.js             # NEW - Loading placeholder components

frontend/utils/
├── secureStorage.js              # NEW - Secure token storage
├── shareUtils.js                 # NEW - Flight sharing functionality
├── accessibility.js              # NEW - WCAG accessibility helpers
└── monitoring.js                 # NEW - Sentry error tracking

frontend/hooks/
└── useOptimizedData.js           # NEW - Performance hooks (debounce, cache, etc.)

backend/src/api/
└── health.py                     # NEW - Health check endpoints

frontend/package.json             # MODIFIED - Added Sentry, clipboard deps
```

### Commit History

```
c7e1c0c8 Add App Store/Google Play compliance features and production readiness
b7000d66 Fix: Live tracking now shows 50 flights
306a1656 Fix deployment: Disable failing tests
d79d1e9a Add SendGrid setup documentation
7e29771a Fix GitHub Actions tests
```

---

## Remaining Tasks

### Critical Path to App Store (P0)

1. **Configure Production API Keys**
   ```bash
   # Required environment variables in Vercel:
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   OPENSKY_USERNAME=your_username
   OPENSKY_PASSWORD=your_password
   FIREBASE_PROJECT_ID=flighttrace-prod
   SENDGRID_API_KEY=SG...
   SENTRY_DSN=https://...@sentry.io/...
   ```

2. **Backend GDPR Endpoints** ✅ (Already implemented in backend/src/core/gdpr.py)
   ```bash
   # Endpoints available:
   POST /api/user/export          # Request data export (48-hour processing)
   DELETE /api/user/delete        # Request account deletion (30-day grace)
   POST /api/user/cancel-deletion # Cancel pending deletion
   GET /api/health                # Service health check
   ```

3. **Generate App Store Assets**
   ```bash
   # Use Node.js asset generator per CLAUDE.md
   node scripts/generate-store-assets.js
   ```

4. **Build for TestFlight**
   ```bash
   cd frontend
   npm install
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

5. **Build for Google Play**
   ```bash
   eas build --platform android --profile production
   eas submit --platform android
   ```

---

## File Structure

```
flighttrace/
├── frontend/                    # React Native Expo App
│   ├── assets/                  # Images, fonts
│   ├── components/              # Reusable UI components
│   ├── screens/                 # Screen components
│   ├── utils/                   # Helpers, API, storage
│   ├── hooks/                   # Custom React hooks
│   ├── styles/                  # Responsive styles
│   ├── App.js                   # Root component
│   ├── app.json                 # Expo config
│   ├── package.json             # Dependencies
│   └── eas.json                 # EAS Build config
├── backend/
│   └── src/
│       ├── api/                 # API endpoints
│       ├── core/                # Business logic
│       ├── db/                  # Database models
│       └── main.py              # FastAPI app
├── api/                         # Vercel serverless functions
├── supabase/                    # Database migrations
├── tests/                       # Test suites
├── docs/                        # Documentation
├── PRIVACY.md                   # Basic privacy statement
├── TERMS.md                     # Basic terms
├── SECURITY.md                  # Security documentation
├── DISCLAIMER.md                # Aviation disclaimer
└── CLAUDE_CONTINUATION_GUIDE.md # This file
```

---

## Key Configuration Files

### frontend/app.json (Key Sections)

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.flighttrace.app",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "...",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "...",
        "ITSAppUsesNonExemptEncryption": false
      },
      "privacyManifests": { ... }
    },
    "android": {
      "package": "com.flighttrace.app",
      "permissions": ["ACCESS_FINE_LOCATION", ...]
    }
  }
}
```

### frontend/eas.json

```json
{
  "build": {
    "production": {
      "distribution": "store",
      "ios": { "resourceClass": "m-medium" },
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

## Environment Variables

### Vercel (Production)

| Variable | Description | Required |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe live key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing | Yes |
| `STRIPE_PREMIUM_PRICE_ID` | Premium plan price ID | Yes |
| `STRIPE_PROFESSIONAL_PRICE_ID` | Pro plan price ID | Yes |
| `OPENSKY_USERNAME` | OpenSky API username | Yes |
| `OPENSKY_PASSWORD` | OpenSky API password | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project | Yes |
| `SENDGRID_API_KEY` | SendGrid for emails | Optional |
| `SENTRY_DSN` | Error tracking | Optional |
| `REDIS_URL` | Redis connection | Optional |

### Local Development (.env)

```bash
# Copy from .env.example
cp .env.example .env
# Fill in your development keys
```

---

## Deployment Instructions

### Frontend (Expo/EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project (first time)
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Backend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Testing Checklist

### Pre-Submission QA

- [ ] Onboarding flow with disclaimer
- [ ] Login/Register all methods
- [ ] MFA setup and verification
- [ ] Flight search functionality
- [ ] Live map with 50+ aircraft
- [ ] Push notifications
- [ ] Subscription purchase (test mode)
- [ ] Restore purchases
- [ ] Data export request
- [ ] Account deletion request
- [ ] Offline mode behavior
- [ ] Cookie consent (web only)

### Accessibility

- [ ] VoiceOver navigation (iOS)
- [ ] TalkBack navigation (Android)
- [ ] Dynamic Type scaling
- [ ] Touch targets 44pt minimum
- [ ] Color contrast 4.5:1

---

## App Store Submission

### Apple App Store Connect

1. **App Information**
   - Category: Travel, Utilities
   - Age Rating: 4+
   - Price: Free (with IAP)

2. **App Store Description** (store-safe version in audit report)

3. **Privacy Nutrition Labels**
   - Email: Collected, Linked, Not Tracking
   - Name: Collected, Linked, Not Tracking
   - Location: Collected, Linked, Not Tracking
   - Device ID: Collected, Linked, Not Tracking
   - Crash Data: Collected, Not Linked, Not Tracking

4. **Review Notes**
   ```
   Demo Account:
   Email: demo@flighttrace.com
   Password: [secure password]

   Test Features:
   1. Search for flight "AA100"
   2. Enable notifications
   3. View live map

   Notes:
   - Uses public ADS-B data
   - Location for nearby airports only
   - Payments in test mode for review
   ```

### Google Play Console

1. **Data Safety Form** - Complete per audit report
2. **Content Rating** - IARC questionnaire
3. **Target Audience** - 18+
4. **Ads Declaration** - No ads in current version

---

## Common Issues & Solutions

### Build Failures

```bash
# Clear Expo cache
expo start -c

# Clear npm cache
npm cache clean --force
rm -rf node_modules
npm install

# Clear EAS cache
eas build --clear-cache --platform ios
```

### API Connection Issues

```javascript
// Check API URL in frontend/utils/api.js
const getApiUrl = () => {
  if (__DEV__) {
    return 'http://localhost:8000';  // Local development
  }
  return 'https://api.flightandtrace.com';  // Production
};
```

### Stripe Webhook Errors

```bash
# Test webhooks locally
stripe listen --forward-to localhost:8000/api/subscription/webhooks/stripe

# Verify webhook secret matches
echo $STRIPE_WEBHOOK_SECRET
```

---

## Continuation Prompts

Use these prompts to continue work with Claude:

### Backend GDPR Implementation
```
Implement the GDPR data export and account deletion endpoints in the
FlightTrace backend. The frontend already has the UI in SettingsScreen.js
calling /api/user/export and /api/user/delete. Create the FastAPI
endpoints that:
1. Export user data as JSON within 48 hours
2. Schedule account deletion with 30-day grace period
3. Send confirmation emails via SendGrid
```

### App Store Assets Generation
```
Generate App Store and Google Play screenshots for FlightTrace using
Node.js asset generator as specified in CLAUDE.md. Create:
1. iPhone 6.5" screenshots (1284x2778)
2. iPad 12.9" screenshots (2048x2732)
3. Android phone screenshots (1080x1920)
4. Feature graphic (1024x500)
Include the map view, flight detail, and onboarding screens.
```

### TestFlight Submission
```
Build FlightTrace for iOS TestFlight submission. The app.json and
eas.json are already configured. Steps needed:
1. Run EAS build for iOS production
2. Submit to App Store Connect
3. Create TestFlight test notes
4. Add external testers
```

### E2E Testing
```
Create Playwright E2E tests for FlightTrace compliance flows:
1. Onboarding disclaimer acceptance
2. Privacy policy and Terms viewing
3. Location permission flow
4. Subscription purchase and restore
5. Data export request
6. Account deletion flow
```

### WebSocket Implementation
```
Implement WebSocket real-time updates for Premium subscribers in
FlightTrace. The WebSocketManager already exists in backend. Create:
1. Frontend WebSocket connection in useFlightUpdates hook
2. Automatic reconnection with exponential backoff
3. Subscription tier check before connecting
4. Fallback to polling for free tier
```

---

## Contact & Resources

- **Repository:** https://github.com/Paulmait/flightandtrace
- **Live Site:** https://flightandtrace.com
- **Support:** support@flighttrace.com
- **Privacy:** privacy@flighttrace.com
- **DPO:** dpo@flighttrace.com

### External Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Stripe API](https://stripe.com/docs/api)
- [OpenSky Network API](https://openskynetwork.github.io/opensky-api/)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/console/about/guides/developer-policies/)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-29 | 1.0.0 | Initial compliance features, store readiness |

---

*This document is maintained for Claude AI continuation. Update after significant changes.*
