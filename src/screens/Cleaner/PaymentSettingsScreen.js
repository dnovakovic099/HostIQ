import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';

// Deep link URLs for Stripe onboarding flow
const APP_SCHEME = 'hostiq://';
const RETURN_URL = `${APP_SCHEME}payments/success`;
const REFRESH_URL = `${APP_SCHEME}payments/refresh`;

export default function PaymentSettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [account, setAccount] = useState(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchAccountStatus();
      fetchPaymentStats();
    }, [])
  );

  const fetchAccountStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/account');
      setHasAccount(response.data.hasAccount);
      setAccount(response.data.account);
    } catch (error) {
      console.error('Error fetching account status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      const response = await api.get('/payments/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccountStatus();
    fetchPaymentStats();
  };

  const handleCreateAccount = async () => {
    try {
      setCreating(true);
      
      const response = await api.post('/payments/account/create', {
        returnUrl: RETURN_URL,
        refreshUrl: REFRESH_URL
      });

      if (response.data.onboardingUrl) {
        // Open Stripe onboarding in browser
        const canOpen = await Linking.canOpenURL(response.data.onboardingUrl);
        if (canOpen) {
          await Linking.openURL(response.data.onboardingUrl);
        } else {
          Alert.alert('Error', 'Unable to open bank linking page');
        }
      }

      // Refresh status after returning
      setTimeout(() => {
        fetchAccountStatus();
      }, 2000);
    } catch (error) {
      console.error('Error creating account:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create payment account');
    } finally {
      setCreating(false);
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      setCreating(true);
      
      const response = await api.post('/payments/account/onboarding-link', {
        returnUrl: RETURN_URL,
        refreshUrl: REFRESH_URL
      });

      if (response.data.onboardingUrl) {
        await Linking.openURL(response.data.onboardingUrl);
      }

      setTimeout(() => {
        fetchAccountStatus();
      }, 2000);
    } catch (error) {
      console.error('Error getting onboarding link:', error);
      Alert.alert('Error', 'Failed to continue setup');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      const response = await api.get('/payments/account/dashboard');
      
      if (response.data.dashboardUrl) {
        await Linking.openURL(response.data.dashboardUrl);
      }
    } catch (error) {
      console.error('Error opening dashboard:', error);
      Alert.alert('Error', 'Failed to open Stripe dashboard');
    }
  };

  const handleSyncStatus = async () => {
    try {
      setRefreshing(true);
      await api.post('/payments/account/sync');
      await fetchAccountStatus();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'ACTIVE':
        return {
          color: '#33D39C',
          bgColor: '#ECFDF5',
          icon: 'checkmark-circle',
          label: 'Active',
          description: 'Your account is set up and ready to receive payments'
        };
      case 'ONBOARDING':
        return {
          color: '#F59E0B',
          bgColor: '#FFFBEB',
          icon: 'time',
          label: 'Setup Required',
          description: 'Please complete your account setup to receive payments'
        };
      case 'RESTRICTED':
        return {
          color: '#F59E0B',
          bgColor: '#FFFBEB',
          icon: 'alert-circle',
          label: 'Restricted',
          description: 'Additional information is needed to enable payouts'
        };
      case 'DISABLED':
        return {
          color: '#EF4444',
          bgColor: '#FEF2F2',
          icon: 'close-circle',
          label: 'Disabled',
          description: 'Your account has been disabled'
        };
      default:
        return {
          color: '#6B7280',
          bgColor: '#F3F4F6',
          icon: 'help-circle',
          label: 'Pending',
          description: 'Account setup is pending'
        };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payment settings...</Text>
      </View>
    );
  }

  const statusConfig = account ? getStatusConfig(account.status) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="card" size={32} color="#4F46E5" />
        </View>
        <Text style={styles.headerTitle}>Payment Settings</Text>
        <Text style={styles.headerSubtitle}>
          Link your bank account to receive payments from property owners
        </Text>
      </View>

      {!hasAccount ? (
        // No account - show setup CTA
        <View style={styles.setupSection}>
          <View style={styles.setupIcon}>
            <Ionicons name="wallet-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.setupTitle}>Set Up Payments</Text>
          <Text style={styles.setupDescription}>
            Link your bank account to start receiving payments directly from property owners. 
            Setup takes just a few minutes.
          </Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#33D39C" />
              <Text style={styles.benefitText}>Fast direct deposits</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#33D39C" />
              <Text style={styles.benefitText}>Secure bank-level encryption</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#33D39C" />
              <Text style={styles.benefitText}>Track all payments in one place</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.setupButton}
            onPress={handleCreateAccount}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="link" size={20} color="#FFF" />
                <Text style={styles.setupButtonText}>Link Bank Account</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.poweredBy}>
            Powered by Stripe • Secure & PCI Compliant
          </Text>
        </View>
      ) : (
        // Has account - show status
        <>
          {/* Account Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                <Ionicons name={statusConfig.icon} size={18} color={statusConfig.color} />
                <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
              <TouchableOpacity onPress={handleSyncStatus}>
                <Ionicons name="refresh" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.statusDescription}>{statusConfig.description}</Text>

            {/* Bank Account Info */}
            {account.bankName && account.bankLast4 && (
              <View style={styles.bankInfo}>
                <Ionicons name="business" size={20} color="#374151" />
                <Text style={styles.bankName}>{account.bankName}</Text>
                <Text style={styles.bankLast4}>••••{account.bankLast4}</Text>
              </View>
            )}

            {/* Feature Status */}
            <View style={styles.featureStatus}>
              <View style={styles.featureItem}>
                <Ionicons 
                  name={account.chargesEnabled ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={18} 
                  color={account.chargesEnabled ? '#33D39C' : '#D1D5DB'} 
                />
                <Text style={styles.featureText}>Charges enabled</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons 
                  name={account.payoutsEnabled ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={18} 
                  color={account.payoutsEnabled ? '#33D39C' : '#D1D5DB'} 
                />
                <Text style={styles.featureText}>Payouts enabled</Text>
              </View>
            </View>

            {/* Actions */}
            {account.status !== 'ACTIVE' && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinueOnboarding}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.continueButtonText}>Complete Setup</Text>
                )}
              </TouchableOpacity>
            )}

            {account.status === 'ACTIVE' && (
              <TouchableOpacity
                style={styles.dashboardButton}
                onPress={handleOpenDashboard}
              >
                <Ionicons name="open-outline" size={18} color="#007AFF" />
                <Text style={styles.dashboardButtonText}>View Stripe Dashboard</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Earnings Stats */}
          {stats?.received && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Earnings</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    ${stats.received.totalReceived?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.statLabel}>Total Received</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.received.paymentCount || 0}</Text>
                  <Text style={styles.statLabel}>Payments</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.viewHistoryButton}
                onPress={() => navigation.navigate('PaymentHistory')}
              >
                <Text style={styles.viewHistoryText}>View Payment History</Text>
                <Ionicons name="chevron-forward" size={18} color="#007AFF" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How It Works</Text>
        
        <View style={styles.infoItem}>
          <View style={styles.infoNumber}>
            <Text style={styles.infoNumberText}>1</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoItemTitle}>Link your bank</Text>
            <Text style={styles.infoItemText}>
              Securely connect your bank account through Stripe
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <View style={styles.infoNumber}>
            <Text style={styles.infoNumberText}>2</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoItemTitle}>Complete cleanings</Text>
            <Text style={styles.infoItemText}>
              Property owners can send payments for your work
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <View style={styles.infoNumber}>
            <Text style={styles.infoNumberText}>3</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoItemTitle}>Get paid directly</Text>
            <Text style={styles.infoItemText}>
              Funds are deposited to your bank within 2-3 business days
            </Text>
          </View>
        </View>
      </View>

      {/* Fee Disclosure */}
      <View style={styles.feeDisclosure}>
        <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
        <Text style={styles.feeText}>
          A 1% platform fee is deducted from each payment to cover processing costs.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280'
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22
  },
  // Setup Section (no account)
  setupSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center'
  },
  setupIcon: {
    marginBottom: 16
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8
  },
  setupDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8
  },
  benefitText: {
    fontSize: 15,
    color: '#374151'
  },
  setupButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%'
  },
  setupButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  poweredBy: {
    marginTop: 16,
    fontSize: 12,
    color: '#9CA3AF'
  },
  // Status Card (has account)
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600'
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16
  },
  bankName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    flex: 1
  },
  bankLast4: {
    fontSize: 15,
    color: '#6B7280'
  },
  featureStatus: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  featureText: {
    fontSize: 13,
    color: '#6B7280'
  },
  continueButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600'
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  dashboardButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500'
  },
  // Stats Card
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#33D39C'
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB'
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  viewHistoryText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500'
  },
  // Info Section
  infoSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16
  },
  infoNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  infoNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5'
  },
  infoContent: {
    flex: 1
  },
  infoItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  infoItemText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  // Fee Disclosure
  feeDisclosure: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10
  },
  feeText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18
  }
});

