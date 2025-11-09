import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  Animated,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import colors, { getScoreColor } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

export default function InspectionDetailScreen({ route, navigation }) {
  const { inspectionId, userRole } = route?.params || {};
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    issues: true,
    photos: true,
    inventory: true,
    photoQuality: true,
    instructions: true,
  });
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [failedRoomIds, setFailedRoomIds] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  // Animation refs for smooth expand/collapse
  const sectionAnimations = useRef({
    issues: new Animated.Value(1),
    photos: new Animated.Value(1),
    inventory: new Animated.Value(1),
    photoQuality: new Animated.Value(1),
    instructions: new Animated.Value(1),
  }).current;

  useEffect(() => {
    if (inspectionId) {
      fetchInspection();
    } else {
      setLoading(false);
      setError('No inspection ID provided');
    }
  }, [inspectionId]);

  useEffect(() => {
    let interval;
    if (inspection?.status === 'PROCESSING') {
      interval = setInterval(fetchInspection, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [inspection?.status]);

  const fetchInspection = async () => {
    try {
      const response = await api.get(`/inspections/${inspectionId}`);
      const data = response.data;
      
      if (!data) {
        setInspection(null);
        return;
      }

      // Parse JSON fields
      try {
        if (typeof data.summary_json === 'string') {
          data.summary_json = JSON.parse(data.summary_json);
        }
        if (typeof data.airbnb_grade_analysis === 'string') {
          data.airbnb_grade_analysis = JSON.parse(data.airbnb_grade_analysis);
        }
        if (typeof data.damage_analysis === 'string') {
          data.damage_analysis = JSON.parse(data.damage_analysis);
        }
        if (typeof data.photo_quality_analysis === 'string') {
          data.photo_quality_analysis = JSON.parse(data.photo_quality_analysis);
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }

      setInspection(data);
      
      // Auto-select first room if available
      if (data.photo_quality_analysis?.room_results && !selectedRoomId) {
        const roomIds = Object.keys(data.photo_quality_analysis.room_results);
        if (roomIds.length > 0) {
          setSelectedRoomId(roomIds[0]);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Fetch inspection error:', err);
      setError('Failed to load inspection');
      setLoading(false);
      Alert.alert('Error', 'Failed to load inspection details');
    }
  };

  const toggleSection = (section) => {
    const isExpanded = expandedSections[section];
    
    // Animate the expansion/collapse
    Animated.timing(sectionAnimations[section], {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInspection();
    setRefreshing(false);
  };
  
  const handlePhotoPress = (photo) => {
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  const handleEditInspection = () => {
    const { unit, failed_room_ids, media, photo_quality_analysis } = inspection || {};
    let rooms = unit?.rooms || [];
    
    // Fallback: If rooms aren't in unit, try to reconstruct from room_results
    if (rooms.length === 0 && photo_quality_analysis?.room_results) {
      const roomResults = photo_quality_analysis.room_results;
      rooms = Object.entries(roomResults).map(([roomId, roomData]) => ({
        id: roomId,
        name: roomData.room_name,
        room_type: roomData.room_type,
        tips: null
      }));
      console.log('📋 Reconstructed rooms from room_results:', rooms.length);
    }
    
    if (rooms.length === 0) {
      Alert.alert('No Rooms', 'This inspection has no rooms defined');
      return;
    }

    const isRejected = inspection?.status === 'REJECTED';
    const failedRoomIds = failed_room_ids || [];

    // Navigate to CaptureMediaScreen with inspection data and existing photos
    navigation.navigate('CaptureMedia', {
      inspectionId: inspectionId,
      propertyName: unit?.property?.name || 'Property',
      unitName: unit?.name || 'Unit',
      rooms: rooms,
      isRejected: isRejected,
      failedRoomIds: failedRoomIds,
      rejectionReason: inspection?.rejection_reason || '',
      existingMedia: media || [],
      isEditing: true
    });
  };

  const handleRedoInspection = () => {
    const { unit, failed_room_ids, photo_quality_analysis } = inspection || {};
    let rooms = unit?.rooms || [];
    
    // Fallback: If rooms aren't in unit, try to reconstruct from room_results
    if (rooms.length === 0 && photo_quality_analysis?.room_results) {
      const roomResults = photo_quality_analysis.room_results;
      rooms = Object.entries(roomResults).map(([roomId, roomData]) => ({
        id: roomId,
        name: roomData.room_name,
        room_type: roomData.room_type,
        tips: null
      }));
      console.log('📋 Reconstructed rooms from room_results:', rooms.length);
    }
    
    if (rooms.length === 0) {
      Alert.alert('No Rooms', 'This inspection has no rooms defined');
      return;
    }

    const isRejected = inspection?.status === 'REJECTED';
    const failedRoomIds = failed_room_ids || [];

    // Navigate to CaptureMediaScreen with inspection data
    navigation.navigate('CaptureMedia', {
      inspectionId: inspectionId,
      propertyName: unit?.property?.name || 'Property',
      unitName: unit?.name || 'Unit',
      rooms: rooms,
      isRejected: isRejected,
      failedRoomIds: failedRoomIds,
      rejectionReason: inspection?.rejection_reason || ''
    });
  };

  const handleOpenRejectModal = () => {
    // Get all room IDs from the inspection
    const roomResults = inspection?.photo_quality_analysis?.room_results || {};
    const allRoomIds = Object.keys(roomResults);
    
    if (allRoomIds.length === 0) {
      Alert.alert('No Rooms', 'This inspection has no rooms to reject');
      return;
    }

    setFailedRoomIds(allRoomIds); // Pre-select all rooms by default
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const toggleFailedRoom = (roomId) => {
    setFailedRoomIds(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId);
      } else {
        return [...prev, roomId];
      }
    });
  };

  const handleSubmitRejection = async () => {
    if (failedRoomIds.length === 0) {
      Alert.alert('No Rooms Selected', 'Please select at least one room that failed');
      return;
    }

    setRejecting(true);
    try {
      await api.post(`/inspections/${inspectionId}/reject`, {
        failed_room_ids: failedRoomIds,
        rejection_reason: rejectionReason.trim() || 'Inspection did not pass quality standards'
      });

      Alert.alert(
        'Inspection Rejected',
        'The cleaner has been notified and can retake photos for the failed rooms.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowRejectModal(false);
              if (navigation) {
                navigation.goBack();
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('Reject inspection error:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to reject inspection');
    } finally {
      setRejecting(false);
    }
  };

  const safeString = (value, defaultValue = '') => {
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  };

  const safeNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  const getRatingColor = (score) => {
    return getScoreColor(score);
  };

  const getRatingBgColor = (score) => {
    if (score >= 8) return '#E8F8ED';  // Light green tint
    if (score >= 6) return '#FFF9E6';  // Light yellow tint
    return '#FFEBEA';  // Light red tint
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (!inspection) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Inspection not found</Text>
      </View>
    );
  }

  const fullAddress = safeString(inspection.unit?.property?.address, 'Address');
  const status = safeString(inspection.status, 'UNKNOWN');

  // Format date
  let formattedDate = '';
  try {
    if (inspection.created_at) {
      const d = new Date(inspection.created_at);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const day = d.getDate();
      const year = d.getFullYear();
      formattedDate = `${month} ${day}, ${year}`;
    }
  } catch (e) {
    console.error('Date error:', e);
  }

  const cleanlinessScore = safeNumber(inspection.cleanliness_score, 0);
  const photoQuality = inspection.photo_quality_analysis;
  const roomResults = photoQuality?.room_results || {};
  const roomIds = Object.keys(roomResults);
  
  // Debug logging
  console.log('🔍 Inspection Debug:');
  console.log('  - Photo Quality:', photoQuality);
  console.log('  - Room Results:', roomResults);
  console.log('  - Room IDs:', roomIds);
  console.log('  - Room IDs length:', roomIds.length);
  console.log('  - Media count:', inspection.media?.length);
  console.log('  - Media with room_id:', inspection.media?.filter(m => m.room_id).length);
  console.log('  - Selected Room ID:', selectedRoomId);
  
  // Get selected room data or fall back to overall
  const selectedRoomData = selectedRoomId ? roomResults[selectedRoomId] : null;
  
  // Debug logging for instruction adherence
  if (selectedRoomData) {
    console.log(`🔍 Selected room: ${selectedRoomData.room_name}`);
    console.log(`📋 has_custom_requirements: ${selectedRoomData.has_custom_requirements}`);
    console.log(`📋 instruction_adherence exists: ${!!selectedRoomData.instruction_adherence}`);
    if (selectedRoomData.instruction_adherence) {
      console.log(`   - adherence_score: ${selectedRoomData.instruction_adherence.adherence_score}/10`);
    } else {
      console.log(`⚠️  No instruction_adherence data for ${selectedRoomData.room_name}`);
    }
  }
  
  // Use room-specific data if available, otherwise fall back to overall
  const improvements = selectedRoomData?.cleanliness_reasons || inspection.airbnb_grade_analysis?.improvements_needed || [];
  const allInventory = selectedRoomData?.damage_items || inspection.damage_analysis?.inventory || [];
  const roomPhotoQuality = selectedRoomData?.photo_quality || photoQuality;
  const isReady = selectedRoomData?.guest_ready ?? inspection.airbnb_grade_analysis?.guest_ready;
  const grade = selectedRoomData?.overall_grade || inspection.airbnb_grade_analysis?.overall_grade;
  const roomScore = selectedRoomData ? safeNumber(selectedRoomData.cleanliness_score, 0) : cleanlinessScore;
  
  // Filter media by selected room
  const allMedia = inspection.media || [];
  const roomMedia = selectedRoomId 
    ? allMedia.filter(m => m.room_id === selectedRoomId) 
    : allMedia;

  // Determine display status and colors
  const getStatusDisplay = () => {
    // Check for app/technical failures
    const errorMsg = inspection.summary_json?.error || '';
    const isAppFailed = errorMsg.includes('blurred') || 
                        errorMsg.includes('technical') || 
                        errorMsg.includes('processing') ||
                        errorMsg.includes('WRONG ROOM TYPE') ||
                        errorMsg.includes('CRITICAL ERROR');
    
    if (status === 'FAILED' || isAppFailed) {
      return {
        label: 'App Failed',
        backgroundColor: '#FFEBEE',
        textColor: '#C62828',
        canEdit: true
      };
    }
    
    if (status === 'REJECTED') {
      return {
        label: 'Rejected',
        backgroundColor: '#FFF3E0',
        textColor: '#E65100',
        canEdit: true
      };
    }
    
    // Not ready means cleaning failed
    if (!isReady && status === 'COMPLETE') {
      return {
        label: 'Cleaning Failed',
        backgroundColor: '#FFEBEE',
        textColor: '#C62828',
        canEdit: true
      };
    }
    
    return {
      label: 'Ready',
      backgroundColor: '#E8F8ED',
      textColor: '#1B5E20',
      canEdit: false
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <View style={styles.container}>
      {status === 'PROCESSING' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.processingText}>Analyzing photos...</Text>
        </View>
      ) : (status === 'COMPLETE' || status === 'FAILED' || status === 'REJECTED') && cleanlinessScore !== null && cleanlinessScore !== undefined ? (
        <>
          {/* COMPACT HEADER */}
          <View style={styles.compactHeader}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerAddress} numberOfLines={1}>{fullAddress}</Text>
                <Text style={styles.headerDate}>{formattedDate}</Text>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreBoxLabel}>Score</Text>
                  <Text style={styles.scoreBoxValue}>
                    {roomScore.toFixed(1)}
                  </Text>
                </View>
                <View style={[styles.statusBox, { 
                  backgroundColor: statusDisplay.backgroundColor
                }]}>
                  <Text style={[styles.statusBoxText, { 
                    color: statusDisplay.textColor
                  }]}>
                    {statusDisplay.label}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* ROOM SELECTOR */}
            {roomIds.length > 0 && (
              <View style={styles.roomSelectorContainer}>
                <Text style={styles.roomSelectorLabel}>Select Room:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomSelectorScroll}>
                  {roomIds.map(roomId => {
                    const room = roomResults[roomId];
                    const isSelected = roomId === selectedRoomId;
                    const photoCount = allMedia.filter(m => m.room_id === roomId).length;
                    
                    return (
                      <TouchableOpacity
                        key={roomId}
                        style={[styles.roomTab, isSelected && styles.roomTabSelected]}
                        onPress={() => setSelectedRoomId(roomId)}
                      >
                        <Text style={[styles.roomTabText, isSelected && styles.roomTabTextSelected]}>
                          {room.room_name}
                        </Text>
                        <Text style={[styles.roomTabCount, isSelected && styles.roomTabCountSelected]}>
                          {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            
            <View style={styles.actionButtons}>
              {/* Edit Inspection Button - for cleaners when inspection failed */}
              {userRole === 'CLEANER' && statusDisplay.canEdit && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditInspection}
                >
                  <Text style={styles.editButtonText}>✏️ Edit Inspection</Text>
                </TouchableOpacity>
              )}
              
              {/* Only show reject button to owners and if status is not already rejected */}
              {userRole === 'OWNER' && status !== 'REJECTED' && (
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={handleOpenRejectModal}
                >
                  <Text style={styles.rejectButtonText}>❌ Reject Inspection</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView 
            style={styles.scrollContent} 
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#007AFF"
              />
            }
          >
            {/* CRITICAL ERROR BANNER */}
            {improvements.length > 0 && improvements.some(item => 
              String(item).includes('❌') || 
              String(item).toUpperCase().includes('WRONG ROOM') ||
              String(item).toUpperCase().includes('CRITICAL ERROR') ||
              String(item).toUpperCase().includes('NOT A BEDROOM') ||
              String(item).toUpperCase().includes('NOT A BATHROOM') ||
              String(item).toUpperCase().includes('NOT A KITCHEN')
            ) && (
              <View style={styles.criticalErrorBanner}>
                <View style={styles.criticalErrorHeader}>
                  <Text style={styles.criticalErrorIcon}>⚠️</Text>
                  <Text style={styles.criticalErrorTitle}>Critical Issue Detected</Text>
                </View>
                {improvements
                  .filter(item => 
                    String(item).includes('❌') || 
                    String(item).toUpperCase().includes('WRONG ROOM') ||
                    String(item).toUpperCase().includes('CRITICAL ERROR') ||
                    String(item).toUpperCase().includes('NOT A BEDROOM') ||
                    String(item).toUpperCase().includes('NOT A BATHROOM') ||
                    String(item).toUpperCase().includes('NOT A KITCHEN')
                  )
                  .map((error, i) => (
                    <Text key={i} style={styles.criticalErrorText}>{safeString(error)}</Text>
                  ))
                }
                <View style={styles.criticalErrorAction}>
                  <Text style={styles.criticalErrorActionText}>
                    📸 Please retake photos of the correct room and resubmit inspection
                  </Text>
                </View>
              </View>
            )}
            
            {/* IMPROVEMENTS NEEDED */}
            <View style={styles.card}>
              <TouchableOpacity 
                style={styles.sectionHeaderButton}
                onPress={() => toggleSection('issues')}
              >
                <Text style={styles.sectionTitle}>Improvements Needed ({improvements.filter(item => 
                  !String(item).includes('❌') && 
                  !String(item).toUpperCase().includes('WRONG ROOM') &&
                  !String(item).toUpperCase().includes('CRITICAL ERROR')
                ).length})</Text>
                <Text style={styles.expandIcon}>{expandedSections.issues ? '−' : '+'}</Text>
              </TouchableOpacity>
              {expandedSections.issues ? (
                <View style={styles.issuesList}>
                  {improvements.filter(item => 
                    !String(item).includes('❌') && 
                    !String(item).toUpperCase().includes('WRONG ROOM') &&
                    !String(item).toUpperCase().includes('CRITICAL ERROR')
                  ).length > 0 ? (
                    improvements
                      .filter(item => 
                        !String(item).includes('❌') && 
                        !String(item).toUpperCase().includes('WRONG ROOM') &&
                        !String(item).toUpperCase().includes('CRITICAL ERROR')
                      )
                      .map((item, i) => (
                        <View key={i} style={styles.issueItem}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.issueText}>{safeString(item)}</Text>
                        </View>
                      ))
                  ) : (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateText}>
                        ✅ No additional issues
                      </Text>
                      <Text style={styles.emptyStateSubtext}>
                        All other aspects look good
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>

            {/* COMPLETE INVENTORY */}
            <View style={styles.card}>
              <TouchableOpacity 
                style={styles.sectionHeaderButton}
                onPress={() => toggleSection('inventory')}
              >
                <Text style={styles.sectionTitle}>Room Inventory ({allInventory.length})</Text>
                <Text style={styles.expandIcon}>{expandedSections.inventory ? '−' : '+'}</Text>
              </TouchableOpacity>
              {expandedSections.inventory ? (
                <View style={styles.itemsList}>
                  {allInventory.length > 0 ? (
                    allInventory.map((item, i) => (
                      <View key={i}>
                        <View style={styles.itemRow}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{safeString(item.item || item.name || 'Item')}</Text>
                            {item.issue ? (
                              <Text style={styles.itemIssue}>{safeString(item.issue)}</Text>
                            ) : item.condition ? (
                              <Text style={styles.itemIssue}>{safeString(item.condition)}</Text>
                            ) : null}
                          </View>
                          {item.condition_score && (
                            <View style={[styles.scoreBadge, { 
                              backgroundColor: getRatingBgColor(item.condition_score || 10)
                            }]}>
                              <Text style={[styles.scoreBadgeText, { 
                                color: getRatingColor(item.condition_score || 10)
                              }]}>
                                {safeNumber(item.condition_score, 10)}/10
                              </Text>
                            </View>
                          )}
                        </View>
                        {i < allInventory.length - 1 ? <View style={styles.thinDivider} /> : null}
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateText}>
                        ⚠️ No items detected
                      </Text>
                      <Text style={styles.emptyStateSubtext}>
                        AI should detect furniture and fixtures in the room.
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>

            {/* INSTRUCTION ADHERENCE */}
            {selectedRoomData?.instruction_adherence && selectedRoomData?.has_custom_requirements && (
              <View style={styles.card}>
                <TouchableOpacity 
                  style={styles.sectionHeaderButton}
                  onPress={() => toggleSection('instructions')}
                >
                  <View style={styles.sectionHeaderWithScore}>
                    <Text style={styles.sectionTitle}>Special Instructions</Text>
                    {selectedRoomData.instruction_adherence.adherence_score !== undefined && (
                      <View style={[styles.adherenceScoreBadge, { 
                        backgroundColor: getRatingBgColor(selectedRoomData.instruction_adherence.adherence_score)
                      }]}>
                        <Text style={[styles.adherenceScoreText, { 
                          color: getRatingColor(selectedRoomData.instruction_adherence.adherence_score)
                        }]}>
                          {safeNumber(selectedRoomData.instruction_adherence.adherence_score, 0)}/10
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.expandIcon}>{expandedSections.instructions ? '−' : '+'}</Text>
                </TouchableOpacity>
                {expandedSections.instructions ? (
                  <View>
                    {/* MISSED REQUIREMENTS FIRST */}
                    {selectedRoomData.instruction_adherence.requirements_missed && selectedRoomData.instruction_adherence.requirements_missed.length > 0 && (
                      <View style={styles.missedSection}>
                        <Text style={styles.missedTitle}>⚠️ Missed Requirements:</Text>
                        {selectedRoomData.instruction_adherence.requirements_missed.map((missed, idx) => (
                          <View key={idx} style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.missedText}>{safeString(missed)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {selectedRoomData.instruction_adherence.feedback && (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackTitle}>📋 Overall Assessment</Text>
                        <Text style={styles.feedbackText}>{safeString(selectedRoomData.instruction_adherence.feedback)}</Text>
                      </View>
                    )}

                    {selectedRoomData.instruction_adherence.requirements_met && selectedRoomData.instruction_adherence.requirements_met.length > 0 && (
                      <View style={styles.requirementsSection}>
                        <Text style={styles.requirementsSectionTitle}>Requirements Status:</Text>
                        {selectedRoomData.instruction_adherence.requirements_met.map((req, idx) => (
                          <View key={idx} style={styles.requirementItem}>
                            <View style={styles.requirementHeader}>
                              <Text style={styles.requirementIcon}>{req.met ? '✅' : '❌'}</Text>
                              <Text style={[styles.requirementText, { flex: 1 }]}>
                                {safeString(req.requirement)}
                              </Text>
                            </View>
                            {req.evidence && (
                              <Text style={styles.requirementEvidence}>
                                Evidence: {safeString(req.evidence)}
                              </Text>
                            )}
                            {req.notes && (
                              <Text style={styles.requirementNotes}>
                                {safeString(req.notes)}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {selectedRoomData.instruction_adherence.improvements_needed && selectedRoomData.instruction_adherence.improvements_needed.length > 0 && (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackTitle}>💡 How to Improve</Text>
                        {selectedRoomData.instruction_adherence.improvements_needed.map((tip, idx) => (
                          <View key={idx} style={styles.feedbackTipRow}>
                            <Text style={styles.feedbackTipText}>• {safeString(tip)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            )}

            {/* PHOTO QUALITY */}
            {roomPhotoQuality ? (
              <View style={styles.card}>
                <TouchableOpacity 
                  style={styles.sectionHeaderButton}
                  onPress={() => toggleSection('photoQuality')}
                >
                  <Text style={styles.sectionTitle}>Photo Quality</Text>
                  <Text style={styles.expandIcon}>{expandedSections.photoQuality ? '−' : '+'}</Text>
                </TouchableOpacity>
                {expandedSections.photoQuality ? (
                  <View>
                    {/* Photo Quality Scores with Progress Bars */}
                    <View style={styles.photoQualityList}>
                      {/* Overall Score - Highlighted */}
                      <View style={styles.qualityRowHighlight}>
                        <View style={styles.qualityRowHeader}>
                          <Text style={styles.qualityRowLabelBold}>Overall Quality</Text>
                          <Text style={[styles.qualityRowValueLarge, { 
                            color: getRatingColor(roomPhotoQuality.photo_quality_score || 0)
                          }]}>
                            {safeNumber(roomPhotoQuality.photo_quality_score, 0)}/10
                          </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBarFill, {
                            width: `${(roomPhotoQuality.photo_quality_score || 0) * 10}%`,
                            backgroundColor: getRatingColor(roomPhotoQuality.photo_quality_score || 0)
                          }]} />
                        </View>
                      </View>

                      {/* Detailed Scores */}
                      <View style={styles.qualityDetailSection}>
                        <View style={styles.qualityRowCompact}>
                          <Text style={styles.qualityRowLabel}>Composition</Text>
                          <View style={styles.qualityRowRight}>
                            <View style={styles.miniProgressBar}>
                              <View style={[styles.miniProgressFill, {
                                width: `${(roomPhotoQuality.composition_score || 0) * 10}%`,
                                backgroundColor: getRatingColor(roomPhotoQuality.composition_score || 0)
                              }]} />
                            </View>
                            <Text style={[styles.qualityRowValue, { 
                              color: getRatingColor(roomPhotoQuality.composition_score || 0)
                            }]}>
                              {safeNumber(roomPhotoQuality.composition_score, 0)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.qualityRowCompact}>
                          <Text style={styles.qualityRowLabel}>Lighting</Text>
                          <View style={styles.qualityRowRight}>
                            <View style={styles.miniProgressBar}>
                              <View style={[styles.miniProgressFill, {
                                width: `${(roomPhotoQuality.lighting_score || 0) * 10}%`,
                                backgroundColor: getRatingColor(roomPhotoQuality.lighting_score || 0)
                              }]} />
                            </View>
                            <Text style={[styles.qualityRowValue, { 
                              color: getRatingColor(roomPhotoQuality.lighting_score || 0)
                            }]}>
                              {safeNumber(roomPhotoQuality.lighting_score, 0)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.qualityRowCompact}>
                          <Text style={styles.qualityRowLabel}>Technical</Text>
                          <View style={styles.qualityRowRight}>
                            <View style={styles.miniProgressBar}>
                              <View style={[styles.miniProgressFill, {
                                width: `${(roomPhotoQuality.technical_score || 0) * 10}%`,
                                backgroundColor: getRatingColor(roomPhotoQuality.technical_score || 0)
                              }]} />
                            </View>
                            <Text style={[styles.qualityRowValue, { 
                              color: getRatingColor(roomPhotoQuality.technical_score || 0)
                            }]}>
                              {safeNumber(roomPhotoQuality.technical_score, 0)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.qualityRowCompact}>
                          <Text style={styles.qualityRowLabel}>Coverage</Text>
                          <View style={styles.qualityRowRight}>
                            <View style={styles.miniProgressBar}>
                              <View style={[styles.miniProgressFill, {
                                width: `${(roomPhotoQuality.coverage_score || 0) * 10}%`,
                                backgroundColor: getRatingColor(roomPhotoQuality.coverage_score || 0)
                              }]} />
                            </View>
                            <Text style={[styles.qualityRowValue, { 
                              color: getRatingColor(roomPhotoQuality.coverage_score || 0)
                            }]}>
                              {safeNumber(roomPhotoQuality.coverage_score, 0)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Coverage Percentage - Inline */}
                    {roomPhotoQuality.coverage_percentage !== undefined && roomPhotoQuality.coverage_percentage !== null ? (
                      <View style={styles.coverageInline}>
                        <Text style={styles.coverageInlineLabel}>Room Coverage:</Text>
                        <Text style={[styles.coverageInlineValue, { 
                          color: roomPhotoQuality.coverage_percentage >= 70 ? colors.success : 
                                 roomPhotoQuality.coverage_percentage >= 30 ? colors.warning : colors.error
                        }]}>
                          {roomPhotoQuality.coverage_percentage}%
                        </Text>
                        <Text style={styles.coverageInlineHint}>
                          {roomPhotoQuality.coverage_percentage >= 70 ? '(Good)' : 
                           roomPhotoQuality.coverage_percentage >= 30 ? '(Aim for 70%+)' : '(Below 30%)'}
                        </Text>
                      </View>
                    ) : null}

                    {/* Missing Areas */}
                    {roomPhotoQuality.missing_areas && roomPhotoQuality.missing_areas.length > 0 ? (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackTitle}>Missing from Photos</Text>
                        {roomPhotoQuality.missing_areas.map((area, idx) => (
                          <View key={idx} style={styles.feedbackTipRow}>
                            <Text style={styles.feedbackTipText}>• {area.charAt(0).toUpperCase() + area.slice(1)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {roomPhotoQuality.what_to_improve ? (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackTitle}>Recommendations</Text>
                        <View style={styles.feedbackTipRow}>
                          <Text style={styles.feedbackText}>• {safeString(roomPhotoQuality.what_to_improve)}</Text>
                        </View>
                      </View>
                    ) : null}

                    {/* Photographer Feedback from Coverage Referee */}
                    {roomPhotoQuality.photographer_feedback && roomPhotoQuality.photographer_feedback.length > 0 ? (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackTitle}>How to Improve Coverage</Text>
                        {roomPhotoQuality.photographer_feedback.map((tip, i) => (
                          <View key={i} style={styles.feedbackTipRow}>
                            <Text style={styles.feedbackTipText}>• {safeString(tip)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* INSPECTION PHOTOS */}
            {roomMedia.length > 0 && (
              <View style={styles.card}>
                <TouchableOpacity 
                  style={styles.sectionHeaderButton}
                  onPress={() => toggleSection('photos')}
                >
                  <Text style={styles.sectionTitle}>Inspection Photos ({roomMedia.length})</Text>
                  <Text style={styles.expandIcon}>{expandedSections.photos ? '−' : '+'}</Text>
                </TouchableOpacity>
                {expandedSections.photos ? (
                  <View style={styles.photosGrid}>
                    {roomMedia.map((media, index) => (
                      <TouchableOpacity 
                        key={media.id || index} 
                        style={styles.photoContainer}
                        onPress={() => handlePhotoPress(media)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: media.url }}
                          style={styles.photoThumbnail}
                          resizeMode="cover"
                        />
                        {media.room_name && (
                          <Text style={styles.photoRoomLabel}>{media.room_name}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </>
      ) : null}

      {/* Full-Screen Photo Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <SafeAreaView style={styles.photoModalContainer}>
          <Pressable 
            style={styles.photoModalOverlay}
            onPress={() => setShowPhotoModal(false)}
          >
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>
                {selectedPhoto?.room_name || 'Inspection Photo'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPhotoModal(false)}
                style={styles.photoModalCloseButton}
              >
                <Ionicons name="close-circle" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Pressable style={styles.photoModalImageContainer}>
              {selectedPhoto && (
                <Image
                  source={{ uri: selectedPhoto.url }}
                  style={styles.photoModalImage}
                  resizeMode="contain"
                />
              )}
            </Pressable>
          </Pressable>
        </SafeAreaView>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Inspection</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Ionicons name="close" size={28} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select rooms that failed:</Text>

            <ScrollView style={styles.modalRoomList}>
              {Object.entries(inspection?.photo_quality_analysis?.room_results || {}).map(([roomId, roomData]) => {
                const isSelected = failedRoomIds.includes(roomId);
                return (
                  <TouchableOpacity
                    key={roomId}
                    style={[styles.modalRoomItem, isSelected && styles.modalRoomItemSelected]}
                    onPress={() => toggleFailedRoom(roomId)}
                  >
                    <Ionicons 
                      name={isSelected ? "checkbox" : "square-outline"} 
                      size={24} 
                      color={isSelected ? colors.primary.main : colors.text.secondary} 
                    />
                    <Text style={[styles.modalRoomText, isSelected && styles.modalRoomTextSelected]}>
                      {roomData.room_name || `Room ${roomId.substring(0, 8)}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.modalLabel}>Rejection Reason (Optional):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Photos are blurry, wrong room captured..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, rejecting && styles.modalButtonDisabled]}
                onPress={handleSubmitRejection}
                disabled={rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Reject</Text>
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
    backgroundColor: '#0F172A', // Modern dark background
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  errorText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#F87171',
    letterSpacing: -0.4,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#94A3B8',
    letterSpacing: -0.4,
  },
  processingText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F1F5F9',
    marginTop: 16,
    letterSpacing: -0.4,
  },
  
  // COMPACT HEADER - Modern dark
  compactHeader: {
    backgroundColor: '#1E293B',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerAddress: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    fontWeight: '400',
    color: '#94A3B8',
    letterSpacing: -0.1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  scoreBoxLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreBoxValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: -0.5,
  },
  gradeBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  gradeBoxLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gradeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  gradeBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: -0.3,
  },
  statusBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBoxText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  
  // CARD - Modern dark style
  card: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  
  // SECTIONS
  sectionHeaderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F1F5F9',
    letterSpacing: -0.4,
  },
  expandIcon: {
    fontSize: 22,
    fontWeight: '400',
    color: '#64748B',
  },
  
  // ISSUES - Better spacing
  issuesList: {
    gap: 12,
    marginTop: 8,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3B82F6',
    marginTop: 8,
  },
  issueText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#CBD5E1',
    letterSpacing: -0.2,
  },
  
  // ITEMS
  itemsList: {
    gap: 0,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  itemIssue: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  thinDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 60, 67, 0.12)',
    marginVertical: 8,
  },
  
  // PHOTO QUALITY - iOS system design
  photoQualityList: {
    marginTop: 16,
    marginBottom: 16,
  },
  qualityRowHighlight: {
    backgroundColor: 'rgba(120, 120, 128, 0.05)',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 67, 0.08)',
  },
  qualityRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qualityRowLabelBold: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
  },
  qualityRowValueLarge: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(60, 60, 67, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  qualityDetailSection: {
    gap: 12,
  },
  qualityRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qualityRowLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: '#3C3C43',
    letterSpacing: -0.2,
  },
  qualityRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniProgressBar: {
    width: 60,
    height: 6,
    backgroundColor: 'rgba(60, 60, 67, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  qualityRowValue: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
    minWidth: 24,
    textAlign: 'right',
  },
  qualityIssues: {
    gap: 16,
  },
  qualityIssueItem: {
    gap: 4,
  },
  qualityIssueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  qualityIssueText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  
  // PHOTOS - iOS grid style
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  photoWrapper: {
    width: (width - 112) / 3,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  roomSelectorContainer: {
    marginTop: 12,
    marginBottom: 6,
  },
  roomSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    marginLeft: 2,
    letterSpacing: -0.1,
  },
  roomSelectorScroll: {
    flexDirection: 'row',
  },
  roomTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
    alignItems: 'center',
  },
  roomTabSelected: {
    backgroundColor: '#007AFF',
    borderWidth: 0,
  },
  roomTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  roomTabTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  roomTabCount: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  roomTabCountSelected: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
  actionButtons: {
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  redoButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  redoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  roomResultsList: {
    marginTop: 12,
  },
  roomResultCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  roomResultHeader: {
    marginBottom: 12,
  },
  roomResultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomResultName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  roomResultType: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  roomResultScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomResultScore: {
    fontSize: 32,
    fontWeight: '700',
  },
  roomStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roomStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  roomIssues: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  roomIssuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  roomIssueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 8,
  },
  roomIssueText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  roomPhotoCount: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 12,
    fontStyle: 'italic',
  },
  emptyStateContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  photoContainer: {
    width: '48%',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
  },
  photoThumbnail: {
    width: '100%',
    height: 150,
    backgroundColor: '#F0F0F0',
  },
  photoRoomLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  
  // Critical Error Banner Styles
  criticalErrorBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  criticalErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  criticalErrorIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  criticalErrorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#C62828',
    letterSpacing: -0.4,
    flex: 1,
  },
  criticalErrorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#991B1B',
    marginBottom: 8,
    fontWeight: '500',
  },
  criticalErrorAction: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  criticalErrorActionText: {
    fontSize: 13,
    color: '#7F1D1D',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Photo Quality Feedback Styles
  feedbackSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 67, 0.08)',
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: '#000000',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3C3C43',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  feedbackTipRow: {
    marginBottom: 6,
  },
  feedbackTipText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#3C3C43',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  
  // Instruction Adherence Styles
  sectionHeaderWithScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  adherenceScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  adherenceScoreText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  requirementsSection: {
    marginTop: 16,
  },
  requirementsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  requirementItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 67, 0.08)',
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  requirementIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  requirementText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 22,
  },
  requirementEvidence: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
    marginLeft: 24,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  requirementNotes: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
    marginLeft: 24,
    lineHeight: 20,
  },
  missedSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  missedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF9500',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  missedText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: '#D17900',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    fontSize: 15,
    color: '#D17900',
    marginRight: 8,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  modalRoomList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  modalRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: 12,
  },
  modalRoomItemSelected: {
    backgroundColor: colors.primary.main + '10',
    borderColor: colors.primary.main,
  },
  modalRoomText: {
    fontSize: 15,
    color: colors.text.primary,
    flex: 1,
  },
  modalRoomTextSelected: {
    fontWeight: '600',
    color: colors.primary.main,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 0.5,
    borderColor: 'rgba(60, 60, 67, 0.18)',
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Coverage Percentage Section
  coverageInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(60, 60, 67, 0.03)',
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
    gap: 6,
  },
  coverageInlineLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3C3C43',
    letterSpacing: -0.2,
  },
  coverageInlineValue: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  coverageInlineHint: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
    marginLeft: 4,
  },
  feedbackSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  // Full-screen Photo Modal
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  photoModalOverlay: {
    flex: 1,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  photoModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  photoModalCloseButton: {
    padding: 4,
  },
  photoModalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: width,
    height: height * 0.8,
  },
});
