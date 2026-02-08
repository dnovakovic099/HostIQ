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
import colors from '../../theme/colors';

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

  const openReport = async (report) => {
    try {
      // Fetch full report details and mark as viewed
      const response = await api.get(`/cleaner/reports/${report.id}`);
      setSelectedReport(response.data.report);
      setModalVisible(true);
      
      // Update the reports list to show this one as viewed
      setReports(prev => prev.map(r => 
        r.id === report.id ? { ...r, viewedByCleaner: true } : r
      ));
      
      // Update unread count
      if (performance?.unreadReports > 0) {
        setPerformance(prev => ({
          ...prev,
          unreadReports: prev.unreadReports - 1
        }));
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return { name: 'trending-up', color: '#33D39C' };
      case 'declining': return { name: 'trending-down', color: '#EF4444' };
      default: return { name: 'remove', color: '#6B7280' };
    }
  };

  const getPassRateColor = (rate) => {
    if (rate >= 90) return '#33D39C';
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

  const renderReportCard = ({ item }) => {
    const trendInfo = getTrendIcon(item.trendDirection);
    const isUnread = !item.viewedByCleaner;

    return (
      <TouchableOpacity 
        style={[styles.reportCard, isUnread && styles.unreadCard]}
        onPress={() => openReport(item)}
      >
        <View style={styles.reportHeader}>
          <View style={styles.reportNumberBadge}>
            <Text style={styles.reportNumberText}>#{item.reportNumber}</Text>
          </View>
          {isUnread && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          <Ionicons name={trendInfo.name} size={20} color={trendInfo.color} />
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
            <Text style={styles.statValue}>{item.passedCount}</Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{item.failedCount}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        <Text style={styles.reportPeriod}>
          {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
        </Text>

        {item.aiFeedback && (
          <Text style={styles.feedbackPreview} numberOfLines={2}>
            {item.aiFeedback}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

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
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report #{selectedReport.reportNumber}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
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
                  <Text style={[styles.countValue, { color: '#33D39C' }]}>{selectedReport.passedCount}</Text>
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
                  <Text style={styles.sectionTitle}>Personalized Feedback</Text>
                </View>
                <Text style={styles.feedbackText}>{selectedReport.aiFeedback}</Text>
              </View>
            )}

            {/* Strengths */}
            {selectedReport.strengths && selectedReport.strengths.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="star" size={20} color="#33D39C" />
                  <Text style={styles.sectionTitle}>Strengths</Text>
                </View>
                {selectedReport.strengths.map((strength, index) => (
                  <View key={index} style={styles.listItem}>
                    <Ionicons name="checkmark-circle" size={18} color="#33D39C" />
                    <Text style={styles.listItemText}>{strength}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Areas for Improvement */}
            {selectedReport.improvements && selectedReport.improvements.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="trending-up" size={20} color="#215EEA" />
                  <Text style={styles.sectionTitle}>Areas for Improvement</Text>
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
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
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
        <ActivityIndicator size="large" color="#215EEA" />
        <Text style={styles.loadingText}>Loading your reports...</Text>
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
        style={[styles.headerGradient, Platform.OS === 'android' && { paddingTop: insets.top }]}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="document-text" size={24} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>My Reports</Text>
              <Text style={styles.headerSubtitle}>Track your performance</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Performance Summary */}
      <View style={styles.summaryHeader}>
        <Text style={styles.sectionTitle}>Your Performance</Text>
        
        <View style={styles.overallStats}>
          <View style={styles.overallStatItem}>
            <Text style={[styles.overallStatValue, { color: getPassRateColor(performance?.allTime?.passRate || 0) }]}>
              {performance?.allTime?.passRate || 0}%
            </Text>
            <Text style={styles.overallStatLabel}>All-Time Pass Rate</Text>
          </View>
          <View style={styles.overallStatItem}>
            <Text style={styles.overallStatValue}>{performance?.allTime?.totalInspections || 0}</Text>
            <Text style={styles.overallStatLabel}>Total Inspections</Text>
          </View>
        </View>

        {performance?.inspectionsUntilNextReport && (
          <View style={styles.nextReportBanner}>
            <Ionicons name="document-text-outline" size={18} color="#6B7280" />
            <Text style={styles.nextReportText}>
              {performance.inspectionsUntilNextReport} inspection{performance.inspectionsUntilNextReport !== 1 ? 's' : ''} until next report
            </Text>
          </View>
        )}
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Performance Reports</Text>
            {performance?.unreadReports > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{performance.unreadReports} new</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Reports Yet</Text>
            <Text style={styles.emptyText}>
              Reports are generated every 5 inspections. Keep cleaning to get your first report!
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
  // Gradient Header Styles
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIconWrapper: {
    marginRight: 12,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  // Content Styles
  summaryHeader: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16
  },
  overallStats: {
    flexDirection: 'row',
    gap: 16
  },
  overallStatItem: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  overallStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937'
  },
  overallStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  nextReportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8
  },
  nextReportText: {
    fontSize: 14,
    color: '#6B7280'
  },
  listContent: {
    padding: 16
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600'
  },
  reportCard: {
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
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#215EEA'
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  reportNumberBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8
  },
  reportNumberText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700'
  },
  newBadge: {
    backgroundColor: '#215EEA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 'auto'
  },
  newBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700'
  },
  reportStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 22,
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
  reportPeriod: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8
  },
  feedbackPreview: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic'
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
  modalContent: {
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8
  },
  listItemText: {
    fontSize: 14,
    color: '#374151',
    flex: 1
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
  issueItem: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  issueText: {
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
  trendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6'
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

