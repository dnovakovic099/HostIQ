import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Post-process parsed content to correct any statements about location data
const adjustLocationContent = (elements) => {
  if (!Array.isArray(elements)) return elements || [];

  const LOCATION_REGEX = /(location\s+data|location\s+information|geolocation|gps)/i;
  const correctedText =
    "We do not track or use your device's location data. Instead, we only ask you to provide the address of the properties you manage within HostIQ.";

  const updatedElements = elements.map((item) => {
    if (
      (item.type === 'paragraph' || item.type === 'bullet') &&
      typeof item.text === 'string' &&
      LOCATION_REGEX.test(item.text)
    ) {
      return {
        ...item,
        text: correctedText,
      };
    }

    return item;
  });

  // If there was no explicit location statement found, just return as-is.
  // We don't want to add redundant text if the policy already correctly omits it.
  return updatedElements;
};

// Heuristically promote certain short, title-like paragraphs to headings
const enhanceHeadings = (elements) => {
  if (!Array.isArray(elements)) return elements || [];

  const isLikelyHeading = (text) => {
    if (!text) return false;

    const trimmed = text.trim();
    const wordCount = trimmed.split(/\s+/).length;

    // Too short or too long is unlikely to be a heading
    if (wordCount < 2 || wordCount > 12) return false;

    // Full sentences with punctuation are unlikely to be headings
    if (/[.?]{1}\s*$/.test(trimmed)) return false;

    const isAllCaps = trimmed === trimmed.toUpperCase();
    const words = trimmed.split(/\s+/);
    const isTitleCase = words.every((w) => {
      if (w.length <= 2) return true; // allow short words like "of", "to"
      return /^[A-Z0-9]/.test(w[0]);
    });

    const startsWithNumber = /^[0-9]+(\.[0-9]+)*\s+/.test(trimmed);

    return isAllCaps || isTitleCase || startsWithNumber;
  };

  return elements.map((item) => {
    if (item.type !== 'paragraph' || typeof item.text !== 'string') {
      return item;
    }

    if (!isLikelyHeading(item.text)) {
      return item;
    }

    const trimmed = item.text.trim();
    const startsWithNumber = /^[0-9]+(\.[0-9]+)*\s+/.test(trimmed);

    // Numbered headings get a slightly smaller level
    const level = startsWithNumber ? 3 : 2;

    return {
      ...item,
      type: 'heading',
      level,
    };
  });
};

