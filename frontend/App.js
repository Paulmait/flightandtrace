
import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './components/ThemeProvider';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import { logLoginEvent } from './utils/analytics';
import RegisterScreen from './screens/RegisterScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import { useEffect } from 'react';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import DragDropZone from './components/DragDropZone';
import { openFlightDetail, openDashboard } from './utils/multiWindow';
import { fetchAnalytics } from './utils/api';
import { fetchUserProfile } from './utils/api';
import FlightReplayScreen from './screens/FlightReplayScreen';
import AdminDashboard from './screens/AdminDashboard';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

import { isDesktop, isTablet } from './styles/responsive';
import FlightStatusWidget from './components/FlightStatusWidget';
import NotificationCenterWidget from './components/NotificationCenterWidget';

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

  // Keyboard shortcuts usage example
  useKeyboardShortcuts({
    newFlight: () => alert('New flight dialog (Ctrl+N)'),
    goHistory: () => alert('Go to History (Ctrl+H)'),
    goAnalytics: () => alert('Go to Analytics (Ctrl+A)'),
    goMap: () => alert('Go to Map (Ctrl+M)'),
  });
  return (
    <View style={{ flex: 1 }}>
      {(isDesktop || isTablet) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
          <FlightStatusWidget flight={flight} />
          <NotificationCenterWidget notifications={notifications} />
        </View>
      )}
      {(isDesktop || isTablet) && (
        <DragDropZone onDrop={files => alert(`Dropped ${files.length} file(s)!`)} />
      )}
      <Button title="Open Flight Detail (Multi-Window)" onPress={() => openFlightDetail('N12345')} />
      <Button title="Open Dashboard (Multi-Window)" onPress={openDashboard} />
      <Drawer.Navigator initialRouteName="Map">
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen name="Map">
          {props => <MapScreen {...props} token={token} userPlan={userPlan} />}
        </Drawer.Screen>
        <Drawer.Screen name="History">
          {props => userPlan === 'Free' ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <Text style={{ fontSize: 16, marginBottom: 8 }}>Flight history is a Premium feature.</Text>
              <Button title="Upgrade to Premium" onPress={() => props.navigation.navigate('ProFeatures')} />
            </View>
          ) : (
            <HistoryScreen {...props} token={token} userPlan={userPlan} />
          )}
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
// End of App component

  const [token, setToken] = useState(null);
  const [userPlan, setUserPlan] = useState('Free');
  useEffect(() => {
    if (token) {
      fetchUserProfile(token)
        .then(profile => setUserPlan(profile.plan || 'Free'))
        .catch(() => setUserPlan('Free'));
    }
  }, [token]);
  return (
    <ThemeProvider>
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
            </>
          ) : (
            <Stack.Screen name="MainDrawer">
              {props => <MainDrawer {...props} token={token} setToken={setToken} userPlan={userPlan} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
