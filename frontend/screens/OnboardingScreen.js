import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: 'welcome',
    icon: 'flight',
    title: 'Welcome to FlightTrace',
    subtitle: 'Track flights in real-time',
    description: 'Monitor aircraft positions, get arrival notifications, and explore flight history with our intuitive tracking platform.',
    color: '#0066CC',
  },
  {
    id: 'features',
    icon: 'notifications-active',
    title: 'Smart Notifications',
    subtitle: 'Never miss an update',
    description: 'Receive instant alerts for departures, arrivals, delays, and gate changes. Stay informed about every flight you track.',
    color: '#4CAF50',
  },
  {
    id: 'map',
    icon: 'map',
    title: 'Live Map Tracking',
    subtitle: 'See flights in motion',
    description: 'Watch aircraft move in real-time on our interactive map. View altitude, speed, and route information at a glance.',
    color: '#FF9800',
  },
];

const DISCLAIMER_KEY = 'flighttrace_disclaimer_accepted';
const ONBOARDING_COMPLETE_KEY = 'flighttrace_onboarding_complete';

export default function OnboardingScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentSlide < ONBOARDING_SLIDES.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollRef.current?.scrollTo({ x: nextSlide * width, animated: true });
    } else {
      // Show disclaimer before proceeding
      setShowDisclaimer(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleSkip = () => {
    setShowDisclaimer(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleAcceptDisclaimer = async () => {
    if (!disclaimerAccepted) return;

    try {
      await AsyncStorage.setItem(DISCLAIMER_KEY, 'true');
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      navigation.replace('Login');
    } catch (error) {
      console.error('Failed to save disclaimer acceptance:', error);
      navigation.replace('Login');
    }
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  if (showDisclaimer) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.disclaimerContainer, { opacity: fadeAnim }]}>
          <View style={styles.disclaimerHeader}>
            <MaterialIcons name="warning" size={56} color="#FF6B00" />
            <Text style={styles.disclaimerTitle}>Important Notice</Text>
            <Text style={styles.disclaimerSubtitle}>Please read before continuing</Text>
          </View>

          <ScrollView style={styles.disclaimerScroll} showsVerticalScrollIndicator={true}>
            <View style={styles.disclaimerContent}>
              <View style={styles.disclaimerItem}>
                <MaterialIcons name="info-outline" size={24} color="#0066CC" />
                <View style={styles.disclaimerTextContainer}>
                  <Text style={styles.disclaimerItemTitle}>Informational Use Only</Text>
                  <Text style={styles.disclaimerItemText}>
                    FlightTrace provides flight tracking data for informational and entertainment purposes only.
                  </Text>
                </View>
              </View>

              <View style={styles.disclaimerItem}>
                <MaterialIcons name="do-not-disturb" size={24} color="#E53935" />
                <View style={styles.disclaimerTextContainer}>
                  <Text style={styles.disclaimerItemTitle}>Not for Aviation Safety</Text>
                  <Text style={styles.disclaimerItemText}>
                    This app must NOT be used for navigation, flight planning, air traffic control, or any aviation safety-critical decisions.
                  </Text>
                </View>
              </View>

              <View style={styles.disclaimerItem}>
                <MaterialIcons name="schedule" size={24} color="#FF9800" />
                <View style={styles.disclaimerTextContainer}>
                  <Text style={styles.disclaimerItemTitle}>Data May Be Delayed</Text>
                  <Text style={styles.disclaimerItemText}>
                    Flight positions and status information may be delayed, incomplete, or inaccurate. Data depends on third-party sources.
                  </Text>
                </View>
              </View>

              <View style={styles.disclaimerItem}>
                <MaterialIcons name="verified-user" size={24} color="#4CAF50" />
                <View style={styles.disclaimerTextContainer}>
                  <Text style={styles.disclaimerItemTitle}>Always Verify</Text>
                  <Text style={styles.disclaimerItemText}>
                    Always confirm flight information with official airline sources, airport authorities, or air traffic control.
                  </Text>
                </View>
              </View>

              <View style={styles.disclaimerItem}>
                <MaterialIcons name="business" size={24} color="#607D8B" />
                <View style={styles.disclaimerTextContainer}>
                  <Text style={styles.disclaimerItemTitle}>No ATC Affiliation</Text>
                  <Text style={styles.disclaimerItemText}>
                    FlightTrace is not affiliated with any air traffic control authority, airline, or government aviation agency.
                  </Text>
                </View>
              </View>

              <View style={styles.legalLinks}>
                <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </TouchableOpacity>
                <Text style={styles.legalSeparator}>|</Text>
                <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
                  <Text style={styles.legalLink}>Terms of Service</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.disclaimerFooter}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: disclaimerAccepted }}
              accessibilityLabel="I understand and accept these terms"
            >
              <View style={[styles.checkbox, disclaimerAccepted && styles.checkboxChecked]}>
                {disclaimerAccepted && (
                  <MaterialIcons name="check" size={18} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                I understand this app is for informational purposes only and is not to be used for aviation safety decisions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                !disclaimerAccepted && styles.acceptButtonDisabled,
              ]}
              onPress={handleAcceptDisclaimer}
              disabled={!disclaimerAccepted}
              accessibilityRole="button"
              accessibilityLabel="Continue to app"
              accessibilityHint="Accept the disclaimer and continue to the login screen"
            >
              <Text style={styles.acceptButtonText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {ONBOARDING_SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={[styles.iconContainer, { backgroundColor: slide.color }]}>
              <MaterialIcons name={slide.icon} size={80} color="#fff" />
            </View>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
            <Text style={styles.slideDescription}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                currentSlide === index && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={
            currentSlide === ONBOARDING_SLIDES.length - 1 ? 'Get started' : 'Next slide'
          }
        >
          <Text style={styles.nextButtonText}>
            {currentSlide === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  skipContainer: {
    alignItems: 'flex-end',
    padding: 16,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 18,
    color: '#0066CC',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  slideDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#0066CC',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  // Disclaimer styles
  disclaimerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  disclaimerHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  disclaimerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 12,
  },
  disclaimerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  disclaimerScroll: {
    flex: 1,
  },
  disclaimerContent: {
    padding: 20,
  },
  disclaimerItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  disclaimerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  disclaimerItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  disclaimerItemText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  legalLink: {
    fontSize: 14,
    color: '#0066CC',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    marginHorizontal: 12,
    color: '#ccc',
  },
  disclaimerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0066CC',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  acceptButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});
