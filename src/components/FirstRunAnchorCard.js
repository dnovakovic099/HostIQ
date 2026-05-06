import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

/**
 * FirstRunAnchorCard
 *
 * The single, prominent CTA shown on the dashboard during the first-run
 * funnel. Replaces the previous stack of welcome modal + demo banner +
 * stats grid + quick-actions grid that overwhelmed new users.
 *
 * Two variants:
 *   - "watch_demo"   → pre-demo state: invites the user to tap into the
 *                      auto-seeded demo inspection to see AI in action.
 *   - "add_property" → post-demo state: their next move is to create
 *                      their first real property.
 *
 * The card has a subtle pulsing glow so the user's eye is drawn to it
 * even on a busy gradient header.
 */
const FirstRunAnchorCard = ({ variant, onPress, eyebrow }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle, slow pulse — never frantic. Eye-catching but not annoying.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.42],
  });

  const config =
    variant === 'add_property'
      ? {
          iconName: 'home',
          eyebrowDefault: 'Step 2 of 2',
          title: 'Add your first real property',
          subtitle:
            "Now that you've seen HostIQ work, set up your own listing — takes about 30 seconds.",
          ctaLabel: 'Add Property',
          ctaIcon: 'arrow-forward',
        }
      : {
          iconName: 'play-circle',
          eyebrowDefault: 'Start here',
          title: 'See HostIQ catch a real issue',
          subtitle:
            'Tap below to open a sample inspection. AI flagged a bathroom problem your guest would have noticed.',
          ctaLabel: 'Open Demo Inspection',
          ctaIcon: 'arrow-forward',
        };

  return (
    <View style={styles.wrapper}>
      {/* Pulsing glow layer behind the card */}
      <Animated.View
        style={[
          styles.glow,
          { opacity: glowOpacity },
        ]}
        pointerEvents="none"
      />

      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={styles.cardTouchable}
      >
        <LinearGradient
          colors={['#0F4FE5', '#1E3AFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>
              {eyebrow || config.eyebrowDefault}
            </Text>
          </View>

          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name={config.iconName} size={28} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.title}>{config.title}</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>{config.subtitle}</Text>

          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>{config.ctaLabel}</Text>
            <Ionicons
              name={config.ctaIcon}
              size={16}
              color="#0F4FE5"
              style={{ marginLeft: 6 }}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 24,
    backgroundColor: '#1E3AFF',
  },
  cardTouchable: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F4FE5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  card: {
    padding: 20,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5AC8FA',
    marginRight: 8,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#0F4FE5',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});

export default FirstRunAnchorCard;
