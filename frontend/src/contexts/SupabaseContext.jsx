import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabase';

const SupabaseContext = createContext();

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export const SupabaseProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Check initial session
    checkSession();
    
    // Check Supabase connection
    checkConnection();
    
    // Listen for auth changes
    const {
      data: { subscription: authSubscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setProfile(null);
        setSubscription(null);
      }
      
      setLoading(false);
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserData(session.user.id);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      const { connected: isConnected } = await supabaseHelpers.checkConnection();
      setConnected(isConnected);
      
      if (!isConnected) {
        console.warn('Supabase connection failed');
      }
    } catch (error) {
      console.error('Error checking Supabase connection:', error);
      setConnected(false);
    }
  };

  const loadUserData = async (userId) => {
    try {
      // Load user profile
      const { data: profileData } = await supabaseHelpers.getProfile(userId);
      setProfile(profileData);
      
      // Load subscription
      const { data: subscriptionData } = await supabaseHelpers.getSubscription(userId);
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseHelpers.signUp(email, password, {
        full_name: metadata.fullName,
        company: metadata.company,
        ...metadata
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseHelpers.signIn(email, password);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabaseHelpers.signOut();
      
      if (error) throw error;
      
      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
      setSubscription(null);
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const { data, error } = await supabaseHelpers.updateProfile(user.id, updates);
      
      if (error) throw error;
      
      setProfile(data);
      return { success: true, data };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  };

  // Alert rules management
  const getAlertRules = async () => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const { data, error } = await supabaseHelpers.getAlertRules(user.id);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Get alert rules error:', error);
      return { success: false, error: error.message };
    }
  };

  const createAlertRule = async (ruleData) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const { data, error } = await supabaseHelpers.createAlertRule(user.id, ruleData);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Create alert rule error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateAlertRule = async (ruleId, updates) => {
    try {
      const { data, error } = await supabaseHelpers.updateAlertRule(ruleId, updates);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Update alert rule error:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteAlertRule = async (ruleId) => {
    try {
      const { error } = await supabaseHelpers.deleteAlertRule(ruleId);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Delete alert rule error:', error);
      return { success: false, error: error.message };
    }
  };

  // Export jobs management
  const getExportJobs = async () => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const { data, error } = await supabaseHelpers.getExportJobs(user.id);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Get export jobs error:', error);
      return { success: false, error: error.message };
    }
  };

  const createExportJob = async (jobData) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const { data, error } = await supabaseHelpers.createExportJob(user.id, jobData);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Create export job error:', error);
      return { success: false, error: error.message };
    }
  };

  // Flight data queries
  const getFlights = async (filters = {}) => {
    try {
      const { data, error } = await supabaseHelpers.getFlights(filters);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Get flights error:', error);
      return { success: false, error: error.message };
    }
  };

  // Real-time subscriptions
  const subscribeToAlertRules = (callback) => {
    if (!user) return null;
    return supabaseHelpers.subscribeToAlertRules(user.id, callback);
  };

  const subscribeToExportJobs = (callback) => {
    if (!user) return null;
    return supabaseHelpers.subscribeToExportJobs(user.id, callback);
  };

  // Utility functions
  const refreshUserData = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  const value = {
    // State
    user,
    session,
    profile,
    subscription,
    loading,
    connected,
    
    // Authentication
    signUp,
    signIn,
    signOut,
    updateProfile,
    
    // Alert rules
    getAlertRules,
    createAlertRule,
    updateAlertRule,
    deleteAlertRule,
    
    // Export jobs
    getExportJobs,
    createExportJob,
    
    // Flight data
    getFlights,
    
    // Real-time subscriptions
    subscribeToAlertRules,
    subscribeToExportJobs,
    
    // Utilities
    refreshUserData,
    checkConnection,
    
    // Direct supabase client access for advanced usage
    supabase
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

export default SupabaseProvider;