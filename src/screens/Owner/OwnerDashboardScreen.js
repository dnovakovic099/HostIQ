import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import UsageIndicator from '../../components/UsageIndicator';

const { width } = Dimensions.get('window');

// Premium color palette
const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#A5B4FC',
  secondary: '#8B5CF6',
  success: '#10B981',
  successDark: '#059669',
  warning: '#F59E0B',
  error: '#EF4444',
  dark: '#1F2937',
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  border: '#E5E7EB',
  background: '#F8FAFC',
  card: '#FFFFFF',
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
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

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
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    fetchDashboardData();
  };

  const getStatusConfig = (inspection) => {
    const status = inspection.status || 'UNKNOWN';
    const isReady = inspection.airbnb_grade_analysis?.guest_ready;
    const errorMsg = inspection.summary_json?.error || '';
    const isAppFailed = errorMsg.includes('blurred') || errorMsg.includes('technical');

    if (status === 'FAILED' || isAppFailed) {
      return { label: 'Failed', color: COLORS.error, bgColor: '#FEE2E2', icon: 'close-circle' };
    }
    if (status === 'COMPLETE' && isReady === false) {
      return { label: 'Needs Work', color: COLORS.error, bgColor: '#FEE2E2', icon: 'alert-circle' };
    }
    if (status === 'COMPLETE') {
      return { label: 'Passed', color: COLORS.success, bgColor: '#D1FAE5', icon: 'checkmark-circle' };
    }
    if (status === 'PROCESSING') {
      return { label: 'Processing', color: COLORS.warning, bgColor: '#FEF3C7', icon: 'time' };
    }
    return { label: status, color: COLORS.gray, bgColor: '#F3F4F6', icon: 'ellipse' };
  };

  const getScoreGrade = (score) => {
    if (score >= 9) return { grade: 'A+', color: '#059669' };
    if (score >= 8) return { grade: 'A', color: '#10B981' };
    if (score >= 7) return { grade: 'B', color: '#F59E0B' };
    if (score >= 6) return { grade: 'C', color: '#F97316' };
    return { grade: 'D', color: '#EF4444' };
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDeleteInspection = (inspectionId, propertyName) => {
    Alert.alert(
      'Delete Inspection',
      `Delete this inspection for ${propertyName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/inspections/${inspectionId}`);
              setRecentInspections(prev => prev.filter(i => i.id !== inspectionId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete inspection');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Stats Header */}
        <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerGreeting}>Welcome back! 👋</Text>
              <Text style={styles.headerSubtitle}>Here's your property overview</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="business" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.statValue}>{stats.properties}</Text>
                <Text style={styles.statLabel}>Properties</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="home" size={20} color={COLORS.secondary} />
                </View>
                <Text style={styles.statValue}>{stats.units}</Text>
                <Text style={styles.statLabel}>Units</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="people" size={20} color={COLORS.success} />
                </View>
                <Text style={styles.statValue}>{stats.cleaners}</Text>
                <Text style={styles.statLabel}>Cleaners</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="today" size={20} color={COLORS.warning} />
                </View>
                <Text style={styles.statValue}>{stats.inspections_today}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Properties', { screen: 'CreateProperty' })}
            >
              <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.actionGradient}>
                <Ionicons name="add-circle" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Add Property</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('ManageCleaners')}
            >
              <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.actionGradient}>
                <Ionicons name="person-add" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Add Cleaner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Insights', { screen: 'PayCleaner' })}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.actionGradient}>
                <Ionicons name="card" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Pay Cleaner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Insights', { screen: 'CleanerPerformance' })}
            >
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.actionGradient}>
                <Ionicons name="bar-chart" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Reports</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Low Rating Alert */}
        {lowRatingProperties.length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.alertCard}
              onPress={() => navigation.navigate('Insights')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FEE2E2', '#FECACA']}
                style={styles.alertGradient}
              >
                <View style={styles.alertIconContainer}>
                  <Ionicons name="warning" size={24} color={COLORS.error} />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>
                    {lowRatingProperties.length} Low Rating{lowRatingProperties.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.alertSubtitle}>
                    Properties with ratings ≤ 4.7 need attention
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.error} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Usage */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <UsageIndicator navigation={navigation} />
        </Animated.View>

        {/* Recent Inspections */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Inspections</Text>
            <TouchableOpacity onPress={() => navigation.navigate('InspectionReports')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentInspections.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={styles.emptyIconBg}>
                <Ionicons name="clipboard-outline" size={40} color={COLORS.primary} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Inspections Yet</Text>
              <Text style={styles.emptySubtitle}>
                Inspections will appear here once your cleaners submit them
              </Text>
            </View>
          ) : (
            recentInspections.map((inspection, index) => {
              const propertyName = inspection.unit?.property?.name || 'Property';
              const unitName = inspection.unit?.name || 'Unit';
              const cleanerName = inspection.creator?.name || 'Cleaner';
              const statusConfig = getStatusConfig(inspection);
              const score = inspection.cleanliness_score;
              const scoreInfo = score ? getScoreGrade(score) : null;
              const mediaCount = inspection._count?.media || 0;

              return (
                <Animated.View
                  key={inspection.id}
                  style={[
                    styles.inspectionCard,
                    {
                      opacity: fadeAnim,
                      transform: [{
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 20],
                          outputRange: [0, 20 + (index * 5)]
                        })
                      }]
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cardTouchable}
                    onPress={() => navigation.navigate('InspectionDetail', { inspectionId: inspection.id })}
                    activeOpacity={0.7}
                  >
                    {/* Status Accent */}
                    <View style={[styles.cardAccent, { backgroundColor: statusConfig.color }]} />
                    
                    <View style={styles.cardContent}>
                      {/* Header */}
                      <View style={styles.cardHeader}>
                        <View style={styles.propertyInfo}>
                          <Text style={styles.propertyName} numberOfLines={1}>{propertyName}</Text>
                          <Text style={styles.unitName}>{unitName}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteInspection(inspection.id, propertyName)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.lightGray} />
                        </TouchableOpacity>
                      </View>

                      {/* Meta Info */}
                      <View style={styles.metaRow}>
                        <View style={styles.metaChip}>
                          <Ionicons name="person-outline" size={12} color={COLORS.gray} />
                          <Text style={styles.metaText}>{cleanerName}</Text>
                        </View>
                        <View style={styles.metaChip}>
                          <Ionicons name="time-outline" size={12} color={COLORS.gray} />
                          <Text style={styles.metaText}>{formatTimeAgo(inspection.created_at)}</Text>
                        </View>
                        <View style={styles.metaChip}>
                          <Ionicons name="camera-outline" size={12} color={COLORS.gray} />
                          <Text style={styles.metaText}>{mediaCount}</Text>
                        </View>
                      </View>

                      {/* Status & Score */}
                      <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                          <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                          </Text>
                        </View>

                        {scoreInfo && (
                          <View style={[styles.scoreBadge, { backgroundColor: scoreInfo.color + '15' }]}>
                            <Text style={[styles.scoreGrade, { color: scoreInfo.color }]}>
                              {scoreInfo.grade}
                            </Text>
                            <Text style={[styles.scoreValue, { color: scoreInfo.color }]}>
                              {score.toFixed(1)}
                            </Text>
                          </View>
                        )}

                        <View style={styles.viewArrow}>
                          <Text style={styles.viewText}>View</Text>
                          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </Animated.View>

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
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  // Header
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerGradient: {
    borderRadius: 24,
    padding: 20,
    paddingBottom: 24,
  },
  headerContent: {
    marginBottom: 20,
  },
  headerGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  // Section
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
  },
  actionGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
  },
  // Alert
  alertCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  alertGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  alertIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 2,
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#991B1B',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.card,
    borderRadius: 20,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Inspection Card
  inspectionCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardTouchable: {
    flexDirection: 'row',
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  unitName: {
    fontSize: 14,
    color: COLORS.gray,
  },
  deleteBtn: {
    padding: 4,
  },
  // Meta Row
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreGrade: {
    fontSize: 14,
    fontWeight: '800',
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  bottomPadding: {
    height: 40,
  },
});
