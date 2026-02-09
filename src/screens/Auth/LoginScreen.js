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
  Modal,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
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
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef([]);
  const { login, biometricLogin, signInWithGoogle, signInWithApple, biometricEnabled, resendVerificationEmail, verifyCode } = useAuthStore();
  const autoLoginAttempted = useRef(false);
  
  // Check if Google Sign-In is configured
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const isGoogleSignInConfigured = googleClientId && 
    googleClientId !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 LoginScreen - Google Sign-In Configuration Check:');
    console.log('   EXPO_PUBLIC_GOOGLE_CLIENT_ID:', googleClientId ? `${googleClientId.substring(0, 20)}...` : 'NOT SET');
    console.log('   isGoogleSignInConfigured:', isGoogleSignInConfigured);
  }, []);

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
      if (result.requiresVerification) {
        setShowVerificationModal(true);
      } else {
        Alert.alert('Login Failed', result.error);
      }
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    const result = await resendVerificationEmail(email);
    setLoading(false);
    
    if (result.success) {
      Alert.alert('Success', 'Verification code sent! Please check your email.');
      // Clear code inputs
      setVerificationCode(['', '', '', '', '', '']);
    } else {
      Alert.alert('Error', result.error || 'Failed to resend verification code');
    }
  };

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (index, e) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    const result = await verifyCode(email, code);
    setLoading(false);

    if (result.success) {
      setShowVerificationModal(false);
      // User is now logged in, navigation will happen automatically
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid verification code');
      // Clear code on error
      setVerificationCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithGoogle();
      setLoading(false);

      if (!result.success) {
        // Don't show alert if user cancelled
        if (result.error !== 'Sign in was cancelled') {
          // Handle account doesn't exist case
          if (result.error === 'requiresRoleSelection' ||
              result.error?.toLowerCase().includes('role selection') ||
              result.error?.toLowerCase().includes('role is required') ||
              result.error?.toLowerCase().includes('role required')) {
            Alert.alert('Google Sign-In Failed', 'the account with this email does not exist');
          } else {
            Alert.alert('Google Sign-In Failed', result.error || 'Please try again');
          }
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Google Sign-In handler error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred. Please check your Google Sign-In configuration.');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithApple();
      setLoading(false);

      if (!result.success) {
        // Don't show alert if user cancelled
        if (result.error !== 'Sign in was cancelled') {
          // Check if error requires role selection
          if (result.error === 'requiresRoleSelection' || 
              result.error?.includes('requiresRoleSelection') ||
              result.error?.includes('role selection')) {
            Alert.alert(
              'Account Not Found',
              'No account found with this Apple ID. Please sign up to create an account.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Up', onPress: () => navigation.navigate('Register') }
              ]
            );
          } else {
            Alert.alert('Sign in with Apple Failed', result.error || 'Please try again');
          }
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Apple Sign-In handler error:', error);
      Alert.alert(
        'Error',
        error.message || 'An unexpected error occurred during Sign in with Apple.'
      );
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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
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
              
              {/* Demo Credentials */}
              <View style={styles.demoBox}>
                <Text style={styles.demoTitle}>Demo Accounts:</Text>
                <Text style={styles.demoText}>Owner: owner@hostiq.com / password123</Text>
                <Text style={styles.demoText}>Cleaner: cleaner@hostiq.com / password123</Text>
              </View>
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

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Sign-In Buttons */}
              {Platform.OS === 'ios' ? (
                <View style={styles.googleButtonWrapper}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={16}
                    style={{ width: '100%', height: 56 }}
                    onPress={handleAppleSignIn}
                  />
                </View>
              ) : (
              <TouchableOpacity
                style={styles.googleButtonWrapper}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.googleButton}>
                  {loading ? (
                    <ActivityIndicator color="#4285F4" />
                  ) : (
                    <>
                        <Ionicons
                          name="logo-google"
                          size={20}
                          color="#4285F4"
                          style={styles.googleIcon}
                        />
                      <Text style={styles.googleButtonText}>Sign in with Google</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
              )}

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
            </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="mail-outline" size={48} color="#3B82F6" />
              <Text style={styles.modalTitle}>Verification sent to your account</Text>
              <Text style={styles.modalSubtitle}>
                Enter code sent to{'\n'}
                <Text style={styles.modalEmail}>{email}</Text>
              </Text>
            </View>

            <View style={styles.modalBody}>
              {/* Code Input */}
              <View style={styles.codeContainer}>
                {verificationCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => {
                      if (ref) {
                        codeInputRefs.current[index] = ref;
                      }
                    }}
                    style={[
                      styles.codeInput,
                      digit && styles.codeInputFilled
                    ]}
                    value={digit}
                    onChangeText={(value) => handleCodeChange(index, value)}
                    onKeyPress={(e) => handleCodeKeyPress(index, e)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  verificationCode.join('').length !== 6 && styles.verifyButtonDisabled
                ]}
                onPress={handleVerifyCode}
                disabled={loading || verificationCode.join('').length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendVerification}
                disabled={loading}
              >
                <Text style={styles.resendButtonText}>
                  {loading ? 'Sending...' : "Didn't receive code? Resend"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
    marginBottom: 20,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  googleButtonWrapper: {
    marginBottom: 14,
  },
  googleButton: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  demoBox: {
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalText: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalEmail: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  codeInput: {
    width: 50,
    height: 60,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  verifyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '500',
  },
});

