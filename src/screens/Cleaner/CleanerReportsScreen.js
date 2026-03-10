import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import colors, { getPassRateColor } from '../../theme/colors';

// Helper for trend icons
const getTrendIcon = (trend) => {
  switch (trend) {
    case 'improving': return { name: 'trending-up', color: colors.status.success };
    case 'declining': return { name: 'trending-down', color: colors.status.error };
    default: return { name: 'remove', color: colors.text.tertiary };
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Separated Report Card Component to prevent re-renders
const ReportCard = React.memo(({ item, onPress }) => {
  const trendInfo = getTrendIcon(item.trendDirection);
  const isUnread = !item.viewedByCleaner;

  return (
    <TouchableOpacity
      style={[styles.reportCard, isUnread && styles.unreadCard]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportNumberContainer}>
          <View style={styles.reportIconBg}>
            <Ionicons name="document-text" size={16} color={colors.primary.main} />
          </View>
          <Text style={styles.reportNumberText}>Report #{item.reportNumber}</Text>
        </View>

        {isUnread && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

        <View style={styles.trendBadge}>
          <Ionicons name={trendInfo.name} size={16} color={trendInfo.color} />
        </View>
      </View>

      <View style={styles.reportStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: getPassRateColor(item.passRate) }]}>
            {item.passRate}%
          </Text>
          <Text style={styles.statLabel}>Pass Rate</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.status.success }]}>{item.passedCount}</Text>
          <Text style={styles.statLabel}>Passed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.status.error }]}>{item.failedCount}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      <Text style={styles.reportPeriod}>
        {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
      </Text>

      {item.aiFeedback && (
        <View style={styles.feedbackPreviewContainer}>
          <Text style={styles.feedbackPreview} numberOfLines={2}>
            "{item.aiFeedback}"
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsText}>View Analysis</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary.main} />
      </View>
    </TouchableOpacity>
  );
});

