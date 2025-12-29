import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

const COOKIE_CONSENT_KEY = 'flighttrace_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'flighttrace_cookie_preferences';

const DEFAULT_PREFERENCES = {
  essential: true, // Always true, cannot be disabled
  analytics: false,
  marketing: false,
};

export default function CookieConsentBanner({ onConsentChange }) {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const slideAnim = useState(new Animated.Value(100))[0];

  useEffect(() => {
    // Only show on web
    if (Platform.OS !== 'web') return;

    checkConsentStatus();
  }, []);

  const checkConsentStatus = async () => {
    try {
      const consent = await AsyncStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // No consent recorded, show banner
        setVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }).start();
      } else {
        // Load saved preferences
        const savedPrefs = await AsyncStorage.getItem(COOKIE_PREFERENCES_KEY);
        if (savedPrefs) {
          const parsedPrefs = JSON.parse(savedPrefs);
          setPreferences(parsedPrefs);
          onConsentChange?.(parsedPrefs);
        }
      }
    } catch (error) {
      console.error('Error checking cookie consent:', error);
    }
  };

  const saveConsent = async (prefs) => {
    try {
      await AsyncStorage.setItem(COOKIE_CONSENT_KEY, 'true');
      await AsyncStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
      onConsentChange?.(prefs);
      hideBanner();
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  };

  const hideBanner = () => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const acceptSelected = () => {
    saveConsent(preferences);
  };

  const rejectNonEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    setPreferences(essentialOnly);
    saveConsent(essentialOnly);
  };

  const togglePreference = (key) => {
    if (key === 'essential') return; // Can't disable essential
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://flightandtrace.com/privacy');
  };

  const openCookiePolicy = () => {
    Linking.openURL('https://flightandtrace.com/cookies');
  };

  if (!visible || Platform.OS !== 'web') return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <MaterialIcons name="cookie" size={24} color="#0066CC" />
          <Text style={styles.title}>Cookie Preferences</Text>
        </View>

        {!showDetails ? (
          <>
            <Text style={styles.description}>
              We use cookies to enhance your experience, analyze site traffic, and for marketing purposes.
              By clicking "Accept All", you consent to our use of cookies.{' '}
              <Text style={styles.link} onPress={openPrivacyPolicy}>
                Privacy Policy
              </Text>
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={rejectNonEssential}
              >
                <Text style={styles.secondaryButtonText}>Reject Non-Essential</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowDetails(true)}
              >
                <Text style={styles.secondaryButtonText}>Customize</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={acceptAll}
              >
                <Text style={styles.primaryButtonText}>Accept All</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.preferencesContainer}>
              <CookieOption
                title="Essential Cookies"
                description="Required for the website to function. Cannot be disabled."
                enabled={preferences.essential}
                locked
              />

              <CookieOption
                title="Analytics Cookies"
                description="Help us understand how visitors interact with our website."
                enabled={preferences.analytics}
                onToggle={() => togglePreference('analytics')}
              />

              <CookieOption
                title="Marketing Cookies"
                description="Used to deliver relevant advertisements and track ad campaigns."
                enabled={preferences.marketing}
                onToggle={() => togglePreference('marketing')}
              />
            </View>

            <View style={styles.detailsFooter}>
              <TouchableOpacity onPress={openCookiePolicy}>
                <Text style={styles.link}>Full Cookie Policy</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowDetails(false)}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={acceptSelected}
              >
                <Text style={styles.primaryButtonText}>Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

function CookieOption({ title, description, enabled, onToggle, locked }) {
  return (
    <View style={styles.optionContainer}>
      <View style={styles.optionInfo}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.toggle,
          enabled && styles.toggleEnabled,
          locked && styles.toggleLocked,
        ]}
        onPress={locked ? undefined : onToggle}
        disabled={locked}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
      >
        <View
          style={[
            styles.toggleKnob,
            enabled && styles.toggleKnobEnabled,
          ]}
        />
      </TouchableOpacity>
    </View>
  );
}

// Export function to reset consent (for settings/privacy page)
export async function resetCookieConsent() {
  try {
    await AsyncStorage.removeItem(COOKIE_CONSENT_KEY);
    await AsyncStorage.removeItem(COOKIE_PREFERENCES_KEY);
  } catch (error) {
    console.error('Error resetting cookie consent:', error);
  }
}

// Export function to get current preferences
export async function getCookiePreferences() {
  try {
    const prefs = await AsyncStorage.getItem(COOKIE_PREFERENCES_KEY);
    return prefs ? JSON.parse(prefs) : DEFAULT_PREFERENCES;
  } catch (error) {
    return DEFAULT_PREFERENCES;
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  content: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 16,
  },
  link: {
    color: '#0066CC',
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
  },
  preferencesContainer: {
    marginBottom: 16,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    padding: 2,
    justifyContent: 'center',
  },
  toggleEnabled: {
    backgroundColor: '#0066CC',
  },
  toggleLocked: {
    opacity: 0.6,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleKnobEnabled: {
    alignSelf: 'flex-end',
  },
  detailsFooter: {
    alignItems: 'center',
    marginBottom: 16,
  },
});
