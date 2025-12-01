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
import colors from '../../theme/colors';

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
    // Entrance animation sequence
    Animated.sequence([
      // Logo dramatic entrance with rotation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
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

    // Continuous color pulsing for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoColorPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false, // Color animations can't use native driver
        }),
        Animated.timing(logoColorPulse, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();

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
    outputRange: [0, -15],
  });

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const logoTintColor = logoColorPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#38BDF8', '#8B5CF6', '#EC4899'], // Cyan -> Purple -> Pink (neon gradient)
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
      
      {/* Dark Gradient Background */}
      <LinearGradient
        colors={['#0A1628', '#0F1B2E', '#1A2332']}
        style={styles.gradientBackground}
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
                  { rotate: logoRotation },
                ],
              }}
            >
              <Animated.Image 
                source={require('../../../assets/logo.png')} 
                style={[
                  styles.logo,
                  { tintColor: logoTintColor },
                ]}
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
              Welcome to HostIQ
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
              AI-driven property intelligence.
            </Animated.Text>

            <Animated.Text
              style={[
                styles.callToAction,
                {
                  opacity: subtitleOpacity,
                },
              ]}
            >
              Start your Short Term Rental AI Journey.
            </Animated.Text>
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
                  colors={['#3B82F6', '#2563EB']}
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
    backgroundColor: '#0A1628',
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
    width: 140,
    height: 140,
    marginBottom: 50,
  },
  title: {
    fontSize: 46,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 36,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 35,
    fontWeight: '400',
    marginBottom: 18,
  },
  callToAction: {
    fontSize: 18,
    color: '#CBD5E1',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 10,
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 60,
    paddingHorizontal: 12,
  },
  loginButtonWrapper: {
    marginBottom: 14,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  signupButtonWrapper: {
    marginBottom: 20,
  },
  signupButton: {
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

