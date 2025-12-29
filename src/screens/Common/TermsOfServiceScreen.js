import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing and using HostIQ ("the App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            HostIQ is a property inspection and management application designed to facilitate communication and coordination between property owners, cleaners, and property management companies. The App provides tools for creating inspection reports, managing properties, tracking cleaning tasks, and generating reports.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            To use certain features of the App, you must register for an account. You agree to:
          </Text>
          <Text style={styles.bulletPoint}>
            • Provide accurate, current, and complete information during registration
          </Text>
          <Text style={styles.bulletPoint}>
            • Maintain and promptly update your account information
          </Text>
          <Text style={styles.bulletPoint}>
            • Maintain the security of your password and identification
          </Text>
          <Text style={styles.bulletPoint}>
            • Accept all responsibility for any and all activities that occur under your account
          </Text>
          <Text style={styles.bulletPoint}>
            • Notify us immediately of any unauthorized use of your account
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
          <Text style={styles.paragraph}>
            You are responsible for:
          </Text>
          <Text style={styles.bulletPoint}>
            • All content you submit, post, or display through the App
          </Text>
          <Text style={styles.bulletPoint}>
            • Ensuring that your use of the App complies with all applicable laws and regulations
          </Text>
          <Text style={styles.bulletPoint}>
            • Maintaining the confidentiality of your account credentials
          </Text>
          <Text style={styles.bulletPoint}>
            • Using the App only for lawful purposes and in accordance with these Terms
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Prohibited Uses</Text>
          <Text style={styles.paragraph}>
            You agree not to use the App:
          </Text>
          <Text style={styles.bulletPoint}>
            • In any way that violates any applicable federal, state, local, or international law or regulation
          </Text>
          <Text style={styles.bulletPoint}>
            • To transmit, or procure the sending of, any advertising or promotional material without our prior written consent
          </Text>
          <Text style={styles.bulletPoint}>
            • To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity
          </Text>
          <Text style={styles.bulletPoint}>
            • In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful
          </Text>
          <Text style={styles.bulletPoint}>
            • To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the App
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The App and its original content, features, and functionality are and will remain the exclusive property of HostIQ and its licensors. The App is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. User Content</Text>
          <Text style={styles.paragraph}>
            You retain ownership of any content you submit, post, or display on or through the App ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute your User Content for the purpose of operating and providing the App and its services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Payment Terms</Text>
          <Text style={styles.paragraph}>
            If you purchase any paid features or subscriptions:
          </Text>
          <Text style={styles.bulletPoint}>
            • Payment will be charged to your payment method at confirmation of purchase
          </Text>
          <Text style={styles.bulletPoint}>
            • Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period
          </Text>
          <Text style={styles.bulletPoint}>
            • Your account will be charged for renewal within 24 hours prior to the end of the current period
          </Text>
          <Text style={styles.bulletPoint}>
            • You can manage and cancel your subscriptions by going to your account settings
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account and bar access to the App immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms. If you wish to terminate your account, you may simply discontinue using the App or contact us to delete your account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Disclaimer</Text>
          <Text style={styles.paragraph}>
            The information on this App is provided on an "as is" basis. To the fullest extent permitted by law, HostIQ excludes all representations, warranties, conditions, and terms relating to our App and the use of this App (including, without limitation, any warranties implied by law in respect of satisfactory quality, fitness for purpose, and/or the use of reasonable care and skill).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            In no event shall HostIQ, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to defend, indemnify, and hold harmless HostIQ and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms shall be interpreted and governed by the laws of the jurisdiction in which HostIQ operates, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms of Service, please contact us through the App's support features or via email at support@hostiq.com.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using HostIQ, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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

