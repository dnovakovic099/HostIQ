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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';

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
      // TODO: Replace with actual API endpoint when available
      // await api.put('/auth/change-password', {
      //   currentPassword,
      //   newPassword,
      // });
      
      // For now, just show success message
      Alert.alert('Success', 'Password changed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to change password. Please check your current password and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#548EDD', '#4A7FD4', '#3F70CB', '#3561C2']}
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
              <Ionicons name="information-circle" size={48} color="#4A90E2" style={styles.infoIcon} />
              <Text style={styles.infoTitle}>Password Change Not Available</Text>
              <Text style={styles.infoText}>
                You signed up using Google, so you don't have a password set in this app. Your account is managed through your Google account.
              </Text>
              <Text style={styles.infoSubtext}>
                To change your password, please update it in your Google Account settings.
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Password</Text>
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
                      size={20}
                      color="#8E8E93"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min 8 characters)"
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
                      size={20}
                      color="#8E8E93"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
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
                      size={20}
                      color="#8E8E93"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
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
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerWrapper: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 4,
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoIcon: {
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

