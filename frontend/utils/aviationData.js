// Aviation Data API utilities
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function fetchLiveADSB(lat, lon, radiusKm = 100) {
  const res = await fetch(`${API_BASE}/aviation-data/adsb/live?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`);
  if (!res.ok) throw new Error('Failed to fetch ADS-B data');
  return res.json();
}

export async function fetchNOTAM(icao) {
  const res = await fetch(`${API_BASE}/aviation-data/notam?icao=${icao}`);
  if (!res.ok) throw new Error('Failed to fetch NOTAM');
  return res.json();
}

export async function fetchMETAR(icao) {
  const res = await fetch(`${API_BASE}/aviation-data/metar?icao=${icao}`);
  if (!res.ok) throw new Error('Failed to fetch METAR');
  return res.json();
}

export async function fetchTAF(icao) {
  const res = await fetch(`${API_BASE}/aviation-data/taf?icao=${icao}`);
  if (!res.ok) throw new Error('Failed to fetch TAF');
  return res.json();
}
