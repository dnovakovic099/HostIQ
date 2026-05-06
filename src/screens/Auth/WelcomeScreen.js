import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';

const FEATURE_PILLS = [
  { icon: 'flash', label: 'AI Cleaning Checks' },
  { icon: 'chatbubble-ellipses', label: 'Guest Issue Alerts' },
  { icon: 'trending-up', label: 'Smart Pricing' },
];

const { width, height } = Dimensions.get('window');

// Floating Particle Component
const FloatingParticle = ({ delay = 0, duration = 4000, size = 60 }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -height,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.4,
              duration: duration * 0.1,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.2,
              duration: duration * 0.8,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.1,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          opacity: opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(56, 189, 248, 0.2)', 'rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.1)']}
        style={styles.particleGradient}
      />
    </Animated.View>
  );
};

export default function WelcomeScreen({ navigation }) {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoColorPulse = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(100)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(30)).current;
  const loginButtonSlide = useRef(new Animated.Value(150)).current;
  const loginButtonOpacity = useRef(new Animated.Value(0)).current;
  const loginButtonFloat = useRef(new Animated.Value(0)).current;
  const signupButtonSlide = useRef(new Animated.Value(150)).current;
  const signupButtonOpacity = useRef(new Animated.Value(0)).current;
  const signupButtonFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation sequence - Apple-style smooth and refined
    Animated.sequence([
      // Logo elegant entrance (no rotation - too gimmicky)
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      
      // Title entrance with scale and slide
      Animated.parallel([
        Animated.spring(titleSlide, {
          toValue: 0,
          tension: 45,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          tension: 45,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      
      // Subtitle slide up and fade
      Animated.parallel([
        Animated.timing(subtitleSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      
      // Buttons dramatic entrance (staggered)
      Animated.parallel([
        Animated.parallel([
          Animated.spring(loginButtonSlide, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(loginButtonOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(150),
          Animated.parallel([
            Animated.spring(signupButtonSlide, {
              toValue: 0,
              tension: 40,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(signupButtonOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
    ]).start();

    // Continuous floating animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Remove color pulsing - too distracting for Apple aesthetic

    // Continuous floating animation for login button
    Animated.loop(
      Animated.sequence([
        Animated.timing(loginButtonFloat, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(loginButtonFloat, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Continuous floating animation for signup button (offset phase)
    Animated.loop(
      Animated.sequence([
        Animated.timing(signupButtonFloat, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(signupButtonFloat, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const logoTranslateY = logoFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],                    // Reduced movement for subtlety
  });

  const loginButtonTranslateY = loginButtonFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const signupButtonTranslateY = signupButtonFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Refined Gradient Background - Subtle, Apple-quality */}
      <LinearGradient
        colors={colors.gradients.dark}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Floating Particles - Removed */}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
            {/* Logo */}
            <Animated.View
              style={{
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { translateY: logoTranslateY },
                ],
              }}
            >
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>
            
            <Animated.Text
              style={[
                styles.title,
                {
                  opacity: titleOpacity,
                  transform: [
                    { translateY: titleSlide },
                    { scale: titleScale },
                  ],
                },
              ]}
            >
              Know before your{"\n"}guests do.
            </Animated.Text>

            <Animated.Text
              style={[
                styles.subtitle,
                {
                  opacity: subtitleOpacity,
                  transform: [{ translateY: subtitleSlide }],
                },
              ]}
            >
              AI-powered quality control for short-term rentals.
            </Animated.Text>

            <Animated.View
              style={[
                styles.featurePillsRow,
                {
                  opacity: subtitleOpacity,
                  transform: [{ translateY: subtitleSlide }],
                },
              ]}
            >
              {FEATURE_PILLS.map((feature) => (
                <View key={feature.label} style={styles.featurePill}>
                  <Ionicons
                    name={feature.icon}
                    size={14}
                    color="rgba(255, 255, 255, 0.95)"
                  />
                  <Text style={styles.featurePillText}>{feature.label}</Text>
                </View>
              ))}
            </Animated.View>
        </View>

        <View style={styles.spacer} />

          {/* Bottom Buttons - Dark Theme */}
        <View style={styles.buttonContainer}>
            <Animated.View
              style={{
                opacity: loginButtonOpacity,
                transform: [
                  { translateY: Animated.add(loginButtonSlide, loginButtonTranslateY) },
                ],
              }}
            >
          <TouchableOpacity
                style={styles.loginButtonWrapper}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={colors.gradients.primaryAlt}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
            style={styles.loginButton}
          >
            <Text style={styles.loginButtonText}>Log in</Text>
                </LinearGradient>
          </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={{
                opacity: signupButtonOpacity,
                transform: [
                  { translateY: Animated.add(signupButtonSlide, signupButtonTranslateY) },
                ],
              }}
            >
          <TouchableOpacity
                style={styles.signupButtonWrapper}
            onPress={() => navigation.navigate('Register')}
                activeOpacity={0.85}
          >
                <View style={styles.signupButton}>
            <Text style={styles.signupButtonText}>Sign up</Text>
                </View>
          </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gradients.dark[0],
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  particlesContainer: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    left: Math.random() * (width - 100),
    bottom: -100,
    borderRadius: 100,
  },
  particleGradient: {
    flex: 1,
    borderRadius: 100,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    width: 120,                               // Slightly smaller, more refined
    height: 120,
    marginBottom: 40,
  },
  title: {
    fontSize: 38,                             // SF Pro Display Large Title (slightly tighter to fit 2 lines)
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 18,
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 17,                             // iOS body text
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    fontWeight: '400',
    marginBottom: 24,
  },
  featurePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  featurePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: -0.1,
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 48,                        // 8pt grid
    paddingHorizontal: 16,                    // 8pt grid
  },
  loginButtonWrapper: {
    marginBottom: 12,
    shadowColor: colors.shadow.blue,
    shadowOffset: { width: 0, height: 4 },   // Reduced shadow
    shadowOpacity: 0.15,                      // Much more subtle
    shadowRadius: 8,
    elevation: 4,
  },
  loginButton: {
    height: 50,                               // Standard iOS button
    borderRadius: 12,                         // Slightly smaller radius
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,                             // iOS standard
    fontWeight: '600',                        // Semibold
    letterSpacing: -0.4,                      // Apple-style tracking
  },
  signupButtonWrapper: {
    marginBottom: 16,
  },
  signupButton: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.10)', // Subtle fill
    borderRadius: 12,
    borderWidth: 1,                           // Hairline border
    borderColor: 'rgba(255, 255, 255, 0.30)', // More visible border
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
});

