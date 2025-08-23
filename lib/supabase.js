/**
 * Supabase Client Configuration
 */

import { createClient } from '@supabase/supabase-js';

// These will be replaced with your actual Supabase project details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'flighttrace'
    }
  }
});

/**
 * Flight Data Service
 */
export const flightService = {
  // Get all active flights
  async getActiveFlights() {
    const { data, error } = await supabase
      .from('flights')
      .select(`
        *,
        flight_positions (
          latitude,
          longitude,
          altitude_ft,
          timestamp
        )
      `)
      .eq('status', 'active')
      .order('departure_time', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get flight by ID with positions
  async getFlightById(flightId) {
    const { data, error } = await supabase
      .from('flights')
      .select(`
        *,
        flight_positions (
          latitude,
          longitude,
          altitude_ft,
          speed_knots,
          heading,
          timestamp
        ),
        fuel_estimates (
          fuel_kg,
          co2_kg,
          confidence,
          phases
        )
      `)
      .eq('id', flightId)
      .single();

    if (error) throw error;
    return data;
  },

  // Track a flight for a user
  async trackFlight(userId, flightId) {
    const { data, error } = await supabase
      .from('user_flights')
      .upsert({
        user_id: userId,
        flight_id: flightId,
        notifications_enabled: true
      });

    if (error) throw error;
    return data;
  },

  // Get user's tracked flights
  async getUserFlights(userId) {
    const { data, error } = await supabase
      .from('user_flights')
      .select(`
        *,
        flights (
          *,
          fuel_estimates (
            fuel_kg,
            co2_kg,
            confidence
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

/**
 * Fuel Estimation Service
 */
export const fuelService = {
  // Save fuel estimate
  async saveFuelEstimate(flightId, estimate, userId = null) {
    const { data, error } = await supabase
      .from('fuel_estimates')
      .insert({
        flight_id: flightId,
        user_id: userId,
        fuel_kg: estimate.fuelKg,
        fuel_l: estimate.fuelL,
        fuel_gal: estimate.fuelGal,
        co2_kg: estimate.co2Kg,
        confidence: estimate.confidence,
        phases: estimate.phases,
        assumptions: estimate.assumptions
      });

    if (error) throw error;
    return data;
  },

  // Get fuel estimates for a flight
  async getFlightFuelEstimates(flightId) {
    const { data, error } = await supabase
      .from('fuel_estimates')
      .select('*')
      .eq('flight_id', flightId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get user's total emissions
  async getUserTotalEmissions(userId) {
    const { data, error } = await supabase
      .from('fuel_estimates')
      .select('co2_kg')
      .eq('user_id', userId);

    if (error) throw error;
    
    const totalCO2 = data.reduce((sum, estimate) => sum + estimate.co2_kg, 0);
    return {
      totalCO2Kg: totalCO2,
      totalCO2Tons: totalCO2 / 1000,
      treesEquivalent: Math.ceil(totalCO2 / 21) // 1 tree absorbs ~21kg CO2/year
    };
  }
};

/**
 * Real-time Subscriptions
 */
export const subscriptions = {
  // Subscribe to flight position updates
  subscribeToFlight(flightId, callback) {
    const subscription = supabase
      .channel(`flight:${flightId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'flight_positions',
          filter: `flight_id=eq.${flightId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  },

  // Subscribe to all active flights
  subscribeToActiveFlights(callback) {
    const subscription = supabase
      .channel('active-flights')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flights',
          filter: 'status=eq.active'
        },
        callback
      )
      .subscribe();

    return subscription;
  },

  // Unsubscribe
  unsubscribe(subscription) {
    supabase.removeChannel(subscription);
  }
};

/**
 * Feature Flags Service
 */
export const featureFlags = {
  async getFlags() {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('enabled', true);

    if (error) throw error;
    
    return data.reduce((flags, flag) => {
      flags[flag.name] = {
        enabled: flag.enabled,
        rollout: flag.rollout_percentage
      };
      return flags;
    }, {});
  },

  async isEnabled(flagName, userId = null) {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('name', flagName)
      .single();

    if (error || !data) return false;

    // Check user override
    if (userId && data.user_overrides?.includes(userId)) {
      return true;
    }

    // Check rollout percentage
    if (data.rollout_percentage === 100) return true;
    if (data.rollout_percentage === 0) return false;

    // Random rollout
    return Math.random() * 100 < data.rollout_percentage;
  }
};

/**
 * Authentication Helpers
 */
export const auth = {
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

export default supabase;