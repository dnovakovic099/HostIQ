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
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';

export default function CleanerPerformanceScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cleaners, setCleaners] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedCleaner, setSelectedCleaner] = useState(null);
  const [cleanerReports, setCleanerReports] = useState([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchCleanerPerformance();
    }, [])
  );

  const fetchCleanerPerformance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/owner/cleaners/performance');
      setCleaners(response.data.cleaners || []);
      setSummary(response.data.summary || null);
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

  const openCleanerReports = async (cleaner) => {
    try {
      setSelectedCleaner(cleaner);
      const response = await api.get(`/owner/cleaners/${cleaner.id}/reports`);
      setCleanerReports(response.data.reports || []);
      setReportModalVisible(true);
    } catch (error) {
      console.error('Error fetching cleaner reports:', error);
    }
  };

  const openReportDetail = async (report) => {
    try {
      const response = await api.get(`/owner/cleaners/${selectedCleaner.id}/reports/${report.id}`);
      setSelectedReport(response.data.report);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('Error fetching report detail:', error);
    }
  };

  const getPassRateColor = (rate) => {
    if (rate >= 90) return '#10B981';
    if (rate >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return { name: 'trending-up', color: '#10B981' };
      case 'declining': return { name: 'trending-down', color: '#EF4444' };
      default: return { name: 'remove', color: '#6B7280' };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderCleanerCard = ({ item }) => {
    const trendInfo = item.latestReport ? getTrendIcon(item.latestReport.trend) : null;

    return (
      <TouchableOpacity 
        style={styles.cleanerCard}
        onPress={() => openCleanerReports(item)}
      >
        <View style={styles.cleanerHeader}>
          <View style={styles.cleanerAvatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cleanerInfo}>
            <Text style={styles.cleanerName}>{item.name}</Text>
            <Text style={styles.cleanerEmail}>{item.email}</Text>
          </View>
          {trendInfo && (
            <Ionicons name={trendInfo.name} size={24} color={trendInfo.color} />
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: getPassRateColor(item.passRate) }]}>
              {item.passRate || 0}%
            </Text>
            <Text style={styles.statLabel}>Pass Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.totalInspections || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{item.passedCount || 0}</Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{item.failedCount || 0}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        {item.latestReport && item.latestReport.commonIssues?.length > 0 && (
          <View style={styles.commonIssuesPreview}>
            <Text style={styles.issuesLabel}>Common Issues:</Text>
            <View style={styles.issuesTags}>
              {item.latestReport.commonIssues.slice(0, 2).map((issue, idx) => (
                <View key={idx} style={styles.issueTag}>
                  <Text style={styles.issueTagText}>{issue.issue}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.viewReportsText}>View Reports</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderReportsList = () => (
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
            {selectedCleaner?.name}'s Reports
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <FlatList
          data={cleanerReports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.reportsListContent}
          renderItem={({ item }) => {
            const trendInfo = getTrendIcon(item.trendDirection);
            return (
              <TouchableOpacity 
                style={styles.reportListItem}
                onPress={() => openReportDetail(item)}
              >
                <View style={styles.reportListHeader}>
                  <View style={styles.reportNumberBadge}>
                    <Text style={styles.reportNumberText}>#{item.reportNumber}</Text>
                  </View>
                  <Ionicons name={trendInfo.name} size={18} color={trendInfo.color} />
                </View>
                <View style={styles.reportListStats}>
                  <Text style={[styles.reportListRate, { color: getPassRateColor(item.passRate) }]}>
                    {item.passRate}%
                  </Text>
                  <Text style={styles.reportListLabel}>pass rate</Text>
                </View>
                <Text style={styles.reportListDate}>
                  {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.reportListChevron} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyReports}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Reports Yet</Text>
              <Text style={styles.emptyText}>
                Reports are generated every 5 inspections
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );

  const renderReportDetail = () => {
    if (!selectedReport) return null;

    const trendInfo = getTrendIcon(selectedReport.trendDirection);

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="arrow-back" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report #{selectedReport.reportNumber}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.reportDetailContent} showsVerticalScrollIndicator={false}>
            {/* Summary Stats */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: getPassRateColor(selectedReport.passRate) }]}>
                    {selectedReport.passRate}%
                  </Text>
                  <Text style={styles.summaryLabel}>Pass Rate</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{selectedReport.avgScore?.toFixed(1) || '—'}</Text>
                  <Text style={styles.summaryLabel}>Avg Score</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name={trendInfo.name} size={28} color={trendInfo.color} />
                  <Text style={styles.summaryLabel}>{selectedReport.trendDirection || 'Stable'}</Text>
                </View>
              </View>

              <View style={styles.inspectionCounts}>
                <View style={styles.countItem}>
                  <Text style={styles.countValue}>{selectedReport.inspectionCount}</Text>
                  <Text style={styles.countLabel}>Total</Text>
                </View>
                <View style={[styles.countItem, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[styles.countValue, { color: '#10B981' }]}>{selectedReport.passedCount}</Text>
                  <Text style={styles.countLabel}>Passed</Text>
                </View>
                <View style={[styles.countItem, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={[styles.countValue, { color: '#EF4444' }]}>{selectedReport.failedCount}</Text>
                  <Text style={styles.countLabel}>Failed</Text>
                </View>
              </View>
            </View>

            {/* AI Feedback */}
            {selectedReport.aiFeedback && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bulb" size={20} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>AI Feedback</Text>
                </View>
                <Text style={styles.feedbackText}>{selectedReport.aiFeedback}</Text>
              </View>
            )}

            {/* Common Issues */}
            {selectedReport.commonIssues && selectedReport.commonIssues.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text style={styles.sectionTitle}>Common Issues</Text>
                </View>
                {selectedReport.commonIssues.slice(0, 5).map((issue, index) => (
                  <View key={index} style={styles.issueItem}>
                    <View style={styles.issueItemHeader}>
                      <Text style={styles.issueItemText}>{issue.issue}</Text>
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
                  <Ionicons name="pie-chart" size={20} color="#6B7280" />
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

            {/* Improvements */}
            {selectedReport.improvements && selectedReport.improvements.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="trending-up" size={20} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Suggested Improvements</Text>
                </View>
                {selectedReport.improvements.map((improvement, index) => (
                  <View key={index} style={styles.improvementItem}>
                    <Text style={styles.improvementArea}>{improvement.area}</Text>
                    <Text style={styles.improvementTip}>{improvement.tip}</Text>
                  </View>
                ))}
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
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading cleaner performance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      {summary && (
        <View style={styles.summaryHeader}>
          <Text style={styles.headerTitle}>Team Performance</Text>
          <View style={styles.teamStats}>
            <View style={styles.teamStatItem}>
              <Text style={styles.teamStatValue}>{summary.totalCleaners}</Text>
              <Text style={styles.teamStatLabel}>Cleaners</Text>
            </View>
            <View style={styles.teamStatItem}>
              <Text style={[styles.teamStatValue, { color: getPassRateColor(summary.avgPassRate) }]}>
                {summary.avgPassRate}%
              </Text>
              <Text style={styles.teamStatLabel}>Avg Pass Rate</Text>
            </View>
          </View>
        </View>
      )}

      {/* Cleaners List */}
      <FlatList
        data={cleaners}
        renderItem={renderCleanerCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Cleaners</Text>
            <Text style={styles.emptyText}>
              Add cleaners to start tracking their performance
            </Text>
          </View>
        }
      />

      {renderReportsList()}
      {renderReportDetail()}
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
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280'
  },
  summaryHeader: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16
  },
  teamStats: {
    flexDirection: 'row',
    gap: 16
  },
  teamStatItem: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  teamStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937'
  },
  teamStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  listContent: {
    padding: 16
  },
  cleanerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  cleanerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  cleanerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700'
  },
  cleanerInfo: {
    flex: 1
  },
  cleanerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  cleanerEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937'
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB'
  },
  commonIssuesPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  issuesLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8
  },
  issuesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  issueTag: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  issueTagText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500'
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  viewReportsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 4
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
    textAlign: 'center',
    marginTop: 8
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  reportsListContent: {
    padding: 16
  },
  reportListItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  reportListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  reportNumberBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  reportNumberText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700'
  },
  reportListStats: {
    flex: 1,
    alignItems: 'center'
  },
  reportListRate: {
    fontSize: 20,
    fontWeight: '700'
  },
  reportListLabel: {
    fontSize: 11,
    color: '#6B7280'
  },
  reportListDate: {
    fontSize: 11,
    color: '#9CA3AF'
  },
  reportListChevron: {
    marginLeft: 8
  },
  emptyReports: {
    alignItems: 'center',
    padding: 40
  },
  // Report Detail Styles
  reportDetailContent: {
    flex: 1
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    margin: 16,
    padding: 20,
    borderRadius: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  summaryItem: {
    alignItems: 'center'
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937'
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  inspectionCounts: {
    flexDirection: 'row',
    gap: 12
  },
  countItem: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  countValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937'
  },
  countLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  feedbackText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22
  },
  issueItem: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  issueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  issueItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1
  },
  issueBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  issueBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600'
  },
  issueCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'capitalize'
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  categoryItem: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  categoryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937'
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  improvementItem: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  improvementArea: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  improvementTip: {
    fontSize: 13,
    color: '#6B7280'
  },
  bottomPadding: {
    height: 40
  }
});