// Static privacy policy content rendered in the app
const STATIC_POLICY_CONTENT = [
  // Introduction
  { type: 'heading', level: 2, text: 'Introduction' },
  {
    type: 'paragraph',
    text:
      'Welcome to HostIQ ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.',
  },
  {
    type: 'paragraph',
    text:
      'Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.',
  },

  // Information We Collect
  { type: 'heading', level: 2, text: 'Information We Collect' },
  {
    type: 'paragraph',
    disableBold: true,
    text:
      'We may collect information about you in a variety of ways. The information we may collect via the Application includes:',
  },
  {
    type: 'bullet',
    text:
      '• Personal Data: Email address, name, and account credentials when you register for an account.',
  },
  {
    type: 'bullet',
    text:
      '• Property Data: Information about your rental properties, including addresses, pricing, and listing details you choose to enter.',
  },
  {
    type: 'bullet',
    text:
      '• Photos and Media: Images you capture or upload for property inspections, only when you explicitly grant camera or photo library access.',
  },
  {
    type: 'bullet',
    text:
      '• Usage Data: Information about how you use our app, including features accessed and time spent.',
  },
  {
    type: 'bullet',
    text:
      '• Device Information: Device type, operating system, and unique device identifiers.',
  },

  // How We Use Your Information
  { type: 'heading', level: 2, text: 'How We Use Your Information' },
  {
    type: 'paragraph',
    disableBold: true,
    text: 'We use the information we collect or receive:',
  },
  {
    type: 'bullet',
    text:
      '• To provide our services: Managing your properties, generating insights, and enabling inspection features.',
  },
  {
    type: 'bullet',
    text:
      '• To improve our app: Understanding how users interact with our features to make improvements.',
  },
  {
    type: 'bullet',
    text:
      '• To communicate with you: Sending important updates about your account or our services.',
  },
  {
    type: 'bullet',
    text:
      '• To process transactions: Managing subscriptions and in-app purchases.',
  },
  {
    type: 'bullet',
    text:
      '• To ensure security: Protecting against unauthorized access and maintaining data integrity.',
  },

  // Device Permissions
  { type: 'heading', level: 2, text: 'Device Permissions' },
  {
    type: 'paragraph',
    disableBold: true,
    text: 'Our app may request access to certain features on your device:',
  },
  {
    type: 'bullet',
    text:
      '• Camera: To capture inspection photos and videos of your properties. Access is only used when you actively take photos within the app.',
  },
  {
    type: 'bullet',
    text:
      '• Photo Library: To select existing photos for property inspections. We only access photos you explicitly select.',
  },
  {
    type: 'bullet',
    text:
      '• Biometric Authentication: Face ID or fingerprint for secure, convenient login. Biometric data never leaves your device.',
  },
  {
    type: 'paragraph',
    text:
      'You can revoke these permissions at any time through your device settings.',
  },

  // Data Storage and Security
  { type: 'heading', level: 2, text: 'Data Storage and Security' },
  {
    type: 'paragraph',
    text:
      'We implement appropriate technical and organizational security measures to protect your personal information. Your data is encrypted in transit and at rest. We use industry-standard protocols to ensure your information remains secure.',
  },
  {
    type: 'paragraph',
    text:
      'However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security.',
  },

  // Third-Party Services
  { type: 'heading', level: 2, text: 'Third-Party Services' },
  {
    type: 'paragraph',
    text:
      'Our app may contain links to third-party websites or integrate with third-party services. These services have their own privacy policies, and we encourage you to review them. We are not responsible for the privacy practices of third parties.',
  },
  {
    type: 'paragraph',
    text: 'We may use third-party service providers for:',
  },
  {
    type: 'bullet',
    text: '• Payment processing (Apple App Store, Google Play Store)',
  },
  {
    type: 'bullet',
    text: '• Analytics to improve our services',
  },
  {
    type: 'bullet',
    text: '• Cloud hosting and data storage',
  },

  // Data Retention
  { type: 'heading', level: 2, text: 'Data Retention' },
  {
    type: 'paragraph',
    text:
      'We retain your personal information only for as long as necessary to fulfill the purposes outlined in this privacy policy, unless a longer retention period is required by law. When you delete your account, we will delete or anonymize your personal data within 30 days.',
  },

  // Your Privacy Rights
  { type: 'heading', level: 2, text: 'Your Privacy Rights' },
  {
    type: 'paragraph',
    disableBold: true,
    text:
      'Depending on your location, you may have certain rights regarding your personal information:',
  },
  {
    type: 'bullet',
    text:
      '• Access: Request a copy of the personal data we hold about you.',
  },
  {
    type: 'bullet',
    text:
      '• Correction: Request correction of inaccurate personal data.',
  },
  {
    type: 'bullet',
    text:
      '• Deletion: Request deletion of your personal data.',
  },
  {
    type: 'bullet',
    text:
      '• Portability: Request transfer of your data to another service.',
  },
  {
    type: 'bullet',
    text:
      '• Opt-out: Opt out of certain data processing activities.',
  },
  {
    type: 'paragraph',
    text:
      'To exercise any of these rights, please contact us using the information below.',
  },

  // Children's Privacy
  { type: 'heading', level: 2, text: "Children's Privacy" },
  {
    type: 'paragraph',
    text:
      'Our application is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will delete it immediately.',
  },

  // Changes to This Policy
  { type: 'heading', level: 2, text: 'Changes to This Policy' },
  {
    type: 'paragraph',
    text:
      'We may update this privacy policy from time to time. The updated version will be indicated by an updated "Effective Date" at the top of this page. We encourage you to review this privacy policy periodically to stay informed about how we are protecting your information.',
  },

  // Contact Us
  { type: 'heading', level: 2, text: 'Contact Us' },
  {
    type: 'paragraph',
    text:
      'If you have questions or concerns about this privacy policy or our practices, please contact us at contact@securestay.ai.',
  },
];

