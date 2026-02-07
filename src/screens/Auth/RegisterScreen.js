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
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../../store/authStore';
import colors from '../../theme/colors';

const { height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(null); // No role selected initially
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef([]);
  const { register, signInWithGoogle, signInWithApple, resendVerificationEmail, verifyCode } = useAuthStore();
  
  // Check if Google Sign-In is configured
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const isGoogleSignInConfigured = googleClientId && 
    googleClientId !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 RegisterScreen - Google Sign-In Configuration Check:');
    console.log('   EXPO_PUBLIC_GOOGLE_CLIENT_ID:', googleClientId ? `${googleClientId.substring(0, 20)}...` : 'NOT SET');
    console.log('   isGoogleSignInConfigured:', isGoogleSignInConfigured);
  }, []);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!role) {
      Alert.alert('Error', 'Please select whether you are a Cleaner or Owner');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const result = await register(email, password, name, role);
    setLoading(false);

    if (result.success && result.requiresVerification) {
      setRegisteredEmail(email);
      setShowVerificationModal(true);
    } else if (!result.success) {
      Alert.alert('Registration Failed', result.error);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    const result = await resendVerificationEmail(registeredEmail);
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
    const result = await verifyCode(registeredEmail, code);
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

  const handleGoogleSignIn = async () => {
    if (!role) {
      Alert.alert('Role Selection Required', 'Please select whether you are a Cleaner or Owner before signing up with Google.');
      return;
    }

    try {
      setLoading(true);
      const result = await signInWithGoogle(role);
      setLoading(false);

      if (!result.success) {
        // Don't show alert if user cancelled
        if (result.error !== 'Sign in was cancelled') {
          // Check if error requires role selection
          if (result.error === 'requiresRoleSelection' || result.error?.includes('role selection') || result.error?.includes('role is required')) {
            Alert.alert(
              'Role Selection Required',
              'Please select whether you are a Cleaner or Owner before signing up with Google.',
              [{ text: 'OK' }]
            );
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

  const handleAppleSignInPress = async () => {
    // Check if role is selected before proceeding
    if (!role) {
      Alert.alert('Role Selection Required', 'Please select whether you are a Cleaner or Owner before signing up with Apple.');
      return;
    }

    try {
      setLoading(true);
      const result = await signInWithApple(role);
      setLoading(false);

      if (!result.success) {
        // Don't show alert if user cancelled
        if (result.error !== 'Sign in was cancelled') {
          // Check if error requires role selection
          if (result.error === 'requiresRoleSelection' || result.error?.includes('role selection') || result.error?.includes('role is required')) {
            Alert.alert(
              'Role Selection Required',
              'Please select whether you are a Cleaner or Owner before signing up with Apple.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Sign in with Apple Failed', result.error || 'Please try again');
          }
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Apple Sign-In handler error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred during Sign in with Apple.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Light Gradient Background */}
      <LinearGradient
        colors={colors.gradients.headerLight}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Background Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Close Button */}
            {navigation.canGoBack() && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="close" size={28} color={colors.text.secondary} />
              </TouchableOpacity>
            )}

            <View style={styles.topSpacer} />

            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={colors.gradients.primary}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image
                    source={require('../../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Join HostIQ to get started</Text>
            </View>

            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.label}>I am a:</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'CLEANER' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('CLEANER')}
                  activeOpacity={0.85}
                >
                  {role === 'CLEANER' ? (
                    <View style={styles.roleButtonContent}>
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color="#3B82F6"
                      />
                      <Text style={styles.roleButtonTextActive}>Cleaner</Text>
                    </View>
                  ) : (
                    <View style={styles.roleButtonContent}>
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color="#94A3B8"
                      />
                      <Text style={styles.roleButtonText}>Cleaner</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'OWNER' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('OWNER')}
                  activeOpacity={0.85}
                >
                  {role === 'OWNER' ? (
                    <View style={styles.roleButtonContent}>
                      <Ionicons
                        name="business-outline"
                        size={20}
                        color="#3B82F6"
                      />
                      <Text style={styles.roleButtonTextActive}>Owner</Text>
                    </View>
                  ) : (
                    <View style={styles.roleButtonContent}>
                      <Ionicons
                        name="business-outline"
                        size={20}
                        color="#94A3B8"
                      />
                      <Text style={styles.roleButtonText}>Owner</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Social Sign-In Buttons */}
            <View style={styles.buttonContainer}>
              {Platform.OS === 'ios' ? (
                <View style={styles.appleButtonWrapper}>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={16}
                    style={{ width: '100%', height: 56 }}
                    onPress={handleAppleSignInPress}
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
                        <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.googleIcon} />
                        <Text style={styles.googleButtonText}>Sign up with Google</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />

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
              />

              <TextInput
                style={styles.input}
                placeholder="Password (min 8 characters)"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="next"
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#64748B"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
              />

              {/* <Text style={styles.label}>I am a:</Text> */}
              <View style={styles.roleContainer}>
                {/* <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'CLEANER' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('CLEANER')}
                  activeOpacity={0.85}
                >
                  {role === 'CLEANER' ? (
                    <View style={styles.roleButtonContent}>
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color="#3B82F6"
                      />
                      <Text style={styles.roleButtonTextActive}>Cleaner</Text>
                    </View>
                  ) : (
                    <View style={styles.roleButtonContent}>
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color="#94A3B8"
                      />
                      <Text style={styles.roleButtonText}>Cleaner</Text>
                    </View>
                  )}
                </TouchableOpacity> */}

                {/* <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'OWNER' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('OWNER')}
                  activeOpacity={0.85}
                >
                  {role === 'OWNER' ? (
                    <View style={styles.roleButtonContent}>
                      <Ionicons
                        name="business-outline"
                        size={20}
                        color="#3B82F6"
                      />
                      <Text style={styles.roleButtonTextActive}>Owner</Text>
                    </View>
                  ) : (
                    <View style={styles.roleButtonContent}>
                      <Ionicons
                        name="business-outline"
                        size={20}
                        color="#94A3B8"
                      />
                      <Text style={styles.roleButtonText}>Owner</Text>
                    </View>
                  )}
                </TouchableOpacity> */}
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.createButtonWrapper}
                onPress={handleRegister}
                disabled={loading || !name || !email || !password || !confirmPassword || !role}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={colors.gradients.primaryAlt}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.createButton,
                    (!name || !email || !password || !confirmPassword) && styles.createButtonDisabled
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.text.inverse} />
                  ) : (
                    <Text style={styles.createButtonText}>Sign up</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.loginLinkText}>
                  Already have an account? <Text style={styles.loginLinkBold}>Log in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
                <Text style={styles.modalEmail}>{registeredEmail}</Text>
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
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  // Decorative Elements
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(90, 200, 250, 0.06)',
    bottom: 100,
    left: -50,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(10, 132, 255, 0.05)',
    top: height / 2,
    right: 30,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.soft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topSpacer: {
    height: 80,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 60,
    height: 60,
    tintColor: colors.text.inverse,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  roleSection: {
    width: '100%',
    marginBottom: 24,
  },
  form: {
    width: '100%',
    marginTop: 24,
    marginBottom: 24,
  },
  input: {
    height: 54,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    fontWeight: '500',
    shadowColor: colors.shadow.soft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.text.primary,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
  },
  roleButtonActive: {
    borderColor: colors.primary.main,
    borderWidth: 2,
    backgroundColor: colors.accent.blueLight,
  },
  roleButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  roleButtonContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  roleButtonText: {
    fontSize: 15,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
  },
  createButtonWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  createButton: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: colors.text.inverse,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  loginLinkBold: {
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
  appleButtonWrapper: {
    marginBottom: 12,
  },
  googleButtonWrapper: {
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
  modalEmail: {
    color: colors.primary.main,
    fontWeight: '600',
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


