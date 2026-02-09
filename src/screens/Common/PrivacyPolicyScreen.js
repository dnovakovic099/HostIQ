import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Welcome to HostIQ ("we," "our," or "us"). We are committed to protecting your privacy and ensuring
            you have a positive experience on our platform. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our mobile application and services.
          </Text>
          <Text style={styles.paragraph}>
            By using HostIQ, you agree to the collection and use of information in accordance with this policy.
            If you do not agree with our policies and practices, please do not use our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>2. Information We Collect</Text>

          <Text style={styles.subheading}>2.1 Information You Provide</Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Account Information:</Text> Name, email address, phone number, and password when you create an account{'\n'}
            • <Text style={styles.bold}>Profile Information:</Text> Profile photo, role (property owner or cleaner), and other optional profile details{'\n'}
            • <Text style={styles.bold}>Property Information:</Text> Property addresses, unit details, room templates, and property management data{'\n'}
            • <Text style={styles.bold}>Inspection Data:</Text> Photos, videos, notes, and other media you upload during inspections{'\n'}
            {/* • <Text style={styles.bold}>Payment Information:</Text> Billing details and payment method information (processed securely through third-party payment processors) */}
          </Text>

          <Text style={styles.subheading}>2.2 Automatically Collected Information</Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Device Information:</Text> Device type, operating system, unique device identifiers, and mobile network information{'\n'}
            • <Text style={styles.bold}>Usage Data:</Text> How you interact with the app, features used, time spent, and navigation patterns{'\n'}
            • <Text style={styles.bold}>IP Address:</Text> We collect IP addresses for security purposes and to prevent fraud. We do not use IP addresses to determine your precise location or track your movements.{'\n'}
            • <Text style={styles.bold}>Log Data:</Text> Browser type, access times, and pages viewed
          </Text>

          <Text style={styles.subheading}>2.3 Third-Party Information</Text>
          <Text style={styles.paragraph}>
            • Information from property management systems (PMS) you connect, such as Hostify or Hostaway{'\n'}
            • Information from authentication providers (Google Sign-In, Apple Sign-In){'\n'}
            {/* • Payment information from payment processors (Stripe, Apple, Google) */}
          </Text>

          <Text style={styles.subheading}>2.4 Location Information</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>We do not collect, use, or track your device's precise or approximate location.</Text>
            {'\n\n'}The only location-related information we collect is the addresses of rental properties that you
            manually enter into the app. These property addresses are provided by you for the purpose of
            property management and are not derived from your device's location services or GPS tracking.
            We do not use App Tracking Transparency or request location permissions because we do not track
            user locations.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>3. How We Use Your Information</Text>
          <Text style={styles.paragraph}>We use the information we collect for the following purposes:</Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Service Delivery:</Text> To provide, maintain, and improve our inspection and property management services{'\n'}
            • <Text style={styles.bold}>AI Analysis:</Text> To process and analyze inspection media using artificial intelligence for quality assessment{'\n'}
            • <Text style={styles.bold}>Account Management:</Text> To create and manage your account, authenticate users, and provide customer support{'\n'}
            • <Text style={styles.bold}>Communication:</Text> To send you service updates, inspection reports, notifications, and respond to your inquiries{'\n'}
            {/* • <Text style={styles.bold}>Payment Processing:</Text> To process payments, manage subscriptions, and handle billing{'\n'} */}
            • <Text style={styles.bold}>Analytics:</Text> To understand how users interact with our services and improve user experience{'\n'}
            • <Text style={styles.bold}>Security:</Text> To detect, prevent, and address technical issues, fraud, and security threats{'\n'}
            • <Text style={styles.bold}>Legal Compliance:</Text> To comply with legal obligations and enforce our terms of service
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>4. AI Processing and Media Analysis</Text>
          <Text style={styles.paragraph}>
            When you upload photos and videos for inspection analysis, we use artificial intelligence and machine
            learning technologies to:
          </Text>
          <Text style={styles.paragraph}>
            • Analyze cleanliness and quality of properties{'\n'}
            • Detect damage, missing items, and maintenance issues{'\n'}
            • Generate inspection reports and scores{'\n'}
            • Provide recommendations for improvements
          </Text>
          <Text style={styles.paragraph}>
            Media files are processed securely and may be stored temporarily for analysis purposes. We do not use
            your media for training AI models without your explicit consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>5. Information Sharing and Disclosure</Text>
          <Text style={styles.paragraph}>We do not sell your personal information. We may share your information in the following circumstances:</Text>

          <Text style={styles.subheading}>5.1 Service Providers</Text>
          <Text style={styles.paragraph}>
            We may share information with third-party service providers who perform services on our behalf, including:
          </Text>
          <Text style={styles.paragraph}>
            • Cloud hosting and storage providers{'\n'}
            {/* • Payment processors{'\n'} */}
            • Email service providers{'\n'}
            • Analytics and monitoring services{'\n'}
            • AI and machine learning service providers
          </Text>

          <Text style={styles.subheading}>5.2 Property Management Systems</Text>
          <Text style={styles.paragraph}>
            If you connect a PMS account, we may share relevant property and inspection data with the connected
            system as necessary to provide integration services.
          </Text>

          <Text style={styles.subheading}>5.3 Team Members</Text>
          <Text style={styles.paragraph}>
            Property owners may share inspection data and property information with team members (cleaners,
            managers) they invite to their account.
          </Text>

          <Text style={styles.subheading}>5.4 Legal Requirements</Text>
          <Text style={styles.paragraph}>
            We may disclose information if required by law, court order, or government regulation, or to protect
            our rights, property, or safety, or that of our users.
          </Text>

          <Text style={styles.subheading}>5.5 Business Transfers</Text>
          <Text style={styles.paragraph}>
            In the event of a merger, acquisition, or sale of assets, your information may be transferred as part
            of that transaction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>6. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard security measures to protect your information, including:
          </Text>
          <Text style={styles.paragraph}>
            • Encryption of data in transit using SSL/TLS{'\n'}
            • Encryption of sensitive data at rest{'\n'}
            • Secure authentication and authorization mechanisms{'\n'}
            • Regular security assessments and updates{'\n'}
            • Access controls and employee training
          </Text>
          <Text style={styles.paragraph}>
            However, no method of transmission over the internet or electronic storage is 100% secure. While we
            strive to use commercially acceptable means to protect your information, we cannot guarantee absolute
            security.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>7. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your information for as long as necessary to provide our services and fulfill the purposes
            outlined in this policy, unless a longer retention period is required by law. When you delete your
            account, we will delete or anonymize your personal information, except where we are required to retain
            it for legal, regulatory, or business purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>8. Your Rights and Choices</Text>
          <Text style={styles.paragraph}>Depending on your location, you may have the following rights regarding your personal information:</Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Access:</Text> Request access to your personal information{'\n'}
            • <Text style={styles.bold}>Correction:</Text> Request correction of inaccurate or incomplete information{'\n'}
            • <Text style={styles.bold}>Deletion:</Text> Request deletion of your personal information{'\n'}
            • <Text style={styles.bold}>Portability:</Text> Request a copy of your data in a portable format{'\n'}
            • <Text style={styles.bold}>Opt-Out:</Text> Opt out of certain data processing activities, such as marketing communications{'\n'}
            • <Text style={styles.bold}>Withdraw Consent:</Text> Withdraw consent for data processing where consent is the legal basis
          </Text>
          <Text style={styles.paragraph}>
            To exercise these rights, please contact us at the email address provided below. We will respond to
            your request within a reasonable timeframe.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>9. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our services are not intended for individuals under the age of 18. We do not knowingly collect
            personal information from children. If you believe we have collected information from a child, please
            contact us immediately, and we will take steps to delete such information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>10. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your information may be transferred to and processed in countries other than your country of residence.
            These countries may have data protection laws that differ from those in your country. We take appropriate
            measures to ensure your information receives adequate protection in accordance with this Privacy Policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>11. Third-Party Links and Services</Text>
          <Text style={styles.paragraph}>
            Our services may contain links to third-party websites or integrate with third-party services. We are
            not responsible for the privacy practices of these third parties. We encourage you to review their
            privacy policies before providing any information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>12. Changes to This Privacy Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by
            posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you
            to review this Privacy Policy periodically for any changes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>13. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
            please contact us at:
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Email:</Text> privacy@hostiq.app{'\n'}
            <Text style={styles.bold}>Support:</Text> support@hostiq.app
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>14. California Privacy Rights</Text>
          <Text style={styles.paragraph}>
            If you are a California resident, you have additional rights under the California Consumer Privacy Act
            (CCPA), including:
          </Text>
          <Text style={styles.paragraph}>
            • The right to know what personal information we collect, use, and disclose{'\n'}
            • The right to delete personal information we have collected{'\n'}
            • The right to opt-out of the sale of personal information (we do not sell personal information){'\n'}
            • The right to non-discrimination for exercising your privacy rights
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>15. GDPR Rights (European Users)</Text>
          <Text style={styles.paragraph}>
            If you are located in the European Economic Area (EEA), you have rights under the General Data Protection
            Regulation (GDPR), including:
          </Text>
          <Text style={styles.paragraph}>
            • Right of access to your personal data{'\n'}
            • Right to rectification of inaccurate data{'\n'}
            • Right to erasure ("right to be forgotten"){'\n'}
            • Right to restrict processing{'\n'}
            • Right to data portability{'\n'}
            • Right to object to processing{'\n'}
            • Right to withdraw consent
          </Text>
          <Text style={styles.paragraph}>
            To exercise these rights, please contact us using the information provided in Section 13.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#E8E9EB',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    marginBottom: 36,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    marginTop: 24,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
  },
  bold: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