export default function CleanerReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [performance, setPerformance] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch performance summary and reports in parallel
      const [perfResponse, reportsResponse] = await Promise.all([
        api.get('/cleaner/performance'),
        api.get('/cleaner/reports')
      ]);

      setPerformance(perfResponse.data);
      setReports(reportsResponse.data.reports || []);
    } catch (error) {
      console.error('Error fetching cleaner data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openReport = useCallback(async (report) => {
    try {
      // First show the report immediately with existing data
      setSelectedReport(report);
      setModalVisible(true);

      // Fetch full details in background
      const response = await api.get(`/cleaner/reports/${report.id}`);
      setSelectedReport(response.data.report);

      // Update the reports list to show this one as viewed
      setReports(prev => prev.map(r =>
        r.id === report.id ? { ...r, viewedByCleaner: true } : r
      ));

      // Update unread count
      if (performance?.unreadReports > 0 && !report.viewedByCleaner) {
        setPerformance(prev => ({
          ...prev,
          unreadReports: Math.max(0, prev.unreadReports - 1)
        }));
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  }, [performance]);

  const renderReportItem = useCallback(({ item }) => (
    <ReportCard item={item} onPress={openReport} />
  ), [openReport]);

  const renderReportModal = () => {
    if (!selectedReport) return null;

    const trendInfo = getTrendIcon(selectedReport.trendDirection);

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalHeaderClose}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.modalHeaderTitleContainer}>
              <Text style={styles.modalTitle}>Report Analysis</Text>

            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Summary Stats */}
            <View style={styles.modalSummaryCard}>
              <View style={styles.modalSummaryTop}>
                <View style={styles.modalScoreContainer}>
                  <Text style={[styles.modalScoreValue, { color: getPassRateColor(selectedReport.passRate) }]}>
                    {selectedReport.passRate}%
                  </Text>
                  <Text style={styles.modalScoreLabel}>Pass Rate</Text>
                </View>

                <View style={{ height: 40, width: 1, backgroundColor: colors.border.light }} />

                <View style={{ alignItems: 'center' }}>
                  <View style={[styles.modalTrendContainer, { backgroundColor: trendInfo.color + '15' }]}>
                    <Ionicons name={trendInfo.name} size={16} color={trendInfo.color} />
                    <Text style={[styles.modalTrendText, { color: trendInfo.color }]}>
                      {selectedReport.trendDirection || 'Stable'}
                    </Text>
                  </View>
                  <Text style={styles.modalScoreLabel}>Trend</Text>
                </View>

                <View style={{ height: 40, width: 1, backgroundColor: colors.border.light }} />

                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.modalScoreValue}>{selectedReport.inspectionCount}</Text>
                  <Text style={styles.modalScoreLabel}>Total</Text>
                </View>
              </View>

              <View style={styles.inspectionCounts}>
                <View style={[styles.countItem, { backgroundColor: colors.accent.successLight }]}>
                  <Text style={[styles.countValue, { color: colors.status.success }]}>{selectedReport.passedCount}</Text>
                  <Text style={styles.countLabel}>Passed</Text>
                </View>
                <View style={[styles.countItem, { backgroundColor: colors.accent.errorLight }]}>
                  <Text style={[styles.countValue, { color: colors.status.error }]}>{selectedReport.failedCount}</Text>
                  <Text style={styles.countLabel}>Failed</Text>
                </View>
              </View>
            </View>

            {/* AI Feedback */}
            {selectedReport.aiFeedback && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="bulb" size={18} color="#D97706" />
                  </View>
                  <Text style={styles.sectionTitle}>Performance Insight</Text>
                </View>
                <Text style={styles.feedbackText}>{selectedReport.aiFeedback}</Text>
              </View>
            )}

            {/* Strengths */}
            {selectedReport.strengths && selectedReport.strengths.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.accent.successLight }]}>
                    <Ionicons name="star" size={18} color={colors.status.success} />
                  </View>
                  <Text style={styles.sectionTitle}>Key Strengths</Text>
                </View>
                <View style={styles.listContainer}>
                  {selectedReport.strengths.map((strength, index) => (
                    <View key={index} style={styles.listItem}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.status.success} />
                      <Text style={styles.listItemText}>{strength}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Areas for Improvement */}
            {selectedReport.improvements && selectedReport.improvements.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.accent.blueLight }]}>
                    <Ionicons name="trending-up" size={18} color={colors.accent.blue} />
                  </View>
                  <Text style={styles.sectionTitle}>Focus Areas</Text>
                </View>
                {selectedReport.improvements.map((improvement, index) => (
                  <View key={index} style={styles.improvementItem}>
                    <Text style={styles.improvementArea}>{improvement.area}</Text>
                    <Text style={styles.improvementTip}>{improvement.tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Common Issues */}
            {selectedReport.commonIssues && selectedReport.commonIssues.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.accent.errorLight }]}>
                    <Ionicons name="alert-circle" size={18} color={colors.status.error} />
                  </View>
                  <Text style={styles.sectionTitle}>Common Issues</Text>
                </View>
                {selectedReport.commonIssues.slice(0, 5).map((issue, index) => (
                  <View key={index} style={styles.issueItem}>
                    <View style={styles.issueHeader}>
                      <Text style={styles.issueText}>{issue.issue}</Text>
                      <View style={styles.issueBadge}>
                        <Text style={styles.issueBadgeText}>{issue.count}x</Text>
                      </View>
                    </View>
                    <Text style={styles.issueCategory}>{issue.category}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Category Breakdown */}
            {selectedReport.categoryFailures && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.accent.blueLight }]}>
                    <Ionicons name="pie-chart" size={18} color={colors.primary.main} />
                  </View>
                  <Text style={styles.sectionTitle}>Failure Categories</Text>
                </View>
                <View style={styles.categoryGrid}>
                  <View style={styles.categoryItem}>
                    <Text style={styles.categoryValue}>{selectedReport.categoryFailures.cleanliness || 0}</Text>
                    <Text style={styles.categoryLabel}>Cleanliness</Text>
                  </View>
                  <View style={styles.categoryItem}>
                    <Text style={styles.categoryValue}>{selectedReport.categoryFailures.instructions || 0}</Text>
                    <Text style={styles.categoryLabel}>Instructions</Text>
                  </View>
                  <View style={styles.categoryItem}>
                    <Text style={styles.categoryValue}>{selectedReport.categoryFailures.coverage || 0}</Text>
                    <Text style={styles.categoryLabel}>Coverage</Text>
                  </View>
                  <View style={styles.categoryItem}>
                    <Text style={styles.categoryValue}>{selectedReport.categoryFailures.damage || 0}</Text>
                    <Text style={styles.categoryLabel}>Damage</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Trend Note */}
            {selectedReport.trendNote && (
              <View style={[styles.section, styles.trendSection]}>
                <Ionicons name={trendInfo.name} size={24} color={trendInfo.color} />
                <Text style={styles.trendNote}>{selectedReport.trendNote}</Text>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Gradient Header */}
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, { paddingTop: insets.top }]}
      >
        <View style={styles.headerGradient}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerIconWrapper}>
            <View style={styles.headerIconInner}>
              <Ionicons name="document-text" size={22} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>My Reports</Text>
            <Text style={styles.headerSubtitle}>Performance analysis & trends</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Performance Summary */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryTitleRow}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          {performance?.unreadReports > 0 && (
            <View style={styles.unreadCountBadge}>
              <Text style={styles.unreadCountText}>{performance.unreadReports} new</Text>
            </View>
          )}
        </View>

        <View style={styles.overallStats}>
          <View style={styles.overallStatItem}>
            <Text style={[styles.overallStatValue, { color: getPassRateColor(performance?.allTime?.passRate || 0) }]}>
              {performance?.allTime?.passRate || 0}%
            </Text>
            <Text style={styles.overallStatLabel}>All-Time Pass Rate</Text>
          </View>
          <View style={styles.overallStatDivider} />
          <View style={styles.overallStatItem}>
            <Text style={styles.overallStatValue}>{performance?.allTime?.totalInspections || 0}</Text>
            <Text style={styles.overallStatLabel}>Total Inspections</Text>
          </View>
        </View>

        {performance?.inspectionsUntilNextReport > 0 && (
          <View style={styles.nextReportBanner}>
            <LinearGradient
              colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)']}
              style={styles.nextReportContent}
            >
              <Ionicons name="information-circle" size={18} color={colors.primary.main} />
              <Text style={styles.nextReportText}>
                <Text style={{ fontWeight: '700', color: colors.primary.main }}>
                  {performance.inspectionsUntilNextReport} more inspection{performance.inspectionsUntilNextReport !== 1 ? 's' : ''}
                </Text> until your next report
              </Text>
            </LinearGradient>
          </View>
        )}
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={48} color={colors.primary.main} />
            </View>
            <Text style={styles.emptyTitle}>No Reports Yet</Text>
            <Text style={styles.emptyText}>
              Reports are generated every 5 inspections. Keep up the good work!
            </Text>
          </View>
        }
      />

      {renderReportModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
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
    color: colors.text.secondary
  },
  // Gradient Header Styles
  headerWrapper: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 14,
  },
  headerBackButton: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconWrapper: {
    marginRight: 12,
  },
  headerIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.85,
  },
  // Summary Header
  summaryHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.text.secondary,
  },
  unreadCountBadge: {
    backgroundColor: colors.status.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  overallStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
  },
  overallStatItem: {
    flex: 1,
    alignItems: 'center'
  },
  overallStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary
  },
  overallStatLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overallStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
  nextReportBanner: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.primary.lighter + '40', // Very light blue
    borderWidth: 1,
    borderColor: colors.primary.lighter,
  },
  nextReportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  nextReportText: {
    fontSize: 13,
    color: colors.text.secondary,
    flex: 1,
  },
  listContent: {
    padding: 16
  },
  // Report Card
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow.card,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.main,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reportNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  newBadge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  trendBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  reportStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border.light
  },
  reportPeriod: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackPreviewContainer: {
    backgroundColor: colors.background.lightYellow,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  feedbackPreview: {
    fontSize: 13,
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.main,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalHeaderClose: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: colors.background.primary,
  },
  modalHeaderTitleContainer: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow.card,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  modalSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalScoreContainer: {
    alignItems: 'flex-start',
  },
  modalScoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalScoreLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  modalTrendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  modalTrendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inspectionCounts: {
    flexDirection: 'row',
    gap: 10,
  },
  countItem: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  countValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  countLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.primary,
  },
  listItemText: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 20,
  },
  improvementItem: {
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  improvementArea: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  improvementTip: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  issueItem: {
    backgroundColor: colors.status.errorLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  issueText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  issueBadge: {
    backgroundColor: colors.status.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  issueBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  issueCategory: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary.lighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center'
  },
  bottomPadding: {
    height: 40,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  categoryItem: {
    width: '48%',
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  categoryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary
  },
  categoryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4
  },
  trendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background.primary,
  },
  trendNote: {
    flex: 1,
    fontSize: 14,
    color: '#374151'
  },
  bottomPadding: {
    height: 40
  }
});

