import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

const OnboardingPopup = ({
  visible,
  hasProperties,
  hasCleaners,
  onClose,
  onAddProperty,
  onAddCleaner
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
            <Ionicons name="hand-right" size={32} color={colors.text.inverse} />
            <Text style={styles.welcomeText}>Welcome to HostIQ!</Text>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.subtitle}>Let's get you set up</Text>

            {!hasProperties && (
              <TouchableOpacity style={styles.actionItem} onPress={onAddProperty}>
                <View style={styles.checkContainer}>
                  <Ionicons name="square-outline" size={24} color={colors.gradients.header[0]} />
                </View>
                <Text style={styles.actionText}>Add your first property</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.ios.gray} />
              </TouchableOpacity>
            )}

            {!hasCleaners && (
              <TouchableOpacity style={styles.actionItem} onPress={onAddCleaner}>
                <View style={styles.checkContainer}>
                  <Ionicons name="square-outline" size={24} color={colors.gradients.header[0]} />
                </View>
                <Text style={styles.actionText}>Invite your cleaning team</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.ios.gray} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.skipButton} onPress={onClose}>
              <Text style={styles.skipText}>I'll do this later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.50)',     // Standard modal overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    backgroundColor: colors.background.card,
    borderRadius: 14,                           // iOS modal radius
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,                               // iOS title 1
    fontWeight: '700',
    color: colors.text.inverse,
    marginTop: 12,
    letterSpacing: -0.6,                        // Apple-style tight
  },
  content: {
    padding: 24,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkContainer: {
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  skipButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: colors.ios.gray,
    fontWeight: '500',
  },
});

export default OnboardingPopup;
