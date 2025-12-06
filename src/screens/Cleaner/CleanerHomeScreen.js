import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
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
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';
import shadows from '../../theme/shadows';
import { spacing, borderRadius } from '../../theme/spacing';

export default function CleanerHomeScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [])
  );

  const fetchJobs = async () => {
    try {
      // Fetch PENDING and IN_PROGRESS assignments only (not SUBMITTED or APPROVED)
      const [assignmentsResponse, inspectionsResponse] = await Promise.all([
        api.get('/cleaner/assignments', { params: { status: 'PENDING' } }),
        api.get('/cleaner/inspections')
      ]);

      // Only show:
      // 1. PENDING assignments (not yet started)
      // 2. IN_PROGRESS inspections with no media (user started but hasn't uploaded yet)
      
      // Debug: Log all inspections with actual media count
      console.log('All inspections:', inspectionsResponse.data.map(i => ({
        id: i.id,
        unit: i.unit?.name,
        status: i.status,
        mediaCount: i.media?.length || 0
      })));
      
      const allJobs = [
        ...assignmentsResponse.data
          .filter(a => a.status === 'PENDING')
          .map(a => ({ ...a, type: 'assignment' })),
        ...inspectionsResponse.data
          .filter(i => {
            const mediaCount = i.media?.length || 0;
            return i.status === 'PROCESSING' && mediaCount === 0;
          })
          .map(i => ({ ...i, type: 'inspection' }))
      ];

      allJobs.sort((a, b) => {
        const dateA = new Date(a.due_at || a.created_at);
        const dateB = new Date(b.due_at || b.created_at);
        return dateA - dateB;
      });

      setJobs(allJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to load jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const handleStartJob = async (job) => {
    if (job.type === 'assignment') {
      try {
        await api.post(`/cleaner/assignments/${job.id}/start`);
        navigation.navigate('CaptureMedia', { 
          assignment: job,
          propertyId: job.unit?.property?.id,
          propertyName: job.unit?.property?.name,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to start assignment');
      }
    } else {
      // Continuing an in-progress inspection
      console.log('🔄 Continuing inspection:', job.id);
      console.log('   Unit rooms:', job.unit?.rooms?.length || 0);
      
      navigation.navigate('CaptureMedia', {
        inspectionId: job.id,
        propertyId: job.unit?.property?.id,
        propertyName: job.unit.property.name,
        unitName: job.unit.name,
        unitId: job.unit?.id, // For valuable items
        rooms: job.unit?.rooms || [], // Pass rooms for room-by-room flow
      });
    }
  };

  const formatDueDate = (dueAt) => {
    const date = new Date(dueAt);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderJob = ({ item }) => {
    const propertyName = item.unit?.property?.name || 'Unknown Property';
    const unitName = item.unit?.name || 'Unknown Unit';
    const address = item.unit?.property?.address || '';
    const isInProgress = item.type === 'inspection';
    
    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => handleStartJob(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyName}>{propertyName}</Text>
              <Text style={styles.unitName}>{unitName}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              isInProgress ? styles.statusBadgeProgress : styles.statusBadgePending
            ]}>
              <Text style={styles.statusText}>
                {isInProgress ? 'IN PROGRESS' : 'PENDING'}
              </Text>
            </View>
          </View>

          {address && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color={colors.primary.main} />
              <Text style={styles.infoText}>{address}</Text>
            </View>
          )}

          {item.due_at && (
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color={colors.accent.warning} />
              <Text style={styles.infoText}>{formatDueDate(item.due_at)}</Text>
            </View>
          )}

          {isInProgress && (
            <View style={styles.infoRow}>
              <Ionicons name="camera" size={16} color={colors.secondary.main} />
              <Text style={styles.infoText}>
                {item.media?.length || 0} photos uploaded
              </Text>
            </View>
          )}

          {item.unit?.notes && (
            <View style={styles.notesBox}>
              <Ionicons name="information-circle" size={16} color={colors.accent.info} />
              <Text style={styles.notesText}>{item.unit.notes}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleStartJob(item)}
          >
            <LinearGradient
              colors={colors.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>
                {isInProgress ? 'Continue Inspection' : 'Start Inspection'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
      {jobs.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="calendar-outline" size={64} color={colors.primary.main} />
          </View>
          <Text style={styles.emptyTitle}>No jobs yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button below to create a new inspection
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {/* Modern FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateInspection')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={colors.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },
  list: {
    padding: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...shadows.md,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  unitName: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusBadgePending: {
    backgroundColor: colors.accent.warning + '15',
  },
  statusBadgeProgress: {
    backgroundColor: colors.accent.info + '15',
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.wide,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
    fontWeight: typography.fontWeight.medium,
  },
  notesBox: {
    flexDirection: 'row',
    backgroundColor: colors.accent.info + '10',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.info,
  },
  notesText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
    fontWeight: typography.fontWeight.medium,
  },
  actionButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
    ...shadows.md,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    ...shadows.xl,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

