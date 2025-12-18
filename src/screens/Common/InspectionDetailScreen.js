import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import { API_URL } from '../../config/api';
import colors, { getScoreColor } from '../../theme/colors';

const { width } = Dimensions.get('window');

// Helper function to fix image URLs (convert production URLs to local when using local API)
const fixImageUrl = (url) => {
  if (!url) return url;
  
  // Ensure it's a string and trim whitespace
  url = String(url).trim();
  
  // Check if it's already a full URL
  const isFullUrl = url.startsWith('http://') || url.startsWith('https://');
  
  if (isFullUrl) {
    // Backend returned a full URL
    // If it's pointing to production but we're using local API, replace it
    const productionUrl = 'https://roomify-server-production.up.railway.app';
    const baseUrl = API_URL.replace('/api', '');
    
    // Only replace if URL contains production domain AND we're using local API
    if (url.includes(productionUrl) && !baseUrl.includes('roomify-server-production')) {
      // Extract the path from the production URL and use local base
      const path = url.replace(productionUrl, '');
      return baseUrl + path;
    }
    // Otherwise use the full URL as-is
    return url;
  } else {
    // It's a relative path (starts with /), construct full URL
    const baseUrl = API_URL.replace('/api', '');
    const path = url.startsWith('/') ? url : '/' + url;
    return baseUrl + path;
  }
};

