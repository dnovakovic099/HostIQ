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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';

export default function CleanerAssignmentsScreen({ route, navigation }) {
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
      const response = await api.get('/owner/cleaners');
      const cleaner = response.data.find(c => String(c.id) === String(cleanerId));
      
      if (cleaner?.assignments) {
        setAssignments(cleaner.assignments);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching cleaner assignments:', error);
      Alert.alert('Error', 'Failed to load assignments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cleanerId]);

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
        return '#FFB000'; // Orange
      case 'SCHEDULED':
        return '#3B82F6'; // Blue
      case 'IN_PROGRESS':
      case 'STARTED':
        return '#F59E0B'; // Orange
      case 'COMPLETED':
      case 'APPROVED':
        return '#10B981'; // Green
      case 'SUBMITTED':
        return '#8B5CF6'; // Purple
      case 'CANCELLED':
      case 'REJECTED':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
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
              Alert.alert('Success', 'Assignment cancelled successfully');
              fetchCleanerAssignments(false);
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
            <Ionicons name="location" size={16} color="#4A90E2" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.unit?.property?.address || 'No address'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={16} color="#4A90E2" />
            <Text style={styles.detailText}>
              Due: {formatDate(item.due_at || item.scheduled_for)}
            </Text>
          </View>
        </View>

        {item.created_at && (
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time" size={16} color="#4A90E2" />
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
              <Ionicons name="document-text" size={18} color="#4A90E2" />
              <Text style={styles.actionButtonText}>View Report</Text>
            </TouchableOpacity>
          )}
          
          {isPending && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteAssignment(item)}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#3A5F9F', '#2E4F8F', '#1E3F7F', '#0F2F6F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
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
            tintColor="#4A90E2"
            colors={['#4A90E2']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient
              colors={['#DBEAFE', '#93C5FD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIcon}
            >
              <Ionicons name="calendar-outline" size={48} color="#4A90E2" />
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
    backgroundColor: '#F8FAFC',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerWrapper: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },
  list: {
    padding: 16,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
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
    color: '#1F2937',
    marginBottom: 4,
  },
  unitName: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#E0E7FF',
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
    color: '#6B7280',
    flex: 1,
  },
  detailTextSmall: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
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
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
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
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
