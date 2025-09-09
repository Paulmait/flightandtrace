// Firebase configuration with error handling
let app = null;
let auth = null;
let db = null;
let storage = null;
let analytics = null;

// Check if we have the minimum required config
const hasFirebaseConfig = () => {
  return (
    process.env.REACT_APP_FIREBASE_API_KEY ||
    process.env.REACT_APP_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID
  );
};

if (hasFirebaseConfig()) {
  try {
    const { initializeApp } = require('firebase/app');
    const { getAuth } = require('firebase/auth');
    const { getFirestore } = require('firebase/firestore');
    const { getStorage } = require('firebase/storage');
    const { getAnalytics } = require('firebase/analytics');

    const firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'demo-api-key',
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'demo-project',
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
      appId: process.env.REACT_APP_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '1:123456789:web:abc123',
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID
    };

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    // Analytics is optional and can fail
    try {
      if (typeof window !== 'undefined') {
        analytics = getAnalytics(app);
      }
    } catch (e) {
      console.log('Analytics not available');
    }
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.warn('Firebase initialization failed:', error.message);
    console.log('App will work without Firebase features');
  }
} else {
  console.log('Firebase config not found - running without Firebase');
}

export { app, auth, db, storage, analytics };
export default app;