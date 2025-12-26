import React, { useState, useEffect } from 'react';
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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import { getRoomSuggestionByType, ROOM_SUGGESTIONS } from '../../config/roomSuggestions';

const COLORS = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  primary: '#4A90E2',
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  pms: '#4A90E2', // HostIQ Blue for PMS badges
  text: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  separator: '#C6C6C8',
  fill: '#E5E5EA',
};

export default function PropertyDetailScreen({ route, navigation }) {
  const { propertyId, isPMS = false } = route.params;
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRooms, setExpandedRooms] = useState({});
  const [editModal, setEditModal] = useState({ visible: false, type: null, data: null });
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingFiveStar, setTogglingFiveStar] = useState(false);
  
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);
  const [selectedUnitForRoom, setSelectedUnitForRoom] = useState(null);

  useEffect(() => {
    if (isPMS) {
      fetchPMSProperty();
    } else {
      fetchProperty();
      fetchUnits();
    }
  }, [propertyId, isPMS]);

  const fetchProperty = async () => {
    try {
      const response = await api.get(`/owner/properties/${propertyId}`);
      setProperty(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load property');
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get(`/owner/properties/${propertyId}/units`);
      setUnits(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const fetchPMSProperty = async () => {
    try {
      const response = await api.get(`/pms/properties/${propertyId}`);
      setProperty(response.data.property);
      setRooms(response.data.property.rooms || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const getAllRooms = () => {
    if (isPMS) return rooms;
    return units.flatMap(u => u.rooms || []);
  };

  const getTotalRooms = () => getAllRooms().length;
  const getTotalInspections = () => units.reduce((t, u) => t + (u._count?.inspections || 0), 0);
  const getLatestScore = () => {
    const latest = units.find(u => u.inspections?.[0])?.inspections?.[0];
    return latest?.cleanliness_score;
  };

  const getScoreColor = (score) => {
    if (!score) return COLORS.textTertiary;
    if (score >= 8) return COLORS.green;
    if (score >= 6) return COLORS.orange;
    return COLORS.red;
  };

  const getRoomIcon = (type) => getRoomSuggestionByType(type)?.icon || 'home-outline';
  const getRoomLabel = (type) => getRoomSuggestionByType(type)?.label || 'Room';

  const openEditModal = (type, data = null) => {
    if (type === 'name') setEditValue(property?.name || '');
    else if (type === 'address') setEditValue(property?.address || '');
    else if (type === 'tips') setEditValue(data?.tips || '');
    setEditModal({ visible: true, type, data });
  };

  const handleSave = async () => {
    if (!editValue.trim() && editModal.type !== 'tips') {
      Alert.alert('Error', 'Field cannot be empty');
      return;
    }
    
    setSaving(true);
    try {
      if (editModal.type === 'name') {
        await api.put(`/owner/properties/${propertyId}`, { name: editValue.trim() });
        setProperty({ ...property, name: editValue.trim() });
      } else if (editModal.type === 'address') {
        await api.put(`/owner/properties/${propertyId}`, { address: editValue.trim() });
        setProperty({ ...property, address: editValue.trim() });
      } else if (editModal.type === 'tips') {
        const roomId = editModal.data.id;
        if (isPMS) {
          await api.put(`/pms/properties/${propertyId}/rooms/${roomId}`, { tips: editValue.trim() });
          setRooms(rooms.map(r => r.id === roomId ? { ...r, tips: editValue.trim() } : r));
        } else {
          await api.put(`/owner/rooms/${roomId}`, { tips: editValue.trim() });
          setUnits(units.map(u => ({
            ...u,
            rooms: u.rooms?.map(r => r.id === roomId ? { ...r, tips: editValue.trim() } : r)
          })));
        }
      }
      setEditModal({ visible: false, type: null, data: null });
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

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
    const allRooms = getAllRooms();
    const count = allRooms.filter(r => r.room_type === roomType).length;

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
    const allRooms = getAllRooms();
    const count = allRooms.filter(r => r.room_type === template.room_type).length;

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

  const insertExampleTip = (tip) => {
    if (!editingRoom) return;
    const currentTips = editingRoom.tips.trim();
    const newTips = currentTips
      ? `${currentTips}\n• ${tip}`
      : `• ${tip}`;
    setEditingRoom({ ...editingRoom, tips: newTips });
  };

  const saveRoom = async () => {
    if (!editingRoom || !editingRoom.name.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }

    if (!editingRoom.tips || !editingRoom.tips.trim()) {
      Alert.alert('Required', 'Please add cleaning tips for this room');
      return;
    }

    // For non-PMS properties, need to select a unit
    if (!isPMS && !selectedUnitForRoom) {
      if (units.length === 0) {
        Alert.alert('Error', 'No units available. Please create a unit first.');
        return;
      }
      // Auto-select first unit if only one exists
      if (units.length === 1) {
        setSelectedUnitForRoom(units[0]);
      } else {
        Alert.alert('Error', 'Please select a unit to add the room to');
        return;
      }
    }

    setAddingRoom(true);
    try {
      let response;
      let unitId;

      // Use same room format as CreatePropertyScreen: name, room_type, tips
      const roomPayload = {
        name: editingRoom.name.trim(),
        room_type: editingRoom.room_type,
        tips: editingRoom.tips.trim() || '',
      };

      if (isPMS) {
        // PMS properties: add room directly to property
        response = await api.post(`/pms/properties/${propertyId}/rooms`, roomPayload);
        setRooms([...rooms, response.data]);
      } else {
        // Non-PMS properties: add room to unit (same pattern as valuable items)
        // Follow pattern: POST /valuable-items/room/${roomId} -> POST /owner/rooms with unit_id
        unitId = selectedUnitForRoom?.id || units[0]?.id;
        
        // Use same pattern as valuable items: POST with unit_id in payload
        const roomPayloadWithUnit = {
          ...roomPayload,
          unit_id: unitId,
        };
        
        
        
        // POST /owner/rooms (same pattern as valuable items)
        response = await api.post('/owner/rooms', roomPayloadWithUnit);
        console.log('✅ Room added successfully');
        
        // Refresh units to get updated room list
        await fetchUnits();
        
        // Check if unit was created by a cleaner and auto-assign (only once, when first room is added)
        const updatedUnitsResponse = await api.get(`/owner/properties/${propertyId}/units`);
        const updatedUnit = updatedUnitsResponse.data.find(u => u.id === unitId);
        const selectedUnit = units.find(u => u.id === unitId);
        
        // Only auto-assign if:
        // 1. Unit was created by cleaner
        // 2. This is the first room being added (unit had no rooms before)
        // 3. No completed inspection exists for this unit
        const hadNoRoomsBefore = !selectedUnit?.rooms || selectedUnit.rooms.length === 0;
        const hasCompletedInspection = updatedUnit?.inspections?.some(
          inv => inv.status === 'COMPLETE' || inv.status === 'APPROVED' || inv.status === 'SUBMITTED'
        );
        
        if (updatedUnit?.created_by_cleaner_id && hadNoRoomsBefore && !hasCompletedInspection) {
          // Check if assignment already exists for this unit
          try {
            // Get cleaner's assignments from /owner/cleaners endpoint
            const cleanersResponse = await api.get('/owner/cleaners');
            const cleaner = cleanersResponse.data.find(
              c => String(c.id) === String(updatedUnit.created_by_cleaner_id)
            );
            
            const existingAssignment = cleaner?.assignments?.find(
              a => String(a.unit_id) === String(unitId) && 
                   (a.status === 'PENDING' || a.status === 'IN_PROGRESS')
            );
            
            if (!existingAssignment) {
              // No existing assignment, create one
              await api.post('/owner/assignments/bulk', {
                cleaner_id: updatedUnit.created_by_cleaner_id,
                unit_ids: [unitId],
                due_at: new Date().toISOString(),
              });
              
              Alert.alert(
                'Success',
                'Room added and cleaner assigned!',
                [{ text: 'OK' }]
              );
            } else {
              // Assignment already exists
              Alert.alert('Success', 'Room added successfully!');
            }
          } catch (assignError) {
            console.error('Auto-assignment error:', assignError);
            // Still show success for room addition even if assignment fails
            Alert.alert('Success', 'Room added successfully!');
          }
        } else {
          // Room added successfully, no auto-assignment needed
          Alert.alert('Success', 'Room added successfully!');
        }
      }

      setEditingRoom(null);
      setSelectedUnitForRoom(null);
    } catch (error) {
      console.error('Save room error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save room');
    } finally {
      setAddingRoom(false);
    }
  };

  const handleDeleteRoom = (room) => {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${room.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/pms/properties/${propertyId}/rooms/${room.id}`);
              setRooms(rooms.filter(r => r.id !== room.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete room');
            }
          }
        }
      ]
    );
  };

  const handleToggleFiveStar = () => {
    const newValue = !property?.five_star_mode;
    Alert.alert(
      newValue ? 'Enable 5-Star Mode?' : 'Disable 5-Star Mode?',
      newValue 
        ? 'Ultra-strict luxury inspection standards with 150+ checklist items.'
        : 'Return to standard inspection grading.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newValue ? 'Enable' : 'Disable',
          onPress: async () => {
            setTogglingFiveStar(true);
            try {
              await api.patch(`/owner/properties/${propertyId}/five-star-mode`, { five_star_mode: newValue });
              setProperty({ ...property, five_star_mode: newValue });
            } catch (error) {
              Alert.alert('Error', 'Failed to update');
            } finally {
              setTogglingFiveStar(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingView}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const score = getLatestScore();
  const allRooms = getAllRooms();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Property Info */}
        <View style={styles.section}>
          <View style={styles.card}>
            {isPMS && (
              <View style={styles.pmsBadge}>
                <Text style={styles.pmsBadgeText}>HOSTIFY</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={() => !isPMS && openEditModal('name')}
              disabled={isPMS}
            >
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{property?.name}</Text>
              </View>
              {!isPMS && <Ionicons name="chevron-forward" size={20} color={COLORS.separator} />}
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={() => !isPMS && openEditModal('address')}
              disabled={isPMS}
            >
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{property?.address}</Text>
              </View>
              {!isPMS && <Ionicons name="chevron-forward" size={20} color={COLORS.separator} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{getTotalRooms()}</Text>
              <Text style={styles.statLabel}>Rooms</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{isPMS ? '—' : getTotalInspections()}</Text>
              <Text style={styles.statLabel}>Inspections</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: getScoreColor(score) }]}>
                {score?.toFixed(1) || '—'}
              </Text>
              <Text style={styles.statLabel}>Score</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        {!isPMS && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>SETTINGS</Text>
            <View style={styles.card}>
              <TouchableOpacity 
                style={styles.settingRow}
                onPress={handleToggleFiveStar}
                disabled={togglingFiveStar}
              >
                <View style={[styles.settingIcon, { backgroundColor: '#FFF3CD' }]}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>5-Star Mode</Text>
                  <Text style={styles.settingDesc}>Luxury inspection standards</Text>
                </View>
                {togglingFiveStar ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <View style={[styles.toggle, property?.five_star_mode && styles.toggleOn]}>
                    <View style={[styles.toggleThumb, property?.five_star_mode && styles.toggleThumbOn]} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => navigation.navigate('Inventory', { 
                propertyId, 
                propertyName: property?.name,
                isPMS 
              })}
            >
              <View style={[styles.settingIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="cube-outline" size={18} color={COLORS.green} />
              </View>
              <Text style={styles.actionTitle}>Inventory</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.separator} />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => navigation.navigate('PropertyValuables', { 
                propertyId, 
                propertyName: property?.name,
                isPMS 
              })}
            >
              <View style={[styles.settingIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.actionTitle}>Valuable Items</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.separator} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Rooms */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>ROOMS</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => {
                // Auto-select first unit if only one exists
                if (!isPMS && units.length === 1) {
                  setSelectedUnitForRoom(units[0]);
                }
                setShowRoomPicker(true);
              }}
            >
              <Ionicons name="add" size={14} color={COLORS.primary} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {allRooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bed-outline" size={40} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No Rooms</Text>
              <Text style={styles.emptyText}>
                Add rooms to enable inspections
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => {
                if (!isPMS && units.length === 1) {
                  setSelectedUnitForRoom(units[0]);
                }
                setShowRoomPicker(true);
              }}>
                <Text style={styles.emptyButtonText}>Add Room</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              {allRooms.map((room, index) => (
                <View key={room.id}>
                  {index > 0 && <View style={styles.divider} />}
                  
                  <TouchableOpacity 
                    style={styles.roomRow}
                    onPress={() => setExpandedRooms(p => ({ ...p, [room.id]: !p[room.id] }))}
                  >
                    <View style={styles.roomIcon}>
                      <Ionicons name={getRoomIcon(room.room_type)} size={22} color={COLORS.primary} />
                    </View>
                    <View style={styles.roomContent}>
                      <Text style={styles.roomName}>{room.name}</Text>
                      <Text style={styles.roomType}>{getRoomLabel(room.room_type)}</Text>
                    </View>
                    {room.tips && (
                      <View style={styles.tipIndicator}>
                        <Ionicons name="chatbubble" size={12} color={COLORS.green} />
                      </View>
                    )}
                    <Ionicons 
                      name={expandedRooms[room.id] ? "chevron-down" : "chevron-forward"} 
                      size={20} 
                      color={COLORS.separator} 
                    />
                  </TouchableOpacity>
                  
                  {expandedRooms[room.id] && (
                    <View style={styles.roomExpanded}>
                      <View style={styles.tipsBox}>
                        <View style={styles.tipsHeader}>
                          <Text style={styles.tipsLabel}>Cleaning Tips</Text>
                          {/* <TouchableOpacity onPress={() => openEditModal('tips', room)}>
                            <Text style={styles.editLink}>Edit</Text>
                          </TouchableOpacity> */}
                        </View>
                        <Text style={[styles.tipsText, !room.tips && styles.tipsEmpty]}>
                          {room.tips || 'No tips added'}
                        </Text>
                      </View>
                      
                      <View style={styles.roomActions}>
                        <TouchableOpacity 
                          style={styles.roomActionBtn}
                          onPress={() => navigation.navigate('ValuableItems', {
                            roomId: room.id,
                            roomName: room.name,
                            propertyName: property?.name,
                            isPMS,
                          })}
                        >
                          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.roomActionText}>Valuables</Text>
                        </TouchableOpacity>
                        
                        {isPMS && (
                          <TouchableOpacity 
                            style={styles.roomActionBtn}
                            onPress={() => handleDeleteRoom(room)}
                          >
                            <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                            <Text style={[styles.roomActionText, { color: COLORS.red }]}>Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent Inspections */}
        {!isPMS && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>RECENT INSPECTIONS</Text>
            
            {!units.some(u => u.inspections?.[0]) ? (
              <View style={styles.emptyCard}>
                <Ionicons name="clipboard-outline" size={40} color={COLORS.textTertiary} />
                <Text style={styles.emptyTitle}>No Inspections</Text>
                <Text style={styles.emptyText}>Assign cleaners to start inspecting</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {units.filter(u => u.inspections?.[0]).map((unit, index) => (
                  <View key={unit.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity 
                      style={styles.inspectionRow}
                      onPress={() => navigation.navigate('InspectionDetail', { inspectionId: unit.inspections[0].id })}
                    >
                      <View style={styles.inspectionContent}>
                        <Text style={styles.inspectionUnit}>{unit.name}</Text>
                        <Text style={styles.inspectionDate}>
                          {new Date(unit.inspections[0].created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <View style={[
                        styles.scoreBadge, 
                        { backgroundColor: getScoreColor(unit.inspections[0].cleanliness_score) + '20' }
                      ]}>
                        <Text style={[
                          styles.scoreBadgeText, 
                          { color: getScoreColor(unit.inspections[0].cleanliness_score) }
                        ]}>
                          {unit.inspections[0].cleanliness_score?.toFixed(1) || '—'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal.visible} transparent animationType="fade">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={() => setEditModal({ visible: false, type: null, data: null })}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>
                {editModal.type === 'name' ? 'Name' : 
                 editModal.type === 'address' ? 'Address' : 'Tips'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.modalSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.modalInput, editModal.type === 'tips' && styles.modalInputTall]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={editModal.type === 'tips' ? 'Add tips for cleaners...' : 'Enter value'}
              placeholderTextColor={COLORS.textTertiary}
              multiline={editModal.type === 'tips'}
              autoFocus
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
        onRequestClose={() => {
          setEditingRoom(null);
          setSelectedUnitForRoom(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {getAllRooms().find(r => r.id === editingRoom?.id) ? 'Edit Room' : 'New Room'}
              </Text>
              <TouchableOpacity onPress={() => {
                setEditingRoom(null);
                setSelectedUnitForRoom(null);
              }}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editRoomContent}>
              {editingRoom && (
                <>
                  {!isPMS && units.length > 1 && (
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Select Unit <Text style={styles.required}>*</Text></Text>
                      <ScrollView style={styles.unitSelector} nestedScrollEnabled>
                        {units.map((unit) => (
                          <TouchableOpacity
                            key={unit.id}
                            style={[
                              styles.unitOption,
                              selectedUnitForRoom?.id === unit.id && styles.unitOptionSelected,
                            ]}
                            onPress={() => setSelectedUnitForRoom(unit)}
                          >
                            <Text style={[
                              styles.unitOptionText,
                              selectedUnitForRoom?.id === unit.id && styles.unitOptionTextSelected,
                            ]}>
                              {unit.name}
                            </Text>
                            {selectedUnitForRoom?.id === unit.id && (
                              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

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
                    <Text style={styles.label}>Tips for AI & Cleaner <Text style={styles.required}>*</Text></Text>
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
                    disabled={addingRoom}
                  >
                    {addingRoom ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Room</Text>
                    )}
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
    backgroundColor: COLORS.bg,
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  
  // Section
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: 6,
    
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
   
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 22,
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.separator,
    marginLeft: 16,
  },
  
  // PMS Badge
  pmsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.pms,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    margin: 12,
    marginBottom: 0,
  },
  pmsBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  
  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minHeight: 44,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 18,
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  
  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingRight: 14,
  },
  settingIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    color: COLORS.text,
  },
  settingDesc: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.fill,
    padding: 2,
  },
  toggleOn: {
    backgroundColor: COLORS.green,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  toggleThumbOn: {
    marginLeft: 18,
  },
  
  // Action Row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingRight: 14,
  },
  actionTitle: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  
  // Room Row
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingRight: 16,
  },
  roomIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomContent: {
    flex: 1,
  },
  roomName: {
    fontSize: 17,
    color: COLORS.text,
  },
  roomType: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  tipIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  roomExpanded: {
    backgroundColor: COLORS.bg,
   
    paddingBottom: 12,
    paddingTop: 0,
  },
  tipsBox: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    width: '100%',
  },
  tipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  editLink: {
    fontSize: 15,
    color: COLORS.primary,
  },
  tipsText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  tipsEmpty: {
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  roomActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  roomActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  roomActionText: {
    fontSize: 15,
    color: COLORS.primary,
  },
  
  // Empty State
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  
  // Inspection Row
  inspectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingRight: 16,
  },
  inspectionContent: {
    flex: 1,
  },
  inspectionUnit: {
    fontSize: 17,
    color: COLORS.text,
  },
  inspectionDate: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreBadgeText: {
    fontSize: 17,
    fontWeight: '600',
  },
  
  // Modal (matching CreatePropertyScreen exactly)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
  // Edit Modal (separate styles)
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 40,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalCancel: {
    fontSize: 17,
    color: COLORS.primary,
  },
  modalSave: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  modalInput: {
    backgroundColor: COLORS.bg,
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 12,
    fontSize: 17,
    color: COLORS.text,
  },
  modalInputTall: {
    height: 120,
    textAlignVertical: 'top',
  },
  
  // Type Chips
  typeScroll: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    marginRight: 8,
    gap: 6,
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: '#FFF',
  },
  
  // Unit Selector
  modalSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: 8,
  },
  unitSelector: {
    maxHeight: 150,
  },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    marginBottom: 8,
  },
  unitOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  unitOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  unitOptionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
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
  tipsTextArea: {
    height: 140,
    paddingTop: 15,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  required: {
    color: 'red',
    marginHorizontal: 4,
  },
});

