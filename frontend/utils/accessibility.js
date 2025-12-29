/**
 * FlightTrace Accessibility Utilities
 *
 * Provides accessibility helpers for WCAG 2.1 AA compliance.
 */

import { AccessibilityInfo, Platform, PixelRatio } from 'react-native';

/**
 * Accessibility Settings State
 */
let accessibilityState = {
  isScreenReaderEnabled: false,
  isReduceMotionEnabled: false,
  isBoldTextEnabled: false,
  isGrayscaleEnabled: false,
  isInvertColorsEnabled: false,
  preferredFontScale: 1,
};

/**
 * Initialize accessibility listeners
 */
export async function initAccessibility() {
  try {
    // Check current screen reader status
    accessibilityState.isScreenReaderEnabled =
      await AccessibilityInfo.isScreenReaderEnabled();

    // Check reduce motion (iOS)
    if (Platform.OS === 'ios') {
      accessibilityState.isReduceMotionEnabled =
        await AccessibilityInfo.isReduceMotionEnabled();
      accessibilityState.isBoldTextEnabled =
        await AccessibilityInfo.isBoldTextEnabled();
      accessibilityState.isGrayscaleEnabled =
        await AccessibilityInfo.isGrayscaleEnabled();
      accessibilityState.isInvertColorsEnabled =
        await AccessibilityInfo.isInvertColorsEnabled();
    }

    // Get font scale
    accessibilityState.preferredFontScale = PixelRatio.getFontScale();

    // Set up listeners
    AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      handleScreenReaderChange
    );
    AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      handleReduceMotionChange
    );
    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener(
        'boldTextChanged',
        handleBoldTextChange
      );
      AccessibilityInfo.addEventListener(
        'grayscaleChanged',
        handleGrayscaleChange
      );
      AccessibilityInfo.addEventListener(
        'invertColorsChanged',
        handleInvertColorsChange
      );
    }
  } catch (error) {
    console.warn('Failed to initialize accessibility:', error);
  }

  return accessibilityState;
}

// Event handlers
function handleScreenReaderChange(isEnabled) {
  accessibilityState.isScreenReaderEnabled = isEnabled;
}

function handleReduceMotionChange(isEnabled) {
  accessibilityState.isReduceMotionEnabled = isEnabled;
}

function handleBoldTextChange(isEnabled) {
  accessibilityState.isBoldTextEnabled = isEnabled;
}

function handleGrayscaleChange(isEnabled) {
  accessibilityState.isGrayscaleEnabled = isEnabled;
}

function handleInvertColorsChange(isEnabled) {
  accessibilityState.isInvertColorsEnabled = isEnabled;
}

/**
 * Get current accessibility state
 */
export function getAccessibilityState() {
  return { ...accessibilityState };
}

/**
 * Check if screen reader is active
 */
export function isScreenReaderActive() {
  return accessibilityState.isScreenReaderEnabled;
}

/**
 * Check if reduce motion is enabled
 */
export function isReduceMotionEnabled() {
  return accessibilityState.isReduceMotionEnabled;
}

/**
 * Announce to screen reader
 */
