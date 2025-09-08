import { createClient } from '@supabase/supabase-js';

// Supabase configuration - using production FlightTrace settings
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

// Create Supabase client with production-ready configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configure auth settings
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Redirect URL for authentication
    redirectTo: process.env.NODE_ENV === 'production' 
      ? 'https://flightandtrace.com/auth/callback'
      : 'http://localhost:3000/auth/callback'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'flighttrace'
    }
  },
  // Real-time configuration
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database table names
export const TABLES = {
  // User management
  PROFILES: 'profiles',
  SUBSCRIPTIONS: 'subscriptions',
  
  // Flight data
  FLIGHTS: 'flights',
  FLIGHT_POSITIONS: 'flight_positions',
  FLIGHT_TRACKS: 'flight_tracks',
  
  // Alerts system
  ALERT_RULES: 'alert_rules',
  ALERT_INSTANCES: 'alert_instances',
  ALERT_NOTIFICATIONS: 'alert_notifications',
  
  // History and exports
  EXPORT_JOBS: 'export_jobs',
  PLAYBACK_SESSIONS: 'playback_sessions',
  USER_EXPORT_QUOTAS: 'user_export_quotas',
  
  // System
  RETENTION_POLICIES: 'retention_policies'
};

// Helper functions for common operations
export const supabaseHelpers = {
  // Authentication helpers
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { data, error };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Profile management
  async getProfile(userId) {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Subscription management
  async getSubscription(userId) {
    const { data, error } = await supabase
      .from(TABLES.SUBSCRIPTIONS)
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  // Flight data queries
  async getFlights(filters = {}) {
    let query = supabase
      .from(TABLES.FLIGHTS)
      .select(`
        *,
        flight_tracks(*)
      `);

    // Apply filters
    if (filters.callsign) {
      query = query.ilike('callsign', `%${filters.callsign}%`);
    }
    if (filters.startTime) {
      query = query.gte('timestamp', filters.startTime);
    }
    if (filters.endTime) {
      query = query.lte('timestamp', filters.endTime);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });
    return { data, error };
  },

  // Alert rules management
  async getAlertRules(userId) {
    const { data, error } = await supabase
      .from(TABLES.ALERT_RULES)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createAlertRule(userId, ruleData) {
    const { data, error } = await supabase
      .from(TABLES.ALERT_RULES)
      .insert({
        user_id: userId,
        ...ruleData
      })
      .select()
      .single();
    return { data, error };
  },

  async updateAlertRule(ruleId, updates) {
    const { data, error } = await supabase
      .from(TABLES.ALERT_RULES)
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();
    return { data, error };
  },

  async deleteAlertRule(ruleId) {
    const { error } = await supabase
      .from(TABLES.ALERT_RULES)
      .delete()
      .eq('id', ruleId);
    return { error };
  },

  // Export jobs management
  async getExportJobs(userId) {
    const { data, error } = await supabase
      .from(TABLES.EXPORT_JOBS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createExportJob(userId, jobData) {
    const { data, error } = await supabase
      .from(TABLES.EXPORT_JOBS)
      .insert({
        user_id: userId,
        ...jobData
      })
      .select()
      .single();
    return { data, error };
  },

  // Real-time subscriptions
  subscribeToAlertRules(userId, callback) {
    return supabase
      .channel('alert_rules_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.ALERT_RULES,
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  subscribeToExportJobs(userId, callback) {
    return supabase
      .channel('export_jobs_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.EXPORT_JOBS,
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  // Utility functions
  async checkConnection() {
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      return { connected: !error, error };
    } catch (err) {
      return { connected: false, error: err };
    }
  },

  // Storage helpers for file uploads
  async uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    return { data, error };
  },

  async getFileUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteFile(bucket, path) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    return { error };
  }
};

// Export default client and helpers
export default supabase;