import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

const COLORS = {
  background: '#F1F5F9',
  card: '#FFFFFF',
  cardBorder: 'rgba(15, 23, 42, 0.08)',
  cardShadow: 'rgba(15, 23, 42, 0.08)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  accent: '#215EEA',
  accentSoft: '#EFF6FF',
  success: '#33D39C',
  successSoft: 'rgba(16, 185, 129, 0.08)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.08)',
  error: '#EF4444',
  errorSoft: 'rgba(239, 68, 68, 0.06)',
  divider: '#E2E8F0',
};

export default function PayCleanerScreen({ navigation, route }) {
  const { preselectedCleaner, inspectionId, propertyName } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [cleaners, setCleaners] = useState([]);
  const [selectedCleaner, setSelectedCleaner] = useState(preselectedCleaner || null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showCleanerPicker, setShowCleanerPicker] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchCleaners();
    fetchStats();
    
    if (propertyName) {
      setDescription(`Payment for cleaning at ${propertyName}`);
    }
  }, []);

  const fetchCleaners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/cleaners');
      setCleaners(response.data.cleaners || []);
      
      // If preselected, find and set the cleaner
      if (preselectedCleaner) {
        const found = response.data.cleaners.find(c => c.id === preselectedCleaner.id);
        if (found) setSelectedCleaner(found);
      }
    } catch (error) {
      console.error('Error fetching cleaners:', error);
      Alert.alert('Error', 'Failed to load cleaners');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/payments/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSendPayment = async () => {
    if (!selectedCleaner) {
      Alert.alert('Error', 'Please select a cleaner');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedCleaner.paymentAccount?.isActive) {
      Alert.alert(
        'Cannot Send Payment',
        `${selectedCleaner.name} has not set up their payment account yet. Ask them to link their bank account in the app.`
      );
      return;
    }

    // Calculate fee
    const platformFee = amountNum * 0.01;
    const netAmount = amountNum - platformFee;

    Alert.alert(
      'Confirm Payment',
      `Send $${amountNum.toFixed(2)} to ${selectedCleaner.name}?\n\nBreakdown:\n• Total: $${amountNum.toFixed(2)}\n• Platform fee (1%): $${platformFee.toFixed(2)}\n• ${selectedCleaner.name} receives: $${netAmount.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Payment', onPress: processPayment }
      ]
    );
  };

  const processPayment = async () => {
    try {
      setProcessing(true);

      const response = await api.post('/payments/send', {
        recipientId: selectedCleaner.id,
        amount: parseFloat(amount),
        description: description || `Payment to ${selectedCleaner.name}`,
        inspectionId: inspectionId || null,
        propertyName: propertyName || null
      });

      // For now, we'll mark as successful (in production, you'd use Stripe's Payment Element)
      // The clientSecret would be used with Stripe SDK to complete the payment
      
      Alert.alert(
        'Payment Initiated',
        `Payment of $${response.data.payment.amount.toFixed(2)} has been initiated to ${selectedCleaner.name}.`,
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      console.error('Error sending payment:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send payment');
    } finally {
      setProcessing(false);
    }
  };

  const renderCleanerOption = ({ item }) => {
    const isSelected = selectedCleaner?.id === item.id;
    const hasPaymentAccount = item.paymentAccount?.isActive;

    return (
      <TouchableOpacity
        style={[styles.cleanerOption, isSelected && styles.cleanerOptionSelected]}
        onPress={() => {
          setSelectedCleaner(item);
          setShowCleanerPicker(false);
        }}
      >
        <View style={styles.cleanerAvatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cleanerOptionInfo}>
          <Text style={styles.cleanerOptionName}>{item.name}</Text>
          <Text style={styles.cleanerOptionEmail}>{item.email}</Text>
          {!hasPaymentAccount && (
            <View style={styles.noBankBadge}>
              <Ionicons name="alert-circle" size={12} color="#F59E0B" />
              <Text style={styles.noBankText}>No bank linked</Text>
            </View>
          )}
        </View>
        {hasPaymentAccount && (
          <Ionicons name="checkmark-circle" size={24} color="#33D39C" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const amountNum = parseFloat(amount) || 0;
  const platformFee = amountNum * 0.01;
  const netAmount = amountNum - platformFee;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header Stats */}
        {stats?.sent && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${stats.sent.totalSent?.toFixed(0) || 0}</Text>
              <Text style={styles.statLabel}>Total Sent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.sent.paymentCount || 0}</Text>
              <Text style={styles.statLabel}>Payments</Text>
            </View>
          </View>
        )}

        {/* Select Cleaner */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pay To</Text>
          <TouchableOpacity
            style={styles.cleanerSelector}
            onPress={() => setShowCleanerPicker(true)}
          >
            {selectedCleaner ? (
              <View style={styles.selectedCleaner}>
                <View style={styles.cleanerAvatar}>
                  <Text style={styles.avatarText}>
                    {selectedCleaner.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.selectedCleanerInfo}>
                  <Text style={styles.selectedCleanerName}>{selectedCleaner.name}</Text>
                  <Text style={styles.selectedCleanerEmail}>{selectedCleaner.email}</Text>
                </View>
                {selectedCleaner.paymentAccount?.isActive ? (
                  <View style={styles.activeBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#33D39C" />
                    <Text style={styles.activeBadgeText}>Bank Linked</Text>
                  </View>
                ) : (
                  <View style={[styles.activeBadge, { backgroundColor: '#FEF3CD' }]}>
                    <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                    <Text style={[styles.activeBadgeText, { color: '#F59E0B' }]}>No Bank</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select a cleaner</Text>
            )}
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.quickAmounts}>
          {[25, 50, 75, 100, 150, 200].map(val => (
            <TouchableOpacity
              key={val}
              style={[styles.quickAmountBtn, amount === String(val) && styles.quickAmountBtnActive]}
              onPress={() => setAmount(String(val))}
            >
              <Text style={[styles.quickAmountText, amount === String(val) && styles.quickAmountTextActive]}>
                ${val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Note (Optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., Payment for December 5th cleaning"
            placeholderTextColor="#9CA3AF"
            multiline
          />
        </View>

        {/* Fee Breakdown */}
        {amountNum > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Amount</Text>
              <Text style={styles.breakdownValue}>${amountNum.toFixed(2)}</Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform Fee (1%)</Text>
              <Text style={styles.breakdownFee}>-${platformFee.toFixed(2)}</Text>
            </View>
            
            <View style={styles.breakdownDivider} />
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabelBold}>
                {selectedCleaner?.name || 'Cleaner'} receives
              </Text>
              <Text style={styles.breakdownValueBold}>${netAmount.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Send Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!selectedCleaner || !amountNum) && styles.sendButtonDisabled
          ]}
          onPress={handleSendPayment}
          disabled={processing || !selectedCleaner || !amountNum}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFF" />
              <Text style={styles.sendButtonText}>
                Send ${amountNum > 0 ? amountNum.toFixed(2) : '0.00'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Cleaner Picker Modal */}
      <Modal
        visible={showCleanerPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCleanerPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCleanerPicker(false)}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Cleaner</Text>
            <View style={{ width: 28 }} />
          </View>

          <FlatList
            data={cleaners}
            keyExtractor={item => item.id}
            renderItem={renderCleanerOption}
            contentContainerStyle={styles.cleanerList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Cleaners</Text>
                <Text style={styles.emptyText}>Add cleaners to your team first</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 100
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.divider
  },
  section: {
    marginBottom: 20
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8
  },
  cleanerSelector: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  selectedCleaner: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  cleanerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '700'
  },
  selectedCleanerInfo: {
    flex: 1
  },
  selectedCleanerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  selectedCleanerEmail: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.success
  },
  placeholderText: {
    fontSize: 16,
    color: COLORS.textMuted
  },
  amountInputContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: 8
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  quickAmountBtn: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder
  },
  quickAmountBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent
  },
  quickAmountText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary
  },
  quickAmountTextActive: {
    color: '#FFF'
  },
  descriptionInput: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  breakdownCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  breakdownLabel: {
    fontSize: 15,
    color: COLORS.textSecondary
  },
  breakdownValue: {
    fontSize: 15,
    color: COLORS.textPrimary
  },
  breakdownFee: {
    fontSize: 15,
    color: COLORS.error
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 8
  },
  breakdownLabelBold: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  breakdownValueBold: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider
  },
  sendButton: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB'
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600'
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  cleanerList: {
    padding: 16
  },
  cleanerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8
  },
  cleanerOptionSelected: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 2,
    borderColor: COLORS.accent
  },
  cleanerOptionInfo: {
    flex: 1,
    marginLeft: 12
  },
  cleanerOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary
  },
  cleanerOptionEmail: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  noBankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  noBankText: {
    fontSize: 12,
    color: '#F59E0B'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4
  }
});
