import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import colors from '../../theme/colors';

export default function InspectionReportsScreen({ navigation }) {
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [filter, setFilter] = useState('all'); // all, COMPLETE, PROCESSING
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchInspections();
    }, [])
  );

  const fetchInspections = async () => {
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 second timeout
      );
      
      const apiPromise = api.get('/owner/inspections');
      const response = await Promise.race([apiPromise, timeoutPromise]);
      
      const validInspections = (response.data || []).filter(i => 
        i && 
        i.id && 
        i.unit && 
        i.unit.property &&
        i.creator
      );
      setInspections(validInspections);
      applyFilters(validInspections, filter);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      if (error.message === 'Request timeout') {
        Alert.alert(
          'Request Timeout',
          'The request took too long. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
      setInspections([]);
      setFilteredInspections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInspections();
  };

  const applyFilters = (data, selectedFilter) => {
    let filtered = [...data];
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(i => i.status === selectedFilter);
    }

    setFilteredInspections(filtered);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    applyFilters(inspections, newFilter);
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
              const updated = inspections.filter(i => i.id !== inspectionId);
              setInspections(updated);
              applyFilters(updated, filter);
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

  const renderInspection = ({ item }) => {
    if (!item || !item.id) {
      return null;
    }

    const propertyName = item.unit?.property?.name || 'Unknown Property';
    const unitName = item.unit?.name || 'Unknown Unit';
    const mediaCount = item._count?.media || 0;
    const issueCount = item._count?.issues || 0;
    const roomCount = item.unit?.rooms?.length || 0;
    const cleanerName = item.creator?.name || 'Unknown';
    const statusDisplay = getStatusDisplay(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('InspectionDetail', { inspectionId: item.id })}
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
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteInspection(item.id, propertyName);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.accent.error || '#F44336'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRowCompact}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.text.secondary || '#666'} />
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
                  <Ionicons name="bed-outline" size={14} color={colors.text.secondary || '#666'} />
                  <Text style={styles.infoTextSmall}>{roomCount}</Text>
                </View>
              </>
            )}
            
            <Text style={styles.infoDivider}>•</Text>
            <View style={styles.infoItem}>
              <Ionicons name="camera-outline" size={14} color={colors.text.secondary || '#666'} />
              <Text style={styles.infoTextSmall}>{mediaCount}</Text>
            </View>
          </View>

          <View style={styles.infoRowCompact}>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={14} color={colors.text.secondary || '#666'} />
              <Text style={styles.infoTextSmall}>{cleanerName}</Text>
            </View>
            
            {issueCount > 0 && (
              <>
                <Text style={styles.infoDivider}>•</Text>
                <View style={styles.infoItem}>
                  <Ionicons name="warning-outline" size={14} color="#FF9800" />
                  <Text style={[styles.infoTextSmall, { color: '#FF9800' }]}>{issueCount} issues</Text>
                </View>
              </>
            )}
          </View>

          {statusDisplay.label === 'COMPLETE' && item.cleanliness_score != null && (
            <View style={styles.scoreRow}>
              <View style={[styles.scoreChip, { backgroundColor: getScoreColor(item.cleanliness_score) + '15' }]}>
                <Ionicons name="star" size={14} color={getScoreColor(item.cleanliness_score)} />
                <Text style={[styles.scoreChipText, { color: getScoreColor(item.cleanliness_score) }]}>
                  {Number(item.cleanliness_score).toFixed(1)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#215EEA" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All ({inspections.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'COMPLETE' && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterChange('COMPLETE')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'COMPLETE' && styles.filterButtonTextActive,
            ]}
          >
            Complete
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'PROCESSING' && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterChange('PROCESSING')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'PROCESSING' && styles.filterButtonTextActive,
            ]}
          >
            Processing
          </Text>
        </TouchableOpacity>
      </View>

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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No inspections found</Text>
          </View>
        }
      />
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
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
    letterSpacing: -0.2,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
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
  cardBody: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.12)',
    paddingTop: 10,
  },
  infoRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
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
  empty: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 12,
    fontWeight: '400',
    letterSpacing: -0.4,
  },
});
