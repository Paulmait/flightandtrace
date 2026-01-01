// Firebase Configuration Loader
// This file loads Firebase config from the server API

// Config will be populated by /api/firebase-config script
let _firebaseConfig = null;

async function loadFirebaseConfig() {
    // If already loaded from server script, use that
    if (window.__FIREBASE_CONFIG__) {
        return window.__FIREBASE_CONFIG__;
    }

    // If config already fetched, return cached
    if (_firebaseConfig) {
        return _firebaseConfig;
    }

    // Fetch from API endpoint
    try {
        const response = await fetch('/api/firebase-config');
        if (response.ok) {
            // The API returns JavaScript that sets window.__FIREBASE_CONFIG__
            const script = await response.text();
            eval(script);
            _firebaseConfig = window.__FIREBASE_CONFIG__;
            return _firebaseConfig;
        }
    } catch (error) {
        console.error('Failed to load Firebase config:', error);
    }

    // Fallback config (will not work without API key)
    return {
        apiKey: window.__FIREBASE_API_KEY__ || "",
        authDomain: "flighttrace-749f1.firebaseapp.com",
        projectId: "flighttrace-749f1",
        storageBucket: "flighttrace-749f1.firebasestorage.app",
        messagingSenderId: "994719406353",
        appId: "1:994719406353:web:01523b9811eeefad5094b0",
        measurementId: "G-HS9H3GM0V1"
    };
}

function getFirebaseConfig() {
    // Synchronous getter - use window config if available
    if (window.__FIREBASE_CONFIG__) {
        return window.__FIREBASE_CONFIG__;
    }

    // Return defaults (API key should be injected via script tag)
    return {
        apiKey: window.__FIREBASE_API_KEY__ || "",
        authDomain: "flighttrace-749f1.firebaseapp.com",
        projectId: "flighttrace-749f1",
        storageBucket: "flighttrace-749f1.firebasestorage.app",
        messagingSenderId: "994719406353",
        appId: "1:994719406353:web:01523b9811eeefad5094b0",
        measurementId: "G-HS9H3GM0V1"
    };
}

// Export the configuration
export const firebaseConfig = getFirebaseConfig();
export { loadFirebaseConfig };
