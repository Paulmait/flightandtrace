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
const SUPPORT_EMAIL = 'support@flighttrace.com';
const LEGAL_EMAIL = 'legal@flighttrace.com';

export default function TermsOfServiceScreen({ navigation }) {
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>
          Last Updated: {LAST_UPDATED}
        </Text>

        <Section title="1. Acceptance of Terms" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            By accessing or using FlightTrace, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our service.
          </Text>
        </Section>

        <Section title="2. Description of Service" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            FlightTrace provides flight tracking information for informational and entertainment purposes. The service includes:
          </Text>
          <BulletPoint text="Live flight position tracking on interactive maps" theme={theme} />
          <BulletPoint text="Flight status notifications (departures, arrivals, delays)" theme={theme} />
          <BulletPoint text="Historical flight data and search" theme={theme} />
          <BulletPoint text="Fuel consumption and CO2 emission estimates" theme={theme} />
          <BulletPoint text="Premium features for paid subscribers" theme={theme} />
        </Section>

        <Section title="3. Important Disclaimers" theme={theme}>
          <View style={styles.warningBox}>
            <MaterialIcons name="warning" size={24} color="#FF6B00" />
            <Text style={styles.warningText}>
              CRITICAL: READ THIS SECTION CAREFULLY
            </Text>
          </View>

          <SubSection title="3.1 Informational Use Only" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              FlightTrace is provided for INFORMATIONAL AND ENTERTAINMENT PURPOSES ONLY. The service must NOT be used for:
            </Text>
            <BulletPoint text="Aviation navigation or flight planning" theme={theme} />
            <BulletPoint text="Air traffic control decisions" theme={theme} />
            <BulletPoint text="Safety-critical aviation operations" theme={theme} />
            <BulletPoint text="Emergency response coordination" theme={theme} />
            <BulletPoint text="Any purpose requiring certified flight data" theme={theme} />
          </SubSection>

          <SubSection title="3.2 No Accuracy Guarantee" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Flight data may be delayed, incomplete, or inaccurate. We do not guarantee the accuracy, completeness, or timeliness of any information provided. Always verify flight information with official airline sources.
            </Text>
          </SubSection>

          <SubSection title="3.3 No ATC Affiliation" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              FlightTrace is NOT affiliated with, endorsed by, or connected to any air traffic control authority, government aviation agency, airline, or airport operator.
            </Text>
          </SubSection>
        </Section>

        <Section title="4. User Accounts" theme={theme}>
          <SubSection title="4.1 Registration Requirements" theme={theme}>
            <BulletPoint text="You must be at least 16 years old to use FlightTrace" theme={theme} />
            <BulletPoint text="You must provide accurate and complete registration information" theme={theme} />
            <BulletPoint text="One account per person is permitted" theme={theme} />
            <BulletPoint text="You are responsible for maintaining account security" theme={theme} />
          </SubSection>

          <SubSection title="4.2 Account Security" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              You are responsible for all activities under your account. Notify us immediately at{' '}
              <Text style={styles.link} onPress={() => openEmail(SUPPORT_EMAIL)}>
                {SUPPORT_EMAIL}
              </Text>{' '}
              if you suspect unauthorized access.
            </Text>
          </SubSection>
        </Section>

        <Section title="5. Acceptable Use" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            You agree NOT to:
          </Text>
          <BulletPoint text="Use the service for any illegal purpose" theme={theme} />
          <BulletPoint text="Interfere with or disrupt the service" theme={theme} />
          <BulletPoint text="Attempt to gain unauthorized access to any systems" theme={theme} />
          <BulletPoint text="Scrape, harvest, or collect data without permission" theme={theme} />
          <BulletPoint text="Use the service to stalk, harass, or harm others" theme={theme} />
          <BulletPoint text="Violate any applicable aviation regulations" theme={theme} />
          <BulletPoint text="Resell or redistribute our data commercially" theme={theme} />
          <BulletPoint text="Reverse engineer or decompile the application" theme={theme} />
          <BulletPoint text="Use automated systems (bots) to access the service" theme={theme} />
        </Section>

        <Section title="6. Subscriptions & Payments" theme={theme}>
          <SubSection title="6.1 Subscription Plans" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              FlightTrace offers Free and Premium subscription tiers. Features and pricing are displayed in the app and on our website.
            </Text>
          </SubSection>

          <SubSection title="6.2 Billing" theme={theme}>
            <BulletPoint text="Subscriptions automatically renew unless cancelled" theme={theme} />
            <BulletPoint text="You will be charged through your App Store or Google Play account" theme={theme} />
            <BulletPoint text="Prices may change with 30 days advance notice" theme={theme} />
            <BulletPoint text="All payments are processed securely via Stripe" theme={theme} />
          </SubSection>

          <SubSection title="6.3 Cancellation" theme={theme}>
            <BulletPoint text="Cancel anytime through your device's subscription settings" theme={theme} />
            <BulletPoint text="Access continues until the end of your current billing period" theme={theme} />
            <BulletPoint text="No refunds for partial billing periods (monthly plans)" theme={theme} />
            <BulletPoint text="Annual plans: Pro-rated refund available within 30 days" theme={theme} />
          </SubSection>

          <SubSection title="6.4 Free Trial" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              New users may be eligible for a free trial. After the trial period, your subscription will automatically convert to a paid subscription unless cancelled at least 24 hours before the trial ends.
            </Text>
          </SubSection>
        </Section>

        <Section title="7. Intellectual Property" theme={theme}>
          <BulletPoint text="FlightTrace owns all service IP rights (design, code, trademarks)" theme={theme} />
          <BulletPoint text="You retain rights to any content you submit" theme={theme} />
          <BulletPoint text="You grant us license to use your content for service operation" theme={theme} />
          <BulletPoint text="Respect third-party intellectual property rights" theme={theme} />
        </Section>

        <Section title="8. Privacy" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            Your use of FlightTrace is subject to our Privacy Policy, which describes how we collect, use, and protect your personal information. Key points:
          </Text>
          <BulletPoint text="We collect only necessary data for service operation" theme={theme} />
          <BulletPoint text="We do NOT sell your personal information" theme={theme} />
          <BulletPoint text="You can request data deletion at any time" theme={theme} />
          <BulletPoint text="We comply with GDPR and CCPA regulations" theme={theme} />
        </Section>

        <Section title="9. Disclaimers & Limitations" theme={theme}>
          <SubSection title="9.1 Service Availability" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              The service is provided "AS IS" and "AS AVAILABLE." We do not guarantee uninterrupted access and may modify or discontinue features at any time.
            </Text>
          </SubSection>

          <SubSection title="9.2 Limitation of Liability" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </Text>
            <BulletPoint text="We are not liable for indirect, incidental, special, or consequential damages" theme={theme} />
            <BulletPoint text="Our total liability is limited to the amount you paid in the last 12 months" theme={theme} />
            <BulletPoint text="We are not liable for any aviation-related decisions made using our data" theme={theme} />
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              Some jurisdictions do not allow these limitations. In such cases, liability is limited to the minimum extent permitted by law.
            </Text>
          </SubSection>
        </Section>

        <Section title="10. Indemnification" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            You agree to indemnify, defend, and hold harmless FlightTrace and its affiliates from any claims, damages, or expenses arising from:
          </Text>
          <BulletPoint text="Your use of the service" theme={theme} />
          <BulletPoint text="Violation of these terms" theme={theme} />
          <BulletPoint text="Violation of any rights of another party" theme={theme} />
          <BulletPoint text="Any aviation decisions made using our data" theme={theme} />
        </Section>

        <Section title="11. Dispute Resolution" theme={theme}>
          <SubSection title="11.1 Informal Resolution" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Before filing any formal complaint, please contact us at{' '}
              <Text style={styles.link} onPress={() => openEmail(SUPPORT_EMAIL)}>
                {SUPPORT_EMAIL}
              </Text>{' '}
              to attempt informal resolution.
            </Text>
          </SubSection>

          <SubSection title="11.2 Binding Arbitration" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Any dispute not resolved informally shall be settled by binding arbitration under the rules of the American Arbitration Association. You waive any right to participate in class actions.
            </Text>
          </SubSection>

          <SubSection title="11.3 Exceptions" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.colors.text }]}>
              Small claims court actions and requests for injunctive relief are excluded from the arbitration requirement.
            </Text>
          </SubSection>
        </Section>

        <Section title="12. Governing Law" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            These terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law provisions.
          </Text>
        </Section>

        <Section title="13. Termination" theme={theme}>
          <BulletPoint text="Either party may terminate at any time" theme={theme} />
          <BulletPoint text="We may suspend or terminate accounts for terms violations" theme={theme} />
          <BulletPoint text="Upon termination, your right to use the service immediately ceases" theme={theme} />
          <BulletPoint text="Sections on IP, indemnification, and limitations survive termination" theme={theme} />
        </Section>

        <Section title="14. Changes to Terms" theme={theme}>
          <Text style={[styles.paragraph, { color: theme.colors.text }]}>
            We may modify these terms at any time. For material changes, we will provide 30 days notice via email or in-app notification. Continued use after changes take effect constitutes acceptance of the new terms.
          </Text>
        </Section>

        <Section title="15. Contact Information" theme={theme}>
          <TouchableOpacity onPress={() => openEmail(SUPPORT_EMAIL)}>
            <Text style={[styles.contactItem, { color: theme.colors.text }]}>
              <MaterialIcons name="help" size={16} color={theme.colors.primary} /> Support: {SUPPORT_EMAIL}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEmail(LEGAL_EMAIL)}>
            <Text style={[styles.contactItem, { color: theme.colors.text }]}>
              <MaterialIcons name="gavel" size={16} color={theme.colors.primary} /> Legal: {LEGAL_EMAIL}
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginLeft: 8,
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
