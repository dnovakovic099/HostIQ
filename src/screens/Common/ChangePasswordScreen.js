import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';
import colors from '../../theme/colors';

export default function ChangePasswordScreen({ navigation }) {
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user signed up via Google
  const isGoogleUser = user?.auth_provider === 'google';

  // Password validation helpers
  const passwordRequirements = {
    minLength: newPassword.length >= 8,
    different: currentPassword && newPassword && currentPassword !== newPassword,
    match: newPassword && confirmPassword && newPassword === confirmPassword,
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      
      Alert.alert('Success', 'Password changed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Change password error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Failed to change password. Please check your current password and try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <View style={styles.headerGradient}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>Change Password</Text>
            <Text style={styles.headerSubtitle}>Update your password</Text>
          </View>
        </View>
      </LinearGradient>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {isGoogleUser ? (
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="information-circle" size={56} color="#4A90E2" />
              </View>
              <Text style={styles.infoTitle}>Password Change Not Available</Text>
              <Text style={styles.infoText}>
                You signed up using Google, so you don't have a password set in this app. Your account is managed through your Google account.
              </Text>
              <View style={styles.infoDivider} />
              <Text style={styles.infoSubtext}>
                To change your password, please update it in your Google Account settings at myaccount.google.com
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.introSection}>
                <Text style={styles.introTitle}>Secure Your Account</Text>
                <Text style={styles.introDescription}>
                  Keep your account safe by regularly updating your password. Choose a strong, unique password that you haven't used before.
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="lock-closed" size={20} color="#4A90E2" />
                  <Text style={styles.sectionTitle}>Password Information</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Current Password</Text>
                  <Text style={styles.helperText}>
                    Enter your current password to verify your identity
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.input}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#8E8E93"
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      <Ionicons
                        name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#8E8E93"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <Text style={styles.helperText}>
                    Create a strong password with at least 8 characters
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#8E8E93"
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#8E8E93"
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {newPassword.length > 0 && (
                    <View style={styles.requirementsContainer}>
                      <View style={styles.requirementRow}>
                        <Ionicons
                          name={passwordRequirements.minLength ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={passwordRequirements.minLength ? '#10B981' : '#9CA3AF'}
                        />
                        <Text style={[
                          styles.requirementText,
                          passwordRequirements.minLength && styles.requirementTextMet
                        ]}>
                          At least 8 characters
                        </Text>
                      </View>
                      <View style={styles.requirementRow}>
                        <Ionicons
                          name={passwordRequirements.different ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={passwordRequirements.different ? '#10B981' : '#9CA3AF'}
                        />
                        <Text style={[
                          styles.requirementText,
                          passwordRequirements.different && styles.requirementTextMet
                        ]}>
                          Different from current password
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <Text style={styles.helperText}>
                    Re-enter your new password to confirm it matches
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        confirmPassword.length > 0 && newPassword !== confirmPassword && styles.inputError
                      ]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#8E8E93"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#8E8E93"
                      />
                    </TouchableOpacity>
                  </View>
                  {confirmPassword.length > 0 && (
                    <View style={styles.requirementRow}>
                      <Ionicons
                        name={passwordRequirements.match ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={passwordRequirements.match ? '#10B981' : '#EF4444'}
                      />
                      <Text style={[
                        styles.requirementText,
                        passwordRequirements.match ? styles.requirementTextMet : styles.requirementTextError
                      ]}>
                        {passwordRequirements.match ? 'Passwords match' : 'Passwords do not match'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.securityTip}>
                  <Ionicons name="shield-checkmark" size={18} color="#4A90E2" />
                  <Text style={styles.securityTipText}>
                    <Text style={styles.securityTipBold}>Security Tip:</Text> Use a combination of letters, numbers, and special characters for better security.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    loading && styles.saveButtonDisabled,
                    (!currentPassword || !newPassword || !confirmPassword) && styles.saveButtonDisabled
                  ]}
                  onPress={handleChangePassword}
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" style={styles.buttonIcon} />
                      <Text style={styles.saveButtonText}>Update Password</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },
  headerWrapper: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 18,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },
  introSection: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  introDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  inputGroup: {
    marginBottom: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  passwordContainer: {
    position: 'relative',
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 52,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 15,
    padding: 6,
    zIndex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
    marginBottom: 24,
  },
  requirementsContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  requirementText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 10,
    lineHeight: 18,
  },
  requirementTextMet: {
    color: '#10B981',
  },
  requirementTextError: {
    color: '#EF4444',
  },
  securityTip: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  securityTipText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
    marginLeft: 10,
  },
  securityTipBold: {
    fontWeight: '700',
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  infoIconContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 50,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  infoText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    letterSpacing: 0.1,
  },
  infoDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
});

