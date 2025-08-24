// adminAnalytics.js
// Utilities for admin analytics endpoints (feature usage, login events)
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/admin';

export async function fetchFeatureUsage(userId = null) {
  const url = userId ? `${API_BASE}/feature_usage?user_id=${userId}` : `${API_BASE}/feature_usage`;
  const res = await axios.get(url);
  return res.data;
}

export async function fetchLoginEvents() {
  const res = await axios.get(`${API_BASE}/login_events`);
  return res.data;
}
