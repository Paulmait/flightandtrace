# FlightTrace TestFlight Submission Checklist

**Version:** 1.0.0
**Target Date:** December 2024

## Pre-Submission Requirements

### 1. Apple Developer Account Setup

- [ ] Apple Developer Program membership active ($99/year)
- [ ] App ID created in App Store Connect
- [ ] Bundle ID registered: `com.flighttrace.app`
- [ ] Certificates and provisioning profiles configured
- [ ] App Store Connect app record created

### 2. Update eas.json Credentials

Replace placeholder values in `frontend/eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID@email.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

**How to find these values:**
- `appleId`: Your Apple ID email
- `ascAppId`: App Store Connect > Your App > App Information > Apple ID
- `appleTeamId`: Apple Developer Portal > Membership > Team ID

### 3. App Store Connect Configuration

- [ ] App name: "FlightTrace"
- [ ] Subtitle: "Real-Time Flight Tracking"
- [ ] Category: Travel (Primary), Utilities (Secondary)
- [ ] Content Rights: No third-party content
- [ ] Age Rating: 4+ (no objectionable content)
- [ ] Price: Free (with In-App Purchases)

### 4. Privacy Labels (App Privacy)

Configure in App Store Connect > App Privacy:

**Data Linked to You:**
| Data Type | Purpose |
|-----------|---------|
| Email Address | App Functionality |
| Name | App Functionality |
| Precise Location | App Functionality |
| Device ID | Analytics |

**Data Not Linked to You:**
| Data Type | Purpose |
|-----------|---------|
| Crash Data | Analytics |
| Performance Data | Analytics |

**Tracking:** No

### 5. In-App Purchases

Configure in App Store Connect:

| Product ID | Type | Price |
|------------|------|-------|
| `com.flighttrace.premium.monthly` | Auto-Renewable | $4.99/mo |
| `com.flighttrace.premium.yearly` | Auto-Renewable | $39.99/yr |
| `com.flighttrace.professional.monthly` | Auto-Renewable | $9.99/mo |
| `com.flighttrace.professional.yearly` | Auto-Renewable | $79.99/yr |

---

## Build Process

### Step 1: Install Dependencies

```bash
cd frontend
npm install

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login
```

### Step 2: Configure EAS Project

```bash
# Link to Expo project (first time only)
eas init

# Verify configuration
eas project:info
```

### Step 3: Build for iOS

```bash
# Production build for App Store
eas build --platform ios --profile production

# This will:
# - Build the app on Expo's cloud
# - Generate an IPA file
# - Provide a download link when complete
```

Build typically takes 15-30 minutes.

### Step 4: Submit to TestFlight

```bash
# After build completes
eas submit --platform ios --latest

# Or submit a specific build
eas submit --platform ios --id BUILD_ID
```

---

## App Store Listing Content

### Screenshots Required

Generate using: `npm run generate:store-assets`

| Device | Size | Quantity |
|--------|------|----------|
| iPhone 6.5" | 1284 x 2778 | 5-10 |
| iPhone 5.5" | 1242 x 2208 | 5-10 |
| iPad Pro 12.9" | 2048 x 2732 | 5-10 |

### App Description

```
Track flights in real-time with FlightTrace - the intelligent flight
tracking app that keeps you informed about aircraft movements worldwide.

KEY FEATURES:

Live Flight Map
Watch aircraft move across an interactive map with real-time position
updates. See flight paths, altitude, speed, and more.

Flight Details
Get comprehensive information about any flight including aircraft type,
registration, departure/arrival times, and current status.

Smart Alerts
Set up notifications for specific flights. Get alerted about departures,
arrivals, delays, and gate changes.

Fuel & CO2 Tracking
Monitor estimated fuel consumption and carbon emissions for any flight.
Understand the environmental impact of air travel.

Flight History
Keep a personal log of flights you've tracked. Review past trips and
statistics.

SUBSCRIPTION OPTIONS:

Free Tier:
- Live map with nearby aircraft
- Basic flight search
- Limited alerts

Premium ($4.99/month):
- Unlimited flight tracking
- Unlimited alerts
- Flight history
- Ad-free experience

Professional ($9.99/month):
- Everything in Premium
- API access
- Advanced analytics
- Priority support

Privacy-focused design. Your data stays yours. No tracking. No ads for
premium users.

IMPORTANT: FlightTrace is for informational purposes only. Do not use
for aviation safety decisions or navigation.
```

### Keywords (100 characters max)

```
flight tracker,plane finder,live flights,aircraft tracking,flightradar,aviation,airport,departures
```

### Support URL
```
https://flightandtrace.com/support
```

### Privacy Policy URL
```
https://flightandtrace.com/legal/privacy.html
```

---

## Review Notes for Apple

```
Demo Account:
Email: demo@flighttrace.com
Password: [Create demo account before submission]

How to Test:
1. Launch app and complete onboarding (accept disclaimer)
2. View live flight map - aircraft will appear based on real data
3. Tap any aircraft to see flight details
4. Search for a flight using the search bar (try "AA100")
5. Go to Settings > Subscription to view premium options
6. Go to Settings > Privacy & Data to test GDPR features

Notes:
- Flight data comes from public ADS-B receivers via OpenSky Network
- Location permission is for showing nearby airports only
- Background location is for flight proximity alerts
- All payments are handled through Apple's In-App Purchase system
- The app does not require login for basic features

In-App Purchase Testing:
- Use sandbox test account for subscription testing
- Premium features unlock immediately after purchase
- Restore Purchases button is in Settings screen
```

---

## Post-Submission

### TestFlight Beta Testing

1. After build is processed, enable External Testing
2. Add beta test information
3. Submit for Beta App Review
4. Once approved, invite testers via email or public link

### Beta Test Groups

| Group | Purpose | Access |
|-------|---------|--------|
| Internal | Core team | Full features |
| External - Early | Power users | All features |
| External - Public | General beta | Staged rollout |

### Feedback Collection

- TestFlight feedback: In-app via TestFlight app
- Bug reports: GitHub Issues
- Feature requests: Email support@flighttrace.com

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
eas build --clear-cache --platform ios --profile production
```

### Credentials Issues

```bash
# Reset credentials
eas credentials --platform ios

# View current credentials
eas credentials --platform ios --profile production
```

### Submission Rejected

Common reasons and fixes:
1. **Metadata Rejection**: Update description/screenshots
2. **Guideline 2.1 - Performance**: Ensure app doesn't crash
3. **Guideline 5.1 - Privacy**: Verify privacy policy URL works
4. **Guideline 3.1 - Payments**: Only use Apple IAP for digital goods

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2024 | Initial submission |

---

*Last updated: December 29, 2024*
