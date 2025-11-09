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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import { ROOM_SUGGESTIONS, getRoomSuggestionByType } from '../../config/roomSuggestions';

export default function PropertyDetailScreen({ route, navigation }) {
  const { propertyId, isPMS = false } = route.params;
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [rooms, setRooms] = useState([]); // For PMS properties
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState({});
  const [editingPropertyName, setEditingPropertyName] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [editingRoomTips, setEditingRoomTips] = useState(null);
  const [newRoomTips, setNewRoomTips] = useState('');
  const [savingChanges, setSavingChanges] = useState(false);
  const [togglingFiveStarMode, setTogglingFiveStarMode] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [newNotes, setNewNotes] = useState('');

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
      console.error('Error fetching PMS property:', error);
      Alert.alert('Error', 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const toggleRoomExpansion = (roomId) => {
    setExpandedRooms(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  };

  const getRoomIcon = (roomType) => {
    const suggestion = getRoomSuggestionByType(roomType);
    return suggestion?.icon || 'home-outline';
  };

  const getRoomLabel = (roomType) => {
    const suggestion = getRoomSuggestionByType(roomType);
    return suggestion?.label || 'Room';
  };

  const getScoreColor = (score) => {
    if (!score) return '#999';
    if (score >= 4.5) return '#4CAF50';
    if (score >= 3.5) return '#FF9800';
    return '#F44336';
  };

  const getTotalRooms = () => {
    return units.reduce((total, unit) => total + (unit.rooms?.length || 0), 0);
  };

  const handleEditPropertyName = () => {
    setNewPropertyName(property?.name || '');
    setEditingPropertyName(true);
  };

  const handleSavePropertyName = async () => {
    if (!newPropertyName.trim()) {
      Alert.alert('Error', 'Property name cannot be empty');
      return;
    }

    setSavingChanges(true);
    try {
      await api.put(`/owner/properties/${propertyId}`, {
        name: newPropertyName.trim()
      });
      
      setProperty({ ...property, name: newPropertyName.trim() });
      setEditingPropertyName(false);
      Alert.alert('Success', 'Property name updated');
    } catch (error) {
      console.error('Error updating property name:', error);
      Alert.alert('Error', 'Failed to update property name');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleEditAddress = () => {
    setNewAddress(property?.address || '');
    setEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    if (!newAddress.trim()) {
      Alert.alert('Error', 'Address cannot be empty');
      return;
    }

    setSavingChanges(true);
    try {
      await api.put(`/owner/properties/${propertyId}`, {
        address: newAddress.trim()
      });
      
      setProperty({ ...property, address: newAddress.trim() });
      setEditingAddress(false);
      Alert.alert('Success', 'Address updated');
    } catch (error) {
      console.error('Error updating address:', error);
      Alert.alert('Error', 'Failed to update address');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleToggleFiveStarMode = async () => {
    const newValue = !property?.five_star_mode;
    
    Alert.alert(
      newValue ? '🌟 Enable 5-Star Mode?' : 'Disable 5-Star Mode?',
      newValue 
        ? 'This will enable ultra-strict, white-glove inspection standards with 150+ professional checklist items. AI grading will be extremely harsh (2-5/10 typical).\n\nBest for luxury properties.'
        : 'This will return to standard inspection grading.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newValue ? 'Enable' : 'Disable',
          style: newValue ? 'default' : 'destructive',
          onPress: async () => {
            setTogglingFiveStarMode(true);
            try {
              await api.patch(`/owner/properties/${propertyId}/five-star-mode`, {
                five_star_mode: newValue
              });
              
              setProperty({ ...property, five_star_mode: newValue });
              Alert.alert(
                'Success', 
                newValue 
                  ? '🌟 5-Star Mode enabled! Future inspections will use ultra-strict standards.' 
                  : '5-Star Mode disabled. Back to standard grading.'
              );
            } catch (error) {
              console.error('Error toggling 5-star mode:', error);
              Alert.alert('Error', 'Failed to update 5-star mode');
            } finally {
              setTogglingFiveStarMode(false);
            }
          }
        }
      ]
    );
  };

  const handleEditRoomTips = (room) => {
    setNewRoomTips(room.tips || '');
    setEditingRoomTips(room);
  };

  const handleSaveRoomTips = async () => {
    if (!editingRoomTips) return;

    setSavingChanges(true);
    try {
      if (isPMS) {
        await api.put(`/pms/properties/${propertyId}/rooms/${editingRoomTips.id}`, {
          tips: newRoomTips.trim()
        });
        
        // Update local state for PMS
        setRooms(rooms.map(room => 
          room.id === editingRoomTips.id 
            ? { ...room, tips: newRoomTips.trim() }
            : room
        ));
      } else {
        await api.put(`/owner/rooms/${editingRoomTips.id}`, {
          tips: newRoomTips.trim()
        });
        
        // Update local state for manual properties
        setUnits(units.map(unit => ({
          ...unit,
          rooms: unit.rooms?.map(room => 
            room.id === editingRoomTips.id 
              ? { ...room, tips: newRoomTips.trim() }
              : room
          )
        })));
      }
      
      setEditingRoomTips(null);
      Alert.alert('Success', 'Room tips updated');
    } catch (error) {
      console.error('Error updating room tips:', error);
      Alert.alert('Error', 'Failed to update room tips');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleEditNotes = () => {
    setNewNotes(property?.notes || '');
    setEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    if (!isPMS) return; // Only PMS properties have notes

    setSavingChanges(true);
    try {
      await api.put(`/pms/properties/${propertyId}`, {
        notes: newNotes.trim()
      });
      
      setProperty({ ...property, notes: newNotes.trim() });
      setEditingNotes(false);
      Alert.alert('Success', 'Notes updated');
    } catch (error) {
      console.error('Error updating notes:', error);
      Alert.alert('Error', 'Failed to update notes');
    } finally {
      setSavingChanges(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Modern Gradient Header */}
        <View style={styles.modernHeader}>
          <View style={styles.headerContent}>
            {/* Property Title */}
            <View style={styles.propertyTitleRow}>
              <View style={styles.propertyTitleLeft}>
                <Text style={styles.modernTitle}>{property?.name}</Text>
                <TouchableOpacity 
                  style={styles.modernEditButton}
                  onPress={handleEditPropertyName}
                >
                  <Ionicons name="pencil-outline" size={14} color="#4A90E2" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Address */}
            <View style={styles.modernAddressRow}>
              <Ionicons name="location-outline" size={14} color="#94A3B8" />
              <Text style={styles.modernAddress}>{property?.address}</Text>
              <TouchableOpacity 
                style={styles.modernEditAddressButton}
                onPress={handleEditAddress}
              >
                <Ionicons name="pencil-outline" size={12} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Compact Stats Grid */}
          <View style={styles.modernStatsGrid}>
            <View style={styles.modernStatCard}>
              <View style={styles.modernStatIcon}>
                <Ionicons name="bed-outline" size={16} color="#4A90E2" />
              </View>
              <Text style={styles.modernStatNumber}>{getTotalRooms()}</Text>
              <Text style={styles.modernStatLabel}>Rooms</Text>
            </View>
            
            <View style={styles.modernStatCard}>
              <View style={styles.modernStatIcon}>
                <Ionicons name="document-text-outline" size={16} color="#10B981" />
              </View>
              <Text style={styles.modernStatNumber}>
                {units.reduce((total, unit) => total + unit._count.inspections, 0)}
              </Text>
              <Text style={styles.modernStatLabel}>Inspections</Text>
            </View>
            
            <View style={styles.modernStatCard}>
              <View style={styles.modernStatIcon}>
                <Ionicons 
                  name={units[0]?.inspections[0] ? "checkmark-circle" : "help-circle-outline"} 
                  size={16} 
                  color={units[0]?.inspections[0] ? getScoreColor(units[0].inspections[0].cleanliness_score) : "#94A3B8"} 
                />
              </View>
              <Text style={[
                styles.modernStatNumber,
                { color: units[0]?.inspections[0] ? getScoreColor(units[0].inspections[0].cleanliness_score) : '#64748B' }
              ]}>
                {units[0]?.inspections[0]?.cleanliness_score?.toFixed(1) || 'N/A'}
              </Text>
              <Text style={styles.modernStatLabel}>Score</Text>
            </View>
          </View>
        </View>

        {/* 5-Star Mode Toggle */}
        <View style={styles.fiveStarSection}>
          <TouchableOpacity 
            style={styles.fiveStarCard}
            onPress={handleToggleFiveStarMode}
            disabled={togglingFiveStarMode}
            activeOpacity={0.7}
          >
            <View style={styles.fiveStarContent}>
              <View style={styles.fiveStarLeft}>
                <View style={styles.fiveStarIconContainer}>
                  <Ionicons 
                    name={property?.five_star_mode ? "star" : "star-outline"} 
                    size={24} 
                    color={property?.five_star_mode ? "#FFD700" : "#999"} 
                  />
                </View>
                <View style={styles.fiveStarTextContainer}>
                  <Text style={styles.fiveStarTitle}>
                    5-Star Mode {property?.five_star_mode && '🌟'}
                  </Text>
                  <Text style={styles.fiveStarDescription}>
                    {property?.five_star_mode 
                      ? 'Ultra-strict white-glove standards active' 
                      : 'Tap to enable luxury inspection standards'}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.fiveStarToggle,
                property?.five_star_mode && styles.fiveStarToggleActive
              ]}>
                <View style={[
                  styles.fiveStarToggleThumb,
                  property?.five_star_mode && styles.fiveStarToggleThumbActive
                ]}>
                  {togglingFiveStarMode ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons 
                      name={property?.five_star_mode ? "checkmark" : "close"} 
                      size={16} 
                      color="#FFF" 
                    />
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
          
          {property?.five_star_mode && (
            <View style={styles.fiveStarInfo}>
              <Ionicons name="information-circle" size={16} color="#FFD700" />
              <Text style={styles.fiveStarInfoText}>
                150+ checklist items • Ultra-harsh AI grading (2-5/10 typical) • Photo/video evidence required
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.modernSectionHeader}>
            <Text style={styles.modernSectionTitle}>Rooms</Text>
            <Text style={styles.modernSectionSubtitle}>
              Tips shown to AI and cleaners
            </Text>
          </View>

          {units.length === 0 || getTotalRooms() === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No rooms configured yet</Text>
              <Text style={styles.emptyHint}>
                Edit this property to add rooms
              </Text>
            </View>
          ) : (
            units.map((unit) => (
              unit.rooms && unit.rooms.length > 0 && (
                <View key={unit.id}>
                  {unit.rooms.map((room) => (
                    <View key={room.id} style={styles.roomCard}>
                      <TouchableOpacity
                        style={styles.roomHeader}
                        onPress={() => toggleRoomExpansion(room.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.roomTitleRow}>
                          <View style={styles.roomIconContainer}>
                            <Ionicons 
                              name={getRoomIcon(room.room_type)} 
                              size={24} 
                              color="#4A90E2" 
                            />
                          </View>
                          <View style={styles.roomInfo}>
                            <Text style={styles.roomName}>{room.name}</Text>
                            <Text style={styles.roomType}>
                              {getRoomLabel(room.room_type)}
                            </Text>
                          </View>
                        </View>
                        <Ionicons 
                          name={expandedRooms[room.id] ? "chevron-up" : "chevron-down"} 
                          size={24} 
                          color="#999" 
                        />
                      </TouchableOpacity>

                      {expandedRooms[room.id] && (
                        <View style={styles.tipsContainer}>
                          <View style={styles.tipsHeader}>
                            <View style={styles.tipsHeaderLeft}>
                              <Ionicons name="information-circle" size={16} color="#4A90E2" />
                              <Text style={styles.tipsTitle}>Inspection Tips</Text>
                            </View>
                            <TouchableOpacity 
                              style={styles.editTipsButton}
                              onPress={() => handleEditRoomTips(room)}
                            >
                              <Ionicons name="pencil" size={14} color="#4A90E2" />
                            </TouchableOpacity>
                          </View>
                          {room.tips ? (
                            <Text style={styles.tipsText}>{room.tips}</Text>
                          ) : (
                            <Text style={styles.noTipsText}>No tips added yet</Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )
            ))
          )}
        </View>

        {/* Inspection History Section */}
        <View style={styles.section}>
          <View style={styles.modernSectionHeader}>
            <Text style={styles.modernSectionTitle}>Recent Inspections</Text>
          </View>
          
          {units.some(unit => unit.inspections[0]) ? (
            units.map((unit) => (
              unit.inspections[0] && (
                <View key={unit.id} style={styles.inspectionCard}>
                  <View style={styles.inspectionHeader}>
                    <View>
                      <Text style={styles.inspectionUnit}>{unit.name}</Text>
                      <Text style={styles.inspectionDate}>
                        {new Date(unit.inspections[0].created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.inspectionScore}>
                      <Text
                        style={[
                          styles.scoreText,
                          { color: getScoreColor(unit.inspections[0].cleanliness_score) },
                        ]}
                      >
                        {unit.inspections[0].cleanliness_score?.toFixed(1) || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            ))
          ) : (
            <View style={styles.emptyInspections}>
              <Ionicons name="clipboard-outline" size={48} color="#ccc" />
              <Text style={styles.emptyInspectionsText}>No inspections yet</Text>
              <Text style={styles.emptyInspectionsHint}>
                Assign a cleaner to start inspecting this property
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Property Name Modal */}
      <Modal
        visible={editingPropertyName}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingPropertyName(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Property Name</Text>
              <TouchableOpacity onPress={() => setEditingPropertyName(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.modalInput}
              value={newPropertyName}
              onChangeText={setNewPropertyName}
              placeholder="Property name"
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingPropertyName(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSavePropertyName}
                disabled={savingChanges}
              >
                {savingChanges ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Address Modal */}
      <Modal
        visible={editingAddress}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingAddress(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Address</Text>
              <TouchableOpacity onPress={() => setEditingAddress(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.modalInput}
              value={newAddress}
              onChangeText={setNewAddress}
              placeholder="Property address"
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingAddress(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveAddress}
                disabled={savingChanges}
              >
                {savingChanges ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Room Tips Modal */}
      <Modal
        visible={editingRoomTips !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingRoomTips(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Tips for {editingRoomTips?.name}</Text>
              <TouchableOpacity onPress={() => setEditingRoomTips(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.modalInput, styles.tipsInput]}
              value={newRoomTips}
              onChangeText={setNewRoomTips}
              placeholder="Add tips for cleaners and AI..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingRoomTips(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveRoomTips}
                disabled={savingChanges}
              >
                {savingChanges ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  // Modern Header Styles
  modernHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  headerContent: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  propertyTitleRow: {
    marginBottom: 6,
  },
  propertyTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.6,
  },
  modernEditButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modernAddress: {
    fontSize: 15,
    color: '#8E8E93',
    flex: 1,
    letterSpacing: -0.2,
  },
  modernEditAddressButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernStatsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  modernStatCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 0,
  },
  modernStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  modernStatNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  modernStatLabel: {
    fontSize: 11,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  // Modern Section Headers
  modernSectionHeader: {
    marginBottom: 12,
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  modernSectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    letterSpacing: -0.5,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  address: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    letterSpacing: -0.2,
  },
  editAddressButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingBottom: 4,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  statTextContainer: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
    letterSpacing: -0.2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e9ecef',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
    letterSpacing: -0.4,
  },
  emptyHint: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 6,
    letterSpacing: -0.2,
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  roomType: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  tipsContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.12)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tipsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 6,
    letterSpacing: -0.1,
  },
  editTipsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  noTipsText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    letterSpacing: -0.2,
  },
  inspectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectionUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  inspectionDate: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: -0.1,
  },
  inspectionScore: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  emptyInspections: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyInspectionsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyInspectionsHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    letterSpacing: -0.3,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  tipsInput: {
    height: 120,
    paddingTop: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // 5-Star Mode Styles
  fiveStarSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  fiveStarCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fiveStarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fiveStarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fiveStarIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fiveStarTextContainer: {
    flex: 1,
  },
  fiveStarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  fiveStarDescription: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
    letterSpacing: -0.2,
  },
  fiveStarToggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  fiveStarToggleActive: {
    backgroundColor: '#FFD700',
  },
  fiveStarToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fiveStarToggleThumbActive: {
    backgroundColor: '#B45309',
    marginLeft: 24,
  },
  fiveStarInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
    gap: 8,
  },
  fiveStarInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
    letterSpacing: -0.2,
  },
});
