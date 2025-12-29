import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeProvider';

const LAST_UPDATED = 'December 29, 2024';
const CONTACT_EMAIL = 'privacy@flighttrace.com';
const DPO_EMAIL = 'dpo@flighttrace.com';

export default function PrivacyPolicyScreen({ navigation }) {
  const { theme } = useTheme();

  const openEmail = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>
          Last Updated: {LAST_UPDATED}
        </Text>

        <Section title="1. Introduction" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            FlightTrace ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our flight tracking mobile application and related services.
          </Text>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            By using FlightTrace, you agree to the collection and use of information in accordance with this policy.
          </Text>
        </Section>

        <Section title="2. Information We Collect" theme={theme}>
          <SubSection title="2.1 Personal Information" theme={theme}>
            <BulletPoint text="Name and email address (for account creation)" theme={theme} />
            <BulletPoint text="Account credentials (username, securely hashed password)" theme={theme} />
            <BulletPoint text="Payment information (processed securely through Stripe - we never store your card details)" theme={theme} />
            <BulletPoint text="Profile preferences and settings" theme={theme} />
          </SubSection>

          <SubSection title="2.2 Device & Usage Information" theme={theme}>
            <BulletPoint text="Device type, operating system, and version" theme={theme} />
            <BulletPoint text="IP address and approximate location (city/country level)" theme={theme} />
            <BulletPoint text="App usage patterns and feature interactions" theme={theme} />
            <BulletPoint text="Crash reports and performance data" theme={theme} />
          </SubSection>

          <SubSection title="2.3 Location Data" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              With your explicit consent, we may collect:
            </Text>
            <BulletPoint text="Precise location (to show nearby airports and aircraft)" theme={theme} />
            <BulletPoint text="Background location (for proximity alerts - optional)" theme={theme} />
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              You can disable location access at any time in your device settings. The app will continue to work with reduced functionality.
            </Text>
          </SubSection>

          <SubSection title="2.4 Flight Data" theme={theme}>
            <BulletPoint text="Flights you choose to track" theme={theme} />
            <BulletPoint text="Search history within the app" theme={theme} />
            <BulletPoint text="Alert preferences and notification settings" theme={theme} />
          </SubSection>
        </Section>

        <Section title="3. How We Use Your Information" theme={theme}>
          <BulletPoint text="Provide and maintain flight tracking services" theme={theme} />
          <BulletPoint text="Send flight status notifications you've requested" theme={theme} />
          <BulletPoint text="Process payments and manage subscriptions" theme={theme} />
          <BulletPoint text="Improve our services and develop new features" theme={theme} />
          <BulletPoint text="Respond to customer support requests" theme={theme} />
          <BulletPoint text="Detect and prevent fraud or abuse" theme={theme} />
          <BulletPoint text="Comply with legal obligations" theme={theme} />
        </Section>

        <Section title="4. Data Sharing" theme={theme}>
          <Text style={[styles.important, { color: '#E53935' }]}>
            We do NOT sell your personal information to third parties.
          </Text>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            We may share your data with:
          </Text>
          <BulletPoint text="Service Providers: Stripe (payment processing), cloud hosting providers, analytics services" theme={theme} />
          <BulletPoint text="Legal Requirements: When required by law, court order, or government request" theme={theme} />
          <BulletPoint text="Business Transfers: In connection with mergers, acquisitions, or sale of assets" theme={theme} />
          <BulletPoint text="With Your Consent: Any other sharing requires your explicit permission" theme={theme} />
        </Section>

        <Section title="5. Data Security" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            We implement industry-standard security measures:
          </Text>
          <BulletPoint text="Encryption of data in transit (TLS 1.3) and at rest" theme={theme} />
          <BulletPoint text="Secure password hashing with bcrypt" theme={theme} />
          <BulletPoint text="Regular security audits and vulnerability testing" theme={theme} />
          <BulletPoint text="Access controls and authentication for all systems" theme={theme} />
          <BulletPoint text="PCI DSS compliance through Stripe for payments" theme={theme} />
        </Section>

        <Section title="6. Your Rights (GDPR/CCPA)" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            Depending on your location, you have the following rights:
          </Text>
          <BulletPoint text="Access: Request a copy of your personal data" theme={theme} />
          <BulletPoint text="Correction: Update or correct inaccurate data" theme={theme} />
          <BulletPoint text="Deletion: Request deletion of your personal data" theme={theme} />
          <BulletPoint text="Portability: Receive your data in a machine-readable format" theme={theme} />
          <BulletPoint text="Restriction: Request limitation of data processing" theme={theme} />
          <BulletPoint text="Objection: Object to processing for direct marketing" theme={theme} />
          <BulletPoint text="Withdraw Consent: Revoke consent at any time" theme={theme} />
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            To exercise these rights, go to Settings {'>'} Privacy & Data or contact us at{' '}
            <Text style={styles.link} onPress={() => openEmail(CONTACT_EMAIL)}>
              {CONTACT_EMAIL}
            </Text>
          </Text>
        </Section>

        <Section title="7. Data Retention" theme={theme}>
          <BulletPoint text="Active accounts: Data retained for the duration of service" theme={theme} />
          <BulletPoint text="Deleted accounts: 30-day recovery period, then permanent deletion" theme={theme} />
          <BulletPoint text="Legal/tax records: As required by law (typically 7 years)" theme={theme} />
          <BulletPoint text="Security logs: 90 days" theme={theme} />
          <BulletPoint text="Anonymized analytics: May be retained indefinitely" theme={theme} />
        </Section>

        <Section title="8. Children's Privacy" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            FlightTrace is not intended for children under 16 years of age. We do not knowingly collect personal information from children. If you believe we have collected data from a child, please contact us immediately.
          </Text>
        </Section>

        <Section title="9. International Data Transfers" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            Your data may be transferred to and processed in the United States. We ensure appropriate safeguards are in place, including Standard Contractual Clauses where required.
          </Text>
        </Section>

        <Section title="10. Cookies & Tracking" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            Our mobile app uses minimal tracking:
          </Text>
          <BulletPoint text="Essential: Authentication tokens, session management" theme={theme} />
          <BulletPoint text="Analytics: Anonymous usage statistics (can be disabled)" theme={theme} />
          <BulletPoint text="Crash Reporting: Error logs to improve stability" theme={theme} />
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            Our web version may use cookies. See our Cookie Policy for details.
          </Text>
        </Section>

        <Section title="11. Third-Party Services" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            We integrate with the following third-party services:
          </Text>
          <BulletPoint text="Stripe - Payment processing (PCI DSS compliant)" theme={theme} />
          <BulletPoint text="Firebase - Authentication and notifications" theme={theme} />
          <BulletPoint text="Sentry - Crash reporting and error tracking" theme={theme} />
          <BulletPoint text="OpenSky Network - Public flight data" theme={theme} />
          <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
            Each service has its own privacy policy. We recommend reviewing them.
          </Text>
        </Section>

        <Section title="12. California Residents (CCPA)" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            California residents have additional rights:
          </Text>
          <BulletPoint text="Right to know what personal information is collected" theme={theme} />
          <BulletPoint text="Right to delete personal information" theme={theme} />
          <BulletPoint text="Right to opt-out of sale of personal information (we do not sell data)" theme={theme} />
          <BulletPoint text="Right to non-discrimination for exercising privacy rights" theme={theme} />
        </Section>

        <Section title="13. Changes to This Policy" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            We may update this Privacy Policy periodically. We will notify you of material changes via email or prominent in-app notice at least 30 days before the changes take effect.
          </Text>
        </Section>

        <Section title="14. Contact Us" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            For privacy concerns or questions:
          </Text>
          <TouchableOpacity onPress={() => openEmail(CONTACT_EMAIL)}>
            <Text style={[styles.contactItem, { color: theme.colors.text }]}>
              <MaterialIcons name="email" size={16} color={theme.colors.primary} /> Privacy Team: {CONTACT_EMAIL}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEmail(DPO_EMAIL)}>
            <Text style={[styles.contactItem, { color: theme.colors.text }]}>
              <MaterialIcons name="security" size={16} color={theme.colors.primary} /> Data Protection Officer: {DPO_EMAIL}
            </Text>
          </TouchableOpacity>
        </Section>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children, theme }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function SubSection({ title, children, theme }) {
  return (
    <View style={styles.subSection}>
      <Text style={[styles.subSectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function BulletPoint({ text, theme }) {
  return (
    <View style={styles.bulletPoint}>
      <Text style={[styles.bullet, { color: theme.colors.primary }]}>{'\u2022'}</Text>
      <Text style={[styles.bulletText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  subSection: {
    marginTop: 12,
    marginLeft: 8,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  important: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  note: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 16,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    color: '#0066CC',
    textDecorationLine: 'underline',
  },
  contactItem: {
    fontSize: 15,
    marginBottom: 8,
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
