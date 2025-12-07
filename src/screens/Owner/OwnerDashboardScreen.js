import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import UsageIndicator from '../../components/UsageIndicator';

// iOS system colors
const COLORS = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  primary: '#007AFF',
  text: {
    primary: '#000000',
    secondary: '#3C3C43',
    tertiary: '#8E8E93',
  },
  success: '#34C759',
  successBg: '#EAFAF0',
  warning: '#FF9500',
  warningBg: '#FFF8F0',
  error: '#FF3B30',
  errorBg: '#FFF0F0',
  separator: '#E5E5EA',
  sectionBg: '#F9F9FB',
};

export default function OwnerDashboardScreen({ navigation }) {
  const [stats, setStats] = useState({
    properties: 0,
    units: 0,
    cleaners: 0,
    inspections_today: 0,
  });
  const [recentInspections, setRecentInspections] = useState([]);
  const [lowRatingProperties, setLowRatingProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchTime = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      if (timeSinceLastFetch > 30000 || lastFetchTime.current === 0) {
        lastFetchTime.current = now;
        fetchDashboardData();
      }
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/owner/stats');
      const inspectionsRes = await api.get('/owner/inspections/recent?limit=5');
      const propertiesRes = await api.get('/owner/properties');

      setStats({
        properties: Number(statsRes.data.properties) || 0,
        units: Number(statsRes.data.units) || 0,
        cleaners: Number(statsRes.data.cleaners) || 0,
        inspections_today: Number(statsRes.data.inspections_today) || 0,
      });

      const inspections = Array.isArray(inspectionsRes.data) ? inspectionsRes.data : [];
      const validInspections = inspections.filter(inspection =>
        inspection && inspection.unit && inspection.unit.property && inspection.creator
      );
      setRecentInspections(validInspections);

      const properties = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
      const lowRated = properties.filter(prop => prop.hasLowRating);
      setLowRatingProperties(lowRated);
    } catch (error) {
      console.error('Dashboard error:', error);
      setStats({ properties: 0, units: 0, cleaners: 0, inspections_today: 0 });
      setRecentInspections([]);
      setLowRatingProperties([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getStatusConfig = (inspection) => {
    const status = inspection.status || 'UNKNOWN';
    const isReady = inspection.airbnb_grade_analysis?.guest_ready;
    const errorMsg = inspection.summary_json?.error || '';
    const isAppFailed = errorMsg.includes('blurred') || errorMsg.includes('technical');

    if (status === 'FAILED' || isAppFailed) {
      return { label: 'Failed', color: COLORS.error };
    }
    if (status === 'COMPLETE' && isReady === false) {
      return { label: 'Attention', color: COLORS.error };
    }
    if (status === 'COMPLETE') {
      return { label: 'Complete', color: COLORS.success };
    }
    if (status === 'PROCESSING') {
      return { label: 'Processing', color: COLORS.warning };
    }
    return { label: status, color: COLORS.text.tertiary };
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getAverageScore = () => {
    const scored = recentInspections.filter(i => i.cleanliness_score && i.cleanliness_score > 0);
    if (scored.length === 0) return null;
    const avg = scored.reduce((sum, i) => sum + i.cleanliness_score, 0) / scored.length;
    return avg.toFixed(1);
  };

  const getCompletedCount = () => recentInspections.filter(i => i.status === 'COMPLETE').length;
  const getProcessingCount = () => recentInspections.filter(i => i.status === 'PROCESSING').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const displayedInspections = recentInspections.slice(0, 3);
  const avgScore = getAverageScore();
  const completedCount = getCompletedCount();
  const processingCount = getProcessingCount();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Dashboard Card */}
        <View style={styles.dashboardCard}>
          
          {/* Usage Section */}
          <UsageIndicator navigation={navigation} />
          
          <View style={styles.divider} />
          
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Properties', { screen: 'CreateProperty' })}
              activeOpacity={0.6}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EBF4FF' }]}>
                <Ionicons name="add" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionText}>Property</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('ManageCleaners')}
              activeOpacity={0.6}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EBF4FF' }]}>
                <Ionicons name="people" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionText}>Team</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('SubscriptionManagement')}
              activeOpacity={0.6}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#EAFAF0' }]}>
                <Ionicons name="card" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.quickActionText}>Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Insights')}
              activeOpacity={0.6}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FFF5EB' }]}>
                <Ionicons name="analytics" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.quickActionText}>Insights</Text>
            </TouchableOpacity>
          </View>

          {/* Section Break */}
          <View style={styles.sectionBreak} />

          {/* Inspections Header */}
          <TouchableOpacity 
            style={styles.inspectionsHeader}
            onPress={() => navigation.navigate('InspectionReports')}
            activeOpacity={0.6}
          >
            <Text style={styles.inspectionsTitle}>Recent Inspections</Text>
            <View style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{recentInspections.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>{avgScore || '–'}</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{completedCount}</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{processingCount}</Text>
              <Text style={styles.statLabel}>Processing</Text>
            </View>
          </View>

          {/* Alert Banner */}
          {lowRatingProperties.length > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() => navigation.navigate('Insights')}
              activeOpacity={0.6}
            >
              <Ionicons name="warning" size={14} color={COLORS.error} />
              <Text style={styles.alertText}>
                {lowRatingProperties.length} low rating{lowRatingProperties.length > 1 ? 's' : ''} need attention
              </Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.error} />
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          {/* Inspection List */}
          {displayedInspections.length > 0 ? (
            displayedInspections.map((inspection, index) => {
              const propertyName = inspection.unit?.property?.name || 'Property';
              const unitName = inspection.unit?.name || 'Unit';
              const cleanerName = inspection.creator?.name || 'Cleaner';
              const statusConfig = getStatusConfig(inspection);
              const score = inspection.cleanliness_score;
              const mediaCount = inspection._count?.media || 0;
              const isLast = index === displayedInspections.length - 1;

              return (
                <React.Fragment key={inspection.id}>
                  <View style={styles.inspectionItem}>
                    <TouchableOpacity
                      style={styles.inspectionRow}
                      onPress={() => navigation.navigate('InspectionDetail', { inspectionId: inspection.id })}
                      activeOpacity={0.5}
                    >
                      <View style={styles.inspectionLeft}>
                        <Text style={styles.propertyName} numberOfLines={1}>{propertyName}</Text>
                        <Text style={styles.inspectionMeta}>
                          {unitName} · {cleanerName} · {formatDate(inspection.created_at)} · {mediaCount} photos
                        </Text>
                        <View style={styles.statusRow}>
                          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                        </View>
                      </View>
                      <View style={styles.inspectionRight}>
                        {score != null && score > 0 && (
                          <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
                        )}
                        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                      </View>
                    </TouchableOpacity>
                    
                    {/* Airbnb Dispute Report Button */}
                    {inspection.status === 'COMPLETE' && (
                      <TouchableOpacity
                        style={styles.disputeButton}
                        onPress={() => navigation.navigate('AirbnbDisputeReport', { inspectionId: inspection.id })}
                        activeOpacity={0.6}
                      >
                        <Ionicons name="document-text-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.disputeButtonText}>Airbnb Dispute Report</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {!isLast && <View style={styles.rowDivider} />}
                </React.Fragment>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No inspections yet</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  
  dashboardCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.separator,
    marginHorizontal: 16,
  },
  
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.separator,
    marginLeft: 16,
  },
  
  sectionBreak: {
    height: 8,
    backgroundColor: '#F5F5F7',
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  quickActionBtn: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  
  // Inspections Header
  inspectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  inspectionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: 1,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  
  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
  },
  
  // Inspection Item
  inspectionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inspectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inspectionLeft: {
    flex: 1,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  inspectionMeta: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inspectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Dispute Button
  disputeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 10,
    gap: 6,
  },
  disputeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Empty State
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  
  bottomPadding: {
    height: 32,
  },
});
