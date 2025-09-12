// Authentication Context Provider
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../utils/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user profile when auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Load user profile from Firestore
        const profile = await authService.getUserProfile(user.uid);
        setUserProfile(profile);
        
        // Store in localStorage for offline access
        localStorage.setItem('user', JSON.stringify({
          id: user.uid,
          email: user.email,
          displayName: user.displayName,
          subscription: profile?.subscription || 'free'
        }));
      } else {
        setUserProfile(null);
        localStorage.removeItem('user');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up function
  const signUp = async (email, password, displayName) => {
    try {
      setError(null);
      setLoading(true);
      const user = await authService.signUp(email, password, displayName);
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const user = await authService.signIn(email, password);
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const user = await authService.signInWithGoogle();
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setError(null);
      await authService.signOut();
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      setError(null);
      await authService.resetPassword(email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (updates) => {
    if (!currentUser) return;
    
    try {
      setError(null);
      await authService.updateUserProfile(currentUser.uid, updates);
      const updatedProfile = await authService.getUserProfile(currentUser.uid);
      setUserProfile(updatedProfile);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Check subscription status
  const hasSubscription = (requiredTier = 'free') => {
    const tiers = {
      free: 0,
      plus: 1,
      pro: 2,
      business: 3
    };
    
    const userTier = userProfile?.subscription || 'free';
    return tiers[userTier] >= tiers[requiredTier];
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    hasSubscription,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;