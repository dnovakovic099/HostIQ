import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { ROOM_SUGGESTIONS, getRoomSuggestionByType } from '../../config/roomSuggestions';

export default function CreatePropertyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  // Wizard state
  const [step, setStep] = useState(1); // 1: Property Info, 2: Add Rooms, 3: Review

  // Property details
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  
  // Tab bar height: 60px (TAB_BAR_HEIGHT) + 50px (dipDepth) + safe area bottom
  const tabBarHeight = 110 + insets.bottom;

  // Rooms
  const [rooms, setRooms] = useState([]);
  const [editingRoom, setEditingRoom] = useState(null);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);

  const addRoomFromType = async (roomType) => {
    setSelectedRoomType(roomType);
    setShowRoomPicker(false);

    // Fetch templates for this room type
    setLoadingTemplates(true);
    try {
      const response = await api.get('/room-templates');
      const allTemplates = response.data.templates || [];
      const typeTemplates = allTemplates.filter(t => t.room_type === roomType);

      if (typeTemplates.length > 0) {
        setTemplates(typeTemplates);
        setShowTemplatePicker(true);
      } else {
        // No templates, create room from scratch
        createRoomFromScratch(roomType);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      // If error, create from scratch
      createRoomFromScratch(roomType);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const createRoomFromScratch = (roomType) => {
    const suggestion = getRoomSuggestionByType(roomType);
    const count = rooms.filter(r => r.room_type === roomType).length;

    const newRoom = {
      id: Date.now().toString(),
      name: count > 0 ? `${suggestion.defaultName} ${count + 1}` : suggestion.defaultName,
      room_type: roomType,
      tips: '',
      exampleTips: suggestion.exampleTips,
    };

    setEditingRoom(newRoom);
  };

  const createRoomFromTemplate = (template) => {
    const count = rooms.filter(r => r.room_type === template.room_type).length;

    const newRoom = {
      id: Date.now().toString(),
      name: count > 0 ? `${template.name} ${count + 1}` : template.name,
      room_type: template.room_type,
      tips: template.tips || '',
      exampleTips: getRoomSuggestionByType(template.room_type).exampleTips,
    };

    setEditingRoom(newRoom);
    setShowTemplatePicker(false);
  };

  const saveRoom = () => {
    if (!editingRoom.name.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }

    const existingIndex = rooms.findIndex(r => r.id === editingRoom.id);
    if (existingIndex >= 0) {
      // Update existing room
      const updatedRooms = [...rooms];
      updatedRooms[existingIndex] = editingRoom;
      setRooms(updatedRooms);
    } else {
      // Add new room
      setRooms([...rooms, editingRoom]);
    }

    setEditingRoom(null);
  };

  const deleteRoom = (id) => {
    Alert.alert(
      'Delete Room',
      'Are you sure you want to remove this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setRooms(rooms.filter(r => r.id !== id))
        }
      ]
    );
  };

  const insertExampleTip = (tip) => {
    const currentTips = editingRoom.tips.trim();
    const newTips = currentTips
      ? `${currentTips}\n• ${tip}`
      : `• ${tip}`;
    setEditingRoom({ ...editingRoom, tips: newTips });
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate property details
      if (!propertyName.trim() || !address.trim()) {
        Alert.alert('Required', 'Please enter property name and address');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate rooms
      if (rooms.length === 0) {
        Alert.alert('Required', 'Please add at least one room');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    const payload = {
      name: propertyName,
      address,
      units: [{
        name: 'Main Property',
        notes: '',
        rooms: rooms.map((room) => ({
          name: room.name,
          room_type: room.room_type,
          tips: room.tips,
        })),
      }],
    };

    console.log('📤 Sending property data:', JSON.stringify(payload, null, 2));
    console.log('🏠 Property name:', propertyName);
    console.log('📍 Address:', address);
    console.log('🚪 Rooms count:', rooms.length);
    console.log('📋 Rooms:', rooms.map(r => `${r.name} (${r.room_type})`));

    setLoading(true);
    try {
      const response = await api.post('/owner/properties', payload);
      console.log('✅ Server response:', JSON.stringify(response.data, null, 2));

      Alert.alert('Success', 'Property created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Create property error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const getRoomIcon = (roomType) => {
    const suggestion = getRoomSuggestionByType(roomType);
    return suggestion?.icon || 'home-outline';
  };

  const getRoomLabel = (roomType) => {
    const suggestion = getRoomSuggestionByType(roomType);
    return suggestion?.label || 'Room';
  };

  // Render progress indicator - Modern Enhanced Version
  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        {/* Progress Line with gradient */}
        <View style={styles.progressLineBackground}>
          <View
            style={[
              styles.progressLineFill,
              { width: `${((step - 1) / 2) * 100}%` }
            ]}
          />
        </View>

        {/* Step 1 */}
        <View style={styles.progressStepWrapper}>
          <View style={[
            styles.progressDot,
            step >= 1 && styles.progressDotCurrent
          ]}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.progressNumber}>1</Text>
            </View>
          </View>
          <Text style={[styles.progressLabel, step === 1 && styles.progressLabelActive]}>
            Details
          </Text>
        </View>

        {/* Step 2 */}
        <View style={styles.progressStepWrapper}>
          <View style={[
            styles.progressDot,
            step >= 2 && styles.progressDotCurrent
          ]}>
            <View style={styles.stepNumberContainer}>
              <Text style={[styles.progressNumber, step < 2 && styles.progressNumberInactive]}>2</Text>
            </View>
          </View>
          <Text style={[styles.progressLabel, step === 2 && styles.progressLabelActive]}>
            Rooms
          </Text>
        </View>

        {/* Step 3 */}
        <View style={styles.progressStepWrapper}>
          <View style={[
            styles.progressDot,
            step >= 3 && styles.progressDotCurrent
          ]}>
            <View style={styles.stepNumberContainer}>
              <Text style={[styles.progressNumber, step < 3 && styles.progressNumberInactive]}>3</Text>
            </View>
          </View>
          <Text style={[styles.progressLabel, step === 3 && styles.progressLabelActive]}>
            Review
          </Text>
        </View>
      </View>
    </View>
  );

  // Step 1: Property Details
  const renderPropertyDetails = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Property Details</Text>
        <Text style={styles.stepSubtitle}>
          Enter basic information about your property
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Property Name<Text style={styles.required}> *</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Sunset Beach House"
          value={propertyName}
          onChangeText={setPropertyName}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Address<Text style={styles.required}>  *</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., 123 Ocean Drive, Miami Beach, FL 33139"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />
      </View>
    </ScrollView>
  );

  // Step 2: Add Rooms
  const renderAddRooms = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Add Rooms</Text>
        <Text style={styles.stepSubtitle}>
          Define rooms and inspection tips for each area
        </Text>
      </View>

      {rooms.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="home-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No rooms added yet</Text>
          <Text style={styles.emptyHint}>
            Tap "Add Room" below to get started
          </Text>
        </View>
      ) : (
        <View style={styles.roomsList}>
          {rooms.map((room, index) => (
            <View key={room.id} style={styles.roomSummaryCard}>
              <View style={styles.roomSummaryHeader}>
                <View style={styles.roomSummaryLeft}>
                  <View style={styles.roomSummaryIconContainer}>
                    <Ionicons
                      name={getRoomIcon(room.room_type)}
                      size={24}
                      color="#4A90E2"
                    />
                  </View>
                  <View style={styles.roomSummaryInfo}>
                    <Text style={styles.roomSummaryName}>{room.name}</Text>
                    <Text style={styles.roomSummaryType}>
                      {getRoomLabel(room.room_type)}
                    </Text>
                  </View>
                </View>
                <View style={styles.roomSummaryActions}>
                  <TouchableOpacity
                    onPress={() => setEditingRoom(room)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="create-outline" size={22} color="#4A90E2" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteRoom(room.id)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="trash-outline" size={22} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
              {room.tips && (
                <Text style={styles.roomSummaryTips} numberOfLines={2}>
                  {room.tips}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.addRoomButton}
        onPress={() => setShowRoomPicker(true)}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addRoomButtonText}>Add Room</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Step 3: Review
  const renderReview = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Review & Confirm</Text>
        <Text style={styles.stepSubtitle}>
          Check your property details before creating
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Property Information</Text>
        <View style={styles.reviewCard}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Name:</Text>
            <Text style={styles.reviewValue}>{propertyName}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Address:</Text>
            <Text style={styles.reviewValue}>{address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Rooms Added</Text>
          
        </View>

        {rooms.map((room) => (
          <View key={room.id} style={styles.reviewRoomCard}>
            <View style={styles.reviewRoomHeader}>
              <Ionicons
                name={getRoomIcon(room.room_type)}
                size={20}
                color="#4A90E2"
                style={styles.reviewRoomIcon}
              />
              <Text style={styles.reviewRoomName}>{room.name}</Text>
            </View>
            <Text style={styles.reviewRoomType}>{getRoomLabel(room.room_type)}</Text>
            {room.tips && (
              <View style={styles.reviewRoomTips}>
                <Text style={styles.reviewRoomTipsLabel}>Tips:</Text>
                <Text style={styles.reviewRoomTipsText}>{room.tips}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Progress Indicator */}
      {renderProgress()}

      {/* Step Content */}
      <View style={styles.content}>
        {step === 1 && renderPropertyDetails()}
        {step === 2 && renderAddRooms()}
        {step === 3 && renderReview()}
      </View>

      {/* Navigation Buttons */}
      <View style={[styles.footer, { paddingBottom: tabBarHeight }]}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.footerButton, styles.backButton]}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={20} color="#4A90E2" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity
            style={[styles.footerButton, styles.nextButton, step === 1 && styles.fullWidth]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerButton, styles.completeButton]}
            onPress={handleComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                
                <Text style={styles.completeButtonText}>Create Property</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Room Type Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRoomPicker}
        onRequestClose={() => setShowRoomPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Room Type</Text>
              <TouchableOpacity onPress={() => setShowRoomPicker(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.roomTypeList}>
              {ROOM_SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.type}
                  style={styles.roomTypeOption}
                  onPress={() => addRoomFromType(suggestion.type)}
                >
                  <View style={styles.roomTypeLeft}>
                    <View style={styles.roomTypeIconContainer}>
                      <Ionicons name={suggestion.icon} size={28} color="#4A90E2" />
                    </View>
                    <View>
                      <Text style={styles.roomTypeLabel}>{suggestion.label}</Text>
                      <Text style={styles.roomTypeHint}>
                        {suggestion.exampleTips[0].substring(0, 40)}...
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Template Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTemplatePicker}
        onRequestClose={() => setShowTemplatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Template</Text>
              <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.templateList}>
              {/* Create from Scratch Option */}
              <TouchableOpacity
                style={styles.templateOption}
                onPress={() => {
                  setShowTemplatePicker(false);
                  createRoomFromScratch(selectedRoomType);
                }}
              >
                <View style={styles.templateLeft}>
                  <View style={[styles.templateIconContainer, { backgroundColor: '#F2F2F7' }]}>
                    <Ionicons name="create-outline" size={28} color="#8E8E93" />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateLabel}>Create from Scratch</Text>
                    <Text style={styles.templateHint}>Start with a blank room</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.templateDivider}>
                <View style={styles.templateDividerLine} />
                <Text style={styles.templateDividerText}>OR USE TEMPLATE</Text>
                <View style={styles.templateDividerLine} />
              </View>

              {/* Templates */}
              {templates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateOption}
                  onPress={() => createRoomFromTemplate(template)}
                >
                  <View style={styles.templateLeft}>
                    <View style={styles.templateIconContainer}>
                      <Ionicons name={getRoomIcon(template.room_type)} size={28} color="#007AFF" />
                    </View>
                    <View style={styles.templateInfo}>
                      <View style={styles.templateNameRow}>
                        <Text style={styles.templateLabel}>{template.name}</Text>
                        {template.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      {template.tips && (
                        <Text style={styles.templateHint} numberOfLines={2}>
                          {template.tips}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Room Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editingRoom !== null}
        onRequestClose={() => setEditingRoom(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {rooms.find(r => r.id === editingRoom?.id) ? 'Edit Room' : 'New Room'}
              </Text>
              <TouchableOpacity onPress={() => setEditingRoom(null)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editRoomContent}>
              {editingRoom && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Room Name <Text style={styles.required}>*</Text></Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Master Bedroom"
                      value={editingRoom.name}
                      onChangeText={(text) => setEditingRoom({ ...editingRoom, name: text })}
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Room Type</Text>
                    <Text style={styles.roomTypeDisplay}>
                      {getRoomLabel(editingRoom.room_type)}
                    </Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Tips for AI & Cleaner</Text>
                    <Text style={styles.labelHint}>
                      What should be checked or photographed?
                    </Text>

                    {editingRoom.exampleTips && editingRoom.exampleTips.length > 0 && (
                      <View style={styles.quickAddSection}>
                        <Text style={styles.quickAddTitle}>Quick Add:</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.quickAddScroll}
                        >
                          {editingRoom.exampleTips.map((tip, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.quickAddChip}
                              onPress={() => insertExampleTip(tip)}
                            >
                              <Ionicons name="add-circle-outline" size={14} color="#4A90E2" />
                              <Text style={styles.quickAddChipText} numberOfLines={1}>
                                {tip}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <TextInput
                      style={[styles.input, styles.tipsTextArea]}
                      placeholder="• Bed made with white linens&#10;• TV on to show it works&#10;• Windows streak-free"
                      value={editingRoom.tips}
                      onChangeText={(text) => setEditingRoom({ ...editingRoom, tips: text })}
                      multiline
                      numberOfLines={6}
                      placeholderTextColor="#999"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveRoom}
                  >
                    <Text style={styles.saveButtonText}>Save Room</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Modern Enhanced Progress Bar
  progressContainer: {
    paddingVertical: 24,
    paddingHorizontal: 24,

  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: 6,
  },
  progressLineBackground: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    top: 22,
    zIndex: 0,
  },
  progressLineFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    minWidth: 0,
  },
  progressStepWrapper: {
    alignItems: 'center',
    zIndex: 1,
  },
  progressDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#E2E8F0',
  },
  progressDotActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10B981',
  },
  progressDotCurrent: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  stepNumberContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkContainer: {
    marginTop: -3,
    marginLeft: -3,
  },
  progressNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  progressNumberInactive: {
    color: '#94A3B8',
  },
  progressLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  progressLabelActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    marginBottom: 80,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 13,
    color: '#999',
    marginTop: -4,
    marginBottom: 12,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 90,
    paddingTop: 15,
    textAlignVertical: 'top',
  },
  tipsTextArea: {
    height: 140,
    paddingTop: 15,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  roomsList: {
    marginBottom: 20,
  },
  roomSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  roomSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomSummaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomSummaryInfo: {
    flex: 1,
  },
  roomSummaryName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  roomSummaryType: {
    fontSize: 13,
    color: '#666',
  },
  roomSummaryActions: {
    flexDirection: 'row',
    gap: 2,
  },
  iconButton: {
    padding: 2,
  },
  roomSummaryTips: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  addRoomButton: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addRoomButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewRow: {
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  reviewRoomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewRoomIcon: {
    marginRight: 8,
  },
  reviewRoomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewRoomType: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  reviewRoomTips: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reviewRoomTipsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 6,
  },
  reviewRoomTipsText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  fullWidth: {
    flex: 1,
  },
  backButton: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#d0e7ff',
  },
  backButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#4A90E2',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#0a8f2bff',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  required: {
    color: 'red',
    marginHorizontal: 4,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  roomTypeList: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  roomTypeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  roomTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roomTypeLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  roomTypeHint: {
    fontSize: 13,
    color: '#999',
    maxWidth: 220,
  },
  editRoomContent: {
    padding: 20,
    paddingBottom: 40,
  },
  roomTypeDisplay: {
    fontSize: 16,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  quickAddSection: {
    marginBottom: 12,
  },
  quickAddTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  quickAddScroll: {
    marginHorizontal: -4,
  },
  quickAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#d0e7ff',
    maxWidth: 200,
  },
  quickAddChipText: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 4,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  // Template Picker Styles
  templateList: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  templateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  templateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  templateInfo: {
    flex: 1,
  },
  templateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  templateHint: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
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
    color: '#34C759',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  templateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  templateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  templateDividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },
});