// Helper function to render text with bold labels (text before colon)
const renderTextWithBold = (text, baseStyle, isBullet = false) => {
  // Pattern: "• Label: description" or "Label: description"
  // Split on colon but keep the colon with the label part
  const colonIndex = text.indexOf(':');
  
  // If no colon found, render as regular text
  if (colonIndex === -1) {
    // Remove bullet character if it's a bullet item (we use visual dot instead)
    const cleanText = isBullet ? text.replace(/^•\s*/, '') : text;
    return <Text style={baseStyle}>{cleanText}</Text>;
  }
  
  // Split into label (before colon) and description (after colon)
  let labelPart = text.substring(0, colonIndex);
  const descriptionPart = text.substring(colonIndex + 1);
  
  // Remove bullet character if it's a bullet item (we use visual dot instead)
  if (isBullet) {
    labelPart = labelPart.replace(/^•\s*/, '');
  }
  
  const cleanLabel = labelPart.trim();
  
  return (
    <Text style={baseStyle}>
      <Text style={[baseStyle, styles.boldText]}>{cleanLabel}:</Text>
      {descriptionPart && <Text style={baseStyle}>{descriptionPart}</Text>}
    </Text>
  );
};

// (Old HTML parsing logic removed; content is now defined statically below)

export default function PrivacyPolicyScreen() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const adjustedContent = adjustLocationContent(STATIC_POLICY_CONTENT);
      const enhancedContent = enhanceHeadings(adjustedContent);
      setContent(enhancedContent);
      setError(null);
    } catch (err) {
      console.error('Error loading privacy policy:', err);
      setError('Failed to load privacy policy. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading Privacy Policy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.errorText}>{error}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
          <View style={styles.titleUnderline} />
          <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>

        {content.map((item, index) => {
          if (item.type === 'heading') {
            const headingStyle = item.level === 1 
              ? styles.heading1 
              : item.level === 2 
              ? styles.heading2 
              : styles.heading3;
            
            const isFirstHeading = index === 0 || content.slice(0, index).every(el => el.type !== 'heading');
            const containerStyle = isFirstHeading 
              ? [styles.headingContainer, styles.firstHeadingContainer]
              : styles.headingContainer;
            
            return (
              <View key={index} style={containerStyle}>
                <View style={styles.headingWrapper}>
                  <View style={styles.headingAccent} />
                  <Text style={headingStyle}>{item.text}</Text>
                </View>
              </View>
            );
          }

          if (item.type === 'bullet') {
            return (
              <View key={index} style={styles.bulletContainer}>
                <View style={styles.bulletDot} />
                <View style={styles.bulletContent}>
                  {renderTextWithBold(item.text, styles.bulletPoint, true)}
                </View>
              </View>
            );
          }

          if (item.type === 'paragraph' && item.disableBold) {
            return (
              <View key={index} style={styles.paragraphContainer}>
                <Text style={styles.paragraph}>{item.text}</Text>
              </View>
            );
          }

          return (
            <View key={index} style={styles.paragraphContainer}>
              {renderTextWithBold(item.text, styles.paragraph)}
            </View>
          );
        })}

        <View style={styles.footer}>
          <View style={styles.footerIcon}>
            <Text style={styles.footerIconText}>✓</Text>
          </View>
          <Text style={styles.footerText}>
            By using HostIQ, you acknowledge that you have read, understood, and agree to this Privacy Policy.
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
    paddingTop: 2,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
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
    backgroundColor: '#4A90E2',
    borderRadius: 2,
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  headingContainer: {
    marginTop: 36,
    marginBottom: 20,
  },
  firstHeadingContainer: {
    marginTop: 12,
  },
  headingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headingAccent: {
    width: 4,
    height: 24,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
    marginRight: 12,
  },
  heading1: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
    flex: 1,
  },
  heading2: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.2,
    flex: 1,
  },
  heading3: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.1,
    flex: 1,
  },
  paragraphContainer: {
    marginBottom: 18,
    paddingLeft: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
    letterSpacing: 0.1,
  },
  bulletContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    paddingLeft: 16,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A90E2',
    marginTop: 10,
    marginRight: 12,
  },
  bulletContent: {
    flex: 1,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
    letterSpacing: 0.1,
  },
  boldText: {
    fontWeight: '700',
    color: '#1A1A1A',
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
    backgroundColor: '#4A90E2',
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
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
});

