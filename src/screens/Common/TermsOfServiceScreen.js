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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Terms of Service</Text>
          <View style={styles.titleUnderline} />
          <Text style={styles.lastUpdated}>
            Last Updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

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
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Provide accurate, current, and complete information during registration
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Maintain and promptly update your account information
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Maintain the security of your password and identification
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Accept all responsibility for any and all activities that occur under your account
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Notify us immediately of any unauthorized use of your account
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
          <Text style={styles.paragraph}>
            You are responsible for:
          </Text>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              All content you submit, post, or display through the App
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Ensuring that your use of the App complies with all applicable laws and regulations
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Maintaining the confidentiality of your account credentials
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Using the App only for lawful purposes and in accordance with these Terms
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Prohibited Uses</Text>
          <Text style={styles.paragraph}>
            You agree not to use the App:
          </Text>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              In any way that violates any applicable federal, state, local, or international law or regulation
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              To transmit, or procure the sending of, any advertising or promotional material without our prior written consent
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              To engage in any other conduct that restricts or inhibits anyone&apos;s use or enjoyment of the App
            </Text>
          </View>
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
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Payment will be charged to your payment method at confirmation of purchase
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Your account will be charged for renewal within 24 hours prior to the end of the current period
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              You can manage and cancel your subscriptions by going to your account settings
            </Text>
          </View>
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
          <View style={styles.footerIcon}>
            <Text style={styles.footerIconText}>✓</Text>
          </View>
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
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 48,
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
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: '#215EEA',
    borderRadius: 2,
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#215EEA',
    marginTop: 10,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
    letterSpacing: 0.1,
  },
  footer: {
    marginTop: 48,
    paddingTop: 28,
    paddingBottom: 8,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E9EB',
    alignItems: 'center',
  },
  footerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#215EEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerIconText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

