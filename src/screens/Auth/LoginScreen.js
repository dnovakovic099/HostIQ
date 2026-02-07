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

const { height, width } = Dimensions.get('window');

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

  // Animated values for delightful entrance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
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
        if (result.error === 'Sign in was cancelled') {
          return;
        }

        // Handle account doesn't exist case - user needs to register first
        if (result.error === 'requiresRoleSelection' ||
            result.error?.toLowerCase().includes('role selection') ||
            result.error?.toLowerCase().includes('role is required') ||
            result.error?.toLowerCase().includes('role required')) {
          Alert.alert(
            'Account Not Found',
            'No account exists with this Apple ID. Please sign up first to create an account.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Up', onPress: () => navigation.navigate('Register') }
            ]
          );
        } else {
          Alert.alert('Sign in with Apple Failed', result.error || 'Please try again');
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

      {/* Gradient Header */}
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          {/* Close Button */}
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color={colors.text.inverse} />
            </TouchableOpacity>
          )}

          {/* Logo & Title */}
          <Animated.View
            style={[
              styles.headerContent,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.logoWrapper}>
              <View style={styles.logoBackground}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue to HostIQ</Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* White Form Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formArea}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Demo Credentials */}
            <Animated.View
              style={[
                styles.demoBox,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
            >
              <View style={styles.demoBadge}>
                <Ionicons name="information-circle" size={14} color={colors.primary.main} />
                <Text style={styles.demoTitle}>Demo Accounts</Text>
              </View>
              <Text style={styles.demoText}>Owner: owner@hostiq.com / password123</Text>
              <Text style={styles.demoText}>Cleaner: cleaner@hostiq.com / password123</Text>
            </Animated.View>

            {/* Form */}
            <Animated.View
              style={[
                styles.form,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
            >
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconWrapper}>
                  <Ionicons name="mail-outline" size={20} color={colors.text.tertiary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!loading}
                  selectTextOnFocus={true}
                />
              </View>

              <View style={styles.inputWrapper}>
                <View style={styles.inputIconWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.text.tertiary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.text.tertiary}
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
                      name={biometricType === 'Face ID' ? 'scan' : 'finger-print'}
                      size={22}
                      color={colors.primary.main}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>

            {/* Bottom Section */}
            <Animated.View
              style={[
                styles.bottomSection,
                { opacity: fadeAnim }
              ]}
            >
              <TouchableOpacity
                style={styles.loginButtonWrapper}
                onPress={handleLogin}
                disabled={loading || !email || !password}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={colors.gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.loginButton,
                    (!email || !password) && styles.loginButtonDisabled
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.text.inverse} />
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
                <View style={styles.socialButtonWrapper}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={{ width: '100%', height: 52 }}
                    onPress={handleAppleSignIn}
                  />
                </View>
              ) : (
              <TouchableOpacity
                style={styles.socialButtonWrapper}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.googleButton}>
                  {loading ? (
                    <ActivityIndicator color={colors.special.googleBlue} />
                  ) : (
                    <>
                        <Ionicons
                          name="logo-google"
                          size={20}
                          color={colors.special.googleBlue}
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
                  <Text style={styles.signupButtonText}>
                    Don't have an account? <Text style={styles.signupButtonBold}>Sign up</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

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
              <View style={styles.modalIconWrapper}>
                <LinearGradient
                  colors={colors.gradients.primary}
                  style={styles.modalIconGradient}
                >
                  <Ionicons name="mail-outline" size={32} color={colors.text.inverse} />
                </LinearGradient>
              </View>
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
                  styles.verifyButtonWrapper,
                  verificationCode.join('').length !== 6 && styles.verifyButtonDisabled
                ]}
                onPress={handleVerifyCode}
                disabled={loading || verificationCode.join('').length !== 6}
              >
                <LinearGradient
                  colors={colors.gradients.primary}
                  style={styles.verifyButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  )}
                </LinearGradient>
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
    backgroundColor: colors.background.primary,
  },
  // Header Gradient
  headerGradient: {
    paddingBottom: 32,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: 16,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    tintColor: colors.text.inverse,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.inverse,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Form Area
  formArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.soft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIconWrapper: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  biometricIcon: {
    marginLeft: 12,
    padding: 4,
  },
  bottomSpacer: {
    height: 32,
  },
  bottomSection: {
    width: '100%',
  },
  loginButtonWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  loginButton: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: colors.text.inverse,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  signupButtonWrapper: {
    marginBottom: 20,
    marginTop: 8,
  },
  signupButton: {
    height: 54,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  signupButtonBold: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  socialButtonWrapper: {
    marginBottom: 12,
  },
  googleButton: {
    height: 52,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.soft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  demoBox: {
    backgroundColor: colors.accent.blueLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary.lighter,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  demoTitle: {
    fontSize: 13,
    color: colors.primary.main,
    fontWeight: '600',
  },
  demoText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow.strong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconWrapper: {
    marginBottom: 16,
  },
  modalIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalEmail: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  modalActions: {
    gap: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: colors.primary.main,
    backgroundColor: colors.accent.blueLight,
  },
  verifyButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  verifyButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
});
