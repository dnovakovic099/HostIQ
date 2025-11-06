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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import biometricAuth from '../../services/biometricAuth';
import colors from '../../theme/colors';
import { API_URL } from '../../config/api';

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity 
          style={styles.content} 
          activeOpacity={1}
          onPress={() => {}}
        >
          {/* Close Button */}
          {navigation.canGoBack() && (
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color="#6B7280" />
            </TouchableOpacity>
          )}

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="dnovakovic21@yahoo.com"
              placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
                    color="#999"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.spacer} />

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[
                styles.loginButton, 
                (!email || !password) && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={loading || !email || !password}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>Log in</Text>
              )}
            </TouchableOpacity>

            {/* Demo Credentials */}
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Demo Accounts:</Text>
              <Text style={styles.demoText}>Owner: owner@hostiq.com / password123</Text>
              <Text style={styles.demoText}>Cleaner: cleaner@hostiq.com / password123</Text>
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  closeButton: {
    marginTop: 12,
    marginBottom: 32,
    alignSelf: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  logo: {
    width: 70,
    height: 70,
  },
  form: {
    width: '100%',
  },
  input: {
    height: 54,
    fontSize: 16,
    color: colors.input.text,
    backgroundColor: colors.input.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.input.border,
    fontWeight: '400',
  },
  passwordContainer: {
    position: 'relative',
  },
  biometricIcon: {
    position: 'absolute',
    right: 16,
    top: 15,
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    width: '100%',
    paddingBottom: 40,
  },
  loginButton: {
    height: 54,
    backgroundColor: colors.button.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButtonDisabled: {
    backgroundColor: colors.button.disabled,
  },
  loginButtonText: {
    color: colors.button.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  demoBox: {
    alignItems: 'center',
    paddingTop: 4,
  },
  demoTitle: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  demoText: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: '400',
  },
});

