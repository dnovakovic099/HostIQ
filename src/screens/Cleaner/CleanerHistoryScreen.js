import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../api/client';
import colors from '../../theme/colors';

export default function CleanerHistoryScreen({ navigation }) {
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [properties, setProperties] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetchInspections();
    }, [])
  );

  const fetchInspections = async () => {
    try {
      // Fetch both assignments and inspections
      const [assignmentsResponse, inspectionsResponse] = await Promise.all([
        api.get('/cleaner/assignments'),
        api.get('/cleaner/inspections')
      ]);

      // Map assignments to card format
      const assignments = assignmentsResponse.data
        .filter(a => a.status === 'PENDING' || a.status === 'IN_PROGRESS')
        .map(a => ({
          id: String(a.id || ''),
          type: 'ASSIGNMENT',
          status: String(a.status || 'PENDING'),
          created_at: a.created_at || new Date().toISOString(),
          cleanliness_score: 0,
          unit: {
            id: a.unit?.id || '',
            name: String(a.unit?.name || 'Unit'),
            property: {
              name: String(a.unit?.property?.name || 'Property')
            },
            rooms: a.unit?.rooms || []
          },
          _count: {
            media: 0
          }
        }));

      // Map inspections to card format
      const inspections = inspectionsResponse.data
        .filter(i => {
          const mediaCount = i.media?.length || 0;
          return i && mediaCount > 0;
        })
        .map(i => ({
          id: String(i.id || ''),
          type: 'INSPECTION',
          status: String(i.status || 'UNKNOWN'),
          created_at: i.created_at || new Date().toISOString(),
          cleanliness_score: Number(i.cleanliness_score || 0),
          unit: {
            name: String(i.unit?.name || 'Unit'),
            property: {
              name: String(i.unit?.property?.name || 'Property')
            },
            rooms: i.unit?.rooms || []
          },
          _count: {
            media: Number(i._count?.media || 0)
          },
          summary_json: i.summary_json || null,
          airbnb_grade_analysis: i.airbnb_grade_analysis || null
        }));

      // Combine and sort: PENDING first (red), PROCESSING/IN_PROGRESS second (orange), then by date
      const combined = [...assignments, ...inspections].sort((a, b) => {
        const priorityA = a.status === 'PENDING' ? 0 : (a.status === 'IN_PROGRESS' || a.status === 'PROCESSING') ? 1 : 2;
        const priorityB = b.status === 'PENDING' ? 0 : (b.status === 'IN_PROGRESS' || b.status === 'PROCESSING') ? 1 : 2;
        
        if (priorityA !== priorityB) return priorityA - priorityB;
        // Sort by created_at descending (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      });

      // Extract unique properties
      const uniqueProperties = [...new Set(combined.map(i => i.unit?.property?.name || 'Unknown'))];
      setProperties(uniqueProperties);

      setInspections(combined);
      setFilteredInspections(combined);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      setInspections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInspections();
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
              setInspections(prev => prev.filter(i => i.id !== inspectionId));
              setFilteredInspections(prev => prev.filter(i => i.id !== inspectionId));
            } catch (error) {
              console.error('Error deleting inspection:', error);
              Alert.alert('Error', 'Failed to delete inspection. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Apply filters whenever property or date filter changes
  React.useEffect(() => {
    applyFilters();
  }, [selectedProperty, selectedDate, inspections]);

  const applyFilters = () => {
    let filtered = [...inspections];

    // Property filter
    if (selectedProperty !== 'all') {
      filtered = filtered.filter(i => i.unit?.property?.name === selectedProperty);
    }

    // Date filter - filter by specific date
    if (selectedDate) {
      const selectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const nextDay = new Date(selectedDay.getTime() + 24 * 60 * 60 * 1000);
      filtered = filtered.filter(i => {
        const itemDate = new Date(i.created_at);
        return itemDate >= selectedDay && itemDate < nextDay;
      });
    }

    setFilteredInspections(filtered);
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setShowDatePicker(false);
  };

  const getScoreColor = (score) => {
    if (score >= 4.5) return '#4CAF50';
    if (score >= 3.5) return '#FF9800';
    return '#F44336';
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

    if (status === 'PENDING') {
      return {
        label: 'PENDING',
        color: '#F44336',
        icon: 'alarm-outline'
      };
    }

    if (status === 'IN_PROGRESS' || status === 'PROCESSING') {
      return {
        label: status,
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

  const renderInspection = ({ item }) => {
    if (!item || !item.id) {
      return null;
    }

    const propertyName = item.unit?.property?.name || 'Property';
    const unitName = item.unit?.name || 'Unit';
    const isAssignment = item.type === 'ASSIGNMENT';
    const statusDisplay = getStatusDisplay(item);
    const isPending = item.status === 'PENDING';
    const isInProgress = item.status === 'IN_PROGRESS' || item.status === 'PROCESSING';
    const mediaCount = item._count?.media || 0;
    const roomCount = item.unit?.rooms?.length || 0;
    const errorMessage = item.summary_json?.error || null;

    // Determine border color
    let borderColor = 'transparent';
    let borderWidth = 0;
    if (isPending) {
      borderColor = '#F44336'; // Red
      borderWidth = 3;
    } else if (isInProgress) {
      borderColor = '#FF9800'; // Orange
      borderWidth = 3;
    }

    const handlePress = () => {
      if (isAssignment) {
        // Start inspection for assignment
        navigation.navigate('CaptureMedia', {
          assignment: {
            id: item.id,
            unit_id: item.unit?.id
          },
          propertyName,
          unitName,
          rooms: item.unit?.rooms || []
        });
      } else {
        // View inspection details
        navigation.navigate('InspectionDetail', { inspectionId: item.id, userRole: 'CLEANER' });
      }
    };

    return (
      <TouchableOpacity
        style={[styles.card, { borderColor, borderWidth }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>{propertyName}</Text>
            <Text style={styles.unitName}>{unitName}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color + '15' }]}>
              <Ionicons name={statusDisplay.icon} size={16} color={statusDisplay.color} />
              <Text style={[styles.statusText, { color: statusDisplay.color }]}>
                {statusDisplay.label}
              </Text>
            </View>
            {!isAssignment && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteInspection(item.id, propertyName);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.accent.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRowCompact}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.infoTextSmall}>
                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {' at '}
                {new Date(item.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
            
            {roomCount > 0 && (
              <>
                <Text style={styles.infoDivider}>•</Text>
                <View style={styles.infoItem}>
                  <Ionicons name="bed-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.infoTextSmall}>{roomCount}</Text>
                </View>
              </>
            )}
            
            <Text style={styles.infoDivider}>•</Text>
            <View style={styles.infoItem}>
              <Ionicons name="images-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.infoTextSmall}>{mediaCount}</Text>
            </View>

            {statusDisplay.label === 'COMPLETE' && item.cleanliness_score > 0 && (
              <>
                <Text style={styles.infoDivider}>•</Text>
                <View style={styles.scoreContainerCompact}>
                  <Text style={[styles.scoreValueCompact, { color: getScoreColor(item.cleanliness_score) }]}>
                    {item.cleanliness_score.toFixed(1)}/10
                  </Text>
                </View>
              </>
            )}
          </View>

          {(item.status === 'PROCESSING' || item.status === 'IN_PROGRESS') && (
            <View style={styles.processingBanner}>
              <ActivityIndicator size="small" color={colors.accent.info} />
              <Text style={styles.processingText}>AI analysis in progress...</Text>
            </View>
          )}

          {(item.status === 'FAILED' || statusDisplay.label === 'Cleaning Failed') && errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.accent.error} />
              <Text style={styles.errorText} numberOfLines={2}>{errorMessage}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>
            {isAssignment ? 'Start Inspection' : 'View Details'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary.main} />
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
      {/* Filters */}
      {inspections.length > 0 && (
        <View style={styles.filtersContainer}>
          {/* Property Dropdown */}
          <Modal
            visible={showPropertyDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPropertyDropdown(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowPropertyDropdown(false)}
            >
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedProperty('all');
                    setShowPropertyDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>All Properties</Text>
                  {selectedProperty === 'all' && (
                    <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
                {properties.map(property => (
                  <TouchableOpacity
                    key={property}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedProperty(property);
                      setShowPropertyDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{property}</Text>
                    {selectedProperty === property && (
                      <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          <View style={styles.filterRow}>
            {/* Property Filter Button */}
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowPropertyDropdown(true)}
            >
              <Ionicons name="business-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.filterButtonText}>
                {selectedProperty === 'all' ? 'All Properties' : selectedProperty}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
            </TouchableOpacity>

            {/* Date Filter Button */}
            <TouchableOpacity 
              style={[styles.filterButton, selectedDate && styles.filterButtonActive]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={selectedDate ? colors.primary.main : colors.text.secondary} />
              <Text style={[styles.filterButtonText, selectedDate && styles.filterButtonTextActive]}>
                {selectedDate ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'All Dates'}
              </Text>
              {selectedDate ? (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); clearDateFilter(); }}>
                  <Ionicons name="close-circle" size={16} color={colors.primary.main} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {inspections.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="document-text-outline" size={64} color={colors.primary.main} />
          </View>
          <Text style={styles.emptyTitle}>No inspections yet</Text>
          <Text style={styles.emptySubtext}>
            Your completed inspections will appear here
          </Text>
        </View>
      ) : filteredInspections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="filter-outline" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInspections}
          renderItem={renderInspection}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateInspection')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
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
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
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
  deleteButton: {
    padding: 4,
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
  cardBody: {
    padding: 14,
  },
  infoRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoTextSmall: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  infoDivider: {
    fontSize: 12,
    color: '#C7C7CC',
    opacity: 0.8,
  },
  scoreContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreValueCompact: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.12)',
    gap: 6,
  },
  processingText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.12)',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.12)',
  },
  viewDetailsText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: colors.primary.main + '15',
    borderColor: colors.primary.main,
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingHorizontal: 16,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
