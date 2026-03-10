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
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { API_URL } from '../../config/api';
import colors, { getScoreColor } from '../../theme/colors';

const { width } = Dimensions.get('window');

// Helper function to fix image URLs (convert production URLs to local when using local API)
const fixImageUrl = (url) => {
  if (!url) return url;

  // Ensure it's a string and trim whitespace
  const originalUrl = String(url).trim();
  url = originalUrl;

  // Check if it's already a full URL
  const isFullUrl = url.startsWith('http://') || url.startsWith('https://');

  let fixedUrl;

  if (isFullUrl) {
    // Backend returned a full URL
    // If it's pointing to production but we're using local API, replace it
    const productionUrl = 'https://roomify-server-production.up.railway.app';
    const baseUrl = API_URL.replace('/api', '');

    // Only replace if URL contains production domain AND we're using local API
    if (url.includes(productionUrl) && !baseUrl.includes('roomify-server-production')) {
      // Extract the path from the production URL and use local base
      const path = url.replace(productionUrl, '');
      fixedUrl = baseUrl + path;
    } else {
      // Otherwise use the full URL as-is
      fixedUrl = url;
    }
  } else {
    // It's a relative path (starts with /), construct full URL
    const baseUrl = API_URL.replace('/api', '');
    const path = url.startsWith('/') ? url : '/' + url;
    fixedUrl = baseUrl + path;
  }

  // Print URL transformation
  console.log('🖼️  Image URL:', {
    original: originalUrl,
    fixed: fixedUrl,
    changed: originalUrl !== fixedUrl
  });

  return fixedUrl;
};

