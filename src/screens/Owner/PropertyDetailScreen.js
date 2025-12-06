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
  
  const [addRoomModal, setAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('bedroom');
  const [addingRoom, setAddingRoom] = useState(false);

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

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }
    
    setAddingRoom(true);
    try {
      const response = await api.post(`/pms/properties/${propertyId}/rooms`, {
        name: newRoomName.trim(),
        room_type: newRoomType,
      });
      setRooms([...rooms, response.data]);
      setAddRoomModal(false);
      setNewRoomName('');
      setNewRoomType('bedroom');
    } catch (error) {
      Alert.alert('Error', 'Failed to add room');
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
            {isPMS && (
              <TouchableOpacity onPress={() => setAddRoomModal(true)}>
                <Text style={styles.addButton}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {allRooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bed-outline" size={40} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No Rooms</Text>
              <Text style={styles.emptyText}>
                {isPMS ? 'Add rooms to enable inspections' : 'Add rooms when editing the property'}
              </Text>
              {isPMS && (
                <TouchableOpacity style={styles.emptyButton} onPress={() => setAddRoomModal(true)}>
                  <Text style={styles.emptyButtonText}>Add Room</Text>
                </TouchableOpacity>
              )}
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
                          <TouchableOpacity onPress={() => openEditModal('tips', room)}>
                            <Text style={styles.editLink}>Edit</Text>
                          </TouchableOpacity>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModal({ visible: false, type: null, data: null })}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
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
        </View>
      </Modal>

      {/* Add Room Modal */}
      <Modal visible={addRoomModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setAddRoomModal(false);
                setNewRoomName('');
                setNewRoomType('bedroom');
              }}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Room</Text>
              <TouchableOpacity onPress={handleAddRoom} disabled={addingRoom}>
                {addingRoom ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.modalSave}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Room Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newRoomName}
              onChangeText={setNewRoomName}
              placeholder="e.g., Master Bedroom"
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
            />
            
            <Text style={styles.inputLabel}>Room Type</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.typeScroll}
            >
              {ROOM_SUGGESTIONS.map(type => (
                <TouchableOpacity
                  key={type.type}
                  style={[
                    styles.typeChip,
                    newRoomType === type.type && styles.typeChipActive
                  ]}
                  onPress={() => setNewRoomType(type.type)}
                >
                  <Ionicons 
                    name={type.icon} 
                    size={16} 
                    color={newRoomType === type.type ? '#FFF' : COLORS.textSecondary} 
                  />
                  <Text style={[
                    styles.typeChipText,
                    newRoomType === type.type && styles.typeChipTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
    marginLeft: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 16,
  },
  addButton: {
    fontSize: 17,
    color: COLORS.primary,
    fontWeight: '400',
  },
  
  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
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
    padding: 12,
    paddingTop: 0,
  },
  tipsBox: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
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
  
  // Modal
  modalOverlay: {
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  modalTitle: {
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
});

