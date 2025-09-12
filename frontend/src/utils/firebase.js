// Firebase Configuration and Services
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { 
  getAnalytics,
  logEvent 
} from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDMJkPbOjp4oQNxb-EVK-Yh1pVSrOuDJgQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "flighttrace-749f1.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "flighttrace-749f1",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "flighttrace-749f1.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "994719406353",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:994719406353:web:01523b9811eeefad5094b0",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-HS9H3GM0V1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// ============================================
// Authentication Functions
// ============================================

export const authService = {
  // Sign up with email and password
  async signUp(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Create user profile in Firestore
      await this.createUserProfile(user, { displayName });
      
      // Log analytics event
      if (analytics) {
        logEvent(analytics, 'sign_up', {
          method: 'email'
        });
      }
      
      return user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Log analytics event
      if (analytics) {
        logEvent(analytics, 'login', {
          method: 'email'
        });
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Create user profile if doesn't exist
      await this.createUserProfile(user);
      
      // Log analytics event
      if (analytics) {
        logEvent(analytics, 'login', {
          method: 'google'
        });
      }
      
      return user;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  },

  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      
      // Log analytics event
      if (analytics) {
        logEvent(analytics, 'logout');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },

  // Create or update user profile
  async createUserProfile(user, additionalData = {}) {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);
    
    if (!snapshot.exists()) {
      const { displayName, email, photoURL } = user;
      const createdAt = serverTimestamp();
      
      try {
        await setDoc(userRef, {
          displayName,
          email,
          photoURL,
          createdAt,
          subscription: 'free',
          savedFlights: [],
          alerts: [],
          preferences: {
            units: 'imperial',
            theme: 'light',
            notifications: true
          },
          ...additionalData
        });
      } catch (error) {
        console.error('Error creating user profile:', error);
      }
    }
    
    return userRef;
  },

  // Get current user profile
  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const snapshot = await getDoc(userRef);
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Auth state observer
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
};

// ============================================
// Saved Flights Functions
// ============================================

export const savedFlightsService = {
  // Save a flight for user
  async saveFlight(userId, flightData) {
    try {
      const savedFlightRef = doc(collection(db, 'savedFlights'));
      await setDoc(savedFlightRef, {
        userId,
        ...flightData,
        savedAt: serverTimestamp()
      });
      
      // Log analytics event
      if (analytics) {
        logEvent(analytics, 'save_flight', {
          flight_number: flightData.callsign
        });
      }
      
      return savedFlightRef.id;
    } catch (error) {
      console.error('Error saving flight:', error);
      throw error;
    }
  },

  // Get user's saved flights
  async getSavedFlights(userId) {
    try {
      const q = query(
        collection(db, 'savedFlights'),
        where('userId', '==', userId),
        orderBy('savedAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting saved flights:', error);
      return [];
    }
  },

  // Delete saved flight
  async deleteSavedFlight(flightId) {
    try {
      await deleteDoc(doc(db, 'savedFlights', flightId));
    } catch (error) {
      console.error('Error deleting saved flight:', error);
      throw error;
    }
  },

  // Listen to saved flights changes
  onSavedFlightsChange(userId, callback) {
    const q = query(
      collection(db, 'savedFlights'),
      where('userId', '==', userId),
      orderBy('savedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const flights = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(flights);
    });
  }
};

// ============================================
// Flight Alerts Functions
// ============================================

export const alertsService = {
  // Create flight alert
  async createAlert(userId, alertData) {
    try {
      const alertRef = doc(collection(db, 'alerts'));
      await setDoc(alertRef, {
        userId,
        ...alertData,
        active: true,
        createdAt: serverTimestamp()
      });
      
      // Log analytics event
      if (analytics) {
        logEvent(analytics, 'create_alert', {
          alert_type: alertData.type
        });
      }
      
      return alertRef.id;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  },

  // Get user's alerts
  async getUserAlerts(userId) {
    try {
      const q = query(
        collection(db, 'alerts'),
        where('userId', '==', userId),
        where('active', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  },

  // Update alert
  async updateAlert(alertId, updates) {
    try {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  },

  // Delete alert
  async deleteAlert(alertId) {
    try {
      await deleteDoc(doc(db, 'alerts', alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  }
};

// ============================================
// Search History Functions
// ============================================

export const searchHistoryService = {
  // Save search
  async saveSearch(userId, searchQuery) {
    try {
      const searchRef = doc(collection(db, 'searchHistory'));
      await setDoc(searchRef, {
        userId,
        query: searchQuery,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving search:', error);
    }
  },

  // Get recent searches
  async getRecentSearches(userId, limitCount = 10) {
    try {
      const q = query(
        collection(db, 'searchHistory'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }
};

// ============================================
// Analytics Functions
// ============================================

export const analyticsService = {
  // Log custom event
  logEvent(eventName, parameters = {}) {
    if (analytics) {
      logEvent(analytics, eventName, parameters);
    }
  },

  // Log page view
  logPageView(pageName) {
    if (analytics) {
      logEvent(analytics, 'page_view', {
        page_title: pageName
      });
    }
  },

  // Log user action
  logUserAction(action, details = {}) {
    if (analytics) {
      logEvent(analytics, 'user_action', {
        action_type: action,
        ...details
      });
    }
  }
};

export default app;