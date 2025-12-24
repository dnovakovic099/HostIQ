import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/client';

export default function ValuableItemsScreen({ route, navigation }) {
  const { roomId, roomName, roomType, isPMS = false, propertyName } = route.params;
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [referencePhoto, setReferencePhoto] = useState(null);
  
  // Photo viewer
  const [viewingPhoto, setViewingPhoto] = useState(null);

  useEffect(() => {
    navigation.setOptions({
      title: `${roomName} Items`,
    });
    fetchItems();
  }, [roomId, roomName]);

  const fetchItems = async () => {
    try {
      const endpoint = isPMS 
        ? `/valuable-items/pms-room/${roomId}`
        : `/valuable-items/room/${roomId}`;
      
      const response = await api.get(endpoint);
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching valuable items:', error);
      Alert.alert('Error', 'Failed to load items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems();
  }, [roomId]);

  const openAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemDescription('');
    setReferencePhoto(null);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDescription(item.description || '');
    setReferencePhoto(item.reference_photo);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReferencePhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReferencePhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', itemName.trim());
      if (itemDescription.trim()) {
        formData.append('description', itemDescription.trim());
      }
      
      // Only add photo if it's a new local file (not a URL)
      if (referencePhoto && !referencePhoto.startsWith('http')) {
        formData.append('reference_photo', {
          uri: referencePhoto,
          type: 'image/jpeg',
          name: 'reference_photo.jpg',
        });
      }

      let endpoint;
      if (editingItem) {
        // Update existing item
        endpoint = isPMS 
          ? `/valuable-items/pms/${editingItem.id}`
          : `/valuable-items/${editingItem.id}`;
        await api.put(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Create new item
        endpoint = isPMS 
          ? `/valuable-items/pms-room/${roomId}`
          : `/valuable-items/room/${roomId}`;
        await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setModalVisible(false);
      fetchItems();
      Alert.alert('Success', editingItem ? 'Item updated' : 'Item added');
    } catch (error) {
      console.error('Save item error:', error);
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to remove "${item.name}"? This will also remove all verification history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const endpoint = isPMS 
                ? `/valuable-items/pms/${item.id}`
                : `/valuable-items/${item.id}`;
              await api.delete(endpoint);
              fetchItems();
            } catch (error) {
              console.error('Delete item error:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerInfo}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="shield-checkmark" size={24} color="#5856D6" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Valuable Items</Text>
          <Text style={styles.headerSubtitle}>
            {propertyName ? `${propertyName} • ` : ''}{roomName}
          </Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color="#3B82F6" />
        <Text style={styles.infoBannerText}>
          Add items you want verified during each cleaning. Cleaners will be required to photograph each item.
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Items Yet</Text>
            <Text style={styles.emptyText}>
              Add valuable items like TVs, game consoles, or expensive appliances that you want verified during each cleaning.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.emptyButtonText}>Add First Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.itemPhotoContainer}
                  onPress={() => item.reference_photo && setViewingPhoto(item.reference_photo)}
                >
                  {item.reference_photo ? (
                    <Image
                      source={{ uri: item.reference_photo }}
                      style={styles.itemPhoto}
                    />
                  ) : (
                    <View style={styles.noPhotoPlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#C7C7CC" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.itemMeta}>
                    <Ionicons name="camera-outline" size={12} color="#8E8E93" />
                    <Text style={styles.itemMetaText}>Photo required</Text>
                  </View>
                </View>
                
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="pencil" size={18} color="#4A90E2" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Button */}
      {items.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Item' : 'Add Valuable Item'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Reference Photo */}
              <Text style={styles.inputLabel}>Reference Photo</Text>
              <View style={styles.photoSection}>
                {referencePhoto ? (
                  <TouchableOpacity
                    style={styles.photoPreview}
                    onPress={() => setViewingPhoto(referencePhoto)}
                  >
                    <Image
                      source={{ uri: referencePhoto }}
                      style={styles.photoPreviewImage}
                    />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => setReferencePhoto(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.photoButtons}>
                    <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                      <Ionicons name="camera" size={24} color="#4A90E2" />
                      <Text style={styles.photoButtonText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                      <Ionicons name="images" size={24} color="#4A90E2" />
                      <Text style={styles.photoButtonText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.photoHint}>
                  Add a reference photo so cleaners know what the item should look like
                </Text>
              </View>

              {/* Item Name */}
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={setItemName}
                placeholder="e.g., 65-inch Samsung TV"
                placeholderTextColor="#8E8E93"
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={itemDescription}
                onChangeText={setItemDescription}
                placeholder="Any specific details, model number, or location info"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingItem ? 'Update' : 'Add Item'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={!!viewingPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingPhoto(null)}
      >
        <TouchableOpacity
          style={styles.photoViewerOverlay}
          activeOpacity={1}
          onPress={() => setViewingPhoto(null)}
        >
          <TouchableOpacity
            style={styles.photoViewerClose}
            onPress={() => setViewingPhoto(null)}
          >
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>
          {viewingPhoto && (
            <Image
              source={{ uri: viewingPhoto }}
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
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
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#5856D615',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  itemsList: {
    paddingTop: 8,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  itemPhotoContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  itemPhoto: {
    width: '100%',
    height: '100%',
  },
  noPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 6,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemMetaText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  itemActions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  photoSection: {
    marginTop: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginTop: 8,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  photoHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#5856D6',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Photo viewer
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  photoViewerImage: {
    width: '100%',
    height: '80%',
  },
});


