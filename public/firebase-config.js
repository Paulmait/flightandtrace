// Firebase Configuration Loader
// This file loads Firebase config from environment or falls back to restricted keys

function getFirebaseConfig() {
    // In production, these should come from environment variables
    // For client-side usage, the API key should be restricted in Google Cloud Console
    
    // Check if config is provided by server
    if (window.__FIREBASE_CONFIG__) {
        return window.__FIREBASE_CONFIG__;
    }
    
    // Default configuration with domain-restricted API key
    // IMPORTANT: This key is restricted to only work on flightandtrace.com
    return {
        apiKey: "AIzaSyDMJkPbOjp4oQNxb-EVK-Yh1pVSrOuDJgQ", // Restricted to flightandtrace.com domains
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