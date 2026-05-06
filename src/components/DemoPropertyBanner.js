import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

/**
 * DemoPropertyBanner
 *
 * Persistent banner shown on the owner dashboard when the user only has
 * the auto-seeded demo property (and no real properties yet). Anchors
 * the new user — explains that the data is sample data, and gives a
 * clear one-tap CTA to add a real property.
 *
 * Disappears automatically once the user creates their first real
 * property (driven by the `hasRealProperties` prop from the parent).
 */
const DemoPropertyBanner = ({ onAddProperty }) => {
  return (
    <LinearGradient
      colors={['#EBF5FF', '#F0F8FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.iconWrapper}>
        <Ionicons name="flash" size={18} color={colors.gradients.header[0]} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>You're exploring with sample data</Text>
        <Text style={styles.subtitle}>
          The "Sunset Beach House" is a demo. Tap an inspection below to see AI
          in action, or add your first real property.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={onAddProperty}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>Add my property</Text>
        <Ionicons
          name="arrow-forward"
          size={14}
          color={colors.text.inverse}
          style={styles.ctaIcon}
        />
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.18)',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  textContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gradients.header[0],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
    letterSpacing: -0.1,
  },
  ctaIcon: {
    marginLeft: 6,
  },
});

export default DemoPropertyBanner;
