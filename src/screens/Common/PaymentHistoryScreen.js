import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';

export default function PaymentHistoryScreen({ navigation }) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'sent', 'received'

  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isCleaner = user?.role === 'CLEANER';

  useFocusEffect(
    useCallback(() => {
      fetchPayments();
      fetchStats();
    }, [filter])
  );

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payments/history?role=${filter}`);
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
    fetchStats();
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'SUCCEEDED':
        return { color: '#33D39C', bgColor: '#ECFDF5', icon: 'checkmark-circle', label: 'Completed' };
      case 'PROCESSING':
        return { color: '#F59E0B', bgColor: '#FFFBEB', icon: 'time', label: 'Processing' };
      case 'PENDING':
        return { color: '#215EEA', bgColor: '#EFF6FF', icon: 'hourglass', label: 'Pending' };
      case 'FAILED':
        return { color: '#EF4444', bgColor: '#FEF2F2', icon: 'close-circle', label: 'Failed' };
      case 'CANCELLED':
        return { color: '#6B7280', bgColor: '#F3F4F6', icon: 'ban', label: 'Cancelled' };
      case 'REFUNDED':
        return { color: '#8B5CF6', bgColor: '#F5F3FF', icon: 'return-down-back', label: 'Refunded' };
      default:
        return { color: '#6B7280', bgColor: '#F3F4F6', icon: 'help-circle', label: status };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderPaymentCard = ({ item }) => {
    const isSent = item.type === 'sent';
    const statusConfig = getStatusConfig(item.status);
    const otherParty = isSent ? item.recipient : item.sender;
    const displayAmount = isSent ? item.amount : item.netAmount;

    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.paymentIcon}>
            <Ionicons
              name={isSent ? 'arrow-up' : 'arrow-down'}
              size={20}
              color={isSent ? '#EF4444' : '#33D39C'}
            />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentParty}>
              {isSent ? `To ${otherParty?.name}` : `From ${otherParty?.name}`}
            </Text>
            <Text style={styles.paymentDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.paymentAmount}>
            <Text style={[styles.amountText, { color: isSent ? '#EF4444' : '#33D39C' }]}>
              {isSent ? '-' : '+'}${displayAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.paymentDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.paymentFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          {isSent && item.platformFee > 0 && (
            <Text style={styles.feeText}>
              Fee: ${item.platformFee.toFixed(2)}
            </Text>
          )}
        </View>

        {item.failureReason && (
          <View style={styles.failureReason}>
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.failureText}>{item.failureReason}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {isOwner && stats?.sent && (
          <View style={[styles.statsCard, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="arrow-up-circle" size={24} color="#EF4444" />
            <Text style={[styles.statsValue, { color: '#EF4444' }]}>
              ${stats.sent.totalSent?.toFixed(0) || 0}
            </Text>
            <Text style={styles.statsLabel}>Total Sent</Text>
          </View>
        )}

        {(isCleaner || isOwner) && stats?.received && (
          <View style={[styles.statsCard, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="arrow-down-circle" size={24} color="#33D39C" />
            <Text style={[styles.statsValue, { color: '#33D39C' }]}>
              ${stats.received.totalReceived?.toFixed(0) || 0}
            </Text>
            <Text style={styles.statsLabel}>Total Received</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      {isOwner && (
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'sender' && styles.filterTabActive]}
            onPress={() => setFilter('sender')}
          >
            <Text style={[styles.filterTabText, filter === 'sender' && styles.filterTabTextActive]}>
              Sent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'recipient' && styles.filterTabActive]}
            onPress={() => setFilter('recipient')}
          >
            <Text style={[styles.filterTabText, filter === 'recipient' && styles.filterTabTextActive]}>
              Received
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.listTitle}>Transaction History</Text>
    </View>
  );

  if (loading && payments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        keyExtractor={item => item.id}
        renderItem={renderPaymentCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Payments</Text>
            <Text style={styles.emptyText}>
              {isOwner
                ? 'Payments you send will appear here'
                : 'Payments you receive will appear here'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280'
  },
  listContent: {
    padding: 16
  },
  header: {
    marginBottom: 16
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8
  },
  statsLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  filterTabActive: {
    backgroundColor: '#4F46E5'
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280'
  },
  filterTabTextActive: {
    color: '#FFF'
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  paymentInfo: {
    flex: 1
  },
  paymentParty: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  paymentDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  paymentAmount: {
    alignItems: 'flex-end'
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700'
  },
  paymentDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  paymentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  feeText: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  failureReason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8
  },
  failureText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center'
  }
});

