// Future-Proof Authentication for FlightTrace
// No dependency on Firebase Dynamic Links
// Multiple provider support for redundancy

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    OAuthProvider,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Import secure Firebase configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');
const appleProvider = new OAuthProvider('apple.com');

// Configure provider scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');

githubProvider.addScope('user:email');

microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');

appleProvider.addScope('email');
appleProvider.addScope('name');

// Enhanced Authentication Class
class AuthenticationManager {
    constructor() {
        this.auth = auth;
        this.currentUser = null;
        this.sessionTimeout = null;
        this.maxSessionDuration = 24 * 60 * 60 * 1000; // 24 hours
        
        // Monitor auth state
        this.initAuthStateListener();
        
        // Set persistence
        this.setPersistence('local');
    }
    
    // Initialize auth state listener
    initAuthStateListener() {
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            
            if (user) {
                this.startSessionTimer();
                this.logActivity('auth_state_change', { uid: user.uid });
            } else {
                this.clearSessionTimer();
            }
        });
    }
    
    // Set persistence type
    async setPersistence(type = 'local') {
        try {
            const persistence = type === 'session' 
                ? browserSessionPersistence 
                : browserLocalPersistence;
            await setPersistence(this.auth, persistence);
        } catch (error) {
            console.error('Error setting persistence:', error);
        }
    }
    
    // Email/Password Sign Up (Future-Proof)
    async signUp(email, password, displayName = null) {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                this.auth, 
                email, 
                password
            );
            const user = userCredential.user;
            
            // Update profile if name provided
            if (displayName) {
                await updateProfile(user, { displayName });
            }
            
            // Send verification email (NOT using Dynamic Links)
            await this.sendVerificationEmail(user);
            
            // Create Stripe customer
            await this.createStripeCustomer(user);
            
            this.logActivity('sign_up', { method: 'email' });
            
            return { 
                success: true, 
                user,
                message: 'Account created! Please check your email to verify.'
            };
        } catch (error) {
            return { 
                success: false, 
                error: this.getErrorMessage(error.code) 
            };
        }
    }
    
    // Email/Password Sign In (Future-Proof)
    async signIn(email, password, rememberMe = true) {
        try {
            // Set persistence based on remember me
            await this.setPersistence(rememberMe ? 'local' : 'session');
            
            const userCredential = await signInWithEmailAndPassword(
                this.auth, 
                email, 
                password
            );
            
            this.logActivity('sign_in', { method: 'email' });
            
            return { 
                success: true, 
                user: userCredential.user 
            };
        } catch (error) {
            return { 
                success: false, 
                error: this.getErrorMessage(error.code) 
            };
        }
    }
    
    // Social Sign In (Future-Proof)
    async signInWithProvider(providerName) {
        try {
            let provider;
            
            switch(providerName) {
                case 'google':
                    provider = googleProvider;
                    break;
                case 'github':
                    provider = githubProvider;
                    break;
                case 'microsoft':
                    provider = microsoftProvider;
                    break;
                case 'apple':
                    provider = appleProvider;
                    break;
                default:
                    throw new Error('Invalid provider');
            }
            
            const result = await signInWithPopup(this.auth, provider);
            const user = result.user;
            
            // Check if new user
            const isNewUser = result._tokenResponse?.isNewUser;
            
            if (isNewUser) {
                await this.createStripeCustomer(user);
            }
            
            this.logActivity('sign_in', { method: providerName });
            
            return { 
                success: true, 
                user, 
                isNewUser 
            };
        } catch (error) {
            return { 
                success: false, 
                error: this.getErrorMessage(error.code) 
            };
        }
    }
    
    // Send Verification Email (NOT using Dynamic Links)
    async sendVerificationEmail(user) {
        try {
            // Use standard email verification without Dynamic Links
            await sendEmailVerification(user, {
                url: 'https://flightandtrace.com/email-verified',
                handleCodeInApp: false // Important: Don't use Dynamic Links
            });
            
            return { success: true };
        } catch (error) {
            console.error('Error sending verification email:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Password Reset (NOT using Dynamic Links)
    async resetPassword(email) {
        try {
            // Use standard password reset without Dynamic Links
            await sendPasswordResetEmail(this.auth, email, {
                url: 'https://flightandtrace.com/login.html',
                handleCodeInApp: false // Important: Don't use Dynamic Links
            });
            
            this.logActivity('password_reset_request', { email });
            
            return { 
                success: true, 
                message: 'Password reset email sent! Check your inbox.' 
            };
        } catch (error) {
            return { 
                success: false, 
                error: this.getErrorMessage(error.code) 
            };
        }
    }
    
    // Sign Out
    async signOut() {
        try {
            await signOut(this.auth);
            this.clearSessionTimer();
            this.logActivity('sign_out');
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
    
    // Session Management
    startSessionTimer() {
        this.clearSessionTimer();
        
        this.sessionTimeout = setTimeout(() => {
            this.signOut();
            alert('Your session has expired. Please sign in again.');
        }, this.maxSessionDuration);
    }
    
    clearSessionTimer() {
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
            this.sessionTimeout = null;
        }
    }
    
    // Create Stripe Customer
    async createStripeCustomer(user) {
        try {
            const idToken = await user.getIdToken();
            
            const response = await fetch('/api/subscription/create-customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    userId: user.uid,
                    email: user.email,
                    name: user.displayName,
                    metadata: {
                        firebase_uid: user.uid,
                        signup_date: new Date().toISOString(),
                        provider: user.providerData[0]?.providerId || 'password'
                    }
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error creating Stripe customer:', error);
        }
    }
    
    // Activity Logging
    logActivity(event, data = {}) {
        // Send to analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', event, data);
        }
        
        // Log to console in dev
        if (window.location.hostname === 'localhost') {
            console.log('Activity:', event, data);
        }
    }
    
    // Error Messages
    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered. Please sign in.',
            'auth/invalid-email': 'Invalid email address format.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/popup-closed-by-user': 'Sign-in popup was closed.',
            'auth/cancelled-popup-request': 'Sign-in was cancelled.',
            'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups.',
            'auth/account-exists-with-different-credential': 
                'An account already exists with this email using a different sign-in method.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/requires-recent-login': 'Please sign in again to complete this action.'
        };
        
        return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
    }
    
    // Get current user
    getCurrentUser() {
        return this.currentUser || this.auth.currentUser;
    }
    
    // Get ID token for API calls
    async getIdToken() {
        const user = this.getCurrentUser();
        if (user) {
            return await user.getIdToken();
        }
        return null;
    }
    
    // Check if user is verified
    isUserVerified() {
        const user = this.getCurrentUser();
        return user ? user.emailVerified : false;
    }
    
    // Check subscription status
    async checkSubscription() {
        try {
            const token = await this.getIdToken();
            if (!token) return { hasSubscription: false, tier: 'free' };
            
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
}

// Create singleton instance
const authManager = new AuthenticationManager();

// Export for use in other files
export default authManager;
export {
    auth,
    googleProvider,
    githubProvider,
    microsoftProvider,
    appleProvider
};