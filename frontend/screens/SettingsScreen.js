import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  TouchableOpacity,
  Alert,
  ActivityIndicator 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeProvider';
import { getFeatureFlags, updateUserSettings } from '../utils/api';

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
});