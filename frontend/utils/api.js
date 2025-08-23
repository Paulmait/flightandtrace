import { API_URL } from '@env';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Get API URL based on environment
const getApiUrl = () => {
  if (__DEV__ && Device.isDevice) {
    // When running on a physical device in development
    // Replace with your computer's local IP address
    return API_URL || 'http://192.168.1.100:8000';
  } else if (__DEV__) {
    // When running on simulator/emulator
    return API_URL || 'http://localhost:8000';
  } else {
    // Production URL
    return 'https://api.flighttrace.com';
  }
};

const BASE_API_URL = getApiUrl();

// Admin: Reset user password
export async function resetUserPassword(username) {
  const res = await fetch(`${BASE_API_URL}/admin/reset_user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error('Failed to reset user');
  return res.json();
}

// Admin: Reset admin password
export async function resetAdminPassword(old_password, new_password) {
  const res = await fetch(`${BASE_API_URL}/admin/reset_admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_password, new_password })
  });
  if (!res.ok) throw new Error('Failed to reset admin password');
  return res.json();
}

// Admin: Fetch audit log
export async function fetchAuditLog() {
  const res = await fetch(`${BASE_API_URL}/admin/audit_log`);
  if (!res.ok) throw new Error('Failed to fetch audit log');
  return res.json();
}
const API_URL = BASE_API_URL;

// Fuel estimation API functions
export async function getFuelEstimate(flightId, aircraftType) {
  const token = await getAuthToken();
  const params = new URLSearchParams({
    flightId,
    aircraftType: aircraftType || 'B738'
  });
  
  const res = await fetch(`${BASE_API_URL}/api/fuel/estimate?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get fuel estimate: ${res.status}`);
  }
  
  return res.json();
}

export async function calculateFuelEstimate(flightData) {
  const token = await getAuthToken();
  
  const res = await fetch(`${BASE_API_URL}/api/fuel/estimate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      flight_id: flightData.flightId,
      aircraft_type: flightData.aircraftType,
      altitude_series: flightData.altitudeSeries,
      distance_nm: flightData.distanceNm
    })
  });
  
  if (!res.ok) {
    throw new Error(`Failed to calculate fuel estimate: ${res.status}`);
  }
  
  return res.json();
}

export async function getFeatureFlags() {
  const token = await getAuthToken();
  
  const res = await fetch(`${BASE_API_URL}/api/feature-flags`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!res.ok) {
    // Return default flags if API fails
    return {
      fuelEstimates: false,
      weatherOverlay: true,
      socialSharing: true,
      familySharing: true
    };
  }
  
  return res.json();
}

export async function updateUserSettings(settings) {
  const token = await getAuthToken();
  
  const res = await fetch(`${BASE_API_URL}/api/user/settings`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  });
  
  if (!res.ok) {
    throw new Error(`Failed to update settings: ${res.status}`);
  }
  
  return res.json();
}

// Helper to get auth token from storage
async function getAuthToken() {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    return await AsyncStorage.default.getItem('auth_token');
  } catch (error) {
    console.warn('Could not get auth token:', error);
    return null;
  }
}

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`API error: ${res.status} ${res.statusText} - ${errorText}`);
    throw new Error(errorText || 'API request failed');
  }
  return res.json();
}

export async function registerUser(username, email, password) {
  if (!username || !email || !password) throw new Error('All fields required');
  return apiRequest('/register', 'POST', { username, email, password });
}

export async function loginUser(email, password) {
  if (!email || !password) throw new Error('Email and password required');
  return apiRequest('/login', 'POST', { email, password });
}

export async function fetchLiveAircraft(token) {
  return apiRequest('/flights/live', 'GET', null, token);
}

export async function fetchFlightHistory(token) {
  return apiRequest('/flights/history', 'GET', null, token);
}

export async function createCheckoutSession(plan) {
  const res = await fetch(`${BASE_API_URL}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan })
  });
  if (!res.ok) throw new Error('Failed to create checkout session');
  return res.json();
}
export async function fetchAnalytics(token) {
  const res = await fetch(`${BASE_API_URL}/analytics`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchUserProfile(token) {
  try {
    const res = await fetch(`${BASE_API_URL}/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return await res.json();
  } catch (err) {
    return { plan: 'Free' };
  }
}
