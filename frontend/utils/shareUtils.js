/**
 * FlightTrace Share Utilities
 *
 * Provides sharing functionality for flights, alerts, and app content.
 */

import { Share, Platform, Linking } from 'react-native';

const APP_URL = 'https://flightandtrace.com';
const DEEP_LINK_SCHEME = 'flighttrace';

/**
 * Generate a shareable flight URL
 */
export function generateFlightUrl(flight) {
  const { callsign, icao24, flightNumber } = flight;
  const identifier = flightNumber || callsign || icao24;
  return `${APP_URL}/flight/${identifier}`;
}

/**
 * Generate a deep link for the app
 */
export function generateDeepLink(path) {
  return `${DEEP_LINK_SCHEME}://${path}`;
}

/**
 * Format flight data for sharing
 */
export function formatFlightShareText(flight) {
  const {
    callsign,
    flightNumber,
    origin,
    destination,
    aircraft,
    altitude,
    groundSpeed,
    status,
  } = flight;

  const lines = [];

  // Flight identifier
  const flightId = flightNumber || callsign || 'Unknown Flight';
  lines.push(`${flightId}`);

  // Route
  if (origin && destination) {
    lines.push(`${origin.code || origin} -> ${destination.code || destination}`);
  }

  // Aircraft
  if (aircraft) {
    lines.push(`Aircraft: ${aircraft.type || aircraft}`);
  }

  // Status
  if (status) {
    lines.push(`Status: ${status}`);
  }

  // Current info
  const currentInfo = [];
  if (altitude) {
    currentInfo.push(`${Math.round(altitude).toLocaleString()} ft`);
  }
  if (groundSpeed) {
    currentInfo.push(`${Math.round(groundSpeed)} kts`);
  }
  if (currentInfo.length > 0) {
    lines.push(currentInfo.join(' | '));
  }

  // App attribution
  lines.push('');
  lines.push('Tracked with FlightTrace');

  return lines.join('\n');
}

/**
 * Share a flight
 */
export async function shareFlight(flight) {
  try {
    const message = formatFlightShareText(flight);
    const url = generateFlightUrl(flight);
    const title = `Track ${flight.flightNumber || flight.callsign || 'Flight'}`;

    const shareContent = {
      title,
      message: Platform.OS === 'ios' ? message : `${message}\n\n${url}`,
      url: Platform.OS === 'ios' ? url : undefined,
    };

    const result = await Share.share(shareContent, {
      dialogTitle: title,
      subject: title,
    });

    return {
      success: result.action === Share.sharedAction,
      activityType: result.activityType,
    };
  } catch (error) {
    console.error('Share failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Share flight alert
 */
export async function shareAlert(alert) {
  try {
    const {
      flightNumber,
      type,
      message,
      triggerTime,
    } = alert;

    const lines = [
      `Flight Alert: ${flightNumber}`,
      '',
      message || `${type} alert triggered`,
      '',
      triggerTime ? `Time: ${new Date(triggerTime).toLocaleString()}` : '',
      '',
      'Set up your own alerts with FlightTrace',
      APP_URL,
    ].filter(Boolean);

    const result = await Share.share({
      title: `Flight Alert: ${flightNumber}`,
      message: lines.join('\n'),
    });

    return {
      success: result.action === Share.sharedAction,
    };
  } catch (error) {
    console.error('Share alert failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Share flight history/trip
 */
export async function shareTrip(trip) {
  try {
    const {
      flights,
      startDate,
      endDate,
      totalDistance,
      totalEmissions,
    } = trip;

    const lines = [
      'My Trip Summary',
      '',
      `${flights.length} flight${flights.length > 1 ? 's' : ''}`,
      `${startDate} - ${endDate}`,
      '',
    ];

    if (totalDistance) {
      lines.push(`Total Distance: ${totalDistance.toLocaleString()} km`);
    }
    if (totalEmissions) {
      lines.push(`CO2 Emissions: ${totalEmissions.toFixed(1)} kg`);
    }

    lines.push('', 'Track your flights with FlightTrace', APP_URL);

    const result = await Share.share({
      title: 'My Flight Trip',
      message: lines.join('\n'),
    });

    return { success: result.action === Share.sharedAction };
  } catch (error) {
    console.error('Share trip failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Share app invite
 */
export async function shareAppInvite(referralCode = null) {
  try {
    let url = APP_URL;
    if (referralCode) {
      url += `?ref=${referralCode}`;
    }

    const message = [
      'Check out FlightTrace - the best way to track flights in real-time!',
      '',
      'Features:',
      '- Live flight tracking on an interactive map',
      '- Flight alerts and notifications',
      '- Fuel consumption & CO2 tracking',
      '- Flight history and statistics',
      '',
      'Download now:',
      url,
    ].join('\n');

    const result = await Share.share({
      title: 'Try FlightTrace',
      message,
      url: Platform.OS === 'ios' ? url : undefined,
    });

    return { success: result.action === Share.sharedAction };
  } catch (error) {
    console.error('Share invite failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Share to specific app (if available)
 */
export async function shareToApp(appType, content) {
  const appSchemes = {
    whatsapp: {
      scheme: 'whatsapp://',
      urlFormat: (text) => `whatsapp://send?text=${encodeURIComponent(text)}`,
    },
    telegram: {
      scheme: 'tg://',
      urlFormat: (text) => `tg://msg?text=${encodeURIComponent(text)}`,
    },
    twitter: {
      scheme: 'twitter://',
      urlFormat: (text, url) =>
        `twitter://post?message=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ''}`,
    },
    email: {
      scheme: 'mailto:',
      urlFormat: (text, url, subject) =>
        `mailto:?subject=${encodeURIComponent(subject || 'Flight Info')}&body=${encodeURIComponent(text + (url ? `\n\n${url}` : ''))}`,
    },
    sms: {
      scheme: 'sms:',
      urlFormat: (text) => `sms:?body=${encodeURIComponent(text)}`,
    },
  };

  const app = appSchemes[appType];
  if (!app) {
    // Fall back to default share
    return Share.share({ message: content.text, url: content.url });
  }

  try {
    const canOpen = await Linking.canOpenURL(app.scheme);
    if (!canOpen) {
      // App not installed, fall back to default share
      return Share.share({ message: content.text, url: content.url });
    }

    const url = app.urlFormat(content.text, content.url, content.subject);
    await Linking.openURL(url);

    return { success: true, app: appType };
  } catch (error) {
    console.error(`Share to ${appType} failed:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text) {
  try {
    const { Clipboard } = await import('@react-native-clipboard/clipboard');
    Clipboard.setString(text);
    return { success: true };
  } catch (error) {
    // Fallback for older React Native versions
    try {
      const { Clipboard: LegacyClipboard } = require('react-native');
      LegacyClipboard.setString(text);
      return { success: true };
    } catch (fallbackError) {
      console.error('Copy to clipboard failed:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
}

/**
 * Generate QR code data for flight
 */
export function generateFlightQRData(flight) {
  const url = generateFlightUrl(flight);
  return {
    type: 'url',
    data: url,
    content: {
      flightNumber: flight.flightNumber || flight.callsign,
      url,
    },
  };
}

export default {
  shareFlight,
  shareAlert,
  shareTrip,
  shareAppInvite,
  shareToApp,
  copyToClipboard,
  generateFlightUrl,
  generateDeepLink,
  formatFlightShareText,
  generateFlightQRData,
};
