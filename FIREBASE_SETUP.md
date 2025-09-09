# 🔥 Firebase Database Setup Guide

## Yes, You Need to Set Up Firebase Database!

### Step 1: Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **"Firestore Database"** in left menu
4. Click **"Create database"**
5. Choose **"Start in production mode"** (we'll add rules)
6. Select location: **"us-central1"** or nearest to you
7. Click **"Enable"**

### Step 2: Set Security Rules

After database is created, go to **Firestore Database → Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read for flights
    match /flights/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    
    // Users can read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Saved searches - authenticated users only
    match /saved_searches/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Flight history - public read
    match /flight_history/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

Click **"Publish"**

### Step 3: Create Initial Collections

Go to **Firestore Database → Data** and create these collections:

#### 1. `flights` Collection
Click **"Start collection"**
- Collection ID: `flights`
- Document ID: Click "Auto-ID"
- Fields:
  ```
  callsign: "TEST123" (string)
  icao24: "abc123" (string)
  lastSeen: (timestamp - click clock icon)
  position: (map)
    - latitude: 51.5 (number)
    - longitude: -0.1 (number)
    - altitude: 35000 (number)
  ```
- Click "Save"

#### 2. `users` Collection
- Collection ID: `users`
- Skip adding document (will be created on signup)

#### 3. `flight_history` Collection
- Collection ID: `flight_history`
- Skip adding document

### Step 4: Enable Authentication

1. Go to **Authentication** in Firebase Console
2. Click **"Get started"**
3. Enable these sign-in methods:
   - **Email/Password**: Click, Enable, Save
   - **Google** (optional): Click, Enable, add project email, Save

### Step 5: Get Your Firebase API Key

1. Click gear icon → **Project settings**
2. Scroll down to **"Your apps"**
3. If no app, click **"Add app"** → Web → Name it "FlightTrace"
4. Copy the config values:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",  // <-- COPY THIS
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-ABC123"
};
```

### Step 6: Add to Vercel Environment Variables

Add these EXACT variables to Vercel:

```
REACT_APP_FIREBASE_API_KEY=AIza... (the apiKey from above)
REACT_APP_FIREBASE_AUTH_DOMAIN=(copy from above)
REACT_APP_FIREBASE_PROJECT_ID=(copy from above)
REACT_APP_FIREBASE_STORAGE_BUCKET=(copy from above)
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=(copy from above)
REACT_APP_FIREBASE_APP_ID=(copy from above)
REACT_APP_FIREBASE_MEASUREMENT_ID=(copy from above)
```

### Step 7: Enable Firebase Storage (Optional)

For storing images, flight logs:

1. Go to **Storage** in Firebase Console
2. Click **"Get started"**
3. Accept default rules
4. Choose location
5. Done!

## 🎯 What This Gives You:

- **User Authentication**: Login/Signup
- **Save Flights**: Users can save favorite flights
- **Search History**: Store user searches
- **Flight History**: Store historical flight data
- **User Preferences**: Save map settings, filters

## 📊 Database Structure:

```
firestore/
├── flights/          # Real-time flight data
│   └── {flightId}/
│       ├── callsign
│       ├── position
│       └── lastUpdate
├── users/            # User profiles
│   └── {userId}/
│       ├── email
│       ├── displayName
│       └── preferences
├── saved_searches/   # User's saved searches
│   └── {searchId}/
│       ├── userId
│       ├── query
│       └── timestamp
└── flight_history/   # Historical data
    └── {date}/
        └── {flightId}/
            └── positions[]
```

## ✅ Quick Check:

After setup, your app should:
1. Not crash/disappear
2. Show live flights
3. Allow user signup/login (once we add UI)
4. Save flight data to Firestore

## 🚨 Common Issues:

**App disappears?**
- Missing Firebase API key
- Wrong project ID
- Database not created

**Authentication fails?**
- Auth not enabled in Firebase
- Wrong auth domain

**Can't write to database?**
- Check security rules
- Ensure user is authenticated

---

After completing these steps, your backend is ready! 🚀