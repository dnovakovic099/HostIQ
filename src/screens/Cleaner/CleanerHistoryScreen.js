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
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';

const { width } = Dimensions.get('window');

// Premium color palette
const COLORS = {
  primary: '#6366F1',      // Indigo
  primaryDark: '#4F46E5',
  primaryLight: '#A5B4FC',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  processing: '#3B82F6',
  processingLight: '#DBEAFE',
  dark: '#1F2937',
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  border: '#E5E7EB',
  background: '#F8FAFC',
  card: '#FFFFFF',
};

export default function CleanerHistoryScreen({ navigation }) {
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0, pending: 0 });
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useFocusEffect(
    useCallback(() => {
      fetchInspections();
    }, [])
  );

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
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
      
      // Calculate stats
      const passed = combined.filter(i => i.status === 'COMPLETE' && i.airbnb_grade_analysis?.guest_ready).length;
      const failed = combined.filter(i => i.status === 'COMPLETE' && i.airbnb_grade_analysis?.guest_ready === false).length;
      const pending = combined.filter(i => i.status === 'PENDING' || i.status === 'PROCESSING').length;
      setStats({ total: combined.length, passed, failed, pending });

      // Extract unique properties
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
    slideAnim.setValue(30);
    fetchInspections();
  };

  const handleDeleteInspection = (inspectionId, propertyName) => {
    Alert.alert(
      'Delete Inspection',
      `Are you sure you want to delete this inspection at ${propertyName}?`,
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
              Alert.alert('Error', 'Failed to delete inspection');
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
    const isAppFailed = errorMsg.includes('blurred') || errorMsg.includes('technical') || errorMsg.includes('WRONG ROOM TYPE');

    if (status === 'FAILED' || isAppFailed) {
      return { label: 'Failed', colors: ['#FEE2E2', '#FECACA'], textColor: '#DC2626', icon: 'alert-circle', iconBg: '#FEE2E2' };
    }
    if (status === 'REJECTED') {
      return { label: 'Rejected', colors: ['#FED7AA', '#FDBA74'], textColor: '#C2410C', icon: 'close-circle', iconBg: '#FFEDD5' };
    }
    if (status === 'COMPLETE' && isGuestReady === false) {
      return { label: 'Needs Work', colors: ['#FEE2E2', '#FECACA'], textColor: '#DC2626', icon: 'warning', iconBg: '#FEE2E2' };
    }
    if (status === 'COMPLETE') {
      return { label: 'Passed', colors: ['#D1FAE5', '#A7F3D0'], textColor: '#059669', icon: 'checkmark-circle', iconBg: '#D1FAE5' };
    }
    if (status === 'PENDING') {
      return { label: 'Pending', colors: ['#FEF3C7', '#FDE68A'], textColor: '#D97706', icon: 'time', iconBg: '#FEF3C7' };
    }
    if (status === 'IN_PROGRESS' || status === 'PROCESSING') {
      return { label: 'Processing', colors: ['#DBEAFE', '#BFDBFE'], textColor: '#2563EB', icon: 'sync', iconBg: '#DBEAFE' };
    }
    return { label: status, colors: ['#F3F4F6', '#E5E7EB'], textColor: '#6B7280', icon: 'ellipse', iconBg: '#F3F4F6' };
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

  const renderStatsHeader = () => (
    <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsGradient}
      >
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#86EFAC' }]}>{stats.passed}</Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FCA5A5' }]}>{stats.failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FDE68A' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const handleInventoryPress = () => {
    // Get unique properties from inspections
    const uniqueProperties = [];
    const seen = new Set();
    
    inspections.forEach(insp => {
      if (insp.unit?.property?.id && !seen.has(insp.unit.property.id)) {
        seen.add(insp.unit.property.id);
        uniqueProperties.push({
          id: insp.unit.property.id,
          name: insp.unit.property.name
        });
      }
    });

    if (uniqueProperties.length === 0) {
      Alert.alert('No Properties', 'Complete an inspection to access inventory.');
      return;
    }

    if (uniqueProperties.length === 1) {
      // Navigate directly
      navigation.navigate('InventoryUpdate', {
        propertyId: uniqueProperties[0].id,
        propertyName: uniqueProperties[0].name
      });
    } else {
      // Show property picker
      Alert.alert(
        'Select Property',
        'Choose a property to update inventory',
        uniqueProperties.map(p => ({
          text: p.name,
          onPress: () => navigation.navigate('InventoryUpdate', {
            propertyId: p.id,
            propertyName: p.name
          })
        })).concat([{ text: 'Cancel', style: 'cancel' }])
      );
    }
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={styles.quickActionBtn}
        onPress={() => navigation.navigate('CleanerReports')}
      >
        <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.quickActionGradient}>
          <Ionicons name="bar-chart" size={20} color="#FFF" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Reports</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.quickActionBtn}
        onPress={handleInventoryPress}
      >
        <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.quickActionGradient}>
          <Ionicons name="cube" size={20} color="#FFF" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Inventory</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.quickActionBtn}
        onPress={() => navigation.navigate('PaymentSettings')}
      >
        <LinearGradient colors={['#10B981', '#059669']} style={styles.quickActionGradient}>
          <Ionicons name="card" size={20} color="#FFF" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Payments</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionBtn}
        onPress={() => setShowPropertyDropdown(true)}
      >
        <View style={[styles.quickActionGradient, { backgroundColor: '#F3F4F6' }]}>
          <Ionicons name="filter" size={20} color={COLORS.dark} />
        </View>
        <Text style={styles.quickActionText}>Filter</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInspectionCard = ({ item, index }) => {
    if (!item || !item.id) return null;

    const propertyName = item.unit?.property?.name || 'Property';
    const unitName = item.unit?.name || 'Unit';
    const isAssignment = item.type === 'ASSIGNMENT';
    const statusConfig = getStatusConfig(item);
    const mediaCount = item._count?.media || 0;
    const roomCount = item.unit?.rooms?.length || 0;
    const score = item.cleanliness_score;
    const scoreInfo = score > 0 ? getScoreGrade(score) : null;

    const handlePress = () => {
      if (isAssignment) {
        navigation.navigate('CaptureMedia', {
          assignment: { id: item.id, unit_id: item.unit?.id },
          propertyName,
          unitName,
          rooms: item.unit?.rooms || []
        });
      } else {
        navigation.navigate('InspectionDetail', { inspectionId: item.id, userRole: 'CLEANER' });
      }
    };

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, 30 + (index * 10)]
              })
            }]
          }
        ]}
      >
      <TouchableOpacity
          style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
      >
          {/* Status Accent Bar */}
          <LinearGradient
            colors={statusConfig.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statusBar}
          />

          <View style={styles.cardContent}>
            {/* Header Row */}
        <View style={styles.cardHeader}>
              <View style={styles.propertySection}>
                <View style={[styles.propertyIcon, { backgroundColor: statusConfig.iconBg }]}>
                  <Ionicons name="business" size={18} color={statusConfig.textColor} />
                </View>
          <View style={styles.propertyInfo}>
                  <Text style={styles.propertyName} numberOfLines={1}>{propertyName}</Text>
            <Text style={styles.unitName}>{unitName}</Text>
          </View>
            </View>

              <View style={styles.headerActions}>
            {!isAssignment && (
              <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteInspection(item.id, propertyName)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                    <Ionicons name="trash-outline" size={18} color={COLORS.lightGray} />
              </TouchableOpacity>
            )}
          </View>
        </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Ionicons name="time-outline" size={14} color={COLORS.gray} />
                <Text style={styles.statChipText}>{formatTimeAgo(item.created_at)}</Text>
            </View>
            
            {roomCount > 0 && (
                <View style={styles.statChip}>
                  <Ionicons name="bed-outline" size={14} color={COLORS.gray} />
                  <Text style={styles.statChipText}>{roomCount} rooms</Text>
                </View>
              )}
              
              <View style={styles.statChip}>
                <Ionicons name="images-outline" size={14} color={COLORS.gray} />
                <Text style={styles.statChipText}>{mediaCount}</Text>
              </View>
            </View>

            {/* Status & Score Row */}
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.colors[0] }]}>
                <Ionicons name={statusConfig.icon} size={14} color={statusConfig.textColor} />
                <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
                  {statusConfig.label}
                  </Text>
                </View>

              {scoreInfo && (
                <View style={[styles.scoreBadge, { backgroundColor: scoreInfo.color + '15' }]}>
                  <Text style={[styles.scoreGrade, { color: scoreInfo.color }]}>{scoreInfo.grade}</Text>
                  <Text style={[styles.scoreValue, { color: scoreInfo.color }]}>{score.toFixed(1)}</Text>
                </View>
              )}

              <View style={styles.arrowContainer}>
                <Text style={styles.actionText}>
                  {isAssignment ? 'Start' : 'View'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </View>
          </View>

            {/* Processing Indicator */}
          {(item.status === 'PROCESSING' || item.status === 'IN_PROGRESS') && (
              <View style={styles.processingBar}>
                <View style={styles.processingPulse}>
                  <ActivityIndicator size="small" color={COLORS.processing} />
                </View>
              <Text style={styles.processingText}>AI analysis in progress...</Text>
            </View>
          )}

            {/* Error Message */}
            {item.summary_json?.error && item.status === 'FAILED' && (
              <View style={styles.errorBar}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText} numberOfLines={2}>{item.summary_json.error}</Text>
            </View>
          )}
        </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['#EEF2FF', '#E0E7FF']}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="clipboard-outline" size={48} color={COLORS.primary} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Inspections Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start your first inspection by tapping the button below
          </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('CreateInspection')}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.emptyButtonText}>New Inspection</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
    );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading inspections...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredInspections}
        renderItem={renderInspectionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {renderStatsHeader()}
            {renderQuickActions()}
            {filteredInspections.length > 0 && (
              <Text style={styles.sectionTitle}>Recent Inspections</Text>
            )}
          </>
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateInspection')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Property Filter Modal */}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Property</Text>
                <TouchableOpacity
              style={[styles.modalOption, selectedProperty === 'all' && styles.modalOptionActive]}
              onPress={() => { setSelectedProperty('all'); setShowPropertyDropdown(false); }}
            >
              <Text style={[styles.modalOptionText, selectedProperty === 'all' && styles.modalOptionTextActive]}>
                All Properties
              </Text>
              {selectedProperty === 'all' && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
                {properties.map(property => (
                  <TouchableOpacity
                    key={property}
                style={[styles.modalOption, selectedProperty === property && styles.modalOptionActive]}
                onPress={() => { setSelectedProperty(property); setShowPropertyDropdown(false); }}
              >
                <Text style={[styles.modalOptionText, selectedProperty === property && styles.modalOptionTextActive]}>
                  {property}
                </Text>
                {selectedProperty === property && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
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
    backgroundColor: COLORS.background,
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
  listContent: {
    paddingBottom: 100,
  },
  // Stats Header
  statsContainer: {
    margin: 16,
    marginBottom: 8,
  },
  statsGradient: {
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  quickActionGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  // Card
  cardContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBar: {
    height: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertySection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statChipText: {
    fontSize: 13,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreGrade: {
    fontSize: 14,
    fontWeight: '800',
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Processing Bar
  processingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  processingPulse: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 13,
    color: COLORS.processing,
    fontWeight: '500',
  },
  // Error Bar
  errorBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.errorLight,
    borderRadius: 10,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
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
    backgroundColor: COLORS.primaryLight + '20',
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  modalOptionTextActive: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});
