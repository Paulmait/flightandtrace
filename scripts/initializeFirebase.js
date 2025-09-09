/**
 * Firebase Database Initialization Script
 * Run this after setting up Firebase project
 * 
 * Usage: node scripts/initializeFirebase.js
 */

const admin = require('firebase-admin');

// Initialize admin SDK (you'll need to download service account key from Firebase Console)
// Go to Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initializeDatabase() {
  console.log('🚀 Initializing Firebase Database...\n');

  try {
    // 1. Create Collections with sample data
    console.log('📁 Creating collections...');

    // System configuration
    await db.collection('system').doc('config').set({
      version: '1.0.0',
      maintenanceMode: false,
      maxFlightsPerRequest: 500,
      updateInterval: 30000, // 30 seconds
      dataRetentionDays: 30,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      features: {
        liveTracking: true,
        historicalData: true,
        weatherOverlay: true,
        alerts: true,
        multiLanguage: false
      }
    });
    console.log('✅ System config created');

    // Create indexes collection
    await db.collection('indexes').doc('flights').set({
      fields: ['icao24', 'callsign', 'lastUpdate'],
      compound: [
        ['icao24', 'lastUpdate'],
        ['callsign', 'lastUpdate']
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Indexes config created');

    // Create sample flight data
    const sampleFlight = {
      icao24: 'abc123',
      callsign: 'DEMO001',
      registration: 'G-DEMO',
      aircraft: {
        model: 'Boeing 737-800',
        type: 'B738',
        operator: 'Demo Airlines'
      },
      position: {
        latitude: 51.4775,
        longitude: -0.4614,
        altitude: 35000,
        heading: 90,
        speed: 450,
        verticalRate: 0
      },
      origin: 'EGLL',
      destination: 'KJFK',
      status: 'EN_ROUTE',
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      source: 'OPENSKY'
    };

    await db.collection('flights').doc('demo_flight').set(sampleFlight);
    console.log('✅ Sample flight created');

    // Create subscription tiers
    const tiers = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: {
          maxTrackedFlights: 5,
          historyDays: 1,
          refreshRate: 60000, // 1 minute
          apiCalls: 100,
          exportData: false,
          weatherOverlay: false,
          alerts: false
        }
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 9.99,
        stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium',
        features: {
          maxTrackedFlights: 50,
          historyDays: 7,
          refreshRate: 30000, // 30 seconds
          apiCalls: 1000,
          exportData: true,
          weatherOverlay: true,
          alerts: true,
          maxAlerts: 10
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 24.99,
        stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional',
        features: {
          maxTrackedFlights: 'unlimited',
          historyDays: 30,
          refreshRate: 10000, // 10 seconds
          apiCalls: 10000,
          exportData: true,
          weatherOverlay: true,
          alerts: true,
          maxAlerts: 'unlimited',
          advancedFilters: true,
          apiAccess: true
        }
      }
    ];

    for (const tier of tiers) {
      await db.collection('subscriptionTiers').doc(tier.id).set(tier);
      console.log(`✅ Subscription tier '${tier.name}' created`);
    }

    // Create rate limiting rules
    await db.collection('rateLimits').doc('default').set({
      endpoints: {
        '/api/flights': {
          windowMs: 60000,
          maxRequests: 100
        },
        '/api/weather': {
          windowMs: 60000,
          maxRequests: 50
        },
        '/api/auth/signup': {
          windowMs: 3600000, // 1 hour
          maxRequests: 5
        },
        '/api/auth/login': {
          windowMs: 900000, // 15 minutes
          maxRequests: 10
        }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Rate limiting rules created');

    // Create data sources configuration
    await db.collection('dataSources').doc('config').set({
      opensky: {
        enabled: true,
        url: 'https://opensky-network.org/api',
        rateLimit: 100,
        priority: 1
      },
      adsb: {
        enabled: false,
        url: 'https://adsbexchange.com/api',
        rateLimit: 1000,
        priority: 2,
        apiKey: process.env.ADSB_API_KEY || null
      },
      flightaware: {
        enabled: false,
        url: 'https://flightxml.flightaware.com',
        rateLimit: 500,
        priority: 3,
        apiKey: null
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Data sources config created');

    // Create analytics structure
    await db.collection('analytics').doc('overview').set({
      totalUsers: 0,
      totalFlightsTracked: 0,
      totalApiCalls: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      dailyStats: {},
      popularFlights: [],
      popularAirports: []
    });
    console.log('✅ Analytics structure created');

    // Create admin user (optional)
    const adminEmail = 'admin@flighttrace.com';
    const adminUser = {
      email: adminEmail,
      role: 'admin',
      tier: 'professional',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      preferences: {
        theme: 'light',
        units: 'metric',
        defaultMap: 'streets',
        notifications: true
      },
      stats: {
        totalSearches: 0,
        savedFlights: [],
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      }
    };

    await db.collection('users').doc('admin').set(adminUser);
    console.log('✅ Admin user created');

    console.log('\n✨ Database initialization complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Update security rules in Firebase Console');
    console.log('2. Create composite indexes as suggested by Firebase');
    console.log('3. Enable any missing APIs in Google Cloud Console');
    console.log('4. Test the application');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase().then(() => {
  console.log('\n👍 All done! Your database is ready.');
  process.exit(0);
});