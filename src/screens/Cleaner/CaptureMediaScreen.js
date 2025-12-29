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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera } from 'expo-camera';
import api from '../../api/client';
import { API_URL } from '../../config/api';
import { useInspectionStore } from '../../store/inspectionStore';
import { getRoomSuggestionByType } from '../../config/roomSuggestions';
import colors from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import shadows from '../../theme/shadows';

export default function CaptureMediaScreen({ route, navigation }) {
  const { 
    assignment, 
    inspectionId,
    propertyId: routePropertyId,
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
  
  // Get propertyId from route params or assignment
  const propertyId = routePropertyId || assignment?.unit?.property?.id;
  
  const [inspection, setInspection] = useState(inspectionId ? { id: inspectionId } : null);
  
  // Log params only once when component mounts
  React.useEffect(() => {
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
  }, []); // Empty dependency array - only log once on mount
  
  // Debug: Log when inspection ID changes
  React.useEffect(() => {
    if (inspection?.id) {
      console.log('📋 Inspection ID state:', inspection?.id);
    }
  }, [inspection]);
  const [photos, setPhotos] = useState([]); // { id, uri, roomId, roomName }
  const [isLoadingExisting, setIsLoadingExisting] = useState(isEditing && existingMedia.length > 0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedPhotoForView, setSelectedPhotoForView] = useState(null);
  const [damageReport, setDamageReport] = useState('');
  const { createInspection } = useInspectionStore();
  
  // Valuable Items State
  const [valuableItems, setValuableItems] = useState([]); // All valuable items from all rooms
  const [valuableItemPhotos, setValuableItemPhotos] = useState({}); // { itemId: { uri, notes } }
  const [selectedValuableItem, setSelectedValuableItem] = useState(null); // For photo taking
  const [valuableItemNotes, setValuableItemNotes] = useState('');
  const [showValuableItemModal, setShowValuableItemModal] = useState(false);
  const [collapsedRooms, setCollapsedRooms] = useState(new Set());
  
  // Listen for updates from RoomCaptureScreen
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check if we have updated photos from RoomCaptureScreen
      const params = route.params;
      if (params?.updatedRoomPhotos) {
        const roomId = params.updatedRoomId;
        // Update photos for this room
        setPhotos(prev => {
          const filtered = prev.filter(p => p.roomId !== roomId);
          return [...filtered, ...params.updatedRoomPhotos];
        });
        // Clear the params
        navigation.setParams({ updatedRoomPhotos: undefined, updatedRoomId: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route.params]);

  const hasRooms = rooms.length > 0;
  const failedRoomIdsSet = new Set(failedRoomIds);
  
  // Toggle room collapse
  const toggleRoomCollapse = (roomId) => {
    setCollapsedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };
  
  // Fetch valuable items for all rooms in this unit
  React.useEffect(() => {
    const fetchValuableItems = async () => {
      const theUnitId = assignment?.unit_id || unitId;
      if (!theUnitId) return;
      
      try {
        console.log('🏷️ Fetching valuable items for unit:', theUnitId);
        const response = await api.get(`/valuable-items/unit/${theUnitId}`);
        console.log('📥 API Response:', JSON.stringify(response.data, null, 2));
        const allItems = response.data.rooms?.flatMap(room => 
          room.valuable_items.map(item => {
            console.log('📸 Valuable item data:', {
              id: item.id,
              name: item.name,
              reference_photo: item.reference_photo,
              hasReferencePhoto: !!item.reference_photo
            });
            return {
              ...item,
              roomName: room.name,
              roomId: room.id
            };
          })
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
    if (isEditing && existingMedia && existingMedia.length > 0) {
      console.log('📸 Loading existing media:', existingMedia.length);
      console.log('📸 First media item:', existingMedia[0]);
      const loadedPhotos = existingMedia
        .filter(m => m && m.type === 'PHOTO' && m.url)
        .map((media, index) => {
          const room = rooms.find(r => r.id === media.room_id);
          // Ensure URL is a full URL if it's relative
          let photoUrl = media.url;
          if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('file://')) {
            // If it's a relative URL, prepend API base URL
            const apiBase = api.defaults?.baseURL?.replace('/api', '') || '';
            photoUrl = photoUrl.startsWith('/') ? apiBase + photoUrl : apiBase + '/' + photoUrl;
          }
          
          return {
            id: `existing_${media.id}_${index}`,
            uri: photoUrl,
            roomId: media.room_id,
            roomName: room?.name || 'Unknown Room',
            isExisting: true,
            mediaId: media.id
          };
        });
      console.log('✅ Loaded', loadedPhotos.length, 'existing photos');
      setPhotos(loadedPhotos);
      setIsLoadingExisting(false);
    } else if (isEditing) {
      console.log('⚠️ isEditing is true but no existingMedia provided');
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
    // If we have an inspection ID, check its status first
    if (inspectionId) {
      try {
        const inspectionResponse = await api.get(`/cleaner/inspections/${inspectionId}`);
        const inspectionData = inspectionResponse.data;
        
        // If inspection is FAILED or REJECTED, we need to create a new one
        if (inspectionData.status === 'FAILED' || inspectionData.status === 'REJECTED') {
          console.log('⚠️ Inspection is FAILED/REJECTED, creating new inspection...');
          
          // Get unit_id from inspection or assignment
          const unitIdForNew = inspectionData.unit_id || assignment?.unit_id || unitId;
          if (!unitIdForNew) {
            throw new Error('Cannot create new inspection: missing unit_id');
          }
          
          const response = await api.post('/cleaner/inspections', {
            unit_id: unitIdForNew,
            assignment_id: assignment?.id,
          });
          setInspection(response.data);
          createInspection(response.data);
          console.log('✅ Created new inspection:', response.data.id);
          return response.data;
        }
        
        // Inspection is valid, use it
        setInspection(inspectionData);
        return inspectionData;
      } catch (error) {
        console.error('Error checking inspection status:', error);
        // Fall through to create new inspection
      }
    }

    // Create new inspection if we don't have one or if previous check failed
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
    
    // If we have unitId but no assignment, create inspection with unitId
    if (unitId && !inspection) {
      try {
        const response = await api.post('/cleaner/inspections', {
          unit_id: unitId,
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

  const handleTakePhotoForRoom = async (room) => {
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
          roomId: room.id,
          roomName: room.name,
        };
        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePickFromGalleryForRoom = async (room) => {
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
              roomId: room.id,
              roomName: room.name,
            };
          })
        );
        setPhotos(prev => [...prev, ...newPhotos]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick photos');
    }
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

      // Prompt to update inventory after successful submission
      if (propertyId) {
        Alert.alert(
          'Inspection Submitted!',
          'AI analysis will begin shortly.\n\nWould you like to update inventory for this property?',
          [
            {
              text: 'Skip',
              style: 'cancel',
              onPress: () => navigation.replace('CleanerHome'),
            },
            {
              text: 'Update Inventory',
              onPress: () => navigation.replace('InventoryUpdate', {
                propertyId: propertyId,
                propertyName: propertyName || assignment?.unit?.property?.name,
                inspectionId: currentInspection.id,
              }),
            },
          ]
        );
      } else {
        // No property ID available, just go home
        Alert.alert(
          'Success!',
          'Inspection submitted successfully. AI analysis will begin shortly.',
          [{
            text: 'OK',
            onPress: () => navigation.replace('CleanerHome'),
          }]
        );
      }
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
    <View style={styles.container}>
      {/* Beautiful Gradient Header */}
      <LinearGradient
        colors={['#DBEAFE', '#93C5FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={styles.headerWrapper}
      >
        <SafeAreaView>
          <View style={styles.headerGradient}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#4A90E2" />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name="camera" size={28} color="#4A90E2" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>Capture Inspection</Text>
              <Text style={styles.headerSubtitle}>
                {displayPropertyName} • {displayUnitName}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>


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

      {/* Rooms & Cleaning Tips - REDESIGNED */}
      <View style={styles.roomsOverviewCard}>
        <View style={styles.roomsOverviewHeader}>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.08)']}
            style={styles.roomsHeaderIcon}
          >
            <Ionicons name="bed" size={20} color="#3B82F6" />
          </LinearGradient>
          <Text style={styles.roomsOverviewTitle}>Rooms to Clean</Text>
          <View style={styles.roomsCountBadge}>
            <Text style={styles.roomsCountText}>{rooms.length}</Text>
          </View>
        </View>

        {rooms.map((room) => {
          const roomPhotos = photos.filter(p => p.roomId === room.id);
          const isComplete = roomPhotos.length > 0;
          
          return (
            <TouchableOpacity
              key={room.id}
              style={[
                styles.modernRoomCard,
                isComplete && styles.modernRoomCardComplete,
                failedRoomIdsSet.has(room.id) && styles.modernRoomCardFailed
              ]}
              onPress={() => navigation.navigate('RoomCapture', {
                room,
                assignment,
                inspectionId,
                propertyId,
                propertyName,
                unitName,
                unitId,
                rooms,
                isRejected,
                failedRoomIds,
                rejectionReason,
                existingMedia: existingMedia.filter(m => m.room_id === room.id),
                isEditing,
                allPhotos: photos, // Pass all photos to maintain state
              })}
              activeOpacity={0.7}
            >
              <View style={styles.modernRoomHeader}>
                <View style={styles.modernRoomTitleRow}>
                  <Text style={styles.modernRoomName}>{room.name}</Text>
                  {isComplete && (
                    <View style={styles.completeBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.completeBadgeText}>{roomPhotos.length} photo{roomPhotos.length > 1 ? 's' : ''}</Text>
                    </View>
                  )}
                </View>
                {room.tips && (
                  <Text style={styles.modernRoomTips} numberOfLines={2}>
                    {room.tips}
                  </Text>
                )}
              </View>

              <View style={styles.roomCardFooter}>
                
                <Text style={styles.roomCardActionText}>
                  {isComplete ? 'View & Edit Photos' : 'Add Photos'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      
   

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Valuable Items Section */}
        {valuableItems.length > 0 && (
          <View style={styles.valuableItemsCard}>
            <View style={styles.valuableItemsHeader}>
              <LinearGradient
                colors={['rgba(88, 86, 214, 0.15)', 'rgba(88, 86, 214, 0.08)']}
                style={styles.valuableItemsHeaderIcon}
              >
                <Ionicons name="shield-checkmark" size={20} color="#5856D6" />
              </LinearGradient>
              <Text style={styles.valuableItemsTitle}>Valuable Items</Text>
              <View style={styles.valuableItemsCountBadge}>
                <Text style={styles.valuableItemsCountText}>
                  {Object.values(valuableItemPhotos).filter(p => p.uri).length}/{valuableItems.length}
                </Text>
              </View>
            </View>
            
            {valuableItems.map((item) => {
              const hasPhoto = !!valuableItemPhotos[item.id]?.uri;
              // Fix reference photo URL - backend may return relative path or full URL
              let referencePhotoUrl = item.reference_photo;
              if (referencePhotoUrl) {
                // Ensure it's a string and trim whitespace
                referencePhotoUrl = String(referencePhotoUrl).trim();
                
                
                const isFullUrl = referencePhotoUrl.startsWith('http://') || referencePhotoUrl.startsWith('https://');
                
                if (isFullUrl) {                  
                  const productionUrl = 'https://roomify-server-production.up.railway.app';
                  const baseUrl = API_URL.replace('/api', '');
                  
                  
                  if (referencePhotoUrl.includes(productionUrl)) {
                    if (!baseUrl.includes('roomify-server-production')) {
                      
                      const path = referencePhotoUrl.replace(productionUrl, '');
                      referencePhotoUrl = baseUrl + path;
                    }
                    
                  }
                  
                } else {
                 
                  const baseUrl = API_URL.replace('/api', '');
                  const path = referencePhotoUrl.startsWith('/') ? referencePhotoUrl : '/' + referencePhotoUrl;
                  referencePhotoUrl = baseUrl + path;
                }
              } else {
                console.log(`   ⚠️ No reference_photo found for this item`);
              }
              
           
              
              return (
                <View key={item.id} style={[
                  styles.valuableItemCard,
                  hasPhoto && styles.valuableItemCardComplete
                ]}>
                  <View style={styles.valuableItemHeader}>
                    <View style={styles.valuableItemTitleRow}>
                      <Text style={styles.valuableItemName}>{item.name}</Text>
                      {hasPhoto && (
                        <View style={styles.valuableItemCompleteBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                          <Text style={styles.valuableItemCompleteText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.valuableItemRoom}>{item.roomName}</Text>
                    {item.description && (
                      <Text style={styles.valuableItemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                  </View>

                  {/* Reference Photo Display */}
                  {referencePhotoUrl && (
                    <View style={styles.referencePhotoContainer}>
                      <Text style={styles.referencePhotoLabel}>Reference Photo:</Text>
                      <TouchableOpacity
                        style={styles.referencePhotoThumbnail}
                        onPress={() => setSelectedPhotoForView({ uri: referencePhotoUrl, roomName: `${item.name} - Reference` })}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={{ uri: referencePhotoUrl }}
                          style={styles.referencePhotoImage}
                          resizeMode="cover"
                          onError={(error) => {
                            console.error(`❌ Failed to load reference photo for ${item.name}:`, error.nativeEvent.error);
                            console.error(`   URL was: ${referencePhotoUrl}`);
                          }}
                          onLoad={() => {
                            console.log(`✅ Successfully loaded reference photo for ${item.name}`);
                          }}
                        />
                        <View style={styles.referencePhotoOverlay}>
                          <Ionicons name="eye-outline" size={20} color="#FFF" />
                          <Text style={styles.referencePhotoOverlayText}>View</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.valuableItemActions}>
                    <TouchableOpacity
                      style={styles.valuableItemPhotoButton}
                      onPress={() => handleValuableItemPhoto(item)}
                      activeOpacity={0.7}
                    >
                      {hasPhoto ? (
                        <View style={styles.valuableItemPhotoPreview}>
                          <Image
                            source={{ uri: valuableItemPhotos[item.id].uri }}
                            style={styles.valuableItemPhotoThumbnail}
                          />
                          <View style={styles.valuableItemPhotoOverlay}>
                            <Ionicons name="camera" size={16} color="#FFF" />
                            <Text style={styles.valuableItemPhotoButtonText}>Retake</Text>
                          </View>
                        </View>
                      ) : (
                        <>
                          <Ionicons name="camera" size={20} color="#5856D6" />
                          <Text style={styles.valuableItemPhotoButtonText}>Take Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    {hasPhoto && (
                      <TouchableOpacity
                        style={styles.addNoteButton}
                        onPress={() => {
                          setSelectedValuableItem(item);
                          setValuableItemNotes(valuableItemPhotos[item.id]?.notes || '');
                          setShowValuableItemModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chatbubble-outline" size={16} color="#5856D6" />
                        <Text style={styles.addNoteText}>
                          {valuableItemPhotos[item.id]?.notes ? 'Edit Note' : 'Add Note'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Submit Button - Always visible */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (uploading || photos.length === 0) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitInspection}
            disabled={uploading || photos.length === 0}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>
                  Uploading {uploadProgress.current}/{uploadProgress.total}...
                </Text>
              </>
            ) : photos.length === 0 ? (
              <>
                <Ionicons name="camera-outline" size={24} color="#FFF" />
                <Text style={styles.submitButtonText}>
                  Start by taking photos for each room
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

        <View style={styles.bottomPadding} />
      </ScrollView>

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

      {/* Valuable Item Notes Modal */}
      <Modal
        visible={showValuableItemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowValuableItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowValuableItemModal(false)}
          />
          <View style={styles.valuableItemModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedValuableItem?.name}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowValuableItemModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.valuableItemModalLabel}>Add a note (optional)</Text>
            <Text style={styles.valuableItemModalHint}>
              Report any issues: damage, scratches, missing parts, etc.
            </Text>
            <TextInput
              style={styles.valuableItemNoteInput}
              value={valuableItemNotes}
              onChangeText={setValuableItemNotes}
              placeholder="e.g., Small scratch on corner"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View style={styles.valuableItemModalButtons}>
              <TouchableOpacity
                style={styles.valuableItemModalCancel}
                onPress={() => setShowValuableItemModal(false)}
              >
                <Text style={styles.valuableItemModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.valuableItemModalSave}
                onPress={handleValuableItemNotesSave}
              >
                <Text style={styles.valuableItemModalSaveText}>Save Note</Text>
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
    backgroundColor: '#F8FAFC',
  },
  // Beautiful Gradient Header
  headerWrapper: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 18,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  // Modern Rooms Overview Card
  roomsOverviewCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  roomsOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
    paddingVertical: 4,
  },
  roomsCollapseIcon: {
    marginLeft: 4,
  },
  roomsHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomsOverviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  roomsCountBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roomsCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Modern Room Cards
  modernRoomCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modernRoomCardComplete: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  modernRoomCardFailed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  modernRoomHeader: {
    marginBottom: 8,
  },
  modernRoomTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modernRoomName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  modernRoomTips: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  roomCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  roomCardActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  capturePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  capturePromptText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Room Card Capture Buttons
  roomCaptureButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  roomCameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  roomCameraButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  roomGalleryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    gap: 6,
  },
  roomGalleryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  firstSection: {
    marginTop: 0,
  },
  roomSection: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  failedRoomSection: {
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  // Modern Room Section Header
  modernRoomSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomHeaderTextContainer: {
    flex: 1,
  },
  roomSectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernRoomSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  roomSectionTips: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  roomHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapseIcon: {
    marginLeft: 4,
  },
  roomPhotoCount: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 28,
    alignItems: 'center',
  },
  roomPhotoCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  failedRoomTitle: {
    color: '#DC2626',
  },
  
  // Old styles (keeping for compatibility)
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
    marginTop: 12,
  },
  photoCard: {
    width: (Dimensions.get('window').width - 64) / 3, // 3 columns with margins
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  photoImageContainer: {
    width: '100%',
    height: '100%',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  roomBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  roomBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
  submitContainer: {
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
    marginTop: 20,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  damageReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  damageReportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  damageReportInput: {
    minHeight: 100,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    color: '#1E293B',
  },
  bottomPadding: {
    height: 32,
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
  // Valuable Items Styles - Matching Rooms Layout
  valuableItemsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  valuableItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  valuableItemsHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valuableItemsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  valuableItemsCountBadge: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  valuableItemsCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  valuableItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  valuableItemCardComplete: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  valuableItemHeader: {
    marginBottom: 12,
  },
  valuableItemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  valuableItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  valuableItemCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  valuableItemCompleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  valuableItemRoom: {
    fontSize: 13,
    color: '#5856D6',
    fontWeight: '600',
    marginBottom: 4,
  },
  valuableItemDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  valuableItemActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexWrap: 'wrap',
  },
  valuableItemPhotoButton: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#5856D6',
    gap: 6,
    position: 'relative',
    height: 44,
  },
  valuableItemPhotoPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  valuableItemPhotoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  valuableItemPhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  valuableItemPhotoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5856D6',
  },
  referencePhotoContainer: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  referencePhotoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  referencePhotoThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  referencePhotoImage: {
    width: '100%',
    height: '100%',
  },
  referencePhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  referencePhotoOverlayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  referencePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#5856D6',
    gap: 6,
    minWidth: 100,
  },
  referencePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5856D6',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#5856D6',
    gap: 6,
    minWidth: 100,
  },
  addNoteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5856D6',
  },
  // Valuable Item Modal
  valuableItemModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: spacing.md,
    ...shadows.large,
  },
  valuableItemModalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
  },
  valuableItemModalHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
  },
  valuableItemNoteInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#000',
    minHeight: 80,
  },
  valuableItemModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  valuableItemModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  valuableItemModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  valuableItemModalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#5856D6',
    alignItems: 'center',
  },
  valuableItemModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
