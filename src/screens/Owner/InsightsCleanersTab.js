import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';

export default function InsightsCleanersTab({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cleaners, setCleaners] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedCleaner, setSelectedCleaner] = useState(null);
  const [cleanerReports, setCleanerReports] = useState([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [loadingInspections, setLoadingInspections] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchCleanerPerformance();
    }, [])
  );

  const fetchCleanerPerformance = async () => {
    try {
      setLoading(true);
      
      // Fetch cleaners
      const cleanersResponse = await api.get('/owner/cleaners');
      const cleanersList = cleanersResponse.data || [];
      
      // Fetch inspections to calculate stats (get more to be accurate)
      const inspectionsResponse = await api.get('/owner/inspections/recent?limit=500');
      const allInspections = inspectionsResponse.data || [];
      
      // Calculate stats for each cleaner from actual inspections
      // Only count COMPLETE inspections (not PROCESSING, FAILED, or REJECTED)
      const cleanersWithStats = cleanersList.map(cleaner => {
        const cleanerInspections = allInspections.filter(i => {
          // Must be by this cleaner
          if (i.creator?.id !== cleaner.id) return false;
          // Must be COMPLETE status only
          if (i.status !== 'COMPLETE') return false;
          // Must have a valid cleanliness score (means it was actually analyzed)
          if (i.cleanliness_score === null || i.cleanliness_score === undefined) return false;
          return true;
        });
        
        const totalInspections = cleanerInspections.length;
        const passedCount = cleanerInspections.filter(
          i => i.airbnb_grade_analysis?.guest_ready === true
        ).length;
        const failedCount = totalInspections - passedCount;
        const passRate = totalInspections > 0 
          ? Math.round((passedCount / totalInspections) * 100) 
          : 0;
        
        // Get recent inspections for this cleaner (for preview)
        const recentInspections = cleanerInspections.slice(0, 5);
        
        return {
          ...cleaner,
          totalInspections,
          passedCount,
          failedCount,
          passRate,
          recentInspections,
          avgScore: cleanerInspections.length > 0
            ? Math.round(
                cleanerInspections.reduce((sum, i) => sum + (i.cleanliness_score || 0), 0) / 
                cleanerInspections.length * 10
              ) / 10
            : null
        };
      });
      
      setCleaners(cleanersWithStats);
      
      // Calculate summary
      const totalCleaners = cleanersWithStats.length;
      const totalInspections = cleanersWithStats.reduce((sum, c) => sum + c.totalInspections, 0);
      const avgPassRate = totalCleaners > 0
        ? Math.round(cleanersWithStats.reduce((sum, c) => sum + c.passRate, 0) / totalCleaners)
        : 0;
      
      setSummary({
        totalCleaners,
        totalInspections,
        avgPassRate
      });
    } catch (error) {
      console.error('Error fetching cleaner performance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCleanerPerformance();
  };

  const openCleanerInspections = async (cleaner) => {
    setSelectedCleaner(cleaner);
    setCleanerReports([]);
    setLoadingInspections(true);
    setReportModalVisible(true);
    
    // Fetch ALL inspections for this cleaner
    try {
      const response = await api.get(`/owner/inspections/recent?limit=500`);
      const allInspections = response.data || [];
      // Same filter as stats: COMPLETE status with valid score
      const cleanerInspections = allInspections.filter(i => {
        if (i.creator?.id !== cleaner.id) return false;
        if (i.status !== 'COMPLETE') return false;
        if (i.cleanliness_score === null || i.cleanliness_score === undefined) return false;
        return true;
      });
      setCleanerReports(cleanerInspections);
    } catch (error) {
      console.error('Error fetching cleaner inspections:', error);
      // Fall back to pre-loaded data
      setCleanerReports(cleaner.recentInspections || []);
    } finally {
      setLoadingInspections(false);
    }
  };

  const openInspectionDetail = (inspection) => {
    // Navigate to inspection detail screen
    navigation.navigate('InspectionDetail', { inspectionId: inspection.id });
    setReportModalVisible(false);
  };

  const getPassRateColor = (rate) => {
    if (rate >= 90) return '#10B981';
    if (rate >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity
        style={styles.quickAction}
        onPress={() => navigation.navigate('PayCleaner')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.quickActionIcon}
        >
          <Ionicons name="wallet" size={20} color="#FFF" />
        </LinearGradient>
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>Pay Cleaner</Text>
          <Text style={styles.quickActionDesc}>Send payments</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickAction}
        onPress={() => navigation.navigate('PaymentHistory')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4A90E2', '#3D7FD9']}
          style={styles.quickActionIcon}
        >
          <Ionicons name="receipt" size={20} color="#FFF" />
        </LinearGradient>
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>Payment History</Text>
          <Text style={styles.quickActionDesc}>View transactions</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  const renderSummary = () => {
    if (!summary) return null;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Team Overview</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>{summary.totalCleaners}</Text>
            <Text style={styles.summaryStatLabel}>Cleaners</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: getPassRateColor(summary.avgPassRate) }]}>
              {summary.avgPassRate}%
            </Text>
            <Text style={styles.summaryStatLabel}>Avg Pass Rate</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>{summary.totalInspections || 0}</Text>
            <Text style={styles.summaryStatLabel}>Inspections</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCleanerCard = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.cleanerCard}
        onPress={() => openCleanerInspections(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cleanerHeader}>
          <View style={styles.cleanerAvatar}>
            <Text style={styles.avatarText}>
              {item.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.cleanerInfo}>
            <Text style={styles.cleanerName}>{item.name}</Text>
            <Text style={styles.cleanerEmail}>{item.email}</Text>
          </View>
          {item.avgScore && (
            <View style={styles.avgScoreBadge}>
              <Text style={styles.avgScoreText}>{item.avgScore}</Text>
              <Text style={styles.avgScoreLabel}>avg</Text>
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: getPassRateColor(item.passRate) }]}>
              {item.passRate || 0}%
            </Text>
            <Text style={styles.statLabel}>Pass Rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.totalInspections || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{item.passedCount || 0}</Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{item.failedCount || 0}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.viewReportsText}>View Inspections</Text>
          <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderInspectionsList = () => (
    <Modal
      visible={reportModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setReportModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setReportModalVisible(false)}>
            <Ionicons name="close" size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {selectedCleaner?.name}'s Inspections ({cleanerReports.length})
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {loadingInspections ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading inspections...</Text>
          </View>
        ) : (
          <FlatList
            data={cleanerReports}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.reportsListContent}
            renderItem={({ item }) => {
              const isGuestReady = item.airbnb_grade_analysis?.guest_ready;
              const score = item.cleanliness_score;
              const propertyName = item.unit?.property?.name || item.unit?.name || 'Property';
              const unitName = item.unit?.name || '';
              
              return (
                <TouchableOpacity 
                  style={styles.inspectionListItem}
                  onPress={() => openInspectionDetail(item)}
                >
                  <View style={styles.inspectionListLeft}>
                    <Text style={styles.inspectionPropertyName} numberOfLines={1}>
                      {propertyName}
                    </Text>
                    {unitName && propertyName !== unitName && (
                      <Text style={styles.inspectionUnitName}>{unitName}</Text>
                    )}
                    <Text style={styles.inspectionDate}>
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                  <View style={styles.inspectionListRight}>
                    {score != null && (
                      <Text style={[
                        styles.inspectionScore,
                        { color: score >= 7 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444' }
                      ]}>
                        {score.toFixed(1)}
                      </Text>
                    )}
                    <View style={[
                      styles.inspectionStatusBadge,
                      { backgroundColor: isGuestReady ? '#ECFDF5' : '#FEF2F2' }
                    ]}>
                      <Text style={[
                        styles.inspectionStatusText,
                        { color: isGuestReady ? '#10B981' : '#EF4444' }
                      ]}>
                        {isGuestReady ? 'Passed' : 'Failed'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyReports}>
                <Ionicons name="clipboard-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Inspections Yet</Text>
                <Text style={styles.emptyText}>
                  This cleaner hasn't completed any inspections
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cleaners}
        renderItem={renderCleanerCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {renderQuickActions()}
            {renderSummary()}
            {cleaners.length > 0 && (
              <Text style={styles.sectionHeaderText}>Cleaner Performance</Text>
            )}
          </>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color="#4A90E2" />
            </View>
            <Text style={styles.emptyTitle}>No Cleaners Yet</Text>
            <Text style={styles.emptyText}>
              Add cleaners to start tracking their performance
            </Text>
          </View>
        }
      />
      {renderInspectionsList()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  listContent: {
    paddingBottom: 20,
  },
  // Quick Actions
  quickActionsContainer: {
    padding: 16,
    gap: 10,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  quickActionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  // Cleaner Card
  cleanerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cleanerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cleanerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cleanerInfo: {
    flex: 1,
  },
  cleanerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cleanerEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  trendBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  issuesPreview: {
    marginBottom: 12,
  },
  issuesLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  issuesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  issueTag: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  issueTagText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewReportsText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: 4,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  reportsListContent: {
    padding: 16,
  },
  reportListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  // Inspection list styles
  inspectionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  inspectionListLeft: {
    flex: 1,
  },
  inspectionPropertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  inspectionUnitName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  inspectionDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  inspectionListRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  inspectionScore: {
    fontSize: 20,
    fontWeight: '700',
  },
  inspectionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  inspectionStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Avg score badge
  avgScoreBadge: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  avgScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  avgScoreLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  reportNumberBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  reportNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reportListStats: {
    flex: 1,
  },
  reportListRate: {
    fontSize: 18,
    fontWeight: '700',
  },
  reportListLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  reportListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  reportListDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyReports: {
    alignItems: 'center',
    padding: 40,
  },
  // Report Detail
  reportDetailContent: {
    flex: 1,
  },
  detailSummaryCard: {
    backgroundColor: '#F8FAFC',
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  detailSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  detailSummaryItem: {
    alignItems: 'center',
  },
  detailSummaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailSummaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  inspectionCounts: {
    flexDirection: 'row',
    gap: 10,
  },
  countItem: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  countValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  countLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  issueItem: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  issueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  issueBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  issueBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  issueCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  improvementItem: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  improvementArea: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  improvementTip: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});