export default function InspectionDetailScreen({ route, navigation }) {
  const { inspectionId, userRole } = route?.params || {};
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  const isCriticalIssue = (item) => {
    const text = String(item || '').toUpperCase();
    return (
      text.includes('❌') ||
      text.includes('WRONG ROOM') ||
      text.includes('CRITICAL ERROR') ||
      text.includes('NOT A BEDROOM') ||
      text.includes('NOT A BATHROOM') ||
      text.includes('NOT A KITCHEN')
    );
  };

  const criticalIssues = improvements.filter(isCriticalIssue);
  const nonCriticalImprovements = improvements.filter(item => !isCriticalIssue(item));

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
          {/* ELEVATED HEADER DESIGN */}
          <View style={styles.compactHeader}>
            {/* Info Card with Address, Date, and Badges */}
            <View style={styles.headerInfoCard}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerAddressContainer}>
                  <Ionicons name="location-sharp" size={18} color="#64748B" />
                  <Text style={styles.headerAddress} numberOfLines={2}>{fullAddress}</Text>
                </View>

                <View style={styles.headerDateRow}>
                  <Ionicons name="calendar-outline" size={16} color="#64748B" />
                  <Text style={styles.headerDate}>{formattedDate}</Text>
                </View>

                <View style={styles.headerBadges}>
                  <View style={[styles.statBadge, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
                    <Ionicons name="star" size={18} color="#3B82F6" />
                    <Text style={[styles.statValue, { color: '#3B82F6' }]}>{roomScore.toFixed(1)}</Text>
                  </View>
                  <View style={[styles.statBadge, { 
                    backgroundColor: statusDisplay.backgroundColor,
                    borderColor: statusDisplay.textColor,
                    borderWidth: statusDisplay.label === 'Cleaning Failed' ? 0 : 1,
                  }]}>
                    <Text style={[styles.statValue, { color: statusDisplay.textColor }]}>
                      {statusDisplay.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons Inside Card */}
              {(status === 'COMPLETE' || statusDisplay.canEdit || (userRole === 'OWNER' && status !== 'REJECTED')) && (
                <View style={styles.headerActionsInCard}>
                  {status === 'COMPLETE' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#10B981' }]}
                      onPress={() => navigation.navigate('CleaningReport', { inspectionId })}
                    >
                      <Ionicons name="document-text" size={18} color="#10B981" />
                      <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Share Cleaning Report</Text>
                    </TouchableOpacity>
                  )}

                  {userRole === 'CLEANER' && statusDisplay.canEdit && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#3B82F6' }]}
                      onPress={handleEditInspection}
                    >
                      <Ionicons name="create" size={18} color="#3B82F6" />
                      <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Edit</Text>
                    </TouchableOpacity>
                  )}

                  {userRole === 'OWNER' && status !== 'REJECTED' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#DC2626' }]}
                      onPress={handleOpenRejectModal}
                    >
                      <Ionicons name="close-circle" size={18} color="#DC2626" />
                      <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Reject</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Room Selector Card */}
            {roomIds.length > 0 && (
              <View style={styles.roomSelectorCard}>
                <View style={styles.roomSelectorHeader}>
                  <Ionicons name="bed" size={18} color="#64748B" />
                  <Text style={styles.roomSelectorLabel}>Rooms</Text>
                </View>
                <View style={styles.roomGrid}>
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
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={18}
                          color={isSelected ? "#FFFFFF" : "#94A3B8"}
                        />
                        <Text 
                          style={[styles.roomTabText, isSelected && styles.roomTabTextSelected]}
                          numberOfLines={1}
                        >
                          {room.room_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
            {/* CRITICAL ERROR BANNER */}
            {criticalIssues.length > 0 && (
                <View style={styles.criticalErrorBanner}>
                  <View style={styles.criticalErrorHeader}>
                    <Ionicons name="alert-circle" size={20} color='#C62828'/>
                    <Text style={styles.criticalErrorTitle}>Critical Issue</Text>
                  </View>
                  {criticalIssues.slice(0, 2).map((error, i) => (
                    <Text
                      key={i}
                      style={styles.criticalErrorText}
                    >
                      {safeString(String(error).replace(/^❌\s*/i, ''))}
                    </Text>
                  ))}
                  {criticalIssues.length > 2 && (
                    <Text style={styles.criticalErrorMoreText}>
                      + {criticalIssues.length - 2} more critical {criticalIssues.length - 2 === 1 ? 'issue' : 'issues'}
                    </Text>
                  )}
                  <View style={styles.criticalErrorAction}>
                    <Ionicons name="camera-outline" size={16} color="#78350F" />
                    <Text style={styles.criticalErrorActionText}>
                      Retake photos of the correct room
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
                <Text style={styles.sectionTitle}>Improvements Needed ({nonCriticalImprovements.length})</Text>
                <Text style={styles.expandIcon}>{expandedSections.issues ? '−' : '+'}</Text>
              </TouchableOpacity>
              {expandedSections.issues ? (
                <View style={styles.issuesList}>
                  {nonCriticalImprovements.length > 0 ? (
                    nonCriticalImprovements.map((item, i) => (
                      <View key={i} style={styles.issueItem}>
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

                    {selectedRoomData.instruction_adherence.requirements_missed && selectedRoomData.instruction_adherence.requirements_missed.length > 0 && (
                      <View style={styles.missedSection}>
                        <Text style={styles.missedTitle}>Missed Requirements:</Text>
                        {selectedRoomData.instruction_adherence.requirements_missed.map((missed, idx) => (
                          <View key={idx} style={styles.bulletPoint}>
                            <Text style={[styles.bullet, { color: '#E65100' }]}>•</Text>
                            <Text style={styles.missedText}>{safeString(missed)}</Text>
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
                    <View style={styles.photoQualityScores}>
                      <View style={styles.qualityMetric}>
                        <Text style={styles.metricLabel}>Overall</Text>
                        <Text style={[styles.metricValue, {
                          color: getRatingColor(roomPhotoQuality.photo_quality_score || 0)
                        }]}>
                          {safeNumber(roomPhotoQuality.photo_quality_score, 0)}/10
                        </Text>
                      </View>
                      <View style={styles.qualityMetric}>
                        <Text style={styles.metricLabel}>Composition</Text>
                        <Text style={[styles.metricValue, {
                          color: getRatingColor(roomPhotoQuality.composition_score || 0)
                        }]}>
                          {safeNumber(roomPhotoQuality.composition_score, 0)}/10
                        </Text>
                      </View>
                      <View style={styles.qualityMetric}>
                        <Text style={styles.metricLabel}>Lighting</Text>
                        <Text style={[styles.metricValue, {
                          color: getRatingColor(roomPhotoQuality.lighting_score || 0)
                        }]}>
                          {safeNumber(roomPhotoQuality.lighting_score, 0)}/10
                        </Text>
                      </View>
                      <View style={styles.qualityMetric}>
                        <Text style={styles.metricLabel}>Technical</Text>
                        <Text style={[styles.metricValue, {
                          color: getRatingColor(roomPhotoQuality.technical_score || 0)
                        }]}>
                          {safeNumber(roomPhotoQuality.technical_score, 0)}/10
                        </Text>
                      </View>
                      <View style={styles.qualityMetric}>
                        <Text style={styles.metricLabel}>Coverage</Text>
                        <Text style={[styles.metricValue, {
                          color: getRatingColor(roomPhotoQuality.coverage_score || 0)
                        }]}>
                          {safeNumber(roomPhotoQuality.coverage_score, 0)}/10
                        </Text>
                      </View>
                    </View>

                    {/* Coverage Percentage */}
                    {roomPhotoQuality.coverage_percentage !== undefined && roomPhotoQuality.coverage_percentage !== null ? (
                      <View style={styles.coveragePercentageSection}>
                        <Text style={styles.coveragePercentageLabel}>Room Coverage</Text>
                        <Text style={[styles.coveragePercentageValue, {
                          color: roomPhotoQuality.coverage_percentage >= 70 ? colors.success :
                            roomPhotoQuality.coverage_percentage >= 30 ? colors.warning : colors.error
                        }]}>
                          {roomPhotoQuality.coverage_percentage}%
                        </Text>
                        <Text style={styles.coveragePercentageHint}>
                          {roomPhotoQuality.coverage_percentage >= 70 ? 'Good coverage' :
                            roomPhotoQuality.coverage_percentage >= 30 ? 'Minimum met • Aim for 70%+' : 'Below minimum (30%)'}
                        </Text>
                      </View>
                    ) : null}

                    {/* Missing Areas */}
                    {roomPhotoQuality.missing_areas && roomPhotoQuality.missing_areas.length > 0 ? (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackTitle}>Missing from Photos</Text>
                        <Text style={styles.feedbackSubtext}>
                          {roomPhotoQuality.missing_areas.join(', ')}
                        </Text>
                      </View>
                    ) : null}

                    {roomPhotoQuality.what_to_improve ? (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackTitle}>Recommendations</Text>
                        <Text style={styles.feedbackText}>{safeString(roomPhotoQuality.what_to_improve)}</Text>
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
                      <View key={media.id || index} style={styles.photoContainer}>
                        <Image
                          source={{ uri: fixImageUrl(media.url) }}
                          style={styles.photoThumbnail}
                          resizeMode="cover"
                        />
                        {media.room_name && (
                          <Text style={styles.photoRoomLabel}>{media.room_name}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </>
      ) : null}

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
    backgroundColor: colors.background.primary,
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
    backgroundColor: colors.background.primary,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.status.error,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.muted,
  },
  processingText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
  },

  // ELEVATED HEADER DESIGN
  compactHeader: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 16,
  },
  headerInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTopRow: {
    marginBottom: 12,
  },
  headerAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerAddress: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  headerDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  headerDate: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerActionsInCard: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // STATUS AND ACTION CARD
  statusActionCard: {
    flexDirection: 'row',
    paddingTop: 16,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  shareReportButtonCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 8,
  },
  shareReportButtonCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },

  // CARD
  card: {
    backgroundColor: colors.background.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  // SECTIONS
  sectionHeaderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  expandIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.text.muted,
  },

  // ISSUES
  issuesList: {
    gap: 14,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.main,
    marginTop: 9,
  },
  bullet: {
    flexDirection: 'row',
    fontSize: 16,
    fontWeight: '600',

    marginBottom: 4,
  },
  issueText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
  },

  // ITEMS
  itemsList: {
    gap: 0,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemIssue: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  thinDivider: {
    height: 1,
    backgroundColor: colors.border.light,
  },

  // PHOTO QUALITY
  photoQualityScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  qualityMetric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
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

  // PHOTOS
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  photoWrapper: {
    width: (width - 112) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.border.light,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  roomSelectorCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  roomSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  roomSelectorLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roomTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    width: '48%',
  },
  roomTabSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  roomTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  roomTabTextSelected: {
    color: '#FFFFFF',
  },
  editButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  shareReportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  redoButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  redoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rejectButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
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
    marginHorizontal: -4,
  },
  photoContainer: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
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
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#C62828',
  },
  criticalErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  criticalErrorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
    flex: 1,
  },
  criticalErrorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#C62828',
    marginBottom: 2,
    paddingLeft: 28,
  },
  criticalErrorMoreText: {
    fontSize: 12,
    color: '#C62828',
    paddingLeft: 28,
    marginTop: 2,
  },
  criticalErrorAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingLeft: 28,
  },
  criticalErrorActionText: {
    flex: 1,
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',

  },

  // Photo Quality Feedback Styles
  feedbackSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  feedbackTipRow: {
    marginBottom: 8,
  },
  feedbackTipText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
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
    paddingVertical: 4,
    borderRadius: 8,
  },
  adherenceScoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  requirementsSection: {
    marginTop: 16,
  },
  requirementsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  requirementItem: {
    backgroundColor: colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.main,
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
    padding: 12,
    backgroundColor: '#FFF4E6',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F57F17',
  },
  missedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  missedText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#E65100',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
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
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
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
  coveragePercentageSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  coveragePercentageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coveragePercentageValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  coveragePercentageHint: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  feedbackSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
