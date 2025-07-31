
import React, { useState } from 'react';
import { View, Text, Image, Button, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import VideoDemo from '../components/VideoDemo';
import OAuth2Login from '../components/OAuth2Login';
import MFASetup from '../components/MFASetup';

const PRICING_TIERS = [
  {
    name: 'Free',
    price: 'Free',
    features: [
      'Track up to 3 tail numbers',
      '24-hour history',
      'Basic alerts',
    ],
  },
  {
    name: 'Premium',
    price: '$5/month or $50/year',
    features: [
      'Unlimited tail numbers',
      'Advanced notifications',
      'Flight replay',
    ],
  },
  {
    name: 'Family Plan',
    price: '$8/month or $80/year',
    features: [
      'Up to 5 users per household',
      'Shared tracking lists',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom pricing',
    features: [
      'Concierge onboarding',
      'Brandable dashboards',
      'API access',
    ],
  },
];

export default function LandingPage({ navigation }) {
  const [demoTail, setDemoTail] = useState('');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0099ff' }} contentContainerStyle={{ alignItems: 'center', padding: 24 }}>
      {/* Logo and Tagline */}
      <Image source={require('../assets/flighttrace-logo.png')} style={styles.logo} />
      <Text style={styles.title}>FlightTrace</Text>
      <Text style={styles.subtitle}>Track your flights with ease</Text>

      {/* Feature Highlights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why FlightTrace?</Text>
        <Text style={styles.feature}>• Real-time flight tracking and predictive delay alerts</Text>
        <Text style={styles.feature}>• Premium analytics and exportable reports</Text>
        <Text style={styles.feature}>• Multi-platform: mobile, desktop, and web</Text>
        <Text style={styles.feature}>• Enterprise-grade security (MFA, OAuth2, GDPR)</Text>
        <Text style={styles.feature}>• Instant notifications and widgets</Text>
      </View>

      {/* Pricing Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
          {PRICING_TIERS.map(tier => (
            <View key={tier.name} style={styles.pricingCard}>
              <Text style={styles.pricingTitle}>{tier.name}</Text>
              <Text style={styles.pricingPrice}>{tier.price}</Text>
              {tier.features.map((f, idx) => (
                <Text key={idx} style={styles.pricingFeature}>• {f}</Text>
              ))}
              <TouchableOpacity style={styles.pricingButton} onPress={() => navigation.navigate('Payment', { plan: tier.name })}>
                <Text style={styles.pricingButtonText}>{tier.name === 'Free' ? 'Get Started' : tier.name === 'Enterprise' ? 'Contact Sales' : 'Start Free Trial'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Live Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Demo</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TextInput
            placeholder="Enter tail number"
            value={demoTail}
            onChangeText={setDemoTail}
            style={styles.demoInput}
            placeholderTextColor="#0099ff"
          />
          <TouchableOpacity style={styles.demoButton} onPress={() => navigation.navigate('Map', { tail: demoTail })}>
            <Text style={styles.demoButtonText}>Track</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>See FlightTrace in Action</Text>
        <VideoDemo platform="mobile" />
      </View>

      {/* Testimonials */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What Our Users Say</Text>
        <Text style={styles.testimonial}>
          "FlightTrace is the only app I trust for real-time flight updates. The predictive delay feature is a game changer!"
        </Text>
        <Text style={styles.testimonialAuthor}>– Alex P., Aviation Enthusiast</Text>
        <Text style={styles.testimonial}>
          "Our operations team relies on FlightTrace for instant notifications and analytics. Highly recommended for professionals."
        </Text>
        <Text style={styles.testimonialAuthor}>– Jamie L., Airline Ops Manager</Text>
      </View>

      {/* Feature Comparison */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Comparison</Text>
        <View style={styles.comparisonRow}><Text style={styles.comparisonFeature}>Real-time Tracking</Text><Text style={styles.comparisonYes}>✔️</Text><Text style={styles.comparisonYes}>✔️</Text><Text style={styles.comparisonYes}>✔️</Text></View>
        <View style={styles.comparisonRow}><Text style={styles.comparisonFeature}>Predictive Delays</Text><Text style={styles.comparisonYes}>✔️</Text><Text style={styles.comparisonNo}>❌</Text><Text style={styles.comparisonNo}>❌</Text></View>
        <View style={styles.comparisonRow}><Text style={styles.comparisonFeature}>Premium Analytics</Text><Text style={styles.comparisonYes}>✔️</Text><Text style={styles.comparisonNo}>❌</Text><Text style={styles.comparisonNo}>❌</Text></View>
        <View style={styles.comparisonRow}><Text style={styles.comparisonFeature}>Multi-Platform</Text><Text style={styles.comparisonYes}>✔️</Text><Text style={styles.comparisonNo}>❌</Text><Text style={styles.comparisonYes}>✔️</Text></View>
        <View style={styles.comparisonRow}><Text style={styles.comparisonFeature}>Security (MFA, OAuth2)</Text><Text style={styles.comparisonYes}>✔️</Text><Text style={styles.comparisonNo}>❌</Text><Text style={styles.comparisonNo}>❌</Text></View>
      </View>

      {/* Security & Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security & Privacy</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
          <View style={styles.securityCard}><Text style={styles.securityIcon}>🔒</Text><Text style={styles.securityText}>MFA & OAuth2</Text></View>
          <View style={styles.securityCard}><Text style={styles.securityIcon}>🛡️</Text><Text style={styles.securityText}>GDPR Compliant</Text></View>
          <View style={styles.securityCard}><Text style={styles.securityIcon}>💳</Text><Text style={styles.securityText}>Secure Payments</Text></View>
        </View>
      </View>

      {/* FAQ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FAQ</Text>
        <Text style={styles.faqQ}>How do I start tracking a flight?</Text>
        <Text style={styles.faqA}>Sign up for a free account and enter a tail number to begin tracking instantly.</Text>
        <Text style={styles.faqQ}>Is my data secure?</Text>
        <Text style={styles.faqA}>Yes, we use industry-standard security and privacy practices, including MFA and GDPR compliance.</Text>
        <Text style={styles.faqQ}>Can I upgrade or cancel anytime?</Text>
        <Text style={styles.faqA}>Absolutely! You can upgrade, downgrade, or cancel your plan at any time from your account dashboard.</Text>
      </View>

      {/* Signup/Login Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get Started Instantly</Text>
        <OAuth2Login onLogin={provider => alert(`OAuth2 login with ${provider}`)} />
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity style={styles.signupButton} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signupButtonText}>Sign Up Free</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
        <MFASetup />
      </View>

      {/* Footer */}
      <Text style={styles.footer}>&copy; {new Date().getFullYear()} FlightTrace. All rights reserved.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#e0f7fa',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  feature: {
    fontSize: 16,
    color: '#e0f7fa',
    marginBottom: 2,
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0099ff',
    marginBottom: 4,
  },
  pricingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0099ff',
    marginBottom: 4,
  },
  pricingFeature: {
    fontSize: 14,
    color: '#0099ff',
  },
  pricingButton: {
    backgroundColor: '#0099ff',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  pricingButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  demoInput: {
    backgroundColor: '#fff',
    color: '#0099ff',
    borderRadius: 6,
    padding: 8,
    width: 140,
    marginRight: 8,
  },
  demoButton: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  demoButtonText: {
    color: '#0099ff',
    fontWeight: 'bold',
  },
  testimonial: {
    fontStyle: 'italic',
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  testimonialAuthor: {
    color: '#e0f7fa',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  comparisonFeature: {
    flex: 2,
    color: '#fff',
    fontSize: 14,
  },
  comparisonYes: {
    flex: 1,
    color: '#00e676',
    textAlign: 'center',
    fontSize: 14,
  },
  comparisonNo: {
    flex: 1,
    color: '#ff1744',
    textAlign: 'center',
    fontSize: 14,
  },
  securityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 80,
  },
  securityIcon: {
    fontSize: 28,
    color: '#0099ff',
  },
  securityText: {
    color: '#0099ff',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 2,
  },
  faqQ: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 8,
  },
  faqA: {
    color: '#e0f7fa',
    marginBottom: 2,
  },
  signupButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 8,
  },
  signupButtonText: {
    color: '#0099ff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    color: '#e0f7fa',
    fontSize: 14,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
});
