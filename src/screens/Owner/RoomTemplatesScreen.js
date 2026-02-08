import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';

const ROOM_TYPES = [
  { value: 'bedroom', label: 'Bedroom', icon: 'bed' },
  { value: 'bathroom', label: 'Bathroom', icon: 'water' },
  { value: 'kitchen', label: 'Kitchen', icon: 'restaurant' },
  { value: 'living_room', label: 'Living Room', icon: 'tv' },
  { value: 'dining_room', label: 'Dining Room', icon: 'wine' },
  { value: 'office', label: 'Office', icon: 'briefcase' },
  { value: 'laundry', label: 'Laundry', icon: 'shirt' },
  { value: 'outdoor', label: 'Outdoor', icon: 'sunny' },
  { value: 'garage', label: 'Garage', icon: 'car' },
  { value: 'hallway', label: 'Hallway', icon: 'git-compare' },
  { value: 'storage', label: 'Storage', icon: 'cube' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function RoomTemplatesScreen({ navigation }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState('bedroom');
  const [tips, setTips] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showRoomTypePicker, setShowRoomTypePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTemplates();
    }, [])
  );

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/room-templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      Alert.alert('Error', 'Failed to load room templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setName('');
    setRoomType('bedroom');
    setTips('');
    setIsDefault(false);
    setModalVisible(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setName(template.name);
    setRoomType(template.room_type);
    setTips(template.tips || '');
    setIsDefault(template.is_default);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowRoomTypePicker(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a template name');
      return;
    }

    try {
      setSaving(true);

      if (editingTemplate) {
        // Update existing template
        await api.put(`/room-templates/${editingTemplate.id}`, {
          name: name.trim(),
          room_type: roomType,
          tips: tips.trim() || null,
          is_default: isDefault,
        });
        Alert.alert('Success', 'Template updated successfully');
      } else {
        // Create new template
        await api.post('/room-templates', {
          name: name.trim(),
          room_type: roomType,
          tips: tips.trim() || null,
          is_default: isDefault,
        });
        Alert.alert('Success', 'Template created successfully');
      }

      closeModal();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (template) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/room-templates/${template.id}`);
              Alert.alert('Success', 'Template deleted');
              fetchTemplates();
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const getRoomTypeIcon = (type) => {
    const roomType = ROOM_TYPES.find(rt => rt.value === type);
    return roomType ? roomType.icon : 'help-circle';
  };

  const getRoomTypeLabel = (type) => {
    const roomType = ROOM_TYPES.find(rt => rt.value === type);
    return roomType ? roomType.label : type;
  };

  const renderTemplate = ({ item }) => (
    <View style={styles.templateCard}>
      <TouchableOpacity
        style={styles.templateMain}
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.templateIcon}>
          <Ionicons name={getRoomTypeIcon(item.room_type)} size={24} color="#007AFF" />
        </View>
        
        <View style={styles.templateInfo}>
          <View style={styles.templateHeader}>
            <Text style={styles.templateName}>{item.name}</Text>
            {item.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={styles.templateType}>{getRoomTypeLabel(item.room_type)}</Text>
          {item.tips && (
            <Text style={styles.templateTips} numberOfLines={2}>{item.tips}</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.templateActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Templates Yet</Text>
            <Text style={styles.emptyText}>
              Create templates to quickly add rooms to your properties
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.headerInfo}>
            <Text style={styles.headerInfoText}>
              Create reusable templates with pre-filled cleaning tips for common room types.
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.modalHeaderButton}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.modalHeaderButton}>
              {saving ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.modalSaveButton}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Template Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Master Bedroom, Guest Bath"
                placeholderTextColor="#8E8E93"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Room Type *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                activeOpacity={0.7}
                onPress={() => {
                  console.log('Room type picker button pressed');
                  setShowRoomTypePicker(!showRoomTypePicker);
                }}
              >
                <View style={styles.pickerButtonContent}>
                  <Ionicons name={getRoomTypeIcon(roomType)} size={20} color="#3C3C43" />
                  <Text style={styles.pickerButtonText}>{getRoomTypeLabel(roomType)}</Text>
                </View>
                <Ionicons name={showRoomTypePicker ? "chevron-up" : "chevron-down"} size={20} color="#8E8E93" />
              </TouchableOpacity>
              
              {showRoomTypePicker && (
                <ScrollView style={styles.inlinePickerContainer} nestedScrollEnabled={true}>
                  {ROOM_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.inlinePickerOption,
                        roomType === type.value && styles.inlinePickerOptionSelected
                      ]}
                      onPress={() => {
                        setRoomType(type.value);
                        setShowRoomTypePicker(false);
                      }}
                    >
                      <View style={styles.inlinePickerIconContainer}>
                        <Ionicons 
                          name={type.icon} 
                          size={24} 
                          color="#215EEA"
                        />
                      </View>
                      <Text style={[
                        styles.inlinePickerOptionText,
                        roomType === type.value && styles.inlinePickerOptionTextSelected
                      ]}>
                        {type.label}
                      </Text>
                      {roomType === type.value && (
                        <Ionicons name="checkmark" size={20} color="#215EEA" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Cleaning Tips (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={tips}
                onChangeText={setTips}
                placeholder="Enter cleaning instructions for this room type..."
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsDefault(!isDefault)}
            >
              <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
                {isDefault && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <View style={styles.checkboxLabel}>
                <Text style={styles.checkboxText}>Set as default template</Text>
                <Text style={styles.checkboxHint}>
                  This will be the default choice for {getRoomTypeLabel(roomType).toLowerCase()} rooms
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  listContainer: {
    padding: 16,
  },
  headerInfo: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  headerInfoText: {
    fontSize: 15,
    color: '#007AFF',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  templateMain: {
    flexDirection: 'row',
    padding: 14,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#33D39C',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  templateType: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  templateTips: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  templateActions: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(120, 120, 128, 0.05)',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  modalHeaderButton: {
    minWidth: 60,
    paddingVertical: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
  },
  modalCancelButton: {
    fontSize: 17,
    color: '#007AFF',
    letterSpacing: -0.4,
  },
  modalSaveButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: -0.4,
    textAlign: 'right',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(60, 60, 67, 0.18)',
    borderRadius: 10,
    padding: 12,
    fontSize: 17,
    color: '#000000',
    letterSpacing: -0.4,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(60, 60, 67, 0.18)',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerButtonText: {
    fontSize: 17,
    color: '#000000',
    letterSpacing: -0.4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxLabel: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 17,
    color: '#000000',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  checkboxHint: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  // Inline Room Type Picker
  inlinePickerContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(60, 60, 67, 0.18)',
    borderRadius: 10,
    maxHeight: 300,
  },
  inlinePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  inlinePickerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inlinePickerOptionSelected: {
    backgroundColor: 'rgba(74, 144, 226, 0.05)',
  },
  inlinePickerOptionText: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    letterSpacing: -0.4,
  },
  inlinePickerOptionTextSelected: {
    color: '#215EEA',
    fontWeight: '600',
  },
});

