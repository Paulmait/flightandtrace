# 📝 Manual Firebase Collections Setup

If you prefer to create collections manually in Firebase Console, follow these steps:

## Quick Method: Run the Script

```bash
cd scripts
npm install firebase-admin
node setupFirebase.js
```

## Manual Method: Firebase Console

Go to [Firebase Console](https://console.firebase.google.com/) → Your Project → Firestore Database

### Create Each Collection:

## 1️⃣ Collection: `system`

Click **"Start collection"** → Collection ID: `system`

**Document 1:** `config`
```javascript
{
  version: "1.0.0",
  maintenanceMode: false,
  maxFlightsPerRequest: 500,
  updateInterval: 30000,
  dataRetentionDays: 30,
  features: {
    liveTracking: true,
    historicalData: true,
    weatherOverlay: true,
    alerts: true,
    darkMode: true
  },
  createdAt: (timestamp)
}
```

## 2️⃣ Collection: `subscriptionTiers`

**Document 1:** `free`
```javascript
{
  id: "free",
  name: "Free",
  price: 0,
  features: {
    maxTrackedFlights: 5,
    historyDays: 1,
    refreshRate: 60000,
    apiCallsPerDay: 100,
    exportData: false,
    weatherOverlay: false,
    alerts: false
  }
}
```

**Document 2:** `premium`
```javascript
{
  id: "premium",
  name: "Premium",
  price: 9.99,
  stripePriceId: "price_premium_monthly",
  features: {
    maxTrackedFlights: 50,
    historyDays: 7,
    refreshRate: 30000,
    apiCallsPerDay: 1000,
    exportData: true,
    weatherOverlay: true,
    alerts: true,
    maxAlerts: 10
  }
}
```

**Document 3:** `professional`
```javascript
{
  id: "professional",
  name: "Professional",
  price: 24.99,
  stripePriceId: "price_professional_monthly",
  features: {
    maxTrackedFlights: "unlimited",
    historyDays: 30,
    refreshRate: 10000,
    apiCallsPerDay: 10000,
    exportData: true,
    weatherOverlay: true,
    alerts: true,
    maxAlerts: "unlimited",
    apiAccess: true
  }
}
```

## 3️⃣ Collection: `flights`

**Document:** Click "Auto-ID"
```javascript
{
  icao24: "4b1805",
  callsign: "SWR123",
  position: {
    latitude: 51.4775,
    longitude: -0.4614,
    altitude: 38000,
    heading: 85,
    speed: 465
  },
  status: "EN_ROUTE",
  lastUpdate: (timestamp),
  source: "OPENSKY"
}
```

## 4️⃣ Collection: `users`

Leave empty - will be populated when users sign up

## 5️⃣ Collection: `rateLimits`

**Document:** `default`
```javascript
{
  endpoints: {
    "/api/flights": {
      windowMs: 60000,
      maxRequests: 100
    },
    "/api/weather": {
      windowMs: 60000,
      maxRequests: 50
    },
    "/api/auth/signup": {
      windowMs: 3600000,
      maxRequests: 5
    }
  },
  createdAt: (timestamp)
}
```

## 6️⃣ Collection: `dataSources`

**Document:** `config`
```javascript
{
  primary: "opensky",
  sources: {
    opensky: {
      enabled: true,
      url: "https://opensky-network.org/api",
      rateLimit: 100,
      priority: 1,
      status: "operational"
    }
  },
  createdAt: (timestamp)
}
```

## 7️⃣ Collection: `analytics`

**Document:** `overview`
```javascript
{
  totalUsers: 0,
  totalFlightsTracked: 0,
  totalApiCalls: 0,
  lastUpdated: (timestamp),
  usersByTier: {
    free: 0,
    premium: 0,
    professional: 0
  }
}
```

## 8️⃣ Collection: `airports`

**Document:** `EGLL`
```javascript
{
  icao: "EGLL",
  iata: "LHR",
  name: "London Heathrow Airport",
  city: "London",
  country: "United Kingdom",
  coordinates: {
    latitude: 51.4700,
    longitude: -0.4543
  }
}
```

## 9️⃣ Collection: `featureFlags`

**Document:** `current`
```javascript
{
  darkMode: true,
  weatherLayers: true,
  satelliteView: true,
  advancedFilters: true,
  updatedAt: (timestamp)
}
```

## ✅ Verification Checklist

After creating all collections, verify:

- [ ] `system` collection has `config` document
- [ ] `subscriptionTiers` has 3 documents (free, premium, professional)
- [ ] `flights` has at least 1 sample flight
- [ ] `rateLimits` has `default` document
- [ ] `dataSources` has `config` document
- [ ] `analytics` has `overview` document
- [ ] `airports` has sample airports
- [ ] `featureFlags` has `current` document

## 🎯 Test Your Setup

1. Go to your deployed app
2. Open browser console (F12)
3. You should see: "Firebase initialized successfully"
4. No errors about missing collections

Your database is now ready! 🚀