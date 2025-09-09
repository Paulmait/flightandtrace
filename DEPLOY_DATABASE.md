# 🚀 Database Deployment Guide

## Prerequisites
1. Firebase project created
2. Node.js installed
3. Firebase CLI installed (`npm install -g firebase-tools`)

## Step 1: Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click gear icon → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the file as `scripts/serviceAccountKey.json`
7. ⚠️ **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore`

## Step 2: Deploy Security Rules

```bash
# Login to Firebase
firebase login

# Initialize Firebase in project root
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules
```

## Step 3: Deploy Indexes

```bash
# Deploy database indexes
firebase deploy --only firestore:indexes
```

## Step 4: Initialize Database

```bash
# Go to scripts directory
cd scripts

# Install dependencies
npm install

# Run initialization script
npm run init-db
```

## Step 5: Verify in Firebase Console

1. Go to **Firestore Database**
2. Check these collections exist:
   - ✅ system
   - ✅ flights
   - ✅ users
   - ✅ subscriptionTiers
   - ✅ rateLimits
   - ✅ dataSources
   - ✅ analytics

## 🔒 Security Features Added

### 1. **Rate Limiting**
- Prevents spam and abuse
- Different limits per endpoint
- Time-based write restrictions

### 2. **Data Validation**
- Email format validation
- Coordinate range validation
- Required field checks
- Data type enforcement

### 3. **Role-Based Access**
- Admin role for system management
- User tier-based features
- Owner-only access for personal data

### 4. **Audit Logging**
- Immutable audit trail
- Admin-only access
- Complete activity history

### 5. **Subscription Enforcement**
- Feature limits based on tier
- API access control
- Alert limits per tier

## 📊 Database Structure

```
firestore/
├── system/
│   └── config                 # System configuration
├── flights/
│   └── {flightId}             # Live flight data
├── flightHistory/
│   └── {date}/
│       └── {flightId}         # Historical data
├── users/
│   └── {userId}/
│       ├── profile            # User info
│       ├── subscription/      # Subscription data
│       ├── savedFlights/      # Bookmarked flights
│       └── searchHistory/     # Search history
├── subscriptionTiers/
│   ├── free                  # Free tier config
│   ├── premium               # Premium tier config
│   └── professional          # Pro tier config
├── alerts/
│   └── {alertId}             # User alerts
├── rateLimits/
│   └── default               # Rate limit rules
├── dataSources/
│   └── config                # API configurations
├── analytics/
│   └── overview              # Usage statistics
└── auditLogs/
    └── {logId}               # Security audit trail
```

## 🎯 What's Protected

### Public Access (No Auth)
- Read flight data
- Read subscription tiers
- Read system config

### Authenticated Users
- Read/write own profile
- Save flights
- Create alerts (tier-based limits)
- View search history

### Admin Only
- Modify system config
- Write flight data
- Access audit logs
- Manage all users
- View detailed analytics

## 🚨 Important Security Notes

1. **Never commit `serviceAccountKey.json`**
2. **Regularly review audit logs**
3. **Monitor rate limit violations**
4. **Update security rules as needed**
5. **Test rules in Firebase Console Rules Playground**

## Testing Security Rules

Go to Firestore Console → Rules → Rules Playground

Test these scenarios:
1. ✅ Anonymous user reading flights
2. ❌ Anonymous user writing flights
3. ✅ Authenticated user reading own profile
4. ❌ User A reading User B's profile
5. ✅ Admin user writing system config
6. ❌ Regular user writing system config

## 🎉 Success Checklist

- [ ] Service account key downloaded
- [ ] Security rules deployed
- [ ] Indexes deployed
- [ ] Database initialized
- [ ] Collections visible in console
- [ ] Security rules tested
- [ ] App connects successfully

Your database is now secure and ready for production! 🚀