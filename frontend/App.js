import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './components/ThemeProvider';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import HomeScreen from './screens/HomeScreen';
import MFASetupScreen from './screens/MFASetupScreen';
import OAuth2LoginScreen from './screens/OAuth2LoginScreen';
import MapScreen from './screens/MapScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import { logLoginEvent } from './utils/analytics';
import RegisterScreen from './screens/RegisterScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import DragDropZone from './components/DragDropZone';
import { openFlightDetail, openDashboard } from './utils/multiWindow';
import { fetchAnalytics } from './utils/api';
import { fetchUserProfile } from './utils/api';
import FlightReplayScreen from './screens/FlightReplayScreen';
import AdminDashboard from './screens/AdminDashboard';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import { isDesktop, isTablet } from './styles/responsive';
import FlightStatusWidget from './components/FlightStatusWidget';
import NotificationCenterWidget from './components/NotificationCenterWidget';
import LiveMapADSB from './components/LiveMapADSB';
import AviationAlerts from './components/AviationAlerts';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Prevent auto-hiding of splash screen
SplashScreen.preventAutoHideAsync();

function MainDrawer({ token, setToken, userPlan }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flight, setFlight] = useState({ tailNumber: 'N12345', status: 'En Route', departure: 'JFK', arrival: 'LAX', eta: '2h 15m' });
  const [notifications, setNotifications] = useState([
    { message: 'Flight N12345 departed JFK', time: '10:05 AM' },
    { message: 'Delay: Weather at LAX', time: '10:45 AM' },
  ]);
  
  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchAnalytics(token)
        .then(data => { setAnalyticsData(data); setLoading(false); })
        .catch(() => { setAnalyticsData(null); setLoading(false); });
    }
  }, [token]);

  const desktop = isDesktop();
  
  useKeyboardShortcuts({
    'cmd+k': () => console.log('Open command palette'),
    'cmd+m': () => console.log('Focus map'),
    'cmd+shift+d': () => openDashboard(),
    'cmd+alt+f': (e) => {
      const flight = prompt('Enter flight number:');
      if (flight) openFlightDetail(flight);
    },
  });

  // Example ICAO for alerts (could be dynamic/user-selected)
  const defaultICAO = 'JFK';

  return (
    <View style={{ flex: 1, flexDirection: desktop ? 'row' : 'column' }}>
      <DragDropZone onFileDrop={(files) => console.log('Files dropped:', files)} />
      {desktop && (
        <View style={{ width: 300, borderRightWidth: 1, borderColor: '#e0e0e0', padding: 16 }}>
          <FlightStatusWidget flight={flight} />
          <NotificationCenterWidget notifications={notifications} />
        </View>
      )}
      <Drawer.Navigator 
        initialRouteName="Home"
        screenOptions={{ 
          drawerType: desktop ? 'permanent' : 'front',
          drawerStyle: { width: desktop ? 240 : '80%' }
        }}
      >
        <Drawer.Screen name="Home">
          {props => (
            <View style={{ flex: 1 }}>
              <HomeScreen {...props} token={token} />
              <View style={{ height: 300 }}>
                <LiveMapADSB />
              </View>
              <View style={{ height: 250 }}>
                <AviationAlerts icao={defaultICAO} />
              </View>
            </View>
          )}
        </Drawer.Screen>
        <Drawer.Screen name="Map">
          {props => <MapScreen {...props} token={token} />}
        </Drawer.Screen>
        <Drawer.Screen name="History">
          {props => <HistoryScreen {...props} token={token} />}
        </Drawer.Screen>
        <Drawer.Screen name="Analytics">
          {props => userPlan === 'Free' ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <Text style={{ fontSize: 16, marginBottom: 8 }}>Analytics is a Premium feature.</Text>
              <Button title="Upgrade to Premium" onPress={() => props.navigation.navigate('ProFeatures')} />
            </View>
          ) : loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} />
          ) : (
            <AnalyticsScreen {...props} token={token} userPlan={userPlan} analyticsData={analyticsData} />
          )}
        </Drawer.Screen>
        <Drawer.Screen name="Notifications">
          {props => <NotificationsScreen {...props} userPlan={userPlan} userId={token ? 'me' : null} />}
        </Drawer.Screen>
        <Drawer.Screen name="AdminDashboard">
          {props => <AdminDashboard {...props} analytics={analyticsData} />}
        </Drawer.Screen>
        <Drawer.Screen name="Settings" component={SettingsScreen} />
      </Drawer.Navigator>
    </View>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [token, setToken] = useState(null);
  const [userPlan, setUserPlan] = useState('Free');

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        // await Font.loadAsync(Ionicons.font);
        // Artificially delay for two seconds to simulate a slow loading
        // experience. Please remove this if you copy and paste the code!
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserProfile(token)
        .then(profile => setUserPlan(profile.plan || 'Free'))
        .catch(() => setUserPlan('Free'));
    }
  }, [token]);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!token ? (
              <>
                <Stack.Screen name="Landing" component={require('./screens/LandingPage').default} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Login">
                  {props => <LoginScreen {...props} setToken={async (token) => {
                    setToken(token);
                    // Log login analytics event
                    if (token) await logLoginEvent({ userId: token });
                  }} />}
                </Stack.Screen>
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="Pricing" component={require('./screens/PricingScreen').default} />
                <Stack.Screen name="Payment" component={require('./screens/PaymentScreen').default} />
                <Stack.Screen name="Analytics" component={require('./screens/AnalyticsScreen').default} />
                <Stack.Screen name="ProFeatures" component={require('./screens/ProFeaturesScreen').default} />
                <Stack.Screen name="MFASetup" component={MFASetupScreen} />
                <Stack.Screen name="OAuth2Login" component={OAuth2LoginScreen} />
                <Stack.Screen name="FlightReplay">
                  {props => userPlan === 'Free' ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                      <Text style={{ fontSize: 16, marginBottom: 8 }}>Flight replay is a Premium feature.</Text>
                      <Button title="Upgrade to Premium" onPress={() => props.navigation.navigate('ProFeatures')} />
                    </View>
                  ) : (
                    <FlightReplayScreen {...props} userPlan={userPlan} flightData={null} />
                  )}
                </Stack.Screen>
                <Stack.Screen name="StripeCheckout" component={require('./screens/StripeCheckoutScreen').default} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
              </>
            ) : (
              <Stack.Screen name="MainDrawer">
                {props => <MainDrawer {...props} token={token} setToken={setToken} userPlan={userPlan} />}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}