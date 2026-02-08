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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { getRoomSuggestionByType, ROOM_SUGGESTIONS } from '../../config/roomSuggestions';
import colors from '../../theme/colors';

const COLORS = {
  // Match PropertiesScreen palette
  bg: '#F8FAFC',
  card: '#FFFFFF',
  primary: '#548EDD', // HostIQ Brand Color
  pms: '#548EDD',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  green: '#33D39C',
  orange: '#F59E0B',
  red: '#EF4444',
};

export default function PropertyDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
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

  // Cleaner assignment state
  const [showCleanerPicker, setShowCleanerPicker] = useState(false);
  const [cleaners, setCleaners] = useState([]);
  const [loadingCleaners, setLoadingCleaners] = useState(false);
  const [assigningCleaner, setAssigningCleaner] = useState(false);
  const [activeAssignments, setActiveAssignments] = useState([]);

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
      // Fetch assignments for this property
      await fetchAssignmentsForUnits();
    } catch (error) {
      Alert.alert('Error', 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentsForUnits = async () => {
    try {
      // Use the /owner/assignments endpoint with property_id filter
      // Fetch both PENDING and IN_PROGRESS assignments for this property
      const [pendingResponse, inProgressResponse] = await Promise.all([
        api.get('/owner/assignments', { params: { property_id: propertyId, status: 'PENDING' } }),
        api.get('/owner/assignments', { params: { property_id: propertyId, status: 'IN_PROGRESS' } }),
      ]);

      const allFetched = [...(pendingResponse.data || []), ...(inProgressResponse.data || [])];

      // Deduplicate by cleaner (show each cleaner only once)
      const seenCleaners = new Set();
      const uniqueAssignments = allFetched.filter(assignment => {
        if (seenCleaners.has(assignment.cleaner_id)) {
          return false;
        }
        seenCleaners.add(assignment.cleaner_id);
        return true;
      }).map(assignment => ({
        ...assignment,
        cleanerId: assignment.cleaner_id,
        cleanerName: assignment.cleaner?.name || 'Unknown',
        cleanerEmail: assignment.cleaner?.email || '',
      }));

      setActiveAssignments(uniqueAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
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

  const openCleanerPicker = async () => {
    setShowCleanerPicker(true);
    setLoadingCleaners(true);
    try {
      const response = await api.get('/owner/cleaners');
      setCleaners(response.data || []);
    } catch (error) {
      console.error('Error fetching cleaners:', error);
      Alert.alert('Error', 'Failed to load cleaners');
    } finally {
      setLoadingCleaners(false);
    }
  };

  const assignCleanerToProperty = async (cleaner) => {
    if (units.length === 0) {
      Alert.alert('No Units', 'This property has no units to assign.');
      return;
    }

    setAssigningCleaner(true);
    try {
      // Assign all units of this property to the selected cleaner
      const unitIds = units.map(u => u.id);
      await api.post('/owner/assignments/bulk', {
        cleaner_id: cleaner.id,
        unit_ids: unitIds,
        due_at: new Date().toISOString(),
      });

      setShowCleanerPicker(false);

      // Refresh units and assignments to show the new assignment
      await fetchUnits();

      Alert.alert(
        'Success',
        `${cleaner.name} has been assigned to ${property?.name}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Assignment error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to assign cleaner');
    } finally {
      setAssigningCleaner(false);
    }
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
      {/* Header Gradient - match PropertiesScreen */}
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, Platform.OS === 'android' && { paddingTop: insets.top }]}
      >
        {Platform.OS === 'ios' ? (
          <SafeAreaView>
            <View style={styles.headerGradient}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerIconWrapper}>
                <View style={styles.headerIconInner}>
                  <Ionicons name="home" size={28} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.headerTextWrapper}>
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {property?.name || 'Property Details'}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {isPMS ? 'PMS Property' : 'Manual Property'} • {getTotalRooms()} rooms
                </Text>
              </View>
            </View>
          </SafeAreaView>
        ) : (
          <View style={styles.headerGradient}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name="home" size={28} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {property?.name || 'Property Details'}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {isPMS ? 'PMS Property' : 'Manual Property'} • {getTotalRooms()} rooms
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Property Info */}
        <View style={styles.section}>
          <View style={styles.card}>
            {isPMS && (
              <LinearGradient
                colors={['#548EDD', '#4A7FD4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pmsBadge}
              >
                <Ionicons name="cloud" size={10} color="#FFFFFF" />
                <Text style={styles.pmsBadgeText}>HOSTIFY</Text>
              </LinearGradient>
            )}
            
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={() => !isPMS && openEditModal('name')}
              disabled={isPMS}
              activeOpacity={0.7}
            >
              <View style={styles.infoIconContainer}>
                <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{property?.name}</Text>
              </View>
              {!isPMS && (
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={() => !isPMS && openEditModal('address')}
              disabled={isPMS}
              activeOpacity={0.7}
            >
              <View style={styles.infoIconContainer}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{property?.address}</Text>
              </View>
              {!isPMS && (
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Rooms</Text>
              <Text style={styles.statNumber}>{getTotalRooms()}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Inspections</Text>
              <Text style={styles.statNumber}>{isPMS ? '—' : getTotalInspections()}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={[styles.statNumber, { color: getScoreColor(score) }]}>
                {score?.toFixed(1) || '—'}
              </Text>
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
              onPress={() => {
                const allRooms = getAllRooms();
                if (allRooms.length === 0) {
                  Alert.alert(
                    'No Rooms',
                    'Please add rooms to your property first before managing valuable items.',
                    [{ text: 'OK' }]
                  );
                  return;
                }

                if (isPMS) {
                  // PMS properties still manage valuables per room
                  if (allRooms.length === 1) {
                    navigation.navigate('ValuableItems', {
                      roomId: allRooms[0].id,
                      roomName: allRooms[0].name,
                      roomType: allRooms[0].room_type,
                      propertyName: property?.name,
                      isPMS
                    });
                  } else {
                    Alert.alert(
                      'Select a Room',
                      'Valuable items are managed per room. Please expand a room below and tap "Valuables" to manage items for that room.',
                      [{ text: 'OK' }]
                    );
                  }
                  return;
                }

                // Manual properties: show all valuables across all rooms
                navigation.navigate('ValuableItems', {
                  propertyId,
                  propertyName: property?.name,
                  isPMS,
                  showAll: true,
                });
              }}
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
              <LinearGradient
                colors={['#DBEAFE', '#BFDBFE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIcon}
              >
                <Ionicons name="bed-outline" size={48} color={COLORS.primary} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Rooms</Text>
              <Text style={styles.emptyText}>
                Add rooms to enable inspections
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton} 
                onPress={() => {
                  if (!isPMS && units.length === 1) {
                    setSelectedUnitForRoom(units[0]);
                  }
                  setShowRoomPicker(true);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#548EDD', '#4A7FD4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emptyButtonGradient}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Add Room</Text>
                </LinearGradient>
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
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#EFF6FF', '#DBEAFE']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.roomIcon}
                    >
                      <Ionicons name={getRoomIcon(room.room_type)} size={22} color={COLORS.primary} />
                    </LinearGradient>
                    <View style={styles.roomContent}>
                      <Text style={styles.roomName}>{room.name}</Text>
                      <Text style={styles.roomType}>{getRoomLabel(room.room_type)}</Text>
                    </View>
                    {room.tips && (
                      <View style={styles.tipIndicator}>
                        <Ionicons name="chatbubble" size={12} color={COLORS.green} />
                      </View>
                    )}
                    <View style={styles.chevronContainer}>
                      <Ionicons 
                        name={expandedRooms[room.id] ? "chevron-down" : "chevron-forward"} 
                        size={18} 
                        color={COLORS.textTertiary} 
                      />
                    </View>
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
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#EFF6FF', '#DBEAFE']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.roomActionIcon}
                          >
                            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
                          </LinearGradient>
                          <Text style={styles.roomActionText}>Valuables</Text>
                        </TouchableOpacity>
                        
                        {isPMS && (
                          <TouchableOpacity 
                            style={[styles.roomActionBtn, styles.roomActionBtnDanger]}
                            onPress={() => handleDeleteRoom(room)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.roomActionIconDanger}>
                              <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                            </View>
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

        {/* Assigned Cleaners */}
        {!isPMS && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>ASSIGNED CLEANERS</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={openCleanerPicker}
              >
                <Ionicons name="add" size={14} color={COLORS.primary} />
                <Text style={styles.addButtonText}>Assign</Text>
              </TouchableOpacity>
            </View>

            {activeAssignments.length === 0 ? (
              <View style={styles.card}>
                <View style={styles.emptyInlineCard}>
                  <Ionicons name="person-outline" size={24} color={COLORS.textTertiary} />
                  <Text style={styles.emptyInlineText}>No cleaners assigned</Text>
                  <TouchableOpacity
                    style={styles.emptyInlineButton}
                    onPress={openCleanerPicker}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emptyInlineButtonText}>Assign</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                {activeAssignments.map((assignment, index) => (
                  <View key={assignment.id || index}>
                    {index > 0 && <View style={styles.divider} />}
                    <View style={styles.cleanerRow}>
                      <LinearGradient
                        colors={['#548EDD', '#4A7FD4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cleanerRowAvatar}
                      >
                        <Text style={styles.cleanerRowAvatarText}>
                          {assignment.cleanerName?.charAt(0)?.toUpperCase() || 'C'}
                        </Text>
                      </LinearGradient>
                      <View style={styles.cleanerRowContent}>
                        <Text style={styles.cleanerRowName}>{assignment.cleanerName}</Text>
                        <Text style={styles.cleanerRowEmail}>{assignment.cleanerEmail}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        assignment.status === 'IN_PROGRESS' ? styles.statusInProgress : styles.statusPending
                      ]}>
                        <View style={[
                          styles.statusDot,
                          assignment.status === 'IN_PROGRESS' ? styles.statusDotInProgress : styles.statusDotPending
                        ]} />
                        <Text style={[
                          styles.statusText,
                          assignment.status === 'IN_PROGRESS' ? styles.statusTextInProgress : styles.statusTextPending
                        ]}>
                          {assignment.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Recent Inspections */}
        {!isPMS && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>RECENT INSPECTIONS</Text>

            {!units.some(u => u.inspections?.[0]) ? (
              <View style={styles.card}>
                <View style={styles.emptyInlineCard}>
                  <Ionicons name="clipboard-outline" size={24} color={COLORS.textTertiary} />
                  <Text style={styles.emptyInlineText}>No inspections yet</Text>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                {units.filter(u => u.inspections?.[0]).map((unit, index) => (
                  <View key={unit.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.inspectionRow}
                      onPress={() => navigation.navigate('InspectionDetail', { inspectionId: unit.inspections[0].id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.inspectionIconContainer}>
                        <Ionicons name="clipboard-outline" size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.inspectionContent}>
                        <Text style={styles.inspectionUnit}>{unit.name}</Text>
                        <Text style={styles.inspectionDate}>
                          {new Date(unit.inspections[0].created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <LinearGradient
                        colors={[getScoreColor(unit.inspections[0].cleanliness_score) + '20', getScoreColor(unit.inspections[0].cleanliness_score) + '10']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.scoreBadge}
                      >
                        <Ionicons name="star" size={14} color={getScoreColor(unit.inspections[0].cleanliness_score)} />
                        <Text style={[
                          styles.scoreBadgeText,
                          { color: getScoreColor(unit.inspections[0].cleanliness_score) }
                        ]}>
                          {unit.inspections[0].cleanliness_score?.toFixed(1) || '—'}
                        </Text>
                      </LinearGradient>
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
                      <Ionicons name={suggestion.icon} size={28} color="#215EEA" />
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
                              <Ionicons name="add-circle-outline" size={14} color="#215EEA" />
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

      {/* Cleaner Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCleanerPicker}
        onRequestClose={() => setShowCleanerPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Cleaner</Text>
              <TouchableOpacity onPress={() => setShowCleanerPicker(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cleanerList}>
              {loadingCleaners ? (
                <View style={styles.cleanerLoading}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.cleanerLoadingText}>Loading cleaners...</Text>
                </View>
              ) : cleaners.length === 0 ? (
                <View style={styles.cleanerEmpty}>
                  <Ionicons name="people-outline" size={48} color={COLORS.textTertiary} />
                  <Text style={styles.cleanerEmptyTitle}>No Cleaners</Text>
                  <Text style={styles.cleanerEmptyText}>
                    Add cleaners first to assign them to properties
                  </Text>
                  <TouchableOpacity
                    style={styles.cleanerEmptyButton}
                    onPress={() => {
                      setShowCleanerPicker(false);
                      navigation.navigate('Inspections', { screen: 'ManageCleaners' });
                    }}
                  >
                    <Text style={styles.cleanerEmptyButtonText}>Add Cleaners</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                cleaners.map((cleaner) => (
                  <TouchableOpacity
                    key={cleaner.id}
                    style={styles.cleanerOption}
                    onPress={() => assignCleanerToProperty(cleaner)}
                    disabled={assigningCleaner}
                  >
                    <View style={styles.cleanerAvatar}>
                      <Text style={styles.cleanerAvatarText}>
                        {cleaner.name?.charAt(0)?.toUpperCase() || 'C'}
                      </Text>
                    </View>
                    <View style={styles.cleanerInfo}>
                      <Text style={styles.cleanerName}>{cleaner.name}</Text>
                      <Text style={styles.cleanerEmail}>{cleaner.email}</Text>
                    </View>
                    {assigningCleaner ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={24} color="#ccc" />
                    )}
                  </TouchableOpacity>
                ))
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
  // Header Gradient (match PropertiesScreen)
  headerWrapper: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 18,
  },
  backButton: {
    marginRight: 4,
    padding: 4,
  },
  headerIconWrapper: {
    marginRight: 14,
  },
  headerIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
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
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E7FF',
    marginLeft: 16,
  },
  
  // PMS Badge
  pmsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    overflow: 'hidden',
    margin: 12,
    marginBottom: 0,
  },
  pmsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 44,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  chevronContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingRight: 16,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    padding: 14,
    paddingRight: 16,
  },
  actionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Room Row
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingRight: 16,
  },
  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  roomContent: {
    flex: 1,
  },
  roomName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  roomType: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  roomActionBtnDanger: {
    borderColor: '#FEE2E2',
  },
  roomActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  roomActionIconDanger: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Empty State
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
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
        shadowColor: COLORS.primary,
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
  
  // Inspection Row
  inspectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingRight: 16,
  },
  inspectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inspectionContent: {
    flex: 1,
  },
  inspectionUnit: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  inspectionDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    overflow: 'hidden',
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: '700',
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
    color: '#215EEA',
    marginLeft: 4,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#215EEA',
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
    color: '#33D39C',
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
  // Cleaner Picker styles
  cleanerList: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  cleanerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  cleanerLoadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  cleanerEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  cleanerEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  cleanerEmptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  cleanerEmptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cleanerEmptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cleanerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  cleanerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cleanerAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  cleanerInfo: {
    flex: 1,
  },
  cleanerName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  cleanerEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // Empty inline card (compact empty state)
  emptyInlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  emptyInlineText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textTertiary,
  },
  emptyInlineButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyInlineButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Cleaner row (assigned cleaners list)
  cleanerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingRight: 16,
  },
  cleanerRowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cleanerRowAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cleanerRowContent: {
    flex: 1,
  },
  cleanerRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  cleanerRowEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusInProgress: {
    backgroundColor: '#DBEAFE',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotPending: {
    backgroundColor: '#F59E0B',
  },
  statusDotInProgress: {
    backgroundColor: '#215EEA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextPending: {
    color: '#B45309',
  },
  statusTextInProgress: {
    color: '#1D4ED8',
  },
});

