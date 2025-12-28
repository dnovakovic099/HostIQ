import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';

// Luxury Blue Color Palette
const COLORS = {
  bg: '#F8F9FA',
  card: '#FFFFFF',
  primary: '#0A7AFF',
  pms: '#0A7AFF', // Luxury Blue for PMS badges
  text: '#1C1C1E',
  textSecondary: '#6C6C70',
  textMuted: '#AEAEB2',
  border: '#E5E5EA',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

export default function PropertiesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [properties, setProperties] = useState([]);
  const [pmsProperties, setPmsProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const lastFetchTime = useRef(0);
  
  // Tab bar height: 60px (TAB_BAR_HEIGHT) + 50px (dipDepth) + safe area bottom
  const tabBarHeight = 110 + insets.bottom;

  const fetchProperties = useCallback(async () => {
    try {
      const response = await api.get('/owner/properties');
      if (response.data.manualProperties) {
        setProperties(response.data.manualProperties);
        setPmsProperties(response.data.pmsProperties || []);
      } else {
        setProperties(response.data);
        setPmsProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on initial mount
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Also fetch on focus (with debounce)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchTime.current > 30000 || lastFetchTime.current === 0) {
        lastFetchTime.current = now;
        fetchProperties();
      }
    }, [fetchProperties])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProperties();
  };

  const handleDelete = (item, isPMS = false) => {
    const name = isPMS ? item.name : item.name;
    Alert.alert(
      'Delete Property',
      `Delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isPMS) {
                await api.delete(`/pms/properties/${item.id}`);
              } else {
                await api.delete(`/owner/properties/${item.id}`);
              }
              fetchProperties();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const getFiltered = (list, isPMS = false) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(p => {
      const name = (isPMS ? (p.nickname || p.name) : p.name || '').toLowerCase();
      const address = (p.address || '').toLowerCase();
      return name.includes(q) || address.includes(q);
    });
  };

  // Combine all properties for unified list
  const getAllProperties = () => {
    const pms = getFiltered(pmsProperties, true).map(p => ({ ...p, _isPMS: true }));
    const manual = getFiltered(properties, false).map(p => ({ ...p, _isPMS: false }));
    return [...pms, ...manual];
  };

  const renderProperty = ({ item }) => {
    const isPMS = item._isPMS;
    const name = isPMS ? (item.nickname || item.name) : item.name;
    const address = item.address || item.city || '';
    const unitCount = item._count?.units || 0;
    const hasWarning = item.hasLowRating;
    const rating = item.rating;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PropertyDetail', { 
          propertyId: item.id,
          isPMS: isPMS 
        })}
        activeOpacity={0.7}
      >
        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item, isPMS)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={['#D4E8FF', '#B8DAFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.propertyIcon}
          >
            <Ionicons name="home" size={18} color={COLORS.primary} />
          </LinearGradient>
          
          <View style={styles.cardHeaderContent}>
            {isPMS && (
              <LinearGradient
                colors={['#0A7AFF', '#0056D6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pmsBadge}
              >
                <Ionicons name="cloud" size={9} color="#FFFFFF" />
                <Text style={styles.pmsBadgeText}>{item.pmsProvider}</Text>
              </LinearGradient>
            )}
            <Text style={styles.propertyName} numberOfLines={2}>{name}</Text>
            <Text style={styles.address} numberOfLines={2}>{address}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          {/* Stats */}
          <View style={styles.stats}>
            {!isPMS && unitCount > 0 && (
              <View style={styles.statPill}>
                <Ionicons name="layers-outline" size={14} color={COLORS.primary} />
                <Text style={styles.statText}>{unitCount} unit{unitCount !== 1 ? 's' : ''}</Text>
              </View>
            )}
            {rating && !hasWarning && (
              <View style={styles.statPill}>
                <Ionicons name="star" size={14} color="#FBBF24" />
                <Text style={styles.statText}>{rating}</Text>
              </View>
            )}
            {hasWarning && (
              <View style={[styles.statPill, styles.warningPill]}>
                <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                <Text style={[styles.statText, { color: COLORS.error }]}>{rating}</Text>
              </View>
            )}
          </View>

          {/* Arrow */}
          <View style={styles.arrowButton}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['#DBEAFE', '#BFDBFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.emptyIcon}
      >
        <Ionicons name="home-outline" size={48} color={COLORS.primary} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Properties Yet</Text>
      <Text style={styles.emptyText}>
        Add your first property to start managing cleanings
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('CreateProperty')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#60A5FA', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Add Property</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingView}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const allProperties = getAllProperties();
  const hasProperties = properties.length > 0 || pmsProperties.length > 0;

  return (
    <View style={styles.container}>
      {/* Header Gradient */}
      <LinearGradient
        colors={['#0A7AFF', '#0056D6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={styles.headerWrapper}
      >
        <SafeAreaView>
          <View style={styles.headerGradient}>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name="business" size={24} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>My Properties</Text>
              <Text style={styles.headerSubtitle}>
                {allProperties.length} {allProperties.length === 1 ? 'property' : 'properties'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Search */}
      {hasProperties && allProperties.length > 0 && (
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search properties..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={allProperties}
        renderItem={renderProperty}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={hasProperties ? (
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.noResultsText}>No properties found</Text>
          </View>
        ) : renderEmpty}
      />

      {/* FAB - Always show to allow adding properties */}
      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight }]}
        onPress={() => navigation.navigate('CreateProperty')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#0A7AFF', '#0056D6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  // Header Gradient
  headerWrapper: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 18,
  },
  headerIconWrapper: {
    marginRight: 14,
  },
  headerIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  // Search
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    
  },
  // List
  listContent: {
    padding: 16,
    paddingBottom: 180,
  },
  // Card
  card: {
    position: 'relative',
    backgroundColor: COLORS.card,
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
  deleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardHeaderContent: {
    flex: 1,
    paddingRight: 32,
  },
  pmsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  pmsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  propertyName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
  },
  warningPill: {
    backgroundColor: '#FEF2F2',
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  // FAB - refined sizing
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fabGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