export default function InspectionDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
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

      // Print all media URLs from the inspection
      if (data.media && Array.isArray(data.media)) {
        console.log('📸 Inspection Media URLs:');
        console.log(`   Total media items: ${data.media.length}`);
        data.media.forEach((media, index) => {
          console.log(`   [${index + 1}] Media ID: ${media.id || 'N/A'}`);
          console.log(`       Original URL: ${media.url || 'N/A'}`);
          console.log(`       Room ID: ${media.room_id || 'N/A'}`);
          console.log(`       Room Name: ${media.room_name || 'N/A'}`);
          if (media.url) {
            const fixed = fixImageUrl(media.url);
            console.log(`       Fixed URL: ${fixed}`);
          }
          console.log('   ---');
        });
      } else {
        console.log('📸 No media found in inspection');
      }

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
    if (score >= 8) return '#ECFDF5';  // Light green tint (iOS)
    if (score >= 6) return '#FFFBEA';  // Light yellow tint (iOS)
    return '#FFF5F5';  // Light red tint (iOS)
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
  const unitName = safeString(inspection.unit?.name, '');
  const propertyName = safeString(inspection.unit?.property?.name, 'Property');
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

  // Get selected room data or fall back to overall
  const selectedRoomData = selectedRoomId ? roomResults[selectedRoomId] : null;

  // Use room-specific data if available, otherwise fall back to overall
  const improvements = selectedRoomData?.cleanliness_reasons || inspection.airbnb_grade_analysis?.improvements_needed || [];
  const allInventory = selectedRoomData?.damage_items || inspection.damage_analysis?.inventory || [];
  const roomPhotoQuality = selectedRoomData?.photo_quality || photoQuality;
  const isReady = selectedRoomData?.guest_ready ?? inspection.airbnb_grade_analysis?.guest_ready;
  const grade = selectedRoomData?.overall_grade || inspection.airbnb_grade_analysis?.overall_grade;
  const roomScore = selectedRoomData ? safeNumber(selectedRoomData.cleanliness_score, 0) : cleanlinessScore;
  const photoCount = selectedRoomId
    ? (inspection.media || []).filter(m => m.room_id === selectedRoomId).length
    : (inspection.media || []).length;

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
        icon: 'alert-circle',
        canEdit: true
      };
    }

    if (status === 'REJECTED') {
      return {
        label: 'Rejected',
        backgroundColor: '#FFF3E0',
        textColor: '#E65100',
        icon: 'close-circle',
        canEdit: true
      };
    }

    // Not ready means cleaning failed
    if (!isReady && status === 'COMPLETE') {
      return {
        label: 'Cleaning Failed',
        backgroundColor: '#FFEBEE',
        textColor: '#C62828',
        icon: 'alert-circle',
        canEdit: true
      };
    }

    return {
      label: 'Ready',
      backgroundColor: '#E8F8ED',
      textColor: '#1B5E20',
      icon: 'checkmark-circle',
      canEdit: false
    };
  };

  const statusDisplay = getStatusDisplay();
  const gradeColor = getScoreColor(cleanlinessScore);

  // Bottom bar: buttons (~48) + padding (8+safe area)
  const bottomBarHeight = 56 + insets.bottom;

  return (
    <View style={styles.container}>
      {status === 'PROCESSING' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.processingText}>Analyzing photos...</Text>
        </View>
      ) : (status === 'COMPLETE' || status === 'FAILED' || status === 'REJECTED') && cleanlinessScore !== null && cleanlinessScore !== undefined ? (
        <>
          <StatusBar barStyle="light-content" />

          {/* Gradient Header */}
          <LinearGradient
            colors={colors.gradients.dashboardHeader}
            locations={colors.gradients.dashboardHeaderLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerWrapper, { paddingTop: insets.top }]}
          >
            {/* Decorative element */}
            <View style={styles.decorativeCircle}>
              <Ionicons name="document-text" size={70} color={colors.decorative.icon1} />
            </View>
            <SafeAreaView>
              <View style={styles.headerGradient}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.headerBackButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerIconWrapper}>
                  <View style={styles.headerIconInner}>
                    <Ionicons name="document-text" size={22} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.headerTextWrapper}>
                  <Text style={styles.headerTitle}>Inspection Details</Text>
                  <Text style={styles.headerSubtitle}>Verified Documentation</Text>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={[styles.content, { paddingBottom: bottomBarHeight + 16 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Property Info Card */}
            <View style={styles.card}>
              <View style={styles.cardLabelRow}>
                <Ionicons name="home" size={16} color={colors.primary.main} />
                <Text style={styles.cardLabel}>PROPERTY INFORMATION</Text>
              </View>
              <View style={styles.propertySection}>
                <Text style={styles.propertyName}>{propertyName}</Text>
                <View style={styles.propertyAddressRow}>
                  <Ionicons name="location-outline" size={16} color={colors.text.tertiary} />
                  <Text style={styles.propertyAddress}>{fullAddress}</Text>
                </View>
                {unitName ? (
                  <View style={styles.propertyUnitRow}>
                    <Ionicons name="layers-outline" size={16} color={colors.text.tertiary} />
                    <Text style={styles.propertyUnit}>{unitName}</Text>
                  </View>
                ) : null}
                <View style={styles.propertyDateRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.text.tertiary} />
                  <Text style={styles.propertyDate}>{formattedDate}</Text>
                </View>
              </View>
            </View>

            {/* Cleaning Summary Card */}
            <View style={styles.card}>
              <View style={styles.cardLabelRow}>
                <Ionicons name="clipboard" size={16} color={colors.primary.main} />
                <Text style={styles.cardLabel}>CLEANING SUMMARY</Text>
              </View>

              {/* Key Metrics Row */}
              <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>{roomScore.toFixed(1)}</Text>
                  <Text style={styles.metricLabel}>Score</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricBox}>
                  <Text style={[styles.metricValue, { color: gradeColor }]}>
                    {grade || '—'}
                  </Text>
                  <Text style={styles.metricLabel}>Grade</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricBox}>
                  <View style={[styles.metricStatusIcon, {

                  }]}>
                    <Ionicons
                      name={statusDisplay.icon}
                      size={20}
                      color={statusDisplay.textColor}
                    />
                  </View>
                  <Text style={[styles.metricLabel, {
                    color: statusDisplay.textColor,
                    marginTop: 4,
                    fontWeight: '700'
                  }]}>
                    {statusDisplay.label}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>{photoCount}</Text>
                  <Text style={styles.metricLabel}>Photos</Text>
                </View>
              </View>
            </View>

            {/* Room Filter */}
            {roomIds.length > 0 && (
              <View style={styles.roomFilter}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.roomChip, !selectedRoomId && styles.roomChipActive]}
                    onPress={() => setSelectedRoomId(null)}
                  >
                    <Text style={[styles.roomChipText, !selectedRoomId && styles.roomChipTextActive]}>
                      All Rooms
                    </Text>
                  </TouchableOpacity>
                  {roomIds.map(roomId => {
                    const room = roomResults[roomId];
                    const isSelected = roomId === selectedRoomId;
                    return (
                      <TouchableOpacity
                        key={roomId}
                        style={[styles.roomChip, isSelected && styles.roomChipActive]}
                        onPress={() => setSelectedRoomId(roomId)}
                      >
                        <Text style={[styles.roomChipText, isSelected && styles.roomChipTextActive]}>
                          {room.room_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* CRITICAL ERROR BANNER */}
            {criticalIssues.length > 0 && (
              <View style={styles.criticalErrorBanner}>
                <View style={styles.criticalErrorHeader}>
                  <Ionicons name="alert-circle" size={16} color='#C62828' />
                  <Text style={styles.criticalErrorTitle}>Critical Issue</Text>
                </View>
                {criticalIssues.slice(0, 2).map((error, i) => (
                  <Text key={i} style={styles.criticalErrorText}>
                    {safeString(String(error).replace(/^❌\s*/i, ''))}
                  </Text>
                ))}
                {criticalIssues.length > 2 && (
                  <Text style={styles.criticalErrorMoreText}>
                    + {criticalIssues.length - 2} more critical {criticalIssues.length - 2 === 1 ? 'issue' : 'issues'}
                  </Text>
                )}
                <View style={styles.criticalErrorAction}>
                  <Ionicons name="camera-outline" size={14} color="#78350F" />
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
                <View style={styles.cardLabelRow}>
                  <Ionicons name="build" size={16} color={colors.primary.main} />
                  <Text style={styles.cardLabel}>IMPROVEMENTS ({nonCriticalImprovements.length})</Text>
                </View>
                <Text style={styles.expandIcon}>{expandedSections.issues ? '−' : '+'}</Text>
              </TouchableOpacity>
              {expandedSections.issues ? (
                <View style={styles.issuesList}>
                  {nonCriticalImprovements.length > 0 ? (
                    nonCriticalImprovements.map((item, i) => (
                      <View key={i} style={styles.issueItem}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.issueText}>{safeString(item)}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateText}>✅ No additional issues</Text>
                      <Text style={styles.emptyStateSubtext}>All other aspects look good</Text>
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
                <View style={styles.cardLabelRow}>
                  <Ionicons name="cube" size={16} color={colors.primary.main} />
                  <Text style={styles.cardLabel}>INVENTORY ({allInventory.length})</Text>
                </View>
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
                      <Text style={styles.emptyStateText}>⚠️ No items detected</Text>
                      <Text style={styles.emptyStateSubtext}>AI should detect furniture and fixtures in the room.</Text>
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
                  <View style={styles.cardLabelRow}>
                    <Ionicons name="list" size={16} color={colors.primary.main} />
                    <Text style={styles.cardLabel}>INSTRUCTIONS</Text>
                  </View>
                  <Text style={styles.expandIcon}>{expandedSections.instructions ? '−' : '+'}</Text>
                </TouchableOpacity>
                {expandedSections.instructions ? (
                  <View>
                    <View style={styles.adherenceHeader}>
                      <Text style={styles.adherenceLabel}>Adherence Score</Text>
                      <View style={[styles.adherenceScoreBadge, {
                        backgroundColor: getRatingBgColor(selectedRoomData.instruction_adherence.adherence_score)
                      }]}>
                        <Text style={[styles.adherenceScoreText, {
                          color: getRatingColor(selectedRoomData.instruction_adherence.adherence_score)
                        }]}>
                          {safeNumber(selectedRoomData.instruction_adherence.adherence_score, 0)}/10
                        </Text>
                      </View>
                    </View>

                    {selectedRoomData.instruction_adherence.feedback && (
                      <View style={styles.feedbackSectionCompact}>
                        <Text style={styles.feedbackTitleCompact}>Assessment</Text>
                        <Text style={styles.feedbackText}>{safeString(selectedRoomData.instruction_adherence.feedback)}</Text>
                      </View>
                    )}

                    {selectedRoomData.instruction_adherence.requirements_missed && selectedRoomData.instruction_adherence.requirements_missed.length > 0 && (
                      <View style={styles.missedSectionClean}>
                        <Text style={styles.missedTitleClean}>Missed Requirements</Text>
                        {selectedRoomData.instruction_adherence.requirements_missed.map((missed, idx) => (
                          <View key={idx} style={styles.missedItemClean}>
                            <Ionicons name="close-circle" size={16} color="#DC2626" />
                            <Text style={styles.missedTextClean}>{safeString(missed)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {selectedRoomData.instruction_adherence.improvements_needed && selectedRoomData.instruction_adherence.improvements_needed.length > 0 && (
                      <View style={styles.feedbackSectionCompact}>
                        <Text style={styles.feedbackTitleCompact}>How to Improve</Text>
                        {selectedRoomData.instruction_adherence.improvements_needed.map((tip, idx) => (
                          <View key={idx} style={styles.feedbackTipRow}>
                            <View style={styles.bulletDotSmall} />
                            <Text style={styles.feedbackTipText}>{safeString(tip)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {selectedRoomData.instruction_adherence.requirements_met && selectedRoomData.instruction_adherence.requirements_met.length > 0 && (
                      <View style={styles.requirementsSection}>
                        <Text style={styles.requirementsSectionTitle}>Details</Text>
                        {selectedRoomData.instruction_adherence.requirements_met.map((req, idx) => (
                          <View key={idx} style={styles.requirementItem}>
                            <View style={styles.requirementHeader}>
                              <Ionicons
                                name={req.met ? "checkmark-circle" : "close-circle"}
                                size={16}
                                color={req.met ? colors.status.success : colors.status.error}
                              />
                              <Text style={[styles.requirementText, { flex: 1 }]}>
                                {safeString(req.requirement)}
                              </Text>
                            </View>
                            {req.evidence && (
                              <Text style={styles.requirementEvidence}>
                                Evidence: {safeString(req.evidence)}
                              </Text>
                            )}
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
                  <View style={styles.cardLabelRow}>
                    <Ionicons name="camera" size={16} color={colors.primary.main} />
                    <Text style={styles.cardLabel}>PHOTO QUALITY</Text>
                  </View>
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
                    </View>

                    {/* Coverage Percentage */}
                    {roomPhotoQuality.coverage_percentage !== undefined && roomPhotoQuality.coverage_percentage !== null ? (
                      <View style={styles.coveragePercentageSection}>
                        <Text style={styles.coveragePercentageLabel}>Room Coverage</Text>
                        <Text style={[styles.coveragePercentageValue, {
                          color: roomPhotoQuality.coverage_percentage >= 70 ? colors.status.success :
                            roomPhotoQuality.coverage_percentage >= 30 ? colors.status.warning : colors.status.error
                        }]}>
                          {roomPhotoQuality.coverage_percentage}%
                        </Text>
                        <Text style={styles.coveragePercentageHint}>
                          {roomPhotoQuality.coverage_percentage >= 70 ? 'Good coverage' :
                            roomPhotoQuality.coverage_percentage >= 30 ? 'Minimum met • Aim for 70%+' : 'Below minimum (30%)'}
                        </Text>
                      </View>
                    ) : null}

                    {roomPhotoQuality.missing_areas && roomPhotoQuality.missing_areas.length > 0 ? (
                      <View style={styles.missedSectionClean}>
                        <Text style={styles.missedTitleClean}>Missing from Photos</Text>
                        <View style={styles.missedItemClean}>
                          
                          <Text style={styles.missedTextClean}>
                            {roomPhotoQuality.missing_areas.join(', ')}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {roomPhotoQuality.what_to_improve ? (
                      <View style={styles.feedbackSectionCompact}>
                        <Text style={styles.feedbackTitleCompact}>Recommendations</Text>
                        <Text style={styles.feedbackText}>{safeString(roomPhotoQuality.what_to_improve)}</Text>
                      </View>
                    ) : null}

                    {roomPhotoQuality.photographer_feedback && roomPhotoQuality.photographer_feedback.length > 0 ? (
                      <View style={styles.feedbackSectionCompact}>
                        <Text style={styles.feedbackTitleCompact}>How to Improve Coverage</Text>
                        {roomPhotoQuality.photographer_feedback.map((tip, i) => (
                          <View key={i} style={styles.feedbackTipRow}>
                            <View style={styles.bulletDotSmall} />
                            <Text style={styles.feedbackTipText}>{safeString(tip)}</Text>
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
                  <View style={styles.cardLabelRow}>
                    <Ionicons name="images" size={16} color={colors.primary.main} />
                    <Text style={styles.cardLabel}>TIMESTAMPED PHOTOS ({roomMedia.length})</Text>
                  </View>
                  <Text style={styles.expandIcon}>{expandedSections.photos ? '−' : '+'}</Text>
                </TouchableOpacity>
                <View style={styles.photoDisclaimer}>
                  <Text style={styles.photoDisclaimerText}>
                    All photos include embedded timestamps and metadata for verification.
                  </Text>
                </View>
                {expandedSections.photos ? (
                  <View style={styles.photosGrid}>
                    {roomMedia.map((media, index) => {
                      const imageUrl = fixImageUrl(media.url);
                      return (
                        <View key={media.id || index} style={styles.photoWrapper}>
                          <Image
                            source={{ uri: imageUrl }}
                            style={styles.photo}
                            resizeMode="cover"
                          />
                          {media.room_name && (
                            <View style={styles.roomLabel}>
                              <Text style={styles.roomLabelText} numberOfLines={1}>{media.room_name}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
            {(status === 'COMPLETE' || statusDisplay.canEdit || (userRole === 'OWNER' && status !== 'REJECTED')) && (
              <View style={styles.buttonRow}>
                {status === 'COMPLETE' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.shareBtn]}
                    onPress={() => navigation.navigate('CleaningReport', { inspectionId })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-text-outline" size={18} color={colors.primary.main} />
                    <Text style={styles.shareBtnText}>View Report</Text>
                  </TouchableOpacity>
                )}

                {userRole === 'CLEANER' && statusDisplay.canEdit && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.pdfBtn]}
                    onPress={handleEditInspection}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.primary.main} />
                    <Text style={styles.pdfBtnText}>Edit Inspection</Text>
                  </TouchableOpacity>
                )}

                {userRole === 'OWNER' && status !== 'REJECTED' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FFEBEE', borderColor: '#FF3B30' }]}
                    onPress={handleOpenRejectModal}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={18} color='#FF3B30' />
                    <Text style={[styles.pdfBtnText, { color: '#FF3B30' }]}>Reject</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
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
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
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

  // Gradient Header
  headerWrapper: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.decorative.circle1,
    top: -30,
    right: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 14,
  },
  headerBackButton: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconWrapper: {
    marginRight: 12,
  },
  headerIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.85,
  },

  // CARD Styles (Standardized)
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionHeaderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.text.muted,
  },

  // Property Section
  propertySection: {
    gap: 8,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  propertyAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  propertyAddress: {
    fontSize: 13,
    color: colors.text.secondary,
    flex: 1,
  },
  propertyUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  propertyUnit: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  propertyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  propertyDate: {
    fontSize: 13,
    color: colors.text.secondary,
  },

  // Cleaning Summary Metrics
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
    marginTop: 6,
  },
  metricStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Room Filter
  roomFilter: {
    marginTop: 16,
    paddingLeft: 16,
  },
  roomChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  roomChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  roomChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  roomChipTextActive: {
    color: '#FFFFFF',
  },

  // Critical Error Banner
  criticalErrorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#C62828',
  },
  criticalErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
    marginBottom: 4,
    paddingLeft: 24,
  },
  criticalErrorMoreText: {
    fontSize: 12,
    color: '#C62828',
    paddingLeft: 24,
    marginTop: 4,
    fontStyle: 'italic',
  },
  criticalErrorAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingLeft: 24,
  },
  criticalErrorActionText: {
    flex: 1,
    fontSize: 13,
    color: '#78350F',
    fontWeight: '600',
  },

  // Issues List
  issuesList: {
    gap: 12,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.main,
    marginTop: 7,
  },
  issueText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
  },

  // Empty State
  emptyStateContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    alignSelf: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: colors.text.tertiary,
  },

  // Inventory
  itemsList: {
    gap: 0,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemIssue: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  thinDivider: {
    height: 1,
    backgroundColor: colors.border.light,
  },

  // Instructions
  adherenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adherenceLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  adherenceScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adherenceScoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  feedbackTipRow: {
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  feedbackTipText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    flex: 1,
  },
  feedbackSubtext: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
    marginTop: 4,
  },
  requirementsSection: {
    marginTop: 8,
    gap: 10,
  },
  requirementsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  feedbackSectionCompact: {
    marginBottom: 12,
  },
  feedbackTitleCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bulletDotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text.tertiary,
    marginTop: 8,
  },
  missedSectionClean: {
    marginBottom: 16,
  },
  missedTitleClean: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  missedItemClean: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  missedTextClean: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
    flex: 1,
  },
  requirementItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
    lineHeight: 20,
  },
  requirementEvidence: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 6,
    fontStyle: 'italic',
    paddingLeft: 24,
  },

  // Photo Quality
  photoQualityScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  qualityMetric: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  coveragePercentageSection: {
    padding: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    alignItems: 'center',
  },
  coveragePercentageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  coveragePercentageValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  coveragePercentageHint: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Photos
  photoDisclaimer: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  photoDisclaimerText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWrapper: {
    width: (width - 32 - 16) / 3, // Screen - padding (16*2) - gaps (8*2) / 3
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.border.light,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  roomLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  roomLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
  },
  shareBtn: {
    backgroundColor: colors.accent.blueLight,
    borderColor: colors.accent.blueLight,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.main,
  },
  pdfBtn: {
    backgroundColor: '#F0F9FF',
    borderColor: '#007AFF',
  },
  pdfBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  generatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  generatingText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
  },

  // Modal Styles (Kept largely the same but refreshed)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  modalRoomList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  modalRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: 12,
  },
  modalRoomItemSelected: {
    backgroundColor: '#F0F9FF',
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
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.text.primary,
    backgroundColor: '#F2F2F7',
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
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
    paddingVertical: 14,
    borderRadius: 12,
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
});
