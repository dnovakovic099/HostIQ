import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import biometricAuth from '../../services/biometricAuth';
import colors from '../../theme/colors';
import { API_URL } from '../../config/api';

const { height } = Dimensions.get('window');

// Debug: Log API URL on module load
console.log('🔍 LoginScreen - API_URL:', API_URL);

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('owner@hostiq.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [biometricType, setBiometricType] = useState('');
  const [showBiometric, setShowBiometric] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { login, biometricLogin, biometricEnabled } = useAuthStore();
  const autoLoginAttempted = useRef(false);

  useEffect(() => {
    loadSavedCredentials();
    checkBiometric();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await biometricAuth.getStoredValue('saved_email');
      const savedPassword = await biometricAuth.getStoredValue('saved_password');
      const savedRemember = await biometricAuth.getStoredValue('remember_me');

      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
      if (savedRemember === 'true') setRememberMe(true);
    } catch (error) {
      console.log('No saved credentials');
    }
  };

  const checkBiometric = async () => {
    const { available } = await biometricAuth.isAvailable();
    const enabled = await biometricAuth.isBiometricEnabled();

    if (available && enabled) {
      const type = await biometricAuth.getBiometricTypeName();
      setBiometricType(type);
      setShowBiometric(true);

      const storedEmail = await biometricAuth.getBiometricEmail();
      if (storedEmail) {
        setEmail(storedEmail);
      }

      // Auto-trigger biometric login on mount
      if (!autoLoginAttempted.current) {
        autoLoginAttempted.current = true;
        // Small delay to ensure UI is ready
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password, rememberMe);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    const result = await biometricLogin();
    setLoading(false);

    if (!result.success) {
      Alert.alert('Biometric Login Failed', result.error || 'Please try again');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Dark Gradient Background */}
      <LinearGradient
        colors={['#0A1628', '#0F1B2E', '#1A2332']}
        style={styles.gradientBackground}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
          <View style={styles.content}>
            {/* Close Button */}
            {navigation.canGoBack() && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="close" size={28} color="#CBD5E1" />
              </TouchableOpacity>
            )}

            <View style={styles.topSpacer} />

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="next"
                editable={!loading}
                selectTextOnFocus={true}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                  selectTextOnFocus={true}
                />
                {showBiometric && (
                  <TouchableOpacity
                    style={styles.biometricIcon}
                    onPress={handleBiometricLogin}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                      size={22}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.bottomSpacer} />

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={styles.loginButtonWrapper}
                onPress={handleLogin}
                disabled={loading || !email || !password}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.loginButton,
                    (!email || !password) && styles.loginButtonDisabled
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Log in</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <TouchableOpacity
                style={styles.signupButtonWrapper}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.85}
              >
                <View style={styles.signupButton}>
                  <Text style={styles.signupButtonText}>Sign up</Text>
                </View>
              </TouchableOpacity>

              {/* Demo Credentials */}
              <View style={styles.demoBox}>
                <Text style={styles.demoTitle}>Demo Accounts:</Text>
                <Text style={styles.demoText}>Owner: owner@hostiq.com / password123</Text>
                <Text style={styles.demoText}>Cleaner: cleaner@hostiq.com / password123</Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 32,
    zIndex: 10,
  },
  topSpacer: {
    flex: 0.5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '400',
  },
  form: {
    width: '100%',
  },
  input: {
    height: 56,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    fontWeight: '400',
  },
  passwordContainer: {
    position: 'relative',
  },
  biometricIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  bottomSpacer: {
    height: 40,
  },
  bottomSection: {
    width: '100%',
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
  loginButtonDisabled: {
    opacity: 0.5,
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
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
  demoBox: {
    alignItems: 'center',
    paddingTop: 4,
  },
  demoTitle: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
    marginBottom: 6,
  },
  demoText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '400',
    marginBottom: 2,
  },
});

