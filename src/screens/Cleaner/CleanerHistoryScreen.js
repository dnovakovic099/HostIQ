import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';

const { width } = Dimensions.get('window');

export default function CleanerHistoryScreen({ navigation }) {
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0, pending: 0 });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fetchInspections();
    }, [])
  );

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  useEffect(() => {
    filterInspections();
  }, [selectedProperty, inspections]);

  const fetchInspections = async () => {
    try {
      const [assignmentsResponse, inspectionsResponse] = await Promise.all([
        api.get('/cleaner/assignments'),
        api.get('/cleaner/inspections')
      ]);

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
            property: { name: String(a.unit?.property?.name || 'Property') },
            rooms: a.unit?.rooms || []
          },
          _count: { media: 0 }
        }));

      const inspectionsList = inspectionsResponse.data
        .filter(i => i && (i.media?.length || 0) > 0)
        .map(i => ({
          id: String(i.id || ''),
          type: 'INSPECTION',
          status: String(i.status || 'UNKNOWN'),
          created_at: i.created_at || new Date().toISOString(),
          cleanliness_score: Number(i.cleanliness_score || 0),
          unit: {
            name: String(i.unit?.name || 'Unit'),
            property: { name: String(i.unit?.property?.name || 'Property') },
            rooms: i.unit?.rooms || []
          },
          _count: { media: Number(i._count?.media || 0) },
          summary_json: i.summary_json || null,
          airbnb_grade_analysis: i.airbnb_grade_analysis || null
        }));

      const combined = [...assignments, ...inspectionsList].sort((a, b) => {
        const priorityA = a.status === 'PENDING' ? 0 : (a.status === 'IN_PROGRESS' || a.status === 'PROCESSING') ? 1 : 2;
        const priorityB = b.status === 'PENDING' ? 0 : (b.status === 'IN_PROGRESS' || b.status === 'PROCESSING') ? 1 : 2;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setInspections(combined);
      
      const passed = combined.filter(i => i.status === 'COMPLETE' && i.airbnb_grade_analysis?.guest_ready).length;
      const failed = combined.filter(i => i.status === 'COMPLETE' && i.airbnb_grade_analysis?.guest_ready === false).length;
      const pending = combined.filter(i => i.status === 'PENDING' || i.status === 'PROCESSING').length;
      setStats({ total: combined.length, passed, failed, pending });

      const uniqueProperties = [...new Set(combined.map(i => i.unit?.property?.name).filter(Boolean))];
      setProperties(uniqueProperties);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterInspections = () => {
    if (selectedProperty === 'all') {
      setFilteredInspections(inspections);
    } else {
      setFilteredInspections(inspections.filter(i => i.unit?.property?.name === selectedProperty));
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fadeAnim.setValue(0);
    fetchInspections();
  };

  const handleDeleteInspection = (inspectionId, propertyName) => {
    Alert.alert(
      'Delete Inspection',
      `Delete this inspection at ${propertyName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/cleaner/inspections/${inspectionId}`);
              setInspections(prev => prev.filter(i => i.id !== inspectionId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const getStatusConfig = (item) => {
    const status = item.status;
    const isGuestReady = item.airbnb_grade_analysis?.guest_ready;
    const errorMsg = item.summary_json?.error || '';
    const isAppFailed = errorMsg.includes('blurred') || errorMsg.includes('technical');

    if (status === 'FAILED' || isAppFailed) {
      return { label: 'Failed', bg: '#FEF2F2', color: '#DC2626', icon: 'close-circle' };
    }
    if (status === 'REJECTED') {
      return { label: 'Rejected', bg: '#FFF7ED', color: '#EA580C', icon: 'close-circle' };
    }
    if (status === 'COMPLETE' && isGuestReady === false) {
      return { label: 'Needs Review', bg: '#FFFBEB', color: '#D97706', icon: 'alert-circle' };
    }
    if (status === 'COMPLETE') {
      return { label: 'Passed', bg: '#F0FDF4', color: '#16A34A', icon: 'checkmark-circle' };
    }
    if (status === 'PENDING') {
      return { label: 'Ready', bg: '#EFF6FF', color: '#2563EB', icon: 'play-circle' };
    }
    if (status === 'IN_PROGRESS' || status === 'PROCESSING') {
      return { label: 'Processing', bg: '#E3F2FD', color: '#4A90E2', icon: 'sync' };
    }
    return { label: status, bg: '#F3F4F6', color: '#6B7280', icon: 'ellipse' };
  };

  const getScoreDisplay = (score) => {
    if (!score || score <= 0) return null;
    if (score >= 9) return { grade: 'A+', color: '#16A34A', bg: '#F0FDF4' };
    if (score >= 8) return { grade: 'A', color: '#22C55E', bg: '#F0FDF4' };
    if (score >= 7) return { grade: 'B', color: '#EAB308', bg: '#FEFCE8' };
    if (score >= 6) return { grade: 'C', color: '#F97316', bg: '#FFF7ED' };
    return { grade: 'D', color: '#EF4444', bg: '#FEF2F2' };
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

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.statValue, { color: '#16A34A' }]}>{stats.passed}</Text>
          <Text style={styles.statLabel}>Passed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
          <Text style={[styles.statValue, { color: '#D97706' }]}>{stats.failed}</Text>
          <Text style={styles.statLabel}>Review</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.statValue, { color: '#2563EB' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => navigation.navigate('CleanerReports')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="stats-chart" size={20} color="#2563EB" />
          </View>
          <Text style={styles.actionText}>Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => navigation.navigate('PaymentSettings')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="wallet" size={20} color="#16A34A" />
          </View>
          <Text style={styles.actionText}>Payments</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => setShowPropertyDropdown(true)}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="funnel" size={20} color="#4A90E2" />
          </View>
          <Text style={styles.actionText}>
            {selectedProperty === 'all' ? 'Filter' : 'Filtered'}
          </Text>
        </TouchableOpacity>
      </View>

      {filteredInspections.length > 0 && (
        <Text style={styles.sectionTitle}>Recent Inspections</Text>
      )}
    </View>
  );

  const renderCard = ({ item }) => {
    if (!item?.id) return null;

    const propertyName = item.unit?.property?.name || 'Property';
    const unitName = item.unit?.name || 'Unit';
    const isAssignment = item.type === 'ASSIGNMENT';
    const status = getStatusConfig(item);
    const score = getScoreDisplay(item.cleanliness_score);
    const mediaCount = item._count?.media || 0;
    const roomCount = item.unit?.rooms?.length || 0;

    const handlePress = () => {
      if (isAssignment) {
        navigation.navigate('CaptureMedia', {
          assignment: { id: item.id, unit_id: item.unit?.id },
          propertyName,
          unitName,
          unitId: item.unit?.id,
          rooms: item.unit?.rooms || []
        });
      } else {
        navigation.navigate('InspectionDetail', { inspectionId: item.id, userRole: 'CLEANER' });
      }
    };

    return (
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
        {/* Top Row: Property & Delete */}
        <View style={styles.cardTop}>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName} numberOfLines={1}>{propertyName}</Text>
            <Text style={styles.unitName}>{unitName}</Text>
          </View>
          {!isAssignment && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteInspection(item.id, propertyName)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
          </View>
          {roomCount > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="bed-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText}>{roomCount}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="camera-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{mediaCount}</Text>
          </View>
        </View>

        {/* Bottom Row: Status, Score, Action */}
        <View style={styles.cardBottom}>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>

          {score && (
            <View style={[styles.scorePill, { backgroundColor: score.bg }]}>
              <Text style={[styles.scoreGrade, { color: score.color }]}>{score.grade}</Text>
              <Text style={[styles.scoreNum, { color: score.color }]}>
                {item.cleanliness_score.toFixed(1)}
              </Text>
            </View>
          )}

          <View style={styles.actionArrow}>
            <Text style={styles.actionLabel}>{isAssignment ? 'Start' : 'View'}</Text>
            <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
          </View>
        </View>

        {/* Processing Indicator */}
        {(item.status === 'PROCESSING' || item.status === 'IN_PROGRESS') && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.processingText}>AI analyzing photos...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="camera-outline" size={48} color="#4A90E2" />
      </View>
      <Text style={styles.emptyTitle}>No Inspections Yet</Text>
      <Text style={styles.emptyText}>
        Tap the + button to start your first cleaning inspection
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingView}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={filteredInspections}
          renderItem={renderCard}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4A90E2" />
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateInspection')}
        activeOpacity={0.9}
      >
        <LinearGradient colors={['#4A90E2', '#3D7FD9']} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={showPropertyDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPropertyDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowPropertyDropdown(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter by Property</Text>
            
            <TouchableOpacity
              style={[styles.modalOption, selectedProperty === 'all' && styles.modalOptionActive]}
              onPress={() => { setSelectedProperty('all'); setShowPropertyDropdown(false); }}
            >
              <Text style={[styles.modalOptionText, selectedProperty === 'all' && styles.modalOptionTextActive]}>
                All Properties
              </Text>
              {selectedProperty === 'all' && <Ionicons name="checkmark" size={20} color="#4A90E2" />}
            </TouchableOpacity>

            {properties.map(prop => (
              <TouchableOpacity
                key={prop}
                style={[styles.modalOption, selectedProperty === prop && styles.modalOptionActive]}
                onPress={() => { setSelectedProperty(prop); setShowPropertyDropdown(false); }}
              >
                <Text style={[styles.modalOptionText, selectedProperty === prop && styles.modalOptionTextActive]}>
                  {prop}
                </Text>
                {selectedProperty === prop && <Ionicons name="checkmark" size={20} color="#4A90E2" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: 100,
  },
  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  // Card
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  unitName: {
    fontSize: 13,
    color: '#6B7280',
  },
  deleteBtn: {
    padding: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  scoreGrade: {
    fontSize: 12,
    fontWeight: '700',
  },
  scoreNum: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  processingText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 18,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  modalOptionTextActive: {
    fontWeight: '600',
    color: '#4A90E2',
  },
});
