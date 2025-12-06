import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera } from 'expo-camera';
import api from '../../api/client';
import { useInspectionStore } from '../../store/inspectionStore';
import { getRoomSuggestionByType } from '../../config/roomSuggestions';
import colors from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import shadows from '../../theme/shadows';

export default function CaptureMediaScreen({ route, navigation }) {
  const { 
    assignment, 
    inspectionId, 
    propertyName, 
    unitName, 
    unitId,
    rooms = [],
    isRejected = false,
    failedRoomIds = [],
    rejectionReason = '',
    existingMedia = [],
    isEditing = false
  } = route.params;
  
  console.log('🎬 CaptureMediaScreen received params:', {
    inspectionId,
    propertyName,
    unitName,
    roomsCount: rooms.length,
    hasRooms: rooms.length > 0,
    isRejected,
    failedRoomIds,
    existingMediaCount: existingMedia.length
  });
  
  const [inspection, setInspection] = useState(inspectionId ? { id: inspectionId } : null);
  
  // Debug: Log when inspection ID changes
  React.useEffect(() => {
    console.log('📋 Inspection ID state:', inspection?.id);
  }, [inspection]);
  const [photos, setPhotos] = useState([]); // { id, uri, roomId, roomName }
  const [isLoadingExisting, setIsLoadingExisting] = useState(isEditing && existingMedia.length > 0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedPhotoForTagging, setSelectedPhotoForTagging] = useState(null);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState(null);
  const [damageReport, setDamageReport] = useState('');
  const { createInspection } = useInspectionStore();
  
  // Valuable Items State
  const [valuableItems, setValuableItems] = useState([]); // All valuable items from all rooms
  const [valuableItemPhotos, setValuableItemPhotos] = useState({}); // { itemId: { uri, notes } }
  const [selectedValuableItem, setSelectedValuableItem] = useState(null); // For photo taking
  const [valuableItemNotes, setValuableItemNotes] = useState('');
  const [showValuableItemModal, setShowValuableItemModal] = useState(false);

  const hasRooms = rooms.length > 0;
  const failedRoomIdsSet = new Set(failedRoomIds);
  
  // Fetch valuable items for all rooms in this unit
  React.useEffect(() => {
    const fetchValuableItems = async () => {
      const theUnitId = assignment?.unit_id || unitId;
      if (!theUnitId) return;
      
      try {
        console.log('🏷️ Fetching valuable items for unit:', theUnitId);
        const response = await api.get(`/valuable-items/unit/${theUnitId}`);
        const allItems = response.data.rooms?.flatMap(room => 
          room.valuable_items.map(item => ({
            ...item,
            roomName: room.name,
            roomId: room.id
          }))
        ) || [];
        console.log(`📦 Found ${allItems.length} valuable items to verify`);
        setValuableItems(allItems);
      } catch (error) {
        console.log('No valuable items or error fetching:', error.message);
        setValuableItems([]);
      }
    };
    
    fetchValuableItems();
  }, [assignment?.unit_id, unitId]);

  // Load existing photos when editing
  React.useEffect(() => {
    if (isEditing && existingMedia.length > 0) {
      console.log('📸 Loading existing media:', existingMedia.length);
      console.log('📸 First media item:', existingMedia[0]);
      const loadedPhotos = existingMedia
        .filter(m => m.type === 'PHOTO')  // ✅ Fixed: use correct field name
        .map((media, index) => {
          const room = rooms.find(r => r.id === media.room_id);
          return {
            id: `existing_${media.id}_${index}`,
            uri: media.url,  // ✅ Fixed: use correct field name
            roomId: media.room_id,
            roomName: room?.name || 'Unknown Room',
            isExisting: true,
            mediaId: media.id
          };
        });
      console.log('✅ Loaded', loadedPhotos.length, 'existing photos');
      setPhotos(loadedPhotos);
      setIsLoadingExisting(false);
    }
  }, [isEditing, existingMedia, rooms]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and photo library access is required');
      return false;
    }
    return true;
  };

  const ensureInspection = async () => {
    if (inspection) return inspection;

    if (assignment) {
      try {
        const response = await api.post('/cleaner/inspections', {
          unit_id: assignment.unit_id,
          assignment_id: assignment.id,
        });
        setInspection(response.data);
        createInspection(response.data);
        return response.data;
      } catch (error) {
        Alert.alert('Error', 'Failed to create inspection');
        throw error;
      }
    }
    
    return inspection;
  };

  const resizeImage = async (uri) => {
    try {
      console.log('📐 Resizing image for ultra-fast upload...');
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 960 } }],
        { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
      );
      console.log('✅ Image resized (960px @ 0.3 quality) for ultra-fast upload');
      return manipResult.uri;
    } catch (error) {
      console.warn('⚠️ Image resize failed, using original:', error);
      return uri;
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const resizedUri = await resizeImage(result.assets[0].uri);
        const newPhoto = {
          id: Date.now().toString(),
          uri: resizedUri,
          roomId: null,
          roomName: 'Unassigned',
        };
        setPhotos(prev => [...prev, newPhoto]);
        
        // Immediately show room picker for the new photo
        setSelectedPhotoForTagging(newPhoto);
        setShowRoomPicker(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = await Promise.all(
          result.assets.map(async (asset, index) => {
            const resizedUri = await resizeImage(asset.uri);
            return {
              id: `${Date.now()}_${index}`,
              uri: resizedUri,
              roomId: null,
              roomName: 'Unassigned',
            };
          })
        );
        setPhotos(prev => [...prev, ...newPhotos]);
        
        // If only one photo, show room picker immediately
        // If multiple, they can assign rooms individually later
        if (newPhotos.length === 1) {
          setSelectedPhotoForTagging(newPhotos[0]);
          setShowRoomPicker(true);
        } else {
          Alert.alert(
            'Photos Added',
            `${newPhotos.length} photos added. Tap "Assign Room" on each photo to categorize them.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick photos');
    }
  };

  const handleAssignRoom = (photoId, room) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, roomId: room.id, roomName: room.name }
        : photo
    ));
    setShowRoomPicker(false);
    setSelectedPhotoForTagging(null);
    
    // No modal - keeps the user moving fast
  };

  const handleDeletePhoto = (photoId) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setPhotos(prev => prev.filter(p => p.id !== photoId)),
        },
      ]
    );
  };

  const handleSubmitInspection = async () => {
    // Validation: Must have at least one photo
    if (photos.length === 0) {
      Alert.alert(
        'No Photos',
        'Please capture at least one photo before submitting.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validation: All photos must be assigned to rooms
    const unassignedPhotos = photos.filter(p => !p.roomId);
    if (unassignedPhotos.length > 0) {
      Alert.alert(
        'Unassigned Photos',
        `You have ${unassignedPhotos.length} photo(s) without a room assignment. Please assign all photos to rooms before submitting.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Validation: All rooms must have at least one photo (STRICT - NO BYPASS)
    const roomsWithPhotos = new Set(photos.map(p => p.roomId));
    const roomsWithoutPhotos = rooms.filter(r => !roomsWithPhotos.has(r.id));
    
    if (roomsWithoutPhotos.length > 0) {
      const roomNames = roomsWithoutPhotos.map(r => r.name).join(', ');
      Alert.alert(
        'Missing Rooms',
        `All rooms must have photos. Missing photos for:\n\n${roomNames}\n\nPlease take at least one photo for each room.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Validation: All valuable items must have photos
    const unverifiedItems = getUnverifiedValuableItems();
    if (unverifiedItems.length > 0) {
      const itemNames = unverifiedItems.map(i => `• ${i.name} (${i.roomName})`).join('\n');
      Alert.alert(
        'Valuable Items Missing',
        `Please photograph all valuable items before submitting:\n\n${itemNames}`,
        [{ text: 'OK' }]
      );
      return;
    }

    performUpload();
  };

  const performUpload = async () => {
    try {
      setUploading(true);
      
      const currentInspection = await ensureInspection();
      if (!currentInspection) {
        throw new Error('Failed to create inspection');
      }

      console.log(`📤 Starting bulk upload of ${photos.length} photos to inspection ${currentInspection.id}...`);
      console.log(`📤 Photos to upload:`, photos.map(p => ({ roomId: p.roomId, roomName: p.roomName })));
      setUploadProgress({ current: 0, total: photos.length });

      // Upload all photos with room assignments
      let uploadedCount = 0;
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('files', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${photo.id}.jpg`,
        });
        formData.append('type', 'PHOTO');
        formData.append('room_id', photo.roomId);

        await api.post(`/cleaner/inspections/${currentInspection.id}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        uploadedCount++;
        setUploadProgress({ current: uploadedCount, total: photos.length });
        console.log(`✅ Uploaded ${uploadedCount}/${photos.length}`);
      }

      console.log('🎉 All photos uploaded successfully!');

      // Upload valuable item verification photos
      const valuableItemsToUpload = Object.entries(valuableItemPhotos).filter(([_, data]) => data.uri);
      if (valuableItemsToUpload.length > 0) {
        console.log(`📦 Uploading ${valuableItemsToUpload.length} valuable item verification photos...`);
        for (const [itemId, data] of valuableItemsToUpload) {
          try {
            const formData = new FormData();
            formData.append('photo', {
              uri: data.uri,
              type: 'image/jpeg',
              name: `valuable_item_${itemId}.jpg`,
            });
            formData.append('inspection_id', currentInspection.id);
            if (data.notes) {
              formData.append('notes', data.notes);
            }

            await api.post(`/valuable-items/verify/${itemId}`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            console.log(`✅ Verified valuable item: ${itemId}`);
          } catch (error) {
            console.error(`Failed to verify item ${itemId}:`, error);
          }
        }
        console.log('📦 Valuable item verifications complete!');
      }

      // Submit inspection with damage report
      console.log('📤 Submitting inspection with damage report...');
      await api.post(`/cleaner/inspections/${currentInspection.id}/submit`, {
        damage_report: damageReport || null
      });
      console.log('✅ Inspection submitted successfully!');

      Alert.alert(
        'Success!',
        'Inspection submitted successfully. AI analysis will begin shortly.',
        [{
          text: 'OK',
          onPress: () => navigation.replace('CleanerHome'),
        }]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getRoomIcon = (roomType) => {
    const suggestion = getRoomSuggestionByType(roomType);
    return suggestion?.icon || 'home-outline';
  };

  const getRoomColor = (roomId) => {
    if (!roomId) return '#94A3B8'; // Gray for unassigned
    const index = rooms.findIndex(r => r.id === roomId);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return colors[index % colors.length];
  };

  // Valuable Item Functions
  const handleValuableItemPhoto = async (item) => {
    setSelectedValuableItem(item);
    setValuableItemNotes(valuableItemPhotos[item.id]?.notes || '');
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const resizedUri = await resizeImage(result.assets[0].uri);
        setValuableItemPhotos(prev => ({
          ...prev,
          [item.id]: {
            uri: resizedUri,
            notes: prev[item.id]?.notes || ''
          }
        }));
        console.log(`✅ Photo captured for valuable item: ${item.name}`);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleValuableItemNotesSave = () => {
    if (selectedValuableItem) {
      setValuableItemPhotos(prev => ({
        ...prev,
        [selectedValuableItem.id]: {
          ...prev[selectedValuableItem.id],
          notes: valuableItemNotes.trim()
        }
      }));
    }
    setShowValuableItemModal(false);
    setSelectedValuableItem(null);
    setValuableItemNotes('');
  };

  const getUnverifiedValuableItems = () => {
    return valuableItems.filter(item => !valuableItemPhotos[item.id]?.uri);
  };

  // Group photos by room for display
  const photosByRoom = rooms.map(room => ({
    room,
    photos: photos.filter(p => p.roomId === room.id),
  }));
  const unassignedPhotos = photos.filter(p => !p.roomId);

  const displayPropertyName = assignment?.unit?.property?.name || propertyName || 'Property';
  const displayUnitName = assignment?.unit?.name || unitName || 'Unit';

  // Error state: no rooms defined
  if (!hasRooms) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4A90E2" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Capture Inspection</Text>
            <Text style={styles.headerSubtitle}>
              {displayPropertyName} • {displayUnitName}
            </Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF9800" />
          <Text style={styles.errorTitle}>No Rooms Configured</Text>
          <Text style={styles.errorText}>
            This property has no rooms set up. Please contact the property owner to configure rooms before starting an inspection.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4A90E2" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Capture Inspection</Text>
          <Text style={styles.headerSubtitle}>
            {displayPropertyName} • {displayUnitName}
          </Text>
        </View>
      </View>

      {/* Edit Mode Tips Banner */}
      {isEditing && !isRejected && (
        <View style={styles.editTipsBanner}>
          <Ionicons name="information-circle" size={18} color="#3B82F6" />
          <View style={styles.editTipsTextContainer}>
            <Text style={styles.editTipsTitle}>✏️ Editing Inspection</Text>
            <Text style={styles.editTipsText}>
              • Add more photos or replace existing ones{'\n'}
              • Photos are grouped by room below{'\n'}
              • Tap any photo to view or delete it
            </Text>
          </View>
        </View>
      )}

      {/* Rejection Warning Banner */}
      {isRejected && (
        <View style={styles.rejectionBanner}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <View style={styles.rejectionTextContainer}>
            <Text style={styles.rejectionTitle}>Inspection Rejected</Text>
            {rejectionReason && (
              <Text style={styles.rejectionReason}>{rejectionReason}</Text>
            )}
            <Text style={styles.rejectionInstruction}>
              Re-upload photos for the highlighted rooms below
            </Text>
          </View>
        </View>
      )}

      {/* Photo Count Summary - Compact */}
      {photos.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Ionicons name="images" size={14} color="#64748B" />
            <Text style={styles.summaryText}>{photos.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.summaryText}>
              {photos.filter(p => p.roomId).length}
            </Text>
          </View>
          {unassignedPhotos.length > 0 && (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                <Text style={styles.summaryText}>
                  {unassignedPhotos.length} unassigned
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Photo Groups */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Unassigned Photos */}
        {unassignedPhotos.length > 0 && (
          <View style={[styles.roomSection, styles.firstSection]}>
            <View style={styles.roomHeader}>
              <Ionicons name="help-circle" size={16} color="#94A3B8" />
              <Text style={styles.roomTitle}>Unassigned ({unassignedPhotos.length})</Text>
            </View>
            <View style={styles.photoGrid}>
              {unassignedPhotos.map(photo => (
                <View key={photo.id} style={styles.photoCard}>
                  <TouchableOpacity 
                    style={styles.photoImageContainer}
                    onPress={() => setSelectedPhotoForView(photo)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => {
                      setSelectedPhotoForTagging(photo);
                      setShowRoomPicker(true);
                    }}
                  >
                    <Ionicons name="pricetag" size={12} color="#FFF" />
                    <Text style={styles.assignButtonText}>Assign</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deletePhotoButton}
                    onPress={() => handleDeletePhoto(photo.id)}
                  >
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Photos by Room */}
        {photosByRoom.map(({ room, photos: roomPhotos }, index) => {
          if (roomPhotos.length === 0) return null;
          const isFailedRoom = failedRoomIdsSet.has(room.id);
          const isFirst = index === 0 && unassignedPhotos.length === 0;
          return (
            <View key={room.id} style={[styles.roomSection, isFirst && styles.firstSection, isFailedRoom && styles.failedRoomSection]}>
              <View style={styles.roomHeader}>
                <Ionicons 
                  name={getRoomIcon(room.type)} 
                  size={16} 
                  color={isFailedRoom ? '#DC2626' : getRoomColor(room.id)} 
                />
                <Text style={[styles.roomTitle, isFailedRoom && styles.failedRoomTitle]}>
                  {room.name} ({roomPhotos.length})
                  {isFailedRoom && ' ⚠️ Needs Re-Upload'}
                </Text>
              </View>
              {room.tips && (
                <View style={styles.tipsContainer}>
                  <Ionicons name="information-circle" size={12} color="#3B82F6" />
                  <Text style={styles.tipsText}>{room.tips}</Text>
                </View>
              )}
              <View style={styles.photoGrid}>
                {roomPhotos.map(photo => (
                  <View key={photo.id} style={styles.photoCard}>
                    <TouchableOpacity 
                      style={styles.photoImageContainer}
                      onPress={() => setSelectedPhotoForView(photo)}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                      <View 
                        style={[
                          styles.roomBadge, 
                          { backgroundColor: getRoomColor(photo.roomId) }
                        ]}
                      >
                        <Text style={styles.roomBadgeText}>{photo.roomName}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reassignButton}
                      onPress={() => {
                        setSelectedPhotoForTagging(photo);
                        setShowRoomPicker(true);
                      }}
                    >
                      <Ionicons name="pencil" size={10} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deletePhotoButton}
                      onPress={() => handleDeletePhoto(photo.id)}
                    >
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Empty State */}
        {photos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No Photos Yet</Text>
            <Text style={styles.emptyStateText}>
              Take photos or import from your gallery, then assign each photo to a room.
            </Text>
          </View>
        )}

        {/* Damage Report Section */}
        {photos.length > 0 && (
          <View style={styles.damageReportSection}>
            <View style={styles.damageReportHeader}>
              <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
              <Text style={styles.damageReportTitle}>Damage Report (Optional)</Text>
            </View>
            <TextInput
              style={styles.damageReportInput}
              placeholder="Report any damage or issues found during inspection..."
              placeholderTextColor="#94A3B8"
              value={damageReport}
              onChangeText={setDamageReport}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Photo Guidelines Tip */}
      <View style={styles.photoTipBanner}>
        <Ionicons name="bulb" size={16} color="#F59E0B" />
        <Text style={styles.photoTipText}>
          📸 <Text style={styles.photoTipBold}>Show the entire room</Text> - Stand in corner, capture 70%+ of room (all walls, floor, furniture)
        </Text>
      </View>

      {/* Capture Buttons - Always visible */}
      <View style={styles.captureButtonsContainer}>
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handleTakePhoto}
          disabled={uploading}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={20} color="#FFF" />
          <Text style={styles.cameraButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={handlePickFromGallery}
          disabled={uploading}
          activeOpacity={0.8}
        >
          <Ionicons name="images" size={20} color="#3B82F6" />
          <Text style={styles.galleryButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Submit Button */}
      {photos.length > 0 && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (uploading || unassignedPhotos.length > 0) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitInspection}
            disabled={uploading || unassignedPhotos.length > 0}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>
                  Uploading {uploadProgress.current}/{uploadProgress.total}...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.submitButtonText}>
                  Submit Inspection ({photos.length} photos)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Photo Enlargement Modal */}
      <Modal
        visible={!!selectedPhotoForView}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoForView(null)}
      >
        <View style={styles.photoViewOverlay}>
          <TouchableOpacity 
            style={styles.photoViewBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedPhotoForView(null)}
          >
            <View style={styles.photoViewHeader}>
              <TouchableOpacity 
                onPress={() => setSelectedPhotoForView(null)}
                style={styles.photoViewCloseButton}
              >
                <Ionicons name="close-circle" size={36} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.photoViewContainer}>
              {selectedPhotoForView && (
                <Image 
                  source={{ uri: selectedPhotoForView.uri }} 
                  style={styles.photoViewImage} 
                  resizeMode="contain"
                />
              )}
            </View>
            {selectedPhotoForView?.roomName && (
              <View style={styles.photoViewFooter}>
                <View style={[styles.photoViewRoomBadge, { backgroundColor: getRoomColor(selectedPhotoForView.roomId) }]}>
                  <Text style={styles.photoViewRoomName}>{selectedPhotoForView.roomName}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Room Picker Modal - Centered */}
      <Modal
        visible={showRoomPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoomPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowRoomPicker(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Room</Text>
              <TouchableOpacity 
                onPress={() => setShowRoomPicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.roomList} showsVerticalScrollIndicator={false}>
              {rooms.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.roomOption}
                  onPress={() => handleAssignRoom(selectedPhotoForTagging?.id, item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.roomIconContainer, { backgroundColor: getRoomColor(item.id) + '20' }]}>
                    <Ionicons 
                      name={getRoomIcon(item.type)} 
                      size={20} 
                      color={getRoomColor(item.id)} 
                    />
                  </View>
                  <View style={styles.roomOptionText}>
                    <Text style={styles.roomOptionName}>{item.name}</Text>
                    {item.tips && (
                      <Text style={styles.roomOptionTips} numberOfLines={2}>
                        {item.tips}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
    marginHorizontal: 8,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: -0.1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  firstSection: {
    marginTop: 0,
  },
  roomSection: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  failedRoomSection: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 0,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.3,
  },
  failedRoomTitle: {
    color: '#FF3B30',
  },
  editTipsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  editTipsTextContainer: {
    flex: 1,
  },
  editTipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  editTipsText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#DC2626',
  },
  rejectionTextContainer: {
    flex: 1,
  },
  rejectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  rejectionReason: {
    fontSize: 11,
    color: '#991B1B',
    marginBottom: 2,
  },
  rejectionInstruction: {
    fontSize: 10,
    color: '#7F1D1D',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  tipsText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoCard: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  photoImageContainer: {
    width: '100%',
    height: '100%',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  roomBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roomBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  assignButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 3,
  },
  assignButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  reassignButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingTop: spacing.sm,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: spacing.sm,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    lineHeight: 16,
  },
  captureButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
    zIndex: 100,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: -0.2,
  },
  galleryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  galleryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: -0.2,
  },
  submitContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
    zIndex: 101,
  },
  submitButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
    opacity: 0.6,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    padding: spacing.md,
    ...shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  roomList: {
    maxHeight: 350,
    paddingHorizontal: spacing.xs,
  },
  roomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  roomIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomOptionText: {
    flex: 1,
  },
  roomOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 1,
  },
  roomOptionTips: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  damageReportSection: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    ...shadows.small,
  },
  damageReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  damageReportTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  damageReportInput: {
    minHeight: 80,
    padding: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    color: '#1E293B',
  },
  bottomPadding: {
    height: 180,
  },
  photoTipBanner: {
    position: 'absolute',
    bottom: 68,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
    zIndex: 99,
  },
  photoTipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  photoTipBold: {
    fontWeight: '700',
    color: '#78350F',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Photo Enlargement Modal Styles
  photoViewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  photoViewBackdrop: {
    flex: 1,
  },
  photoViewHeader: {
    position: 'absolute',
    top: 50,
    right: spacing.md,
    zIndex: 10,
  },
  photoViewCloseButton: {
    padding: spacing.xs,
  },
  photoViewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  photoViewImage: {
    width: '100%',
    height: '100%',
  },
  photoViewFooter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    alignItems: 'center',
  },
  photoViewRoomBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  photoViewRoomName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
