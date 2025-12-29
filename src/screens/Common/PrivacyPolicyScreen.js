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
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            HostIQ ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application ("App"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          
          <Text style={styles.subsectionTitle}>1.1 Personal Information</Text>
          <Text style={styles.paragraph}>
            We may collect personal information that you voluntarily provide to us when you register for an account, use the App, or contact us for support. This information may include:
          </Text>
          <Text style={styles.bulletPoint}>
            • Name, email address, phone number
          </Text>
          <Text style={styles.bulletPoint}>
            • Account credentials (username, password)
          </Text>
          <Text style={styles.bulletPoint}>
            • Profile information and preferences
          </Text>
          <Text style={styles.bulletPoint}>
            • Payment information (processed securely through third-party payment processors)
          </Text>

          <Text style={styles.subsectionTitle}>1.2 Property and Inspection Data</Text>
          <Text style={styles.paragraph}>
            When using the App, you may provide information about properties, inspections, cleaning reports, and related documentation. This includes:
          </Text>
          <Text style={styles.bulletPoint}>
            • Property details, addresses, and descriptions
          </Text>
          <Text style={styles.bulletPoint}>
            • Inspection reports, photos, videos, and notes
          </Text>
          <Text style={styles.bulletPoint}>
            • Inventory lists and valuable items information
          </Text>
          <Text style={styles.bulletPoint}>
            • Cleaning schedules and task assignments
          </Text>

          <Text style={styles.subsectionTitle}>1.3 Automatically Collected Information</Text>
          <Text style={styles.paragraph}>
            When you access the App, we may automatically collect certain information about your device, including:
          </Text>
          <Text style={styles.bulletPoint}>
            • Device information (model, operating system, unique device identifiers)
          </Text>
          <Text style={styles.bulletPoint}>
            • IP address and location data (with your permission)
          </Text>
          <Text style={styles.bulletPoint}>
            • App usage data and analytics
          </Text>
          <Text style={styles.bulletPoint}>
            • Log files and error reports
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to:
          </Text>
          <Text style={styles.bulletPoint}>
            • Provide, maintain, and improve the App and its services
          </Text>
          <Text style={styles.bulletPoint}>
            • Process your transactions and manage your account
          </Text>
          <Text style={styles.bulletPoint}>
            • Send you technical notices, updates, security alerts, and support messages
          </Text>
          <Text style={styles.bulletPoint}>
            • Respond to your comments, questions, and requests
          </Text>
          <Text style={styles.bulletPoint}>
            • Monitor and analyze trends, usage, and activities in connection with the App
          </Text>
          <Text style={styles.bulletPoint}>
            • Detect, prevent, and address technical issues and fraudulent activity
          </Text>
          <Text style={styles.bulletPoint}>
            • Personalize and improve your experience with the App
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing and Disclosure</Text>
          <Text style={styles.paragraph}>
            We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
          </Text>

          <Text style={styles.subsectionTitle}>3.1 Service Providers</Text>
          <Text style={styles.paragraph}>
            We may share your information with third-party service providers who perform services on our behalf, such as:
          </Text>
          <Text style={styles.bulletPoint}>
            • Cloud storage and hosting services
          </Text>
          <Text style={styles.bulletPoint}>
            • Payment processing services
          </Text>
          <Text style={styles.bulletPoint}>
            • Analytics and performance monitoring services
          </Text>
          <Text style={styles.bulletPoint}>
            • Customer support services
          </Text>

          <Text style={styles.subsectionTitle}>3.2 Business Transfers</Text>
          <Text style={styles.paragraph}>
            If we are involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction.
          </Text>

          <Text style={styles.subsectionTitle}>3.3 Legal Requirements</Text>
          <Text style={styles.paragraph}>
            We may disclose your information if required to do so by law or in response to valid requests by public authorities.
          </Text>

          <Text style={styles.subsectionTitle}>3.4 With Your Consent</Text>
          <Text style={styles.paragraph}>
            We may share your information with your consent or at your direction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, we will securely delete or anonymize it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights and Choices</Text>
          <Text style={styles.paragraph}>
            Depending on your location, you may have certain rights regarding your personal information, including:
          </Text>
          <Text style={styles.bulletPoint}>
            • Access: Request access to your personal information
          </Text>
          <Text style={styles.bulletPoint}>
            • Correction: Request correction of inaccurate or incomplete information
          </Text>
          <Text style={styles.bulletPoint}>
            • Deletion: Request deletion of your personal information
          </Text>
          <Text style={styles.bulletPoint}>
            • Portability: Request transfer of your data to another service
          </Text>
          <Text style={styles.bulletPoint}>
            • Opt-out: Opt out of certain data collection and processing activities
          </Text>
          <Text style={styles.paragraph}>
            To exercise these rights, please contact us using the information provided in the "Contact Us" section below.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            The App is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately. If we become aware that we have collected personal information from children under 13, we will take steps to delete such information from our servers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Location Information</Text>
          <Text style={styles.paragraph}>
            With your permission, we may collect and use location information from your device to provide location-based features. You can enable or disable location services through your device settings at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Camera and Photo Library Access</Text>
          <Text style={styles.paragraph}>
            The App requires access to your device's camera and photo library to enable you to capture and upload photos for inspection reports. We only access photos that you explicitly choose to upload through the App. You can revoke these permissions at any time through your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Third-Party Links</Text>
          <Text style={styles.paragraph}>
            The App may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies before providing any information to them.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using the App, you consent to the transfer of your information to these facilities.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. California Privacy Rights</Text>
          <Text style={styles.paragraph}>
            If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to delete personal information, and the right to opt-out of the sale of personal information. We do not sell personal information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. European Privacy Rights</Text>
          <Text style={styles.paragraph}>
            If you are located in the European Economic Area (EEA), you have certain data protection rights under the General Data Protection Regulation (GDPR). These rights include access, rectification, erasure, restriction of processing, data portability, and the right to object to processing. To exercise these rights, please contact us.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Changes to This Privacy Policy</Text>
          <Text style={styles.paragraph}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </Text>
          <Text style={styles.bulletPoint}>
            • Email: privacy@hostiq.com
          </Text>
          <Text style={styles.bulletPoint}>
            • Through the App's support features
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using HostIQ, you acknowledge that you have read and understood this Privacy Policy and agree to the collection and use of your information as described herein.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginLeft: 8,
    marginBottom: 6,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    fontStyle: 'italic',
  },
});