export function announceForAccessibility(message) {
  if (accessibilityState.isScreenReaderEnabled) {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/**
 * Set focus to element (for screen readers)
 */
export function setAccessibilityFocus(ref) {
  if (ref?.current && accessibilityState.isScreenReaderEnabled) {
    AccessibilityInfo.setAccessibilityFocus(ref.current);
  }
}

/**
 * Generate accessibility props for common UI patterns
 */
export const a11yProps = {
  /**
   * Button accessibility props
   */
  button: (label, hint = null, disabled = false) => ({
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { disabled },
  }),

  /**
   * Link accessibility props
   */
  link: (label, hint = null) => ({
    accessible: true,
    accessibilityRole: 'link',
    accessibilityLabel: label,
    accessibilityHint: hint || `Opens ${label}`,
  }),

  /**
   * Image accessibility props
   */
  image: (label) => ({
    accessible: true,
    accessibilityRole: 'image',
    accessibilityLabel: label,
  }),

  /**
   * Header accessibility props
   */
  header: (label) => ({
    accessible: true,
    accessibilityRole: 'header',
    accessibilityLabel: label,
  }),

  /**
   * Text input accessibility props
   */
  textInput: (label, hint = null, error = null) => ({
    accessible: true,
    accessibilityRole: 'text',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { invalid: !!error },
    accessibilityValue: error ? { text: error } : undefined,
  }),

  /**
   * Checkbox accessibility props
   */
  checkbox: (label, checked, disabled = false) => ({
    accessible: true,
    accessibilityRole: 'checkbox',
    accessibilityLabel: label,
    accessibilityState: { checked, disabled },
  }),

  /**
   * Switch/Toggle accessibility props
   */
  switch: (label, checked, disabled = false) => ({
    accessible: true,
    accessibilityRole: 'switch',
    accessibilityLabel: label,
    accessibilityState: { checked, disabled },
  }),

  /**
   * Tab accessibility props
   */
  tab: (label, selected, index, total) => ({
    accessible: true,
    accessibilityRole: 'tab',
    accessibilityLabel: label,
    accessibilityState: { selected },
    accessibilityValue: { min: 1, max: total, now: index + 1 },
  }),

  /**
   * List item accessibility props
   */
  listItem: (label, index, total, selected = false) => ({
    accessible: true,
    accessibilityRole: 'none',
    accessibilityLabel: label,
    accessibilityHint: `Item ${index + 1} of ${total}`,
    accessibilityState: { selected },
  }),

  /**
   * Alert/Notification accessibility props
   */
  alert: (message) => ({
    accessible: true,
    accessibilityRole: 'alert',
    accessibilityLabel: message,
    accessibilityLiveRegion: 'assertive',
  }),

  /**
   * Progress indicator accessibility props
   */
  progress: (label, value, max = 100) => ({
    accessible: true,
    accessibilityRole: 'progressbar',
    accessibilityLabel: label,
    accessibilityValue: { min: 0, max, now: value },
  }),

  /**
   * Map marker accessibility props
   */
  mapMarker: (flight) => {
    const label = flight.flightNumber || flight.callsign || 'Aircraft';
    return {
      accessible: true,
      accessibilityRole: 'button',
      accessibilityLabel: `${label} on map`,
      accessibilityHint: 'Double tap to view flight details',
    };
  },

  /**
   * Flight card accessibility props
   */
  flightCard: (flight) => {
    const { flightNumber, callsign, origin, destination, status } = flight;
    const flightId = flightNumber || callsign || 'Flight';
    const route = origin && destination ? `from ${origin} to ${destination}` : '';
    const statusText = status ? `, Status: ${status}` : '';

    return {
      accessible: true,
      accessibilityRole: 'button',
      accessibilityLabel: `${flightId} ${route}${statusText}`,
      accessibilityHint: 'Double tap to view flight details',
    };
  },
};

/**
 * Scale font size based on accessibility settings
 */
export function scaleFontSize(baseSize, maxScale = 1.5) {
  const scale = Math.min(accessibilityState.preferredFontScale, maxScale);
  return Math.round(baseSize * scale);
}

/**
 * Get animation duration (respects reduce motion)
 */
export function getAnimationDuration(normalDuration) {
  if (accessibilityState.isReduceMotionEnabled) {
    return 0;
  }
  return normalDuration;
}

/**
 * Get animation config for Animated API
 */
export function getAnimationConfig(config) {
  if (accessibilityState.isReduceMotionEnabled) {
    return {
      ...config,
      duration: 0,
    };
  }
  return config;
}

/**
 * Check contrast ratio (WCAG 2.1)
 * Returns true if contrast meets AA standard (4.5:1 for normal text)
 */
export function meetsContrastRatio(foreground, background, isLargeText = false) {
  const getLuminance = (hex) => {
    const rgb = hex.replace('#', '').match(/.{2}/g).map((x) => {
      const c = parseInt(x, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  // WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text
  const threshold = isLargeText ? 3 : 4.5;
  return ratio >= threshold;
}

/**
 * Get accessible color (ensures contrast)
 */
export function getAccessibleColor(foreground, background, isLargeText = false) {
  if (meetsContrastRatio(foreground, background, isLargeText)) {
    return foreground;
  }

  // Return high contrast alternative
  const bgLuminance = getLuminance(background);
  return bgLuminance > 0.5 ? '#000000' : '#FFFFFF';
}

function getLuminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map((x) => {
    const c = parseInt(x, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Minimum touch target size (44x44 per Apple HIG, 48x48 per Material)
 */
export const MIN_TOUCH_TARGET = Platform.OS === 'ios' ? 44 : 48;

/**
 * Get touch target style
 */
export function getTouchTargetStyle(currentSize) {
  if (currentSize >= MIN_TOUCH_TARGET) {
    return {};
  }

  const padding = (MIN_TOUCH_TARGET - currentSize) / 2;
  return {
    padding,
    margin: -padding,
  };
}

export default {
  initAccessibility,
  getAccessibilityState,
  isScreenReaderActive,
  isReduceMotionEnabled,
  announceForAccessibility,
  setAccessibilityFocus,
  a11yProps,
  scaleFontSize,
  getAnimationDuration,
  getAnimationConfig,
  meetsContrastRatio,
  getAccessibleColor,
  MIN_TOUCH_TARGET,
  getTouchTargetStyle,
};
