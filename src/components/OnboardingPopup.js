import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

/**
 * OnboardingPopup
 *
 * Shown the FIRST time a new user lands on the dashboard. Acknowledges
 * the demo property we auto-seeded, explains what HostIQ does in three
 * pills, and gives a clear next-step checklist.
 *
 * Gated on the `hasSeenOnboarding` flag in onboardingStore — appears
 * exactly once, regardless of demo data.
 */
const OnboardingPopup = ({
  visible,
  hasRealProperties,
  hasCleaners,
  onClose,
  onAddProperty,
  onAddCleaner,
  onTryDemo,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={[colors.gradients.header[0], colors.gradients.header[1]]}
            style={styles.header}
          >
            <Ionicons name="flash" size={32} color={colors.text.inverse} />
            <Text style={styles.welcomeText}>Welcome to HostIQ</Text>
            <Text style={styles.welcomeSubtitle}>Know before your guests do</Text>
          </LinearGradient>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.intro}>
              We added a sample property so you can explore HostIQ right away.
              Here's what you can do:
            </Text>

            {/* Step 1 — Try the demo */}
            <TouchableOpacity style={styles.actionItem} onPress={onTryDemo}>
              <View style={[styles.iconCircle, styles.iconCirclePrimary]}>
                <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Tap a demo inspection</Text>
                <Text style={styles.actionSubtitle}>
                  See how AI scores cleanings and flags issues
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>

            {/* Step 2 — Add real property */}
            {!hasRealProperties && (
              <TouchableOpacity style={styles.actionItem} onPress={onAddProperty}>
                <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
                  <Ionicons name="home-outline" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Add your first real property</Text>
                  <Text style={styles.actionSubtitle}>
                    Set up a listing your team can inspect
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}

            {/* Step 3 — Invite cleaners */}
            {!hasCleaners && (
              <TouchableOpacity style={styles.actionItem} onPress={onAddCleaner}>
                <View style={[styles.iconCircle, styles.iconCircleAccent]}>
                  <Ionicons name="people-outline" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Invite your cleaning team</Text>
                  <Text style={styles.actionSubtitle}>
                    Cleaners take photos; AI does the QC
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
              <Text style={styles.primaryButtonText}>Got it — let me explore</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.inverse,
    marginTop: 10,
    letterSpacing: -0.6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 0,
  },
  content: {
    padding: 20,
  },
  intro: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 21,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCirclePrimary: {
    backgroundColor: colors.gradients.header[0],
  },
  iconCircleSuccess: {
    backgroundColor: colors.status.success,
  },
  iconCircleAccent: {
    backgroundColor: colors.primary?.vibrant || colors.gradients.header[1],
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
    lineHeight: 17,
  },
  primaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: colors.gradients.header[0],
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
    letterSpacing: -0.2,
  },
});

export default OnboardingPopup;
