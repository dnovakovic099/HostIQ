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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';

const STATUS_CONFIG = {
  IN_STOCK: { label: 'In Stock', color: '#34C759', icon: 'checkmark-circle' },
  LOW: { label: 'Low', color: '#FF9500', icon: 'alert-circle' },
  OUT_OF_STOCK: { label: 'Out', color: '#FF3B30', icon: 'close-circle' },
  ORDERED: { label: 'Ordered', color: '#007AFF', icon: 'time' },
};

const CATEGORY_ICONS = {
  'Toiletries': 'water',
  'Linens': 'bed',
  'Kitchen': 'restaurant',
  'Cleaning': 'sparkles',
  'Essentials': 'flash',
};

export default function InventoryScreen({ route, navigation }) {
  const { propertyId, propertyName } = route.params;
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', min_threshold: '2', unit: 'units' });

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
      fetchCategories();
    }, [propertyId])
  );

  const fetchInventory = async () => {
    try {
      const params = selectedCategory ? `?category_id=${selectedCategory}` : '';
      const res = await api.get(`/inventory/properties/${propertyId}/items${params}`);
      setItems(res.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/inventory/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    try {
      await api.post(`/inventory/properties/${propertyId}/items`, {
        name: newItem.name,
        quantity: parseInt(newItem.quantity) || 0,
        min_threshold: parseInt(newItem.min_threshold) || 2,
        unit: newItem.unit,
        category_id: selectedCategory,
      });
      setShowAddModal(false);
      setNewItem({ name: '', quantity: '', min_threshold: '2', unit: 'units' });
      fetchInventory();
    } catch (error) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleRestock = async (itemId, itemName) => {
    Alert.alert(
      'Restock Item',
      `Mark ${itemName} as fully restocked?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restock',
          onPress: async () => {
            try {
              await api.post(`/inventory/items/${itemId}/restock`);
              fetchInventory();
            } catch (error) {
              Alert.alert('Error', 'Failed to restock item');
            }
          },
        },
      ]
    );
  };

  const handleDeleteItem = (itemId, itemName) => {
    Alert.alert(
      'Delete Item',
      `Remove ${itemName} from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/inventory/items/${itemId}`);
              fetchInventory();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const groupedItems = items.reduce((acc, item) => {
    const catName = item.category?.name || 'Uncategorized';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(item);
    return acc;
  }, {});

  // Count items needing attention
  const lowCount = items.filter(i => i.status === 'LOW').length;
  const outCount = items.filter(i => i.status === 'OUT_OF_STOCK').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      {(lowCount > 0 || outCount > 0) && (
        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle" size={20} color="#FF9500" />
          <Text style={styles.alertText}>
            {outCount > 0 && `${outCount} out of stock`}
            {outCount > 0 && lowCount > 0 && ' • '}
            {lowCount > 0 && `${lowCount} running low`}
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
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#34C75915' }]}>
            <Text style={[styles.statValue, { color: '#34C759' }]}>
              {items.filter(i => i.status === 'IN_STOCK').length}
            </Text>
            <Text style={styles.statLabel}>In Stock</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FF950015' }]}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>{lowCount}</Text>
            <Text style={styles.statLabel}>Low</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FF3B3015' }]}>
            <Text style={[styles.statValue, { color: '#FF3B30' }]}>{outCount}</Text>
            <Text style={styles.statLabel}>Out</Text>
          </View>
        </View>

        {/* Items by Category */}
        {Object.entries(groupedItems).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Inventory Items</Text>
            <Text style={styles.emptySubtitle}>
              Add items to track supplies for this property
            </Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addFirstButtonText}>Add First Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
            <View key={categoryName} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons 
                  name={CATEGORY_ICONS[categoryName] || 'cube'} 
                  size={18} 
                  color="#8E8E93" 
                />
                <Text style={styles.categoryTitle}>{categoryName}</Text>
                <Text style={styles.categoryCount}>{categoryItems.length}</Text>
              </View>
              
              {categoryItems.map(item => {
                const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.IN_STOCK;
                const needsAttention = item.status === 'LOW' || item.status === 'OUT_OF_STOCK';
                
                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.itemCard,
                      needsAttention && styles.itemCardAlert
                    ]}
                  >
                    <View style={styles.itemMain}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.itemMeta}>
                          <Text style={styles.itemQuantity}>
                            {item.quantity} {item.unit}
                          </Text>
                          <Text style={styles.metaDot}>·</Text>
                          <Text style={styles.itemThreshold}>
                            Min: {item.min_threshold}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.itemStatus}>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                          <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {needsAttention && (
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.restockButton}
                          onPress={() => handleRestock(item.id, item.name)}
                        >
                          <Ionicons name="refresh" size={16} color="#007AFF" />
                          <Text style={styles.restockButtonText}>Restock</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteItem(item.id, item.name)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#C7C7CC" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Item</Text>
            <TouchableOpacity onPress={handleAddItem}>
              <Text style={styles.modalSave}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.input}
                value={newItem.name}
                onChangeText={(text) => setNewItem(prev => ({ ...prev, name: text }))}
                placeholder="e.g., Toilet Paper"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={newItem.quantity}
                  onChangeText={(text) => setNewItem(prev => ({ ...prev, quantity: text }))}
                  placeholder="0"
                  keyboardType="number-pad"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={newItem.unit}
                  onChangeText={(text) => setNewItem(prev => ({ ...prev, unit: text }))}
                  placeholder="units"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minimum Threshold</Text>
              <TextInput
                style={styles.input}
                value={newItem.min_threshold}
                onChangeText={(text) => setNewItem(prev => ({ ...prev, min_threshold: text }))}
                placeholder="2"
                keyboardType="number-pad"
                placeholderTextColor="#C7C7CC"
              />
              <Text style={styles.inputHint}>Alert when quantity falls below this</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryPicker}>
                {['Toiletries', 'Linens', 'Kitchen', 'Cleaning', 'Essentials'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && styles.categoryChipActive
                    ]}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  >
                    <Ionicons 
                      name={CATEGORY_ICONS[cat]} 
                      size={16} 
                      color={selectedCategory === cat ? '#FFF' : '#8E8E93'} 
                    />
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === cat && styles.categoryChipTextActive
                    ]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  scrollContent: {
    paddingTop: 8,
  },
  // Alert Banner
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
  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  // Category Section
  categorySection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    flex: 1,
  },
  categoryCount: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  // Item Card
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    position: 'relative',
  },
  itemCardAlert: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  itemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#8E8E93',
  },
  metaDot: {
    fontSize: 14,
    color: '#C7C7CC',
  },
  itemThreshold: {
    fontSize: 14,
    color: '#C7C7CC',
  },
  itemStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemActions: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF15',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  restockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  deleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 16,
    marginTop: 20,
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
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    gap: 6,
  },
  addFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomPadding: {
    height: 100,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  modalCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  modalSave: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#000',
  },
  inputHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#000',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
});


