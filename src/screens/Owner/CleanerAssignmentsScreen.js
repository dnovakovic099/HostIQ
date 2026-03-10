import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import colors from '../../theme/colors';

export default function CleanerAssignmentsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { cleanerId, cleanerName, assignments: passedAssignments } = route.params;
  const [assignments, setAssignments] = useState(passedAssignments || []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCleanerAssignments = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await api.get('/owner/assignments', {
        params: { cleaner_id: cleanerId }
      });

      if (response.data && Array.isArray(response.data)) {
        setAssignments(response.data);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching cleaner assignments:', error);
      Alert.alert('Error', 'Failed to load assignments');
      setAssignments(passedAssignments || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cleanerId, passedAssignments]);

  // Fetch assignments when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCleanerAssignments(true);
    }, [fetchCleanerAssignments])
  );

  const getStatusColor = (status) => {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case 'PENDING':
        return colors.status.warning; // Orange
      case 'SCHEDULED':
        return colors.primary.main; // Blue
      case 'IN_PROGRESS':
      case 'STARTED':
        return colors.status.warning; // Orange
      case 'COMPLETED':
      case 'APPROVED':
        return colors.status.success; // Green
      case 'SUBMITTED':
        return colors.ios.purple; // Purple
      case 'CANCELLED':
      case 'REJECTED':
        return colors.status.error; // Red
      default:
        return colors.text.tertiary; // Gray
    }
  };

  const getStatusIcon = (status) => {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case 'PENDING':
      case 'SCHEDULED':
        return 'time-outline';
      case 'IN_PROGRESS':
      case 'STARTED':
        return 'hourglass-outline';
      case 'COMPLETED':
      case 'APPROVED':
        return 'checkmark-circle';
      case 'SUBMITTED':
        return 'checkmark-done-outline';
      case 'CANCELLED':
      case 'REJECTED':
        return 'close-circle';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusLabel = (status) => {
    return status?.toLowerCase().replace('_', ' ') || 'unknown';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleDeleteAssignment = (assignment) => {
    Alert.alert(
      'Cancel Assignment',
      `Cancel this cleaning assignment for ${assignment.unit?.property?.name}?\n\nThis will remove the assignment from ${cleanerName}'s schedule.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/owner/assignments/${assignment.id}`);
              // Remove the assignment from local state
              setAssignments(prev => prev.filter(a => String(a.id) !== String(assignment.id)));
              Alert.alert('Success', 'Assignment cancelled successfully');
            } catch (error) {
              console.error('Error deleting assignment:', error);

              // Handle specific error cases
              if (error.response?.status === 404) {
                Alert.alert('Error', 'Assignment not found');
              } else if (error.response?.status === 403) {
                Alert.alert('Error', 'You are not authorized to cancel this assignment');
              } else {
                Alert.alert('Error', error.response?.data?.message || 'Failed to cancel assignment');
              }
            }
          },
        },
      ]
    );
  };

  const handleViewInspection = async (assignment) => {
    // Only show inspection if it's been completed/submitted
    if (['COMPLETED', 'SUBMITTED', 'APPROVED'].includes(assignment.status?.toUpperCase())) {
      // Get unit_id from nested unit object if not directly available
      const unitId = assignment.unit_id || assignment.unit?.id;

      // Debug: Log assignment structure
      console.log('🔍 Assignment object:', {
        id: assignment.id,
        unit_id: assignment.unit_id,
        unit: assignment.unit,
        unitIdFromUnit: assignment.unit?.id,
        status: assignment.status,
        inspection_id: assignment.inspection_id,
        inspection: assignment.inspection,
        allKeys: Object.keys(assignment)
      });

      // Try to get inspection ID from assignment
      let inspectionId = assignment.inspection_id || assignment.inspection?.id;

      // If no inspection_id on assignment, try to find it by assignment_id
      if (!inspectionId && unitId) {
        try {
          // Fetch inspections for this unit and find the one linked to this assignment
          const response = await api.get(`/owner/inspections/recent?limit=500`);
          const inspections = response.data || [];

          console.log('🔍 Searching through inspections:', {
            totalInspections: inspections.length,
            assignmentId: assignment.id,
            unitId: unitId,
            matchingByAssignmentId: inspections.filter(i => String(i.assignment_id) === String(assignment.id)),
            matchingByUnitId: inspections.filter(i => String(i.unit_id) === String(unitId))
          });

          // First try to find by assignment_id (most specific)
          let relatedInspection = inspections.find(
            i => String(i.assignment_id) === String(assignment.id)
          );

          // If not found, try by unit_id and status (less specific but should work)
          if (!relatedInspection && unitId) {
            // Get all inspections for this unit with completed status
            const unitInspections = inspections.filter(
              i => String(i.unit_id) === String(unitId) &&
                ['COMPLETE', 'APPROVED', 'SUBMITTED', 'COMPLETED'].includes(i.status?.toUpperCase())
            );

            // Sort by created_at descending and get the most recent one
            if (unitInspections.length > 0) {
              unitInspections.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA; // Most recent first
              });
              relatedInspection = unitInspections[0];
            }
          }

          // Last resort: check if inspection has assignment nested object
          if (!relatedInspection) {
            relatedInspection = inspections.find(
              i => String(i.assignment?.id) === String(assignment.id) &&
                ['COMPLETE', 'APPROVED', 'SUBMITTED', 'COMPLETED'].includes(i.status?.toUpperCase())
            );
          }

          inspectionId = relatedInspection?.id;

          if (relatedInspection) {
            console.log('✅ Found inspection:', {
              inspectionId: relatedInspection.id,
              status: relatedInspection.status,
              assignment_id: relatedInspection.assignment_id,
              assignment: relatedInspection.assignment,
              unit_id: relatedInspection.unit_id
            });
          } else {
            console.log('❌ No matching inspection found', {
              assignmentId: assignment.id,
              unitId: unitId,
              totalInspections: inspections.length,
              inspectionDetails: inspections.map(i => ({
                id: i.id,
                assignment_id: i.assignment_id,
                assignment: i.assignment,
                unit_id: i.unit_id,
                status: i.status
              }))
            });
          }
        } catch (error) {
          console.error('Error fetching inspection:', error);
        }
      } else {
        console.log('✅ Using inspection_id from assignment:', inspectionId);
      }

      if (inspectionId) {
        navigation.navigate('InspectionDetail', {
          inspectionId: inspectionId,
          userRole: 'owner'
        });
      } else {
        Alert.alert(
          'Inspection Not Found',
          'The inspection report for this assignment could not be found. It may still be processing.'
        );
      }
    } else {
      Alert.alert(
        'No Inspection Yet',
        'This assignment hasn\'t been completed. The inspection report will be available once the cleaner submits it.'
      );
    }
  };

  const renderAssignment = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    const statusLabel = getStatusLabel(item.status);
    const isCompleted = ['COMPLETED', 'SUBMITTED', 'APPROVED'].includes(item.status?.toUpperCase());
    const isPending = ['PENDING', 'SCHEDULED'].includes(item.status?.toUpperCase());

    return (
      <View style={styles.assignmentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName} numberOfLines={1}>
              {item.unit?.property?.name || 'Unknown Property'}
            </Text>
            <Text style={styles.unitName} numberOfLines={1}>
              {item.unit?.name || 'Unknown Unit'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={statusIcon} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="location" size={16} color={colors.primary.main} />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.unit?.property?.address || 'No address'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={16} color={colors.primary.main} />
            <Text style={styles.detailText}>
              Due: {formatDate(item.due_at || item.scheduled_for)}
            </Text>
          </View>
        </View>

        {item.created_at && (
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time" size={16} color={colors.primary.main} />
              <Text style={styles.detailTextSmall}>
                Assigned: {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isCompleted && (
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => handleViewInspection(item)}
            >
              <Ionicons name="document-text" size={18} color={colors.primary.main} />
              <Text style={styles.actionButtonText}>View Report</Text>
            </TouchableOpacity>
          )}

          {isPending && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteAssignment(item)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.status.error} />
              <Text style={[styles.actionButtonText, { color: colors.status.error }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, { paddingTop: insets.top }]}
      >
        {/* Decorative element */}
        <View style={styles.decorativeCircle}>
          <Ionicons name="clipboard-outline" size={70} color={colors.decorative.icon1} />
        </View>
        <SafeAreaView>
          <View style={styles.headerGradient}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text.inverse} />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name="clipboard-outline" size={22} color={colors.text.inverse} />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>{cleanerName}</Text>
              <Text style={styles.headerSubtitle}>
                {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={assignments}
        renderItem={renderAssignment}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCleanerAssignments(false)}
            tintColor={colors.primary.main}
            colors={[colors.primary.main]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient
              colors={colors.gradients.lightBlue}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIcon}
            >
              <Ionicons name="calendar-outline" size={48} color={colors.primary.main} />
            </LinearGradient>
            <Text style={styles.emptyText}>No assignments yet</Text>
            <Text style={styles.emptySubtext}>
              This cleaner hasn't been assigned to any properties
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  headerWrapper: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.decorative.circle1,
    top: -30,
    right: -30,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: colors.text.inverse,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.text.inverse,
    fontWeight: '500',
    opacity: 0.85,
  },
  list: {
    padding: 16,
  },
  assignmentCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        borderWidth: 0.5,
        borderColor: colors.border.light,
        shadowColor: colors.shadow.card,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyInfo: {
    flex: 1,
    marginRight: 12,
  },
  propertyName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  unitName: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginBottom: 12,
  },
  detailsRow: {
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
  },
  detailTextSmall: {
    fontSize: 13,
    color: colors.text.tertiary,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewButton: {
    backgroundColor: colors.accent.blueLight,
  },
  deleteButton: {
    backgroundColor: colors.accent.errorLight,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow.blue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
