// Firebase Authentication for FlightTrace
// Using new Firebase project: flighttrace-749f1

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    getAnalytics,
    logEvent 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js';

// Your NEW Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAzOLlHRbCDRHEDOqS2rHrgjN5ETAaRA-4",
    authDomain: "flighttrace-749f1.firebaseapp.com",
    projectId: "flighttrace-749f1",
    storageBucket: "flighttrace-749f1.firebasestorage.app",
    messagingSenderId: "994719406353",
    appId: "1:994719406353:web:01523b9811eeefad5094b0",
    measurementId: "G-HS9H3GM0V1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();

// Current user state
let currentUser = null;

// Authentication Functions
export async function signUp(email, password, displayName = null) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update display name if provided
        if (displayName) {
            await updateProfile(user, { displayName });
        }
        
        // Log analytics event
        logEvent(analytics, 'sign_up', {
            method: 'email'
        });
        
        // Create Stripe customer
        await createStripeCustomer(user.uid, email);
        
        return { success: true, user };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: getErrorMessage(error.code) };
    }
}

export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Log analytics event
        logEvent(analytics, 'login', {
            method: 'email'
        });
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: getErrorMessage(error.code) };
    }
}

export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Log analytics event
        logEvent(analytics, 'login', {
            method: 'google'
        });
        
        // Create Stripe customer if new user
        const isNewUser = result._tokenResponse?.isNewUser;
        if (isNewUser) {
            await createStripeCustomer(user.uid, user.email);
        }
        
        return { success: true, user, isNewUser };
    } catch (error) {
        console.error('Google sign in error:', error);
        return { success: false, error: getErrorMessage(error.code) };
    }
}

export async function logOut() {
    try {
        await signOut(auth);
        
        // Log analytics event
        logEvent(analytics, 'logout');
        
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: 'Password reset email sent!' };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: getErrorMessage(error.code) };
    }
}

// Monitor auth state changes
export function onAuth(callback) {
    return onAuthStateChanged(auth, (user) => {
        currentUser = user;
        callback(user);
    });
}

// Get current user
export function getCurrentUser() {
    return currentUser || auth.currentUser;
}

// Get ID token for API calls
export async function getIdToken() {
    const user = getCurrentUser();
    if (user) {
        return await user.getIdToken();
    }
    return null;
}

// Create Stripe customer for new users
async function createStripeCustomer(userId, email) {
    try {
        const response = await fetch('/api/subscription/create-customer', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getIdToken()}`
            },
            body: JSON.stringify({ 
                userId, 
                email,
                metadata: {
                    firebase_uid: userId,
                    signup_date: new Date().toISOString()
                }
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Log analytics event
            logEvent(analytics, 'stripe_customer_created', {
                user_id: userId
            });
        }
        
        return result;
    } catch (error) {
        console.error('Error creating Stripe customer:', error);
        return { status: 'error', error: error.message };
    }
}

// Get user-friendly error messages
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please sign in.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/popup-closed-by-user': 'Sign in was cancelled.',
        'auth/cancelled-popup-request': 'Sign in was cancelled.',
        'auth/popup-blocked': 'Sign in popup was blocked. Please allow popups.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

// Check if user has active subscription
export async function checkSubscription() {
    try {
        const token = await getIdToken();
        if (!token) return { hasSubscription: false };
        
        const response = await fetch('/api/subscription/status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        return {
            hasSubscription: data.status === 'active',
            tier: data.tier || 'free',
            ...data
        };
    } catch (error) {
        console.error('Error checking subscription:', error);
        return { hasSubscription: false, tier: 'free' };
    }
}

// Track user events
export function trackEvent(eventName, parameters = {}) {
    logEvent(analytics, eventName, parameters);
}

// Export Firebase app instance
export { app, auth, analytics };