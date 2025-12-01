import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import colors from '../../theme/colors';

const { height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('CLEANER');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
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

    if (!result.success) {
      Alert.alert('Registration Failed', result.error);
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
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Join HostIQ to get started</Text>
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

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.createButtonWrapper}
                onPress={handleRegister}
                disabled={loading || !name || !email || !password || !confirmPassword}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.createButton,
                    (!name || !email || !password || !confirmPassword) && styles.createButtonDisabled
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  closeButton: {
    marginTop: 12,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 36,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 20,
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
    marginBottom: 24,
  },
  input: {
    height: 56,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    fontWeight: '400',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
    color: '#FFFFFF',
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  roleButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
    color: '#94A3B8',
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  buttonContainer: {
    width: '100%',
  },
  createButtonWrapper: {
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  createButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '400',
  },
  loginLinkBold: {
    color: '#60A5FA',
    fontWeight: '600',
  },
});


