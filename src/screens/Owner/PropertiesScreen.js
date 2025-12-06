import React, { useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';

const COLORS = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  primary: '#4A90E2',
  pms: '#4A90E2', // HostIQ Blue for PMS badges
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

export default function PropertiesScreen({ navigation }) {
  const [properties, setProperties] = useState([]);
  const [pmsProperties, setPmsProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const lastFetchTime = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchTime.current > 30000 || lastFetchTime.current === 0) {
        lastFetchTime.current = now;
        fetchProperties();
      }
    }, [])
  );

  const fetchProperties = async () => {
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
  };

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
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {isPMS && (
              <View style={styles.pmsBadge}>
                <Ionicons name="cloud" size={10} color={COLORS.pms} />
                <Text style={styles.pmsBadgeText}>{item.pmsProvider}</Text>
              </View>
            )}
            <Text style={styles.propertyName} numberOfLines={2}>{name}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item, isPMS)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Address */}
        <Text style={styles.address} numberOfLines={2}>{address}</Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          {/* Stats */}
          <View style={styles.stats}>
            {!isPMS && unitCount > 0 && (
              <View style={styles.statPill}>
                <Ionicons name="layers-outline" size={14} color={COLORS.textSecondary} />
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
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="home-outline" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>No Properties Yet</Text>
      <Text style={styles.emptyText}>
        Add your first property to start managing cleanings
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('CreateProperty')}
      >
        <Text style={styles.emptyButtonText}>Add Property</Text>
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
      {/* Search */}
      {hasProperties && (
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
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

      {/* FAB */}
      {hasProperties && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateProperty')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[COLORS.primary, '#3D7FD9']}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
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
  // Search
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
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
    paddingBottom: 100,
  },
  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
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
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  pmsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  pmsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.pms,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  propertyName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 22,
  },
  deleteBtn: {
    padding: 4,
  },
  address: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
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
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
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
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
