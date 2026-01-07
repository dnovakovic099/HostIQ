import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';

const STATUS_CONFIG = {
  IN_STOCK: { label: 'OK', color: '#34C759', icon: 'checkmark-circle' },
  LOW: { label: 'Low', color: '#FF9500', icon: 'alert-circle' },
  OUT_OF_STOCK: { label: 'Out', color: '#FF3B30', icon: 'close-circle' },
  ORDERED: { label: 'Ordered', color: '#007AFF', icon: 'time' },
};

export default function InventoryUpdateScreen({ route, navigation }) {
  const { propertyId, propertyName, inspectionId } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedItems, setUpdatedItems] = useState({}); // Track local updates
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [propertyId])
  );

  const fetchInventory = async () => {
    try {
      const res = await api.get(`/inventory/properties/${propertyId}/items`);
      setItems(res.data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      
      // Handle 404 - property not found or access denied
      if (error.response?.status === 404) {
        setItems([]);
        // Show alert on refresh, not initial load
        if (!loading && refreshing) {
          Alert.alert(
            'Inventory Not Available',
            'This property is not accessible or has no inventory set up yet.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Other errors
        if (!loading && refreshing) {
          Alert.alert(
            'Error Loading Inventory',
            'Failed to load inventory items. Please try again.',
            [{ text: 'OK' }]
          );
        }
        setItems([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const handleMarkLow = async (item) => {
    try {
      await api.post(`/inventory/items/${item.id}/mark-low`, {
        notes: inspectionId ? `Noted during inspection` : 'Marked by cleaner'
      });
      
      // Update local state
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'LOW' } : i
      ));
      setUpdatedItems(prev => ({ ...prev, [item.id]: 'LOW' }));
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const handleUpdateQuantity = async (item, newQty) => {
    if (newQty < 0) return;
    
    try {
      const res = await api.post(`/inventory/items/${item.id}/update-quantity`, {
        new_quantity: newQty,
        reason: 'Updated by cleaner',
        inspection_id: inspectionId
      });
      
      // Update local state
      setItems(prev => prev.map(i => 
        i.id === item.id ? res.data.item : i
      ));
      setUpdatedItems(prev => ({ ...prev, [item.id]: newQty }));
    } catch (error) {
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const handleDone = () => {
    const updateCount = Object.keys(updatedItems).length;
    
    // If we came from inspection flow (inspectionId present), go to CleanerHome
    // Otherwise, just go back to where we came from
    const navigateAway = () => {
      if (inspectionId) {
        navigation.replace('CleanerHome');
      } else {
        navigation.goBack();
      }
    };
    
    if (updateCount > 0) {
      Alert.alert(
        'Updates Saved',
        `${updateCount} item${updateCount > 1 ? 's' : ''} updated successfully`,
        [{ text: 'OK', onPress: navigateAway }]
      );
    } else {
      navigateAway();
    }
  };

  // Sort items to show low/out-of-stock first
  const sortedItems = [...items].sort((a, b) => {
    const priority = { OUT_OF_STOCK: 0, LOW: 1, ORDERED: 2, IN_STOCK: 3 };
    return (priority[a.status] || 3) - (priority[b.status] || 3);
  });

  const needsAttentionCount = items.filter(
    i => i.status === 'LOW' || i.status === 'OUT_OF_STOCK'
  ).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.propertyName}>{propertyName}</Text>
        <Text style={styles.headerSubtitle}>
          Tap items to mark as low or update quantity
        </Text>
      </View>

      {needsAttentionCount > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle" size={18} color="#FF9500" />
          <Text style={styles.alertText}>
            {needsAttentionCount} item{needsAttentionCount > 1 ? 's need' : ' needs'} attention
          </Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#007AFF" />
        }
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Inventory</Text>
            <Text style={styles.emptySubtitle}>
              The owner hasn't set up inventory for this property yet
            </Text>
          </View>
        ) : (
          sortedItems.map(item => {
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.IN_STOCK;
            const needsAttention = item.status === 'LOW' || item.status === 'OUT_OF_STOCK';
            const wasUpdated = updatedItems[item.id] !== undefined;

            return (
              <View 
                key={item.id} 
                style={[
                  styles.itemCard,
                  needsAttention && styles.itemCardAlert,
                  wasUpdated && styles.itemCardUpdated
                ]}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {wasUpdated && (
                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                      )}
                    </View>
                    <Text style={styles.itemUnit}>
                      {item.quantity} {item.unit} • Min: {item.min_threshold}
                    </Text>
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                    <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                  {/* Quantity Adjuster */}
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => handleUpdateQuantity(item, item.quantity - 1)}
                      disabled={item.quantity === 0}
                    >
                      <Ionicons 
                        name="remove" 
                        size={20} 
                        color={item.quantity === 0 ? '#C7C7CC' : '#007AFF'} 
                      />
                    </TouchableOpacity>
                    
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => handleUpdateQuantity(item, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Mark as Low button */}
                  {item.status === 'IN_STOCK' && (
                    <TouchableOpacity
                      style={styles.markLowButton}
                      onPress={() => handleMarkLow(item)}
                    >
                      <Ionicons name="alert-circle-outline" size={16} color="#FF9500" />
                      <Text style={styles.markLowText}>Mark Low</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {item.location && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color="#8E8E93" />
                    <Text style={styles.locationText}>{item.location}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Done Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
        >
          <Text style={styles.doneButtonText}>
            {Object.keys(updatedItems).length > 0 
              ? `Done (${Object.keys(updatedItems).length} updated)` 
              : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  // Header
  header: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  propertyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  // Alert
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF950015',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
  },
  // Item Card
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemCardAlert: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  itemCardUpdated: {
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  itemUnit: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 4,
  },
  qtyButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  qtyValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    minWidth: 40,
    textAlign: 'center',
  },
  markLowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF950015',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  markLowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
  },
  // Footer
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomPadding: {
    height: 20,
  },
});

