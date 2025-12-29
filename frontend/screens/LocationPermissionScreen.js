import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeProvider';

const LOCATION_PERMISSION_KEY = 'flighttrace_location_permission_shown';

export default function LocationPermissionScreen({ navigation, onComplete }) {
  const { theme } = useTheme();
  const [step, setStep] = useState('foreground'); // 'foreground' | 'background' | 'complete'
  const [foregroundGranted, setForegroundGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkExistingPermissions();
  }, []);

  const checkExistingPermissions = async () => {
    const { status: foreground } = await Location.getForegroundPermissionsAsync();
    if (foreground === 'granted') {
      setForegroundGranted(true);
      const { status: background } = await Location.getBackgroundPermissionsAsync();
      if (background === 'granted') {
        handleComplete();
      } else {
        setStep('background');
      }
    }
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'true');
    if (onComplete) {
      onComplete();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const requestForegroundPermission = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setForegroundGranted(true);
        setStep('background');
      } else {
        // User denied, proceed without location
        handleComplete();
      }
    } catch (error) {
      console.error('Error requesting foreground permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestBackgroundPermission = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      // Whether granted or denied, we proceed
      handleComplete();
    } catch (error) {
      console.error('Error requesting background permission:', error);
      handleComplete();
    } finally {
      setLoading(false);
    }
  };

  const skipBackgroundLocation = () => {
    handleComplete();
  };

  if (step === 'foreground') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="my-location" size={80} color="#0066CC" />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>
            Enable Location Services
          </Text>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            FlightTrace uses your location to enhance your experience
          </Text>

          <View style={styles.benefitsContainer}>
            <BenefitItem
              icon="flight"
              title="Nearby Aircraft"
              description="See flights passing over your current location"
              theme={theme}
            />
            <BenefitItem
              icon="place"
              title="Local Airports"
              description="Find airports and airfields near you"
              theme={theme}
            />
            <BenefitItem
              icon="explore"
              title="Regional View"
              description="Map automatically centers on your area"
              theme={theme}
            />
          </View>

          <View style={styles.privacyNote}>
            <MaterialIcons name="lock" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
              Your location is processed locally on your device and is never sold to third parties.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={requestForegroundPermission}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Enable location"
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Enabling...' : 'Enable Location'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleComplete}
              accessibilityRole="button"
              accessibilityLabel="Skip for now"
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
                Skip for Now
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Background location step (Android only prominent disclosure)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <View style={styles.backgroundIcon}>
            <MaterialIcons name="location-on" size={50} color="#fff" />
            <View style={styles.backgroundBadge}>
              <MaterialIcons name="notifications-active" size={20} color="#fff" />
            </View>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          Background Location Access
        </Text>

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Optional feature for flight proximity alerts
        </Text>

        {/* Prominent disclosure for Google Play compliance */}
        <View style={[styles.disclosureBox, { backgroundColor: '#E3F2FD' }]}>
          <MaterialIcons name="info" size={24} color="#1976D2" />
          <View style={styles.disclosureContent}>
            <Text style={styles.disclosureTitle}>How we use background location</Text>
            <Text style={styles.disclosureText}>
              FlightTrace collects location data to enable flight proximity alerts even when the app is closed or not in use.
            </Text>
          </View>
        </View>

        <View style={styles.benefitsContainer}>
          <BenefitItem
            icon="notifications"
            title="Proximity Alerts"
            description="Get notified when tracked flights approach your location"
            theme={theme}
          />
          <BenefitItem
            icon="offline-bolt"
            title="Works in Background"
            description="Receive alerts even when the app is not open"
            theme={theme}
          />
        </View>

        <View style={styles.dataUsageBox}>
          <Text style={[styles.dataUsageTitle, { color: theme.colors.text }]}>
            Your data stays safe:
          </Text>
          <View style={styles.dataUsageItem}>
            <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
            <Text style={[styles.dataUsageText, { color: theme.colors.text }]}>
              Location processed locally on your device
            </Text>
          </View>
          <View style={styles.dataUsageItem}>
            <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
            <Text style={[styles.dataUsageText, { color: theme.colors.text }]}>
              Never sold to third parties
            </Text>
          </View>
          <View style={styles.dataUsageItem}>
            <MaterialIcons name="check-circle" size={18} color="#4CAF50" />
            <Text style={[styles.dataUsageText, { color: theme.colors.text }]}>
              Disable anytime in Settings
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={requestBackgroundPermission}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Allow background location"
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Processing...' : 'Allow Background Location'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={skipBackgroundLocation}
            accessibilityRole="button"
            accessibilityLabel="Use only while app is open"
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
              Only While Using App
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footerNote, { color: theme.colors.textSecondary }]}>
          You can change this setting anytime in your device's app permissions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function BenefitItem({ icon, title, description, theme }) {
  return (
    <View style={styles.benefitItem}>
      <View style={[styles.benefitIcon, { backgroundColor: '#E3F2FD' }]}>
        <MaterialIcons name={icon} size={24} color="#0066CC" />
      </View>
      <View style={styles.benefitText}>
        <Text style={[styles.benefitTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.benefitDescription, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  backgroundIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backgroundBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  disclosureBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  disclosureContent: {
    flex: 1,
    marginLeft: 12,
  },
  disclosureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  disclosureText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 14,
  },
  dataUsageBox: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 24,
  },
  dataUsageTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  dataUsageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataUsageText: {
    fontSize: 14,
    marginLeft: 8,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
  },
  footerNote: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
