// analyticsExtra.js
// Utilities for advanced analytics endpoints
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/analytics-extra';

export async function fetchAirportCongestion(hours = 24) {
  const res = await axios.get(`${API_BASE}/airport-congestion?hours=${hours}`);
  return res.data;
}

export async function fetchRouteTrends(days = 30) {
  const res = await axios.get(`${API_BASE}/route-trends?days=${days}`);
  return res.data;
}

export async function fetchAlertResponseTimes(days = 30) {
  const res = await axios.get(`${API_BASE}/alert-response-times?days=${days}`);
  return res.data;
}

export async function fetchWeatherImpact(days = 30) {
  const res = await axios.get(`${API_BASE}/weather-impact?days=${days}`);
  return res.data;
}

export async function fetchFleetUtilization(days = 30) {
  const res = await axios.get(`${API_BASE}/fleet-utilization?days=${days}`);
  return res.data;
}

export async function fetchUserEngagement(days = 30) {
  const res = await axios.get(`${API_BASE}/user-engagement?days=${days}`);
  return res.data;
}

export async function fetchSubscriptionAnalytics(days = 30) {
  const res = await axios.get(`${API_BASE}/subscription?days=${days}`);
  return res.data;
}
