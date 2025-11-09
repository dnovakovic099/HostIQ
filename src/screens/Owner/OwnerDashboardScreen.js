import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import UsageIndicator from '../../components/UsageIndicator';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import shadows from '../../theme/shadows';
import { spacing, borderRadius } from '../../theme/spacing';

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

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
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
      
      // Ensure inspections is an array with properly structured data
      const inspections = Array.isArray(inspectionsRes.data) ? inspectionsRes.data : [];
      const validInspections = inspections.filter(inspection => 
        inspection && 
        inspection.unit && 
        inspection.unit.property && 
        inspection.creator
      );
      setRecentInspections(validInspections);

      // Filter properties with low ratings
      const properties = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
      const lowRated = properties.filter(prop => prop.hasLowRating);
      setLowRatingProperties(lowRated);
    } catch (error) {
      console.error('Dashboard error:', error);
      // Set default values on error
      setStats({
        properties: 0,
        units: 0,
        cleaners: 0,
        inspections_today: 0,
      });
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

  const getScoreColor = (score) => {
    if (score >= 4.5) return colors.accent.success;
    if (score >= 3.5) return colors.accent.warning;
    return colors.accent.error;
  };

  const getStatusDisplay = (inspection) => {
    const status = inspection.status || 'UNKNOWN';
    const isReady = inspection.airbnb_grade_analysis?.guest_ready;
    const errorMsg = inspection.summary_json?.error || '';
    
    // Check for app/technical failures
    const isAppFailed = errorMsg.includes('blurred') || 
                        errorMsg.includes('technical') || 
                        errorMsg.includes('processing') ||
                        errorMsg.includes('WRONG ROOM TYPE') ||
                        errorMsg.includes('CRITICAL ERROR');

    if (status === 'FAILED' || isAppFailed) {
      return {
        label: 'FAILED',
        color: colors.accent.error || '#F44336',
        icon: 'alert-circle'
      };
    }

    if (status === 'REJECTED') {
      return {
        label: 'REJECTED',
        color: '#E65100',
        icon: 'close-circle'
      };
    }

    // Not ready means cleaning failed
    if (status === 'COMPLETE' && isReady === false) {
      return {
        label: 'Cleaning Failed',
        color: colors.accent.error || '#F44336',
        icon: 'alert-circle'
      };
    }

    if (status === 'COMPLETE') {
      return {
        label: 'COMPLETE',
        color: colors.accent.success || '#4CAF50',
        icon: 'checkmark-circle'
      };
    }

    if (status === 'PROCESSING') {
      return {
        label: 'PROCESSING',
        color: '#FF9800',
        icon: 'time'
      };
    }

    return {
      label: status,
      color: colors.text.secondary || '#999',
      icon: 'ellipse'
    };
  };

  const handleDeleteInspection = (inspectionId, propertyName) => {
    Alert.alert(
      'Delete Inspection',
      `Are you sure you want to delete this inspection for ${propertyName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/inspections/${inspectionId}`);
              // Remove from local state
              setRecentInspections(prev => prev.filter(i => i.id !== inspectionId));
              Alert.alert('Success', 'Inspection deleted successfully');
            } catch (error) {
              console.error('Error deleting inspection:', error);
              Alert.alert('Error', 'Failed to delete inspection. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
      >
        {/* Quick Actions */}
        <View style={styles.topSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('CreateProperty')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary.main + '15' }]}>
                <Ionicons name="add-circle" size={26} color={colors.primary.main} />
              </View>
              <Text style={styles.actionText}>Property</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('ManageCleaners')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.secondary.main + '15' }]}>
                <Ionicons name="person-add" size={26} color={colors.secondary.main} />
              </View>
              <Text style={styles.actionText}>Team</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('SubscriptionManagement')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#9C27B0' + '15' }]}>
                <Ionicons name="card" size={26} color="#9C27B0" />
              </View>
              <Text style={styles.actionText}>Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Issues')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#DC2626' + '15' }]}>
                <Ionicons name="alert-circle" size={26} color="#DC2626" />
              </View>
              <Text style={styles.actionText}>Issues</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Low Rating Alert */}
        {lowRatingProperties.length > 0 && (
          <View style={styles.alertSection}>
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={styles.alertTitle}>
                  {lowRatingProperties.length} Low {lowRatingProperties.length === 1 ? 'Rating' : 'Ratings'}
                </Text>
              </View>
              <Text style={styles.alertSubtext}>
                {lowRatingProperties.length === 1 
                  ? `${lowRatingProperties[0].name}: ${lowRatingProperties[0].rating}` 
                  : 'Ratings ≤ 4.7'}
              </Text>
              {lowRatingProperties.length > 1 && (
                <View style={styles.alertPropertyList}>
                  {lowRatingProperties.map(prop => (
                    <Text key={prop.id} style={styles.alertPropertyItem}>
                      • {prop.name}: {prop.rating}
                    </Text>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => navigation.navigate('ListingOptimization')}
              >
                <Text style={styles.alertButtonText}>Fix Now</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Usage Indicator */}
        <View style={styles.usageSection}>
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
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={48} color={colors.primary.main} />
              </View>
              <Text style={styles.emptyTitle}>No inspections yet</Text>
              <Text style={styles.emptySubtext}>
                Inspections will appear here once cleaners submit them
              </Text>
            </View>
          ) : (
            recentInspections.map((inspection) => {
              const mediaCount = inspection._count?.media || 0;
              const propertyName = inspection.unit?.property?.name || 'Unknown Property';
              const unitName = inspection.unit?.name || 'Unknown Unit';
              const cleanerName = inspection.creator?.name || 'Unknown';
              const statusDisplay = getStatusDisplay(inspection);

              return (
                <TouchableOpacity
                  key={inspection.id}
                  style={styles.inspectionCard}
                  onPress={() =>
                    navigation.navigate('InspectionDetail', {
                      inspectionId: inspection.id,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyName}>{propertyName}</Text>
                      <Text style={styles.unitName}>{unitName}</Text>
                    </View>
                    <View style={styles.headerRight}>
                      <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color + '15' }]}>
                        <Ionicons name={statusDisplay.icon} size={14} color={statusDisplay.color} />
                        <Text style={[styles.statusText, { color: statusDisplay.color }]}>
                          {statusDisplay.label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteInspection(inspection.id, propertyName);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.accent.error || '#F44336'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inspectionMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={13} color={colors.text.tertiary} />
                      <Text style={styles.metaText}>
                        {new Date(inspection.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' at '}
                        {new Date(inspection.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.metaDivider}>•</Text>
                    <View style={styles.metaItem}>
                      <Ionicons name="camera-outline" size={13} color={colors.text.tertiary} />
                      <Text style={styles.metaText}>{mediaCount}</Text>
                    </View>
                  </View>

                  <View style={styles.inspectionMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={13} color={colors.text.tertiary} />
                      <Text style={styles.metaText}>{cleanerName}</Text>
                    </View>
                  </View>

                  {statusDisplay.label === 'COMPLETE' && inspection.cleanliness_score != null && (
                    <View style={styles.scoreRow}>
                      <View style={[styles.scoreChip, { backgroundColor: getScoreColor(inspection.cleanliness_score) + '15' }]}>
                        <Ionicons name="star" size={13} color={getScoreColor(inspection.cleanliness_score)} />
                        <Text style={[styles.scoreChipText, { color: getScoreColor(inspection.cleanliness_score) }]}>
                          {Number(inspection.cleanliness_score).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS grouped background
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  usageSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  alertSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  alertCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#DC2626',
    ...shadows.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: 6,
  },
  alertTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: -0.3,
  },
  alertSubtext: {
    fontSize: 13,
    color: '#991B1B',
    marginBottom: spacing.sm,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  alertPropertyList: {
    marginBottom: spacing.sm,
  },
  alertPropertyItem: {
    fontSize: 13,
    color: '#991B1B',
    marginBottom: 4,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: 4,
  },
  alertButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  inspectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
    letterSpacing: -0.4,
  },
  unitName: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  deleteButton: {
    padding: 4,
  },
  inspectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  metaDivider: {
    fontSize: 12,
    color: '#C7C7CC',
    marginHorizontal: 6,
  },
  scoreRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  scoreChipText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: -0.2,
  },
  bottomSpacing: {
    height: 40,
  },
});
