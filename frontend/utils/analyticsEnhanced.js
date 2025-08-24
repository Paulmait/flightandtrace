// analyticsEnhanced.js
// Utilities for enhanced analytics endpoints
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/analytics-enhanced';

export async function fetchCohortRetention(weeks = 12) {
  const res = await axios.get(`${API_BASE}/cohort-retention?weeks=${weeks}`);
  return res.data;
}

export async function fetchChurnPrediction() {
  const res = await axios.get(`${API_BASE}/churn-prediction`);
  return res.data;
}

export async function fetchRealTimeActivity() {
  const res = await axios.get(`${API_BASE}/real-time-activity`);
  return res.data;
}

export async function fetchPremiumAdoption() {
  const res = await axios.get(`${API_BASE}/premium-adoption`);
  return res.data;
}

export async function fetchAlertEffectiveness() {
  const res = await axios.get(`${API_BASE}/alert-effectiveness`);
  return res.data;
}

export async function fetchAnomalyDays(days = 30) {
  const res = await axios.get(`${API_BASE}/anomaly-days?days=${days}`);
  return res.data;
}
