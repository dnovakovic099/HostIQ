import React, { useState, useEffect, useRef } from 'react';
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
  TextInput,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera } from 'expo-camera';
import api from '../../api/client';
import { API_URL } from '../../config/api';
import { getRoomSuggestionByType } from '../../config/roomSuggestions';
import colors from '../../theme/colors';

const { width } = Dimensions.get('window');

export default function RoomCaptureScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    room,
    assignment,
    inspectionId,
    propertyName,
    unitName,
    allPhotos = [],
    existingMedia = [],
    isEditing = false,
  } = route.params;

  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState(null);
  const [damageReport, setDamageReport] = useState('');
  const scrollViewRef = useRef(null);
  const damageReportInputRef = useRef(null);

  // Load existing photos for this room
  useEffect(() => {
    if (isEditing && existingMedia && existingMedia.length > 0) {
      console.log('📸 Loading existing media for room:', room.name, existingMedia.length);
      const loadedPhotos = existingMedia
        .filter(m => m && m.type === 'PHOTO' && m.url)
        .map((media, index) => {
          // Ensure URL is a full URL if it's relative
          let photoUrl = media.url;
          if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('file://')) {
            // If it's a relative URL, prepend API base URL
            // Remove /api suffix from API_URL if present, as media URLs are usually absolute from server root
            const apiBase = API_URL.replace('/api', '');
            photoUrl = photoUrl.startsWith('/') ? apiBase + photoUrl : apiBase + '/' + photoUrl;
          }
          
          return {
            id: `existing_${media.id}_${index}`,
            uri: photoUrl,
            roomId: room.id,
            roomName: room.name,
            isExisting: true,
            mediaId: media.id,
          };
        });
      console.log('✅ Loaded', loadedPhotos.length, 'existing photos for', room.name);
      setPhotos(loadedPhotos);
    } else if (allPhotos && allPhotos.length > 0) {
      // Load photos from allPhotos that belong to this room
      const roomPhotos = allPhotos.filter(p => p && p.roomId === room.id);
      setPhotos(roomPhotos);
    }
  }, [existingMedia, allPhotos, room.id, room.name, isEditing]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and photo library access is required');
      return false;
    }
    return true;
  };

  const resizeImage = async (uri) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 960 } }],
        { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.warn('Image resize failed, using original:', error);
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

  const handleSave = () => {
    // Pass updated photos back to CaptureMediaScreen
    navigation.navigate('CaptureMedia', {
      ...route.params,
      updatedRoomPhotos: photos,
      updatedRoomId: room.id,
      updatedDamageReport: damageReport,
    });
  };

  const getRoomIcon = (roomType) => {
    const suggestion = getRoomSuggestionByType(roomType);
    return suggestion?.icon || 'home-outline';
  };

  const getRoomColor = (roomId) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return colors[0]; // Use first color for single room
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, { paddingTop: insets.top }]}
      >
        <SafeAreaView>
          <View style={styles.headerGradient}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#4A90E2" />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name={getRoomIcon(room.type)} size={28} color="#4A90E2" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>{room.name}</Text>
              <Text style={styles.headerSubtitle}>
                {propertyName} • {unitName}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        {/* Room Requirements */}
        {room.tips && (
          <View style={styles.requirementsCard}>
            <View style={styles.requirementsHeader}>
              
              <Text style={styles.requirementsTitle}>Inspection Requirements</Text>
            </View>
            <Text style={styles.requirementsText}>{room.tips}</Text>
          </View>
        )}

        {/* Capture Buttons */}
        <View style={styles.captureButtonsContainer}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleTakePhoto}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={18} color="#FFF" />
            <Text style={styles.cameraButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handlePickFromGallery}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Ionicons name="images" size={18} color="#3B82F6" />
            <Text style={styles.galleryButtonText}>From Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <View style={styles.photoSection}>
            <View style={styles.photoSectionHeader}>
              <Text style={styles.photoSectionTitle}>Photos ({photos.length})</Text>
            </View>
            <View style={styles.photoGrid}>
              {photos.map(photo => (
                <View key={photo.id} style={styles.photoCard}>
                  <TouchableOpacity
                    style={styles.photoImageContainer}
                    onPress={() => setSelectedPhotoForView(photo)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} />
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

        {/* Damage Report Section */}
        <View style={styles.damageReportSection}>
          <View style={styles.damageReportHeader}>
            <View style={styles.damageReportIconContainer}>
              <Ionicons name="construct" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.damageReportTitle}>Damage Report (Optional)</Text>
          </View>
          <TextInput
            ref={damageReportInputRef}
            style={styles.damageReportInput}
            placeholder="Report any damage or issues found in this room..."
            placeholderTextColor="#94A3B8"
            value={damageReport}
            onChangeText={setDamageReport}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={() => {
              // Scroll to end to show the input
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
        </View>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={styles.saveButtonText}>Save Room</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

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
          </TouchableOpacity>
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
  headerWrapper: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  requirementsCard: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
   
   
  },
  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  requirementsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.3,
  },
  requirementsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
  },
  captureButtonsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  galleryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    gap: 8,
  },
  galleryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  photoSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  photoSectionHeader: {
    marginBottom: 12,
  },
  photoSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoCard: {
    width: (width - 64) / 3,
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
  damageReportSection: {
    marginHorizontal: 16,
    marginBottom: 24,
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
    gap: 10,
    marginBottom: 12,
  },
  damageReportIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
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
    fontSize: 14,
    color: '#1F2937',
  },
  bottomPadding: {
    height: 32,
  },
  saveButtonContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  photoViewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  photoViewBackdrop: {
    flex: 1,
  },
  photoViewHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  photoViewCloseButton: {
    padding: 8,
  },
  photoViewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewImage: {
    width: width - 40,
    height: width - 40,
  },
});
