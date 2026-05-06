import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

/**
 * EducationalEmptyState
 *
 * A reusable empty-state component that not only tells the user "there's
 * nothing here" but actually teaches them what the feature does and why
 * they should care. Used for hidden / not-yet-activated features (e.g.
 * Issues, Insights, Pricing) where the value isn't obvious.
 *
 * Props:
 *   - icon          (string)      Ionicons name for the hero icon
 *   - title         (string)      Feature title (e.g. "Guest Issue Detection")
 *   - subtitle      (string)      One-sentence value prop
 *   - bullets       (array)       [{ icon, title, description }] feature highlights
 *   - primaryCta    (object)      { label, icon, onPress }
 *   - secondaryCta  (object)      Optional { label, onPress }
 *   - footerNote    (string)      Optional informational text below the CTAs
 *   - accentColor   (string)      Optional override for primary color
 */
const EducationalEmptyState = ({
  icon = 'sparkles-outline',
  title,
  subtitle,
  bullets = [],
  primaryCta,
  secondaryCta,
  footerNote,
  accentColor = colors.primary.main,
}) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Icon */}
      <LinearGradient
        colors={[`${accentColor}20`, `${accentColor}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroIconWrap}
      >
        <Ionicons name={icon} size={44} color={accentColor} />
      </LinearGradient>

      {/* Title + Subtitle */}
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {/* Feature Bullets */}
      {bullets.length > 0 && (
        <View style={styles.bulletsContainer}>
          {bullets.map((bullet, index) => (
            <View key={index} style={styles.bulletRow}>
              <View
                style={[
                  styles.bulletIconWrap,
                  { backgroundColor: `${accentColor}15` },
                ]}
              >
                <Ionicons
                  name={bullet.icon || 'checkmark'}
                  size={18}
                  color={accentColor}
                />
              </View>
              <View style={styles.bulletText}>
                <Text style={styles.bulletTitle}>{bullet.title}</Text>
                {!!bullet.description && (
                  <Text style={styles.bulletDescription}>
                    {bullet.description}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Primary CTA */}
      {primaryCta && (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: accentColor }]}
          onPress={primaryCta.onPress}
          activeOpacity={0.85}
        >
          {!!primaryCta.icon && (
            <Ionicons
              name={primaryCta.icon}
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={styles.primaryButtonText}>{primaryCta.label}</Text>
        </TouchableOpacity>
      )}

      {/* Secondary CTA */}
      {secondaryCta && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={secondaryCta.onPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryButtonText, { color: accentColor }]}>
            {secondaryCta.label}
          </Text>
        </TouchableOpacity>
      )}

      {/* Footer note (informational only) */}
      {!!footerNote && <Text style={styles.footerNote}>{footerNote}</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  contentContainer: {
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  bulletsContainer: {
    width: '100%',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bulletIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    paddingTop: 2,
  },
  bulletTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  bulletDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  secondaryButton: {
    paddingVertical: 14,
    marginTop: 4,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  footerNote: {
    fontSize: 12,
    color: colors.text.tertiary || '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
});

export default EducationalEmptyState;
