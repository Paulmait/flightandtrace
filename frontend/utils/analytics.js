// Analytics utility for logging user events, device info, and location
import { Platform } from 'react-native';

export async function logLoginEvent({ userId, event = 'login' }) {
  let location = null;
  try {
    // Geolocation API (mobile)
    if (navigator && navigator.geolocation) {
      location = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          err => resolve(null),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      });
    }
  } catch (e) { location = null; }

  // Device info
  const device = Platform.OS;
  const appVersion = '1.0.0'; // TODO: dynamically fetch from app config
  const userAgent = navigator?.userAgent || 'unknown';

  // IP address (web only, fallback)
  let ip = null;
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      ip = (await res.json()).ip;
    } catch (e) { ip = null; }
  }

  // Send to backend
  await fetch('/api/analytics/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      event,
      timestamp: new Date().toISOString(),
      location,
      device,
      appVersion,
      userAgent,
      ip,
    })
  });
}

// Add more analytics events as needed (feature usage, errors, etc.)
