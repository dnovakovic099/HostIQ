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
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import UsageIndicator from '../../components/UsageIndicator';

const { width } = Dimensions.get('window');

// Modern muted color palette
const COLORS = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  cardBorder: 'rgba(0,0,0,0.04)',
  text: {
    primary: '#1A1D21',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
  },
  accent: '#2563EB', // Clean blue
  accentLight: 'rgba(37, 99, 235, 0.08)',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  divider: '#F1F3F5',
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
      return { label: 'Failed', color: '#FF3B30' };
    }
    if (status === 'COMPLETE' && isReady === false) {
      return { label: 'Cleaning Failed', color: '#FF3B30' };
    }
    if (status === 'COMPLETE') {
      return { label: 'Complete', color: '#34C759' };
    }
    if (status === 'PROCESSING') {
      return { label: 'Processing', color: '#FF9500' };
    }
    return { label: status, color: '#8E8E93' };
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Get first 3 media URLs from inspection
  const getMediaThumbnails = (inspection) => {
    if (!inspection.media || inspection.media.length === 0) return [];
    return inspection.media.slice(0, 3).map(m => m.url);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Usage Indicator */}
        <View style={styles.usageSection}>
          <UsageIndicator navigation={navigation} />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Properties', { screen: 'CreateProperty' })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.quickActionGradient}>
                <Ionicons name="add" size={24} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Property</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('ManageCleaners')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#4A90E2', '#3D7FD9']} style={styles.quickActionGradient}>
                <Ionicons name="people" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Team</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('SubscriptionManagement')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.quickActionGradient}>
                <Ionicons name="card" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Insights')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#F59E0B', '#EA580C']} style={styles.quickActionGradient}>
                <Ionicons name="analytics" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Issues</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Low Rating Alert */}
        {lowRatingProperties.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.alertCard}
              onPress={() => navigation.navigate('Insights')}
              activeOpacity={0.7}
            >
              <View style={styles.alertIconWrapper}>
                <Ionicons name="warning-outline" size={18} color={COLORS.error} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  {lowRatingProperties.length} Low Rating{lowRatingProperties.length > 1 ? 's' : ''}
                </Text>
                <Text style={styles.alertSubtitle}>Ratings ≤ 4.7 need attention</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Inspections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Inspections</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('InspectionReports')}
              style={styles.viewAllBtn}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
            </TouchableOpacity>
          </View>

          {recentInspections.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="clipboard-outline" size={32} color={COLORS.text.tertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Inspections Yet</Text>
              <Text style={styles.emptySubtitle}>
                Inspections will appear here once cleaners submit them
              </Text>
            </View>
          ) : (
            recentInspections.map((inspection) => {
              const propertyName = inspection.unit?.property?.name || 'Property';
              const unitName = inspection.unit?.name || 'Unit';
              const cleanerName = inspection.creator?.name || 'Cleaner';
              const statusConfig = getStatusConfig(inspection);
              const score = inspection.cleanliness_score;
              const mediaCount = inspection._count?.media || 0;
              const thumbnails = getMediaThumbnails(inspection);

              return (
                <TouchableOpacity
                  key={inspection.id}
                  style={styles.inspectionCard}
                  onPress={() => navigation.navigate('InspectionDetail', { inspectionId: inspection.id })}
                  activeOpacity={0.7}
                >
                  {/* Thumbnails Row */}
                  {thumbnails.length > 0 && (
                    <View style={styles.thumbnailRow}>
                      {thumbnails.map((url, index) => (
                        <Image
                          key={index}
                          source={{ uri: url }}
                          style={[
                            styles.thumbnail,
                            index === 0 && styles.thumbnailFirst,
                            index === thumbnails.length - 1 && styles.thumbnailLast,
                          ]}
                        />
                      ))}
                      {mediaCount > 3 && (
                        <View style={styles.morePhotos}>
                          <Text style={styles.morePhotosText}>+{mediaCount - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.cardBody}>
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
                        <Ionicons name="trash-outline" size={16} color={COLORS.text.tertiary} />
                      </TouchableOpacity>
                    </View>

                    {/* Meta */}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>{cleanerName}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaText}>{formatDate(inspection.created_at)}</Text>
                      <View style={styles.metaDot} />
                      <Ionicons name="camera-outline" size={12} color={COLORS.text.tertiary} />
                      <Text style={styles.metaText}> {mediaCount}</Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}12` }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>

                      <View style={styles.footerRight}>
                        {score != null && score > 0 && (
                          <View style={styles.scoreContainer}>
                            <Text style={styles.scoreValue}>{score.toFixed(1)}</Text>
                            <Text style={styles.scoreMax}>/10</Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
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
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  // Usage Section
  usageSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // Section
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
  },
  // Quick Actions
  quickActionsContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  quickActionBtn: {
    alignItems: 'center',
    width: 70,
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Alert
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: `${COLORS.error}20`,
    backgroundColor: `${COLORS.error}06`,
  },
  alertIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.error}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  alertSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.divider,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  // Inspection Card
  inspectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  thumbnailRow: {
    flexDirection: 'row',
    height: 110,
  },
  thumbnail: {
    flex: 1,
    height: 110,
    backgroundColor: COLORS.divider,
  },
  thumbnailFirst: {
    borderTopLeftRadius: 15,
  },
  thumbnailLast: {
    borderTopRightRadius: 15,
  },
  morePhotos: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  morePhotosText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  unitName: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 3,
  },
  deleteBtn: {
    padding: 6,
    marginTop: -4,
    marginRight: -4,
  },
  // Meta
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.text.tertiary,
    marginHorizontal: 8,
  },
  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scoreMax: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },
  bottomPadding: {
    height: 32,
  },
});
