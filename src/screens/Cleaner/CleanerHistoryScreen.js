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
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';

const { width } = Dimensions.get('window');

// Modern color palette matching OwnerDashboard
const COLORS = {
  background: '#F1F5F9',
  card: '#FFFFFF',
  cardBorder: 'rgba(15, 23, 42, 0.08)',
  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
  accent: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  divider: '#E2E8F0',
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
  const [userName, setUserName] = useState('Cleaner');
  
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

      // Fetch user name
      try {
        const userRes = await api.get('/auth/me');
        if (userRes.data && userRes.data.name) {
          setUserName(userRes.data.name.split(' ')[0]);
        }
      } catch (error) {
        console.log('Could not fetch user name:', error);
      }
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

  // No need for separate renderHeader, we'll build it inline

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
              <Ionicons name="trash-outline" size={18} color="red" />
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
      <View style={styles.emptyIconWrapper}>
        <Ionicons name="camera-outline" size={32} color={COLORS.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Inspections Yet</Text>
      <Text style={styles.emptySubtitle}>
        Assigned cleanings will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingView}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Welcome Header */}
        <LinearGradient
          colors={['#EBF4FF', '#F8FBFF', COLORS.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeSection}
        >
          {/* Decorative circles */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />

          {/* Cleaner-themed icons */}
          <Ionicons name="home" size={80} color="rgba(37, 86, 165, 0.05)" style={styles.decorativeIcon1} />
          <Ionicons name="build" size={60} color="rgba(16, 125, 89, 0.04)" style={styles.decorativeIcon2} />

          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeGreeting}>Hello! </Text>
            <Text style={styles.welcomeName}>{userName}</Text>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: COLORS.card }]}>
              <View style={styles.statContent}>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total Cleanings</Text>
                  <Text style={styles.statDescription}>All assignments</Text>
                </View>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
                  style={styles.statIconWrapper}
                >
                  <Ionicons name="calendar" size={20} color={COLORS.accent} />
                </LinearGradient>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: COLORS.card }]}>
              <View style={styles.statContent}>
                <View style={styles.statTextContainer}>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.passed}</Text>
                  <Text style={styles.statLabel}>Passed</Text>
                  <Text style={styles.statDescription}>Guest-ready</Text>
                </View>
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
                  style={styles.statIconWrapper}
                >
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                </LinearGradient>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: COLORS.card }]}>
              <View style={styles.statContent}>
                <View style={styles.statTextContainer}>
                  <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.failed}</Text>
                  <Text style={styles.statLabel}>Needs Work</Text>
                  <Text style={styles.statDescription}>Not guest-ready</Text>
                </View>
                <LinearGradient
                  colors={['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.05)']}
                  style={styles.statIconWrapper}
                >
                  <Ionicons name="construct-outline" size={20} color={COLORS.warning} />
                </LinearGradient>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: COLORS.card }]}>
              <View style={styles.statContent}>
                <View style={styles.statTextContainer}>
                  <Text style={[styles.statValue, { color: COLORS.accent }]}>{stats.pending}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={styles.statDescription}>To be done</Text>
                </View>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
                  style={styles.statIconWrapper}
                >
                  <Ionicons name="time" size={20} color={COLORS.accent} />
                </LinearGradient>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActions}>
          <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('CreateInspection')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7F9AC0', '#5F7FA3']}
               style={styles.quickActionCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('CleanerReports')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionCircle, { backgroundColor: '#A8D5E2' }]}>
                <Ionicons name="stats-chart" size={24} color="#2C6B7F" />
              </View>
              <Text style={styles.quickActionText}>Reports</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('PaymentSettings')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionCircle, { backgroundColor: '#C4E8C2' }]}>
                <Ionicons name="wallet" size={22} color="#3A7B37" />
              </View>
              <Text style={styles.quickActionText}>Payments</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => setShowPropertyDropdown(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionCircle, { backgroundColor: '#C4D7FF' }]}>
                <Ionicons name="funnel" size={22} color="#4A6FA5" />
              </View>
              <Text style={styles.quickActionText}>
                {selectedProperty === 'all' ? 'Filter' : 'Filtered'}
              </Text>
            </TouchableOpacity>

           
          </View>
        </View>

        {/* Recent Inspections Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Inspections</Text>
              <View style={styles.sectionTitleUnderline} />
            </View>
          </View>

          {filteredInspections.length === 0 ? (
            renderEmpty()
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              {filteredInspections.map(item => renderCard({ item }))}
            </Animated.View>
          )}
        </View>
      </ScrollView>

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
    backgroundColor: COLORS.background,
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Welcome Header
  welcomeSection: {
    paddingHorizontal: 24,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 40 : 60,
    paddingBottom: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    top: -60,
    right: -40,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    bottom: -30,
    left: -30,
  },
  decorativeIcon1: {
    position: 'absolute',
    top: 40,
    right: 30,
  },
  decorativeIcon2: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    zIndex: 1,
  },
  welcomeGreeting: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.text.secondary,
  },
  welcomeName: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  // Stats Section
  statsSection: {
    paddingHorizontal: 16,
    marginTop: -16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  statDescription: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },

  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 24,
    marginVertical: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: 0.3,
  },
  sectionTitleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginTop: 4,
  },
  // Card
  card: {
    backgroundColor: COLORS.card,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  unitName: {
    fontSize: 14,
    color: COLORS.text.secondary,
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
    color: COLORS.text.tertiary,
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
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: '600',
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
    color: COLORS.accent,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    padding: 8,
    borderRadius: 8,
  },
  processingText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '500',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
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
