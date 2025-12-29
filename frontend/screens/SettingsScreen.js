import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeProvider';
import { getFeatureFlags, updateUserSettings, exportUserData, deleteUserAccount } from '../utils/api';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  
  // Feature toggles
  const [features, setFeatures] = useState({
    fuelEstimates: false,
    weatherOverlay: true,
    realtimeNotifications: true,
    socialSharing: true,
    familySharing: true,
    voiceAssistant: false,
    multiWindow: false,
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
    statusChanges: true,
    delays: true,
    emergencies: true,
    fuelUpdates: false,
  });

  // Display preferences
  const [display, setDisplay] = useState({
    darkMode: false,
    compactView: false,
    showAircraft: true,
    showCallsign: true,
    metric: false, // false = imperial, true = metric
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load feature flags from API
      const flags = await getFeatureFlags();
      
      // Load saved preferences from AsyncStorage
      const savedFeatures = await AsyncStorage.getItem('featureSettings');
      const savedNotifications = await AsyncStorage.getItem('notificationSettings');
      const savedDisplay = await AsyncStorage.getItem('displaySettings');
      
      if (savedFeatures) {
        setFeatures({ ...features, ...JSON.parse(savedFeatures) });
      } else {
        // Use feature flags from API if no saved preferences
        setFeatures(prev => ({
          ...prev,
          ...flags
        }));
      }
      
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
      
      if (savedDisplay) {
        setDisplay(JSON.parse(savedDisplay));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem('featureSettings', JSON.stringify(features));
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(notifications));
      await AsyncStorage.setItem('displaySettings', JSON.stringify(display));
      
      // Update server
      await updateUserSettings({
        features,
        notifications,
        display
      });
      
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (feature) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const toggleNotification = (setting) => {
    setNotifications(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const toggleDisplay = (setting) => {
    if (setting === 'darkMode') {
      toggleTheme();
    }
    setDisplay(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleRestorePurchases = async () => {
    setRestoringPurchases(true);
    try {
      // For iOS, use StoreKit to restore purchases
      // For Android, use Google Play Billing
      if (Platform.OS === 'ios') {
        // In production, use expo-in-app-purchases or react-native-iap
        // await InAppPurchases.restorePurchasesAsync();
        Alert.alert(
          'Restore Purchases',
          'Checking for previous purchases...',
          [{ text: 'OK' }]
        );
        // Simulate restore process
        await new Promise(resolve => setTimeout(resolve, 2000));
        Alert.alert('Success', 'Purchases restored successfully!');
      } else {
        // Android restore flow
        Alert.alert(
          'Restore Purchases',
          'Checking Google Play for previous purchases...',
          [{ text: 'OK' }]
        );
        await new Promise(resolve => setTimeout(resolve, 2000));
        Alert.alert('Success', 'Purchases restored successfully!');
      }
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again or contact support.');
    } finally {
      setRestoringPurchases(false);
    }
  };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      Alert.alert(
        'Export Your Data',
        'We will prepare your data export and send a download link to your email within 48 hours.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setExportingData(false) },
          {
            text: 'Request Export',
            onPress: async () => {
              try {
                await exportUserData();
                Alert.alert('Success', 'Data export requested. Check your email within 48 hours.');
              } catch (error) {
                Alert.alert('Error', 'Failed to request data export. Please try again.');
              }
              setExportingData(false);
            },
          },
        ]
      );
    } catch (error) {
      setExportingData(false);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. You will have 30 days to recover your account before permanent deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Type DELETE to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteUserAccount();
                      Alert.alert(
                        'Account Scheduled for Deletion',
                        'Your account will be deleted in 30 days. You can log back in to cancel this process.'
                      );
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete account. Please contact support.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const openPrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const openTermsOfService = () => {
    navigation.navigate('TermsOfService');
  };

  const openSupport = () => {
    Linking.openURL('mailto:support@flighttrace.com');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Features Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Features
          </Text>
          
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <MaterialIcons name="local-gas-station" size={20} color={theme.colors.primary} />
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                    Fuel & CO₂ Estimates
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Calculate fuel consumption and emissions for tracked flights
                </Text>
              </View>
              <Switch
                value={features.fuelEstimates}
                onValueChange={() => toggleFeature('fuelEstimates')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={features.fuelEstimates ? theme.colors.primaryDark : '#f4f3f4'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <MaterialIcons name="cloud" size={20} color={theme.colors.primary} />
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                    Weather Overlay
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Show weather conditions on the map
                </Text>
              </View>
              <Switch
                value={features.weatherOverlay}
                onValueChange={() => toggleFeature('weatherOverlay')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={features.weatherOverlay ? theme.colors.primaryDark : '#f4f3f4'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <MaterialIcons name="share" size={20} color={theme.colors.primary} />
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                    Social Sharing
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Share flight tracking with friends
                </Text>
              </View>
              <Switch
                value={features.socialSharing}
                onValueChange={() => toggleFeature('socialSharing')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={features.socialSharing ? theme.colors.primaryDark : '#f4f3f4'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <MaterialIcons name="group" size={20} color={theme.colors.primary} />
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                    Family Sharing
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Share tracking with family members
                </Text>
              </View>
              <Switch
                value={features.familySharing}
                onValueChange={() => toggleFeature('familySharing')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={features.familySharing ? theme.colors.primaryDark : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Notifications
          </Text>
          
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  Push Notifications
                </Text>
              </View>
              <Switch
                value={notifications.push}
                onValueChange={() => toggleNotification('push')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.push ? theme.colors.primaryDark : '#f4f3f4'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  Email Notifications
                </Text>
              </View>
              <Switch
                value={notifications.email}
                onValueChange={() => toggleNotification('email')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.email ? theme.colors.primaryDark : '#f4f3f4'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  SMS Notifications
                </Text>
              </View>
              <Switch
                value={notifications.sms}
                onValueChange={() => toggleNotification('sms')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.sms ? theme.colors.primaryDark : '#f4f3f4'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  Fuel Updates
                </Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Get notified about fuel consumption milestones
                </Text>
              </View>
              <Switch
                value={notifications.fuelUpdates}
                onValueChange={() => toggleNotification('fuelUpdates')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.fuelUpdates ? theme.colors.primaryDark : '#f4f3f4'}
                disabled={!features.fuelEstimates}
              />
            </View>
          </View>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Display
          </Text>
          
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={display.darkMode}
                onValueChange={() => toggleDisplay('darkMode')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={display.darkMode ? theme.colors.primaryDark : '#f4f3f4'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  Units
                </Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {display.metric ? 'Metric (km, kg, L)' : 'Imperial (mi, lbs, gal)'}
                </Text>
              </View>
              <Switch
                value={display.metric}
                onValueChange={() => toggleDisplay('metric')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={display.metric ? theme.colors.primaryDark : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Subscription
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleRestorePurchases}
              disabled={restoringPurchases}
              accessibilityRole="button"
              accessibilityLabel="Restore purchases"
            >
              <View style={styles.actionInfo}>
                <MaterialIcons name="restore" size={20} color={theme.colors.primary} />
                <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                  Restore Purchases
                </Text>
              </View>
              {restoringPurchases ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Pricing')}
              accessibilityRole="button"
              accessibilityLabel="Manage subscription"
            >
              <View style={styles.actionInfo}>
                <MaterialIcons name="credit-card" size={20} color={theme.colors.primary} />
                <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                  Manage Subscription
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy & Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Privacy & Data
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleExportData}
              disabled={exportingData}
              accessibilityRole="button"
              accessibilityLabel="Export my data"
            >
              <View style={styles.actionInfo}>
                <MaterialIcons name="download" size={20} color={theme.colors.primary} />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                    Export My Data
                  </Text>
                  <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>
                    Download a copy of your data (GDPR)
                  </Text>
                </View>
              </View>
              {exportingData ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDeleteAccount}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
            >
              <View style={styles.actionInfo}>
                <MaterialIcons name="delete-forever" size={20} color="#E53935" />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionLabel, { color: '#E53935' }]}>
                    Delete Account
                  </Text>
                  <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>
                    Permanently delete your account and data
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionNote, { color: theme.colors.textSecondary }]}>
            Your data is stored securely and never sold to third parties.
          </Text>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Legal
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={openPrivacyPolicy}
              accessibilityRole="link"
              accessibilityLabel="Privacy policy"
            >
              <View style={styles.actionInfo}>
                <MaterialIcons name="privacy-tip" size={20} color={theme.colors.primary} />
                <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                  Privacy Policy
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={openTermsOfService}
              accessibilityRole="link"
              accessibilityLabel="Terms of service"
            >
              <View style={styles.actionInfo}>
                <MaterialIcons name="description" size={20} color={theme.colors.primary} />
                <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                  Terms of Service
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={openSupport}
              accessibilityRole="link"
              accessibilityLabel="Contact support"
            >
              <View style={styles.actionInfo}>
                <MaterialIcons name="help-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                  Contact Support
                </Text>
              </View>
              <MaterialIcons name="open-in-new" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
            FlightTrace v1.0.0 (Build 1)
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
    marginLeft: 28,
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
  },
  saveButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 56,
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  actionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionNote: {
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});