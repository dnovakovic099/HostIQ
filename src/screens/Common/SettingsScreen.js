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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { FEATURE_FLAGS } from '../../config/constants';
import colors from '../../theme/colors';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout, deleteAccount } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data, including properties, inspections, and reports, will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const result = await deleteAccount();
            setIsDeleting(false);

            if (!result.success) {
              Alert.alert(
                'Error',
                result.error || 'Failed to delete account. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const SettingsItem = ({ icon, title, value, onPress, danger, showChevron = true }) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconWrapper, danger && styles.iconWrapperDanger]}>
          <Ionicons
            name={icon}
            size={20}
            color={danger ? colors.status.error : colors.primary.main}
          />
        </View>
        <Text style={[styles.settingsItemTitle, danger && styles.dangerText]}>
          {title}
        </Text>
      </View>
      {value && (
        <Text style={styles.settingsItemValue}>{value}</Text>
      )}
      {onPress && showChevron && !value && (
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      )}
    </TouchableOpacity>
  );

  const firstName = (user?.name || 'User').split(' ')[0];

  return (
    <View style={styles.container}>
      {/* Header Gradient */}
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        {/* Decorative elements */}
        <View style={styles.decorativeCircle1}>
          <Ionicons name="settings" size={80} color={colors.decorative.icon1} />
        </View>
        <View style={styles.decorativeCircle2}>
          <Ionicons name="person" size={60} color={colors.decorative.icon2} />
        </View>

        <Text style={styles.headerGreeting}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your account and preferences</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={colors.gradients.primary}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <View style={styles.roleBadgeWrapper}>
            <LinearGradient
              colors={colors.gradients.lightBlue}
              style={styles.roleBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.roleText}>{user?.role}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            <SettingsItem
              icon="person-outline"
              title="Edit Profile"
              onPress={() => navigation.navigate('EditProfile')}
            />
            {user?.auth_provider !== 'google' && user?.auth_provider !== 'apple' && (
              <>
                <View style={styles.divider} />
                <SettingsItem
                  icon="lock-closed-outline"
                  title="Change Password"
                  onPress={() => navigation.navigate('ChangePassword')}
                />
              </>
            )}
          </View>
        </View>

        {/* Payments Section (Cleaners Only) */}
        {user?.role === 'CLEANER' && FEATURE_FLAGS.ENABLE_PAYMENTS && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENTS</Text>
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

        {/* Property Management (Owners Only) */}
        {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PROPERTY MANAGEMENT</Text>
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

            {FEATURE_FLAGS.ENABLE_PMS_INTEGRATION && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>INTEGRATIONS</Text>
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
            )}
          </>
        )}

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.card}>
            <SettingsItem
              icon="information-circle-outline"
              title="Version"
              value="1.0.0"
              showChevron={false}
            />
            <View style={styles.divider} />
            <SettingsItem
              icon="document-text-outline"
              title="Terms of Service"
              onPress={() => navigation.navigate('TermsOfService')}
            />
            <View style={styles.divider} />
            <SettingsItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DANGER ZONE</Text>
          <View style={styles.card}>
            <SettingsItem
              icon="trash-outline"
              title="Delete Account"
              onPress={isDeleting ? undefined : handleDeleteAccount}
              danger
            />
            <View style={styles.divider} />
            <SettingsItem
              icon="log-out-outline"
              title="Logout"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <LinearGradient
            colors={colors.gradients.primary}
            style={styles.footerLogoWrapper}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.footerLogo}
              resizeMode="contain"
            />
          </LinearGradient>
          <Text style={styles.footerText}>HostIQ</Text>
          <Text style={styles.footerSubtext}>Property Inspection Made Simple</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'visible',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.decorative.circle1,
    top: -40,
    right: -40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.decorative.circle2,
    bottom: -20,
    left: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text.inverse,
    marginBottom: 4,
    letterSpacing: -0.8,
    zIndex: 10,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.inverse,
    opacity: 0.9,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: colors.background.card,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
    borderWidth: 0.5,
    borderColor: colors.border.light,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  roleBadgeWrapper: {
    marginLeft: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.main,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
    borderWidth: 0.5,
    borderColor: colors.border.light,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accent.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrapperDanger: {
    backgroundColor: colors.accent.errorLight,
  },
  settingsItemTitle: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  settingsItemValue: {
    fontSize: 15,
    color: colors.text.tertiary,
    marginRight: 8,
    fontWeight: '500',
  },
  dangerText: {
    color: colors.status.error,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border.light,
    marginLeft: 60,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  footerLogoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    opacity: 0.4,
  },
  footerLogo: {
    width: 40,
    height: 40,
    tintColor: colors.text.inverse,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: -0.2,
  },
  footerSubtext: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 4,
    fontWeight: '500',
  },
});
