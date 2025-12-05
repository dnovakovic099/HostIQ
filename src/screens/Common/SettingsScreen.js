import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import biometricAuth from '../../services/biometricAuth';

export default function SettingsScreen({ navigation }) {
  const { user, logout, biometricAvailable, biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();
  const [biometricType, setBiometricType] = useState('');

  useEffect(() => {
    loadBiometricType();
  }, []);

  const loadBiometricType = async () => {
    const type = await biometricAuth.getBiometricTypeName();
    setBiometricType(type);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleToggleBiometric = async (value) => {
    if (value) {
      // Enable biometric
      const result = await enableBiometric();
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to enable biometric authentication');
      }
    } else {
      // Disable biometric
      Alert.alert(
        'Disable Biometric',
        `Are you sure you want to disable ${biometricType}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disableBiometric();
            },
          },
        ]
      );
    }
  };

  const SettingsItem = ({ icon, title, value, onPress, danger }) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons
          name={icon}
          size={24}
          color={danger ? '#F44336' : '#666'}
        />
        <Text style={[styles.settingsItemTitle, danger && styles.dangerText]}>
          {title}
        </Text>
      </View>
      {value && (
        <Text style={styles.settingsItemValue}>{value}</Text>
      )}
      {onPress && !value && (
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingsItem
            icon="person-outline"
            title="Edit Profile"
            onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon')}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="lock-closed-outline"
            title="Change Password"
            onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          {biometricAvailable && (
            <>
              <View style={styles.settingsItem}>
                <View style={styles.settingsItemLeft}>
                  <Ionicons
                    name={biometricType === 'Face ID' ? 'scan' : 'finger-print'}
                    size={24}
                    color="#666"
                  />
                  <Text style={styles.settingsItemTitle}>
                    {biometricType}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: '#ddd', true: '#4A90E2' }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.divider} />
            </>
          )}
          <SettingsItem
            icon="lock-closed-outline"
            title="Change Password"
            onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon')}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="language-outline"
            title="Language"
            value="English"
            onPress={() => Alert.alert('Coming Soon', 'Language selection will be available soon')}
          />
        </View>
      </View>

      {user?.role === 'CLEANER' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments</Text>
          <View style={styles.card}>
            <SettingsItem
              icon="card-outline"
              title="Payment Settings"
              onPress={() => navigation.navigate('HomeTab', { screen: 'PaymentSettings' })}
            />
            <View style={styles.divider} />
            <SettingsItem
              icon="receipt-outline"
              title="Payment History"
              onPress={() => navigation.navigate('HomeTab', { screen: 'PaymentHistory' })}
            />
          </View>
        </View>
      )}

      {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Management</Text>
            <View style={styles.card}>
              <SettingsItem
                icon="bookmark-outline"
                title="Room Templates"
                onPress={() => navigation.navigate('Inspections', { 
                  screen: 'RoomTemplates' 
                })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Integrations</Text>
            <View style={styles.card}>
              <SettingsItem
                icon="cloud-outline"
                title="PMS Integration"
                onPress={() => navigation.navigate('Inspections', { 
                  screen: 'PMSSettings' 
                })}
              />
            </View>
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <SettingsItem
            icon="information-circle-outline"
            title="Version"
            value="1.0.0"
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => Alert.alert('Terms of Service', 'Terms will be displayed here')}
          />
          <View style={styles.divider} />
          <SettingsItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be displayed here')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <SettingsItem
            icon="log-out-outline"
            title="Logout"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Image 
          source={require('../../../assets/logo.png')} 
          style={styles.footerLogo}
          resizeMode="contain"
        />
        <Text style={styles.footerText}>HostIQ</Text>
        <Text style={styles.footerSubtext}>Property Inspection Made Simple</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profile: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 10,
    marginLeft: 5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  settingsItemValue: {
    fontSize: 14,
    color: '#999',
    marginRight: 5,
  },
  dangerText: {
    color: '#F44336',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 55,
  },
  footer: {
    alignItems: 'center',
    padding: 30,
  },
  footerLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
    opacity: 0.4,
  },
  footerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
  },
});

