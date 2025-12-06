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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import UsageIndicator from '../../components/UsageIndicator';

const { width } = Dimensions.get('window');

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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#007AFF" />
        }
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Properties', { screen: 'CreateProperty' })}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#007AFF15' }]}>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
              </View>
              <Text style={styles.actionLabel}>Property</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('ManageCleaners')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#5856D615' }]}>
                <Ionicons name="person-add" size={24} color="#5856D6" />
              </View>
              <Text style={styles.actionLabel}>Team</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('SubscriptionManagement')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FF950015' }]}>
                <Ionicons name="card" size={24} color="#FF9500" />
              </View>
              <Text style={styles.actionLabel}>Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Insights')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FF3B3015' }]}>
                <Ionicons name="alert-circle" size={24} color="#FF3B30" />
              </View>
              <Text style={styles.actionLabel}>Issues</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Low Rating Alert */}
        {lowRatingProperties.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.alertCard}
              onPress={() => navigation.navigate('Insights')}
            >
              <Ionicons name="exclamationmark.triangle.fill" size={20} color="#FF3B30" />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  {lowRatingProperties.length} Low Rating{lowRatingProperties.length > 1 ? 's' : ''}
                </Text>
                <Text style={styles.alertSubtitle}>Ratings ≤ 4.7 need attention</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        )}

        {/* Usage */}
        <View style={styles.section}>
          <UsageIndicator navigation={navigation} />
        </View>

        {/* Recent Inspections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Inspections</Text>
            <TouchableOpacity onPress={() => navigation.navigate('InspectionReports')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentInspections.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={44} color="#C7C7CC" />
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
                  activeOpacity={0.6}
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
                        <Ionicons name="trash-outline" size={18} color="#C7C7CC" />
                      </TouchableOpacity>
                    </View>

                    {/* Meta */}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>{cleanerName}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.metaText}>{formatDate(inspection.created_at)}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="camera" size={12} color="#8E8E93" />
                      <Text style={styles.metaText}>{mediaCount}</Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>

                      {score != null && score > 0 && (
                        <View style={styles.scoreContainer}>
                          <Text style={styles.scoreValue}>{score.toFixed(1)}</Text>
                          <Text style={styles.scoreMax}>/10</Text>
                        </View>
                      )}

                      <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
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
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  // Section
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  // Quick Actions
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  // Alert
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
  },
  // Inspection Card
  inspectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  thumbnailRow: {
    flexDirection: 'row',
    height: 100,
  },
  thumbnail: {
    flex: 1,
    height: 100,
    backgroundColor: '#F2F2F7',
  },
  thumbnailFirst: {
    borderTopLeftRadius: 12,
  },
  thumbnailLast: {
    borderTopRightRadius: 12,
  },
  morePhotos: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  morePhotosText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    padding: 14,
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
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.4,
  },
  unitName: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  // Meta
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  metaDot: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 12,
  },
  scoreValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  scoreMax: {
    fontSize: 13,
    color: '#8E8E93',
  },
  bottomPadding: {
    height: 40,
  },
});
