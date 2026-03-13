import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { FEATURE_FLAGS } from '../../config/constants';
import { useDataStore } from '../../store/dataStore';
import colors from '../../theme/colors';

// Align with app theme (AssignCleanerScreen / PropertiesScreen)
const COLORS = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  cardBorder: 'rgba(0, 0, 0, 0.06)',
  cardShadow: 'rgba(0, 0, 0, 0.08)',
  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textMuted: '#8E8E93',
  accent: colors.primary?.main || '#0A84FF',
  accentSoft: 'rgba(10, 132, 255, 0.10)',
  success: '#34C759',
  successSoft: '#ECFDF5',
  warning: '#FF9500',
  warningSoft: '#FFFBEA',
  error: '#FF3B30',
  errorSoft: 'rgba(255, 59, 48, 0.10)',
  divider: '#E5E5EA',
};

// Extract stats computation so it can be used for both cached data and fresh fetches
function buildCleanerStats(cleanersList, allInspections) {
  return cleanersList.map(cleaner => {
    const assignmentsCount = cleaner._count?.assignments ?? cleaner.assignments?.length ?? 0;
    const cleanerInspections = allInspections.filter(i => {
      if (i.creator?.id !== cleaner.id) return false;
      if (i.status !== 'COMPLETE') return false;
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
    const recentInspections = cleanerInspections.slice(0, 5);

    return {
      ...cleaner,
      totalInspections,
      passedCount,
      failedCount,
      passRate,
      recentInspections,
      assignmentsCount,
      avgScore: cleanerInspections.length > 0
        ? Math.round(
          cleanerInspections.reduce((sum, i) => sum + (i.cleanliness_score || 0), 0) /
          cleanerInspections.length * 10
        ) / 10
        : null
    };
  });
}

function buildSummary(cleanersWithStats) {
  const totalCleaners = cleanersWithStats.length;
  const totalInspections = cleanersWithStats.reduce((sum, c) => sum + c.totalInspections, 0);
  const totalAssignments = cleanersWithStats.reduce(
    (sum, c) => sum + (c.assignmentsCount || 0),
    0
  );
  const avgPassRate = totalCleaners > 0
    ? Math.round(cleanersWithStats.reduce((sum, c) => sum + c.passRate, 0) / totalCleaners)
    : 0;
  return { totalCleaners, totalInspections, totalAssignments, avgPassRate };
}

export default function InsightsCleanersTab({ navigation }) {
  const cachedCleaners = useDataStore((s) => s.cleaners);
  const cachedInspections = useDataStore((s) => s.inspections);
  const cacheLoaded = useDataStore((s) => s.cleanersLoaded);
  const [loading, setLoading] = useState(!cacheLoaded);
  const [refreshing, setRefreshing] = useState(false);
  const [cleaners, setCleaners] = useState(() =>
    cacheLoaded ? buildCleanerStats(cachedCleaners, cachedInspections) : []
  );
  const [summary, setSummary] = useState(() =>
    cacheLoaded ? buildSummary(buildCleanerStats(cachedCleaners, cachedInspections)) : null
  );
  const [selectedCleaner, setSelectedCleaner] = useState(null);
  const [cleanerReports, setCleanerReports] = useState([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const hasLoadedOnce = useRef(cacheLoaded);

  useFocusEffect(
    useCallback(() => {
      fetchCleanerPerformance();
    }, [])
  );

  const fetchCleanerPerformance = async () => {
    try {
      // Only show loading spinner on the very first load when there's no cached data
      if (!hasLoadedOnce.current) {
        setLoading(true);
      }

      // Fetch cleaners and inspections in parallel for faster load
      const [cleanersResponse, inspectionsResult] = await Promise.all([
        api.get('/owner/cleaners'),
        api.get('/owner/inspections/recent?limit=100').catch(async (inspectionError) => {
          if (inspectionError.code === 'ECONNABORTED' || inspectionError.message?.includes('timeout')) {
            try {
              return await api.get('/owner/inspections/recent?limit=50');
            } catch (fallbackError) {
              return { data: [] };
            }
          }
          return { data: [] };
        }),
      ]);

      const cleanersList = cleanersResponse.data || [];
      let allInspections = inspectionsResult.data || [];

      // Update the cache for next time
      useDataStore.getState().setCleaners(cleanersList);
      useDataStore.getState().setInspections(allInspections);

      const cleanersWithStats = buildCleanerStats(cleanersList, allInspections);
      setCleaners(cleanersWithStats);
      setSummary(buildSummary(cleanersWithStats));
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('Error fetching cleaner performance:', error);
      // Only set empty state if we have no data at all
      if (!hasLoadedOnce.current) {
        setCleaners([]);
        setSummary({
          totalCleaners: 0,
          totalInspections: 0,
          totalAssignments: 0,
          avgPassRate: 0
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCleanerPerformance();
  };

  const openCleanerInspections = (cleaner) => {
    setSelectedCleaner(cleaner);
    // Show pre-loaded recent inspections immediately (instant open, no spinner)
    setCleanerReports(cleaner.recentInspections || []);
    setReportModalVisible(true);

    // Optionally load more in background (non-blocking)
    (async () => {
      try {
        const response = await api.get('/owner/inspections/recent?limit=100');
        const allInspections = response.data || [];
        const filtered = allInspections.filter(i => {
          if (i.creator?.id !== cleaner.id) return false;
          if (i.status !== 'COMPLETE') return false;
          if (i.cleanliness_score == null) return false;
          return true;
        });
        setCleanerReports(prev => (filtered.length > (cleaner.recentInspections?.length || 0) ? filtered : prev));
      } catch (e) {
        // Keep showing recentInspections on error
      }
    })();
  };

  const openInspectionDetail = (inspection) => {
    // Navigate to inspection detail screen
    navigation.navigate('InspectionDetail', { inspectionId: inspection.id });
    setReportModalVisible(false);
  };

  const getPassRateColor = (rate) => {
    if (rate >= 90) return COLORS.success;
    if (rate >= 70) return COLORS.accent;
    if (rate >= 50) return COLORS.warning;
    return COLORS.error;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderQuickActions = () => {
    if (!FEATURE_FLAGS.ENABLE_PAYMENTS) {
      return null;
    }

    return (
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('PayCleaner')}
          activeOpacity={0.8}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.successSoft }]}>
            <Ionicons name="wallet" size={20} color={COLORS.success} />
          </View>
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
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.accentSoft }]}>
            <Ionicons name="receipt" size={20} color={COLORS.accent} />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>Payment History</Text>
            <Text style={styles.quickActionDesc}>View transactions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    );
  };

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
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>{summary.totalAssignments || 0}</Text>
            <Text style={styles.summaryStatLabel}>Assignments</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCleanerCard = ({ item }) => {
    const assignmentCount = item.assignmentsCount ?? item._count?.assignments ?? (item.assignments?.length ?? 0);

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
          {item.avgScore != null && (
            <View style={styles.avgScoreBadge}>
              <Text style={styles.avgScoreText}>{item.avgScore}</Text>
              <Text style={styles.avgScoreLabel}>avg</Text>
            </View>
          )}
        </View>

        <View style={styles.assignmentsRow}>
          <View style={styles.assignmentPill}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.accent} />
            <Text style={styles.assignmentText}>
              {assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'}
            </Text>
          </View>
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
            <Text style={[styles.statValue, { color: COLORS.success }]}>{item.passedCount || 0}</Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: COLORS.error }]}>{item.failedCount || 0}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.viewReportsText}>View Inspections</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
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
        <SafeAreaView style={styles.modalHeaderPlain}>
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity
              onPress={() => setReportModalVisible(false)}
              style={styles.modalBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalHeaderIconWrap}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitlePlain} numberOfLines={1}>
                  {selectedCleaner?.name}'s Inspections
                </Text>
                <Text style={styles.modalSubtitlePlain}>
                  {cleanerReports.length} {cleanerReports.length === 1 ? 'inspection' : 'inspections'}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

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
                style={[
                  styles.inspectionListItem,
                  isGuestReady && styles.inspectionListItemPassed,
                ]}
                onPress={() => openInspectionDetail(item)}
                activeOpacity={0.7}
              >
                <View style={styles.inspectionListLeft}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={styles.inspectionPropertyIconWrap}>
                      <Ionicons name="home-outline" size={16} color={COLORS.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inspectionPropertyName} numberOfLines={1}>
                        {propertyName}
                      </Text>
                      {unitName && propertyName !== unitName && (
                        <Text style={styles.inspectionUnitName}>{unitName}</Text>
                      )}
                      <View style={styles.inspectionDateRow}>
                        <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.inspectionDate}>
                          {formatDate(item.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.inspectionListRight}>
                  <View style={[
                    styles.inspectionStatusBadge,
                    { backgroundColor: isGuestReady ? COLORS.successSoft : COLORS.errorSoft }
                  ]}>
                    <Text style={[
                      styles.inspectionStatusText,
                      { color: isGuestReady ? COLORS.success : COLORS.error }
                    ]}>
                      {isGuestReady ? 'Passed' : 'Failed'}
                    </Text>
                  </View>
                  {score != null && (
                    <View style={[
                      styles.inspectionScoreWrap,
                      score >= 7 ? styles.inspectionScoreWrapBlue :
                        score >= 5 ? styles.inspectionScoreWrapWarning :
                          styles.inspectionScoreWrapError
                    ]}
                    >
                      <Ionicons
                        name="star"
                        size={12}
                        color={score >= 7 ? COLORS.accent : score >= 5 ? COLORS.warning : COLORS.error}
                      />
                      <Text style={[
                        styles.inspectionScore,
                        { color: score >= 7 ? COLORS.accent : score >= 5 ? COLORS.warning : COLORS.error }
                      ]}>
                        {score.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.inspectionChevronWrap}>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyReports}>
              <View style={styles.emptyReportsIconWrap}>
                <Ionicons name="clipboard-outline" size={40} color={COLORS.accent} />
              </View>
              <Text style={styles.emptyTitle}>No Inspections Yet</Text>
              <Text style={styles.emptyText}>
                This cleaner hasn't completed any inspections
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color={COLORS.accent} />
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
    backgroundColor: COLORS.background,
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
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingBottom: 20,
  },
  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
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
    color: COLORS.textPrimary,
  },
  quickActionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
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
    color: COLORS.textSecondary,
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
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  summaryStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.divider,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  // Cleaner Card
  cleanerCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
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
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  cleanerInfo: {
    flex: 1,
  },
  cleanerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cleanerEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  assignmentsRow: {
    marginBottom: 12,
  },
  assignmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  assignmentText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
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
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  issuesPreview: {
    marginBottom: 12,
  },
  issuesLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  issuesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  issueTag: {
    backgroundColor: COLORS.errorSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  issueTagText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  viewReportsText: {
    fontSize: 14,
    color: COLORS.accent,
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
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Modal Styles (plain header, blue accents in content)
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeaderPlain: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalBackButton: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTextWrap: {
    flex: 1,
  },
  modalTitlePlain: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  modalSubtitlePlain: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'left',
  },
  reportsListContent: {
    padding: 16,
    paddingBottom: 24,
  },
  // Inspection list styles (thin blue border like PropertyDetailScreen, content aligned)
  inspectionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  inspectionListItemPassed: {
    borderColor: '#E0E7FF',
  },
  inspectionListLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  inspectionPropertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inspectionPropertyIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inspectionPropertyName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inspectionUnitName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inspectionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  inspectionDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  inspectionListRight: {
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  inspectionScoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inspectionScoreWrapBlue: {
    backgroundColor: COLORS.accentSoft,
  },
  inspectionScoreWrapWarning: {
    backgroundColor: COLORS.warningSoft,
  },
  inspectionScoreWrapError: {
    backgroundColor: COLORS.errorSoft,
  },
  inspectionScore: {
    fontSize: 14, // Reduced from 20
    fontWeight: '700',
  },
  inspectionChevronWrap: {
    paddingLeft: 4,
  },
  inspectionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 2, // Add some spacing below status
  },
  inspectionStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Avg score badge
  avgScoreBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  avgScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
  avgScoreLabel: {
    fontSize: 10,
    color: COLORS.accent,
  },
  reportNumberBadge: {
    backgroundColor: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
  },
  reportListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  reportListDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  emptyReports: {
    alignItems: 'center',
    padding: 40,
  },
  emptyReportsIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Report Detail
  reportDetailContent: {
    flex: 1,
  },
  detailSummaryCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
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
    color: COLORS.textPrimary,
  },
  detailSummaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  inspectionCounts: {
    flexDirection: 'row',
    gap: 10,
  },
  countItem: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  countValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  countLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
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
    color: COLORS.textPrimary,
  },
  feedbackText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  issueItem: {
    backgroundColor: COLORS.errorSoft,
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
    color: COLORS.textPrimary,
    flex: 1,
  },
  issueBadge: {
    backgroundColor: COLORS.error,
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
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  improvementItem: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  improvementArea: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  improvementTip: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
