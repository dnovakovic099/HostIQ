import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { ROOM_SUGGESTIONS, ROOM_TYPES, getRoomSuggestionByType } from '../../config/roomSuggestions';
import SecureStayListingPicker from '../../components/SecureStayListingPicker';
import { getStatus as getSecureStayStatus } from '../../api/securestay';

// =============================================================================
// QUICK SETUP PRESETS
// =============================================================================
// Most short-term rentals fit a small handful of standard layouts. The Quick
// Setup mode lets users pick "what kind of place is it" and we auto-generate
// a sensible room list. Power users can still drop into Custom mode for
// fine-grained control.

const PLACE_TYPES = [
  { id: 'studio', label: 'Studio', bedrooms: 0, hasLivingRoom: false, icon: 'cube-outline' },
  { id: '1br', label: '1 Bedroom', bedrooms: 1, hasLivingRoom: true, icon: 'home-outline' },
  { id: '2br', label: '2 Bedrooms', bedrooms: 2, hasLivingRoom: true, icon: 'home-outline' },
  { id: '3br', label: '3 Bedrooms', bedrooms: 3, hasLivingRoom: true, icon: 'home-outline' },
  { id: '4br_plus', label: '4+ Bedrooms', bedrooms: 4, hasLivingRoom: true, icon: 'business-outline' },
];

const BATHROOM_OPTIONS = [
  { id: 1, label: '1' },
  { id: 1.5, label: '1.5' },
  { id: 2, label: '2' },
  { id: 2.5, label: '2.5' },
  { id: 3, label: '3+' },
];

// Generate a sensible room list from a preset configuration. Returns rooms
// in the same shape used by the existing wizard, so the rest of the
// submission flow needs no changes.
const generateRoomsFromPreset = (placeTypeId, bathroomCount) => {
  const preset = PLACE_TYPES.find((p) => p.id === placeTypeId);
  if (!preset) return [];

  const result = [];
  let idCounter = Date.now();

  // Bedrooms (named "Master Bedroom", "Bedroom 2", "Bedroom 3", ...)
  for (let i = 0; i < preset.bedrooms; i++) {
    const suggestion = getRoomSuggestionByType(ROOM_TYPES.BEDROOM);
    const name = i === 0 ? 'Master Bedroom' : `Bedroom ${i + 1}`;
    result.push({
      id: String(idCounter++),
      name,
      room_type: ROOM_TYPES.BEDROOM,
      tips: '',
      exampleTips: suggestion?.exampleTips || [],
    });
  }

  // Living room (skipped for studios — single combined area)
  if (preset.hasLivingRoom) {
    const suggestion = getRoomSuggestionByType(ROOM_TYPES.LIVING_ROOM);
    result.push({
      id: String(idCounter++),
      name: 'Living Room',
      room_type: ROOM_TYPES.LIVING_ROOM,
      tips: '',
      exampleTips: suggestion?.exampleTips || [],
    });
  }

  // Kitchen
  {
    const suggestion = getRoomSuggestionByType(ROOM_TYPES.KITCHEN);
    result.push({
      id: String(idCounter++),
      name: 'Kitchen',
      room_type: ROOM_TYPES.KITCHEN,
      tips: '',
      exampleTips: suggestion?.exampleTips || [],
    });
  }

  // Bathrooms (round up — 1.5 baths becomes 2 inspectable rooms)
  const bathroomRooms = Math.ceil(bathroomCount);
  for (let i = 0; i < bathroomRooms; i++) {
    const suggestion = getRoomSuggestionByType(ROOM_TYPES.BATHROOM);
    const name =
      bathroomRooms === 1
        ? 'Bathroom'
        : i === 0
          ? 'Master Bathroom'
          : `Bathroom ${i + 1}`;
    result.push({
      id: String(idCounter++),
      name,
      room_type: ROOM_TYPES.BATHROOM,
      tips: '',
      exampleTips: suggestion?.exampleTips || [],
    });
  }

  return result;
};

export default function CreatePropertyScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Setup mode: 'quick' is the new default (smart presets), 'custom' falls
  // back to the existing 3-step wizard for power users.
  const [setupMode, setSetupMode] = useState('quick');

  // Quick Setup state
  const [quickPlaceType, setQuickPlaceType] = useState('1br');
  const [quickBathrooms, setQuickBathrooms] = useState(1);

  // Wizard state (custom mode)
  const [step, setStep] = useState(1); // 1: Property Info, 2: Add Rooms, 3: Review

  // Property details
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');

  // Tab bar height: 60px (TAB_BAR_HEIGHT) + 50px (dipDepth) + safe area bottom
  const tabBarHeight = 15;

  // Rooms
  const [rooms, setRooms] = useState([]);
  const [editingRoom, setEditingRoom] = useState(null);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // True once the user has manually touched the Quick-mode room list (added,
  // edited, or deleted a room). After that, place-type / bathroom chips no
  // longer auto-regenerate the preview — `rooms` is the source of truth.
  const [quickRoomsCustomized, setQuickRoomsCustomized] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);

  // SecureStay quick-import
  const [secureStayConnected, setSecureStayConnected] = useState(false);
  const [showSecureStayPicker, setShowSecureStayPicker] = useState(false);
  const [importedFromSecureStay, setImportedFromSecureStay] = useState(null);

  // Reset form when screen is focused (for adding new property)
  useFocusEffect(
    useCallback(() => {
      setSetupMode('quick');
      setQuickPlaceType('1br');
      setQuickBathrooms(1);
      setStep(1);
      setPropertyName('');
      setAddress('');
      setRooms([]);
      setQuickRoomsCustomized(false);
      setEditingRoom(null);
      setShowRoomPicker(false);
      setShowTemplatePicker(false);
      setSelectedRoomType(null);
      setTemplates([]);
      setImportedFromSecureStay(null);

      (async () => {
        try {
          const s = await getSecureStayStatus();
          setSecureStayConnected(!!s?.connected);
        } catch {
          setSecureStayConnected(false);
        }
      })();
    }, [])
  );

  // The rooms shown/submitted in Quick Setup. SS-imported rooms or any
  // user-customized list takes priority; otherwise we fall back to the
  // preset generated from the place-type + bathroom chips.
  const getQuickRooms = () => {
    if (importedFromSecureStay || quickRoomsCustomized) {
      return rooms;
    }
    return generateRoomsFromPreset(quickPlaceType, quickBathrooms);
  };

  // Materialize the current preset preview into `rooms` state so that
  // the user can add to / edit / delete that list. After this call,
  // `rooms` is the source of truth for Quick mode.
  const ensureQuickRoomsMaterialized = () => {
    if (importedFromSecureStay || quickRoomsCustomized) return;
    const generatedRooms = generateRoomsFromPreset(quickPlaceType, quickBathrooms);
    setRooms(generatedRooms);
    setQuickRoomsCustomized(true);
  };

  // Submit a property created via Quick Setup. Uses the current Quick
  // rooms (preset, SS import, or user-customized) and submits in one tap.
  const handleQuickSubmit = async () => {
    if (!propertyName.trim() || !address.trim()) {
      Alert.alert('Required', 'Please enter property name and address');
      return;
    }

    const finalRooms = getQuickRooms();
    if (finalRooms.length === 0) {
      Alert.alert('Required', 'Please add at least one room before creating the property.');
      return;
    }

    const payload = {
      name: propertyName,
      address,
      securestay_listing_id: importedFromSecureStay?.id || null,
      units: [
        {
          name: 'Main Property',
          notes: '',
          rooms: finalRooms.map((room) => ({
            name: room.name,
            room_type: room.room_type,
            tips: room.tips,
          })),
        },
      ],
    };

    setLoading(true);
    try {
      await api.post('/owner/properties', payload);

      Alert.alert('Success', 'Property created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            const parentNav = navigation.getParent();
            if (parentNav) {
              parentNav.navigate('Properties', { screen: 'PropertiesList' });
            } else {
              navigation.goBack();
              setTimeout(() => {
                navigation.navigate('Properties');
              }, 100);
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Create property (quick) error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to create property'
      );
    } finally {
      setLoading(false);
    }
  };

  // Switch from Quick Setup to Custom mode, pre-populating the wizard
  // with the rooms we'd have auto-generated. The user can then edit them.
  const handleSwitchToCustom = () => {
    const carryRooms = getQuickRooms();
    setRooms(carryRooms);
    setStep(propertyName.trim() && address.trim() ? 2 : 1);
    setSetupMode('custom');
  };

  const applySecureStayTemplate = (template) => {
    if (!template) return;
    setPropertyName(template.name || '');
    setAddress(template.address || '');
    const tplRooms = template.units?.[0]?.rooms || [];
    setRooms(
      tplRooms.map((r, i) => ({
        id: `ss-${Date.now()}-${i}`,
        name: r.name,
        room_type: r.room_type,
        tips: r.tips || '',
        exampleTips: getRoomSuggestionByType(r.room_type)?.exampleTips || [],
      }))
    );
    // SS becomes the new base — wipe any prior customization flag so the
    // user can still tweak/remove these (which will set the flag again).
    setQuickRoomsCustomized(false);
    setImportedFromSecureStay({
      id: template.securestay_listing_id,
      name: template.name,
      counts: template.counts,
    });
  };

  const addRoomFromType = async (roomType) => {
    // In Quick mode, freeze the preset preview into `rooms` so the user's
    // additions survive future place-type chip taps.
    if (setupMode === 'quick') ensureQuickRoomsMaterialized();

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
    // Use the live Quick room list when in Quick mode so default names
    // ("Bedroom 2", etc.) reflect what the user actually sees.
    const baseRooms = setupMode === 'quick' ? getQuickRooms() : rooms;
    const count = baseRooms.filter(r => r.room_type === roomType).length;

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
    const baseRooms = setupMode === 'quick' ? getQuickRooms() : rooms;
    const count = baseRooms.filter(r => r.room_type === template.room_type).length;

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

  const saveRoom = () => {
    if (!editingRoom.name.trim()) {
      Alert.alert('Error', 'Please enter a room name');
      return;
    }

    // In Quick mode, take ownership of the preset preview (if not already)
    // before we mutate `rooms`.
    if (setupMode === 'quick' && !importedFromSecureStay && !quickRoomsCustomized) {
      const generated = generateRoomsFromPreset(quickPlaceType, quickBathrooms);
      const existingIdx = generated.findIndex(r => r.id === editingRoom.id);
      const next = existingIdx >= 0
        ? generated.map((r, i) => (i === existingIdx ? editingRoom : r))
        : [...generated, editingRoom];
      setRooms(next);
      setQuickRoomsCustomized(true);
      setEditingRoom(null);
      return;
    }

    const existingIndex = rooms.findIndex(r => r.id === editingRoom.id);
    if (existingIndex >= 0) {
      const updatedRooms = [...rooms];
      updatedRooms[existingIndex] = editingRoom;
      setRooms(updatedRooms);
    } else {
      setRooms([...rooms, editingRoom]);
    }

    if (setupMode === 'quick') setQuickRoomsCustomized(true);
    setEditingRoom(null);
  };

  // Open the editor for an existing room. In Quick mode, materialize the
  // preset preview first so the edit affects the actual list.
  const startEditRoom = (room) => {
    if (setupMode === 'quick') ensureQuickRoomsMaterialized();
    const suggestion = getRoomSuggestionByType(room.room_type);
    setEditingRoom({
      ...room,
      exampleTips: room.exampleTips || suggestion?.exampleTips || [],
    });
  };

  const deleteRoom = (id) => {
    Alert.alert(
      'Delete Room',
      'Are you sure you want to remove this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // In Quick mode, materialize the preset before removing so the
            // remaining rooms are kept (otherwise nothing changes).
            if (setupMode === 'quick' && !importedFromSecureStay && !quickRoomsCustomized) {
              const generated = generateRoomsFromPreset(quickPlaceType, quickBathrooms);
              setRooms(generated.filter(r => r.id !== id));
              setQuickRoomsCustomized(true);
              return;
            }
            setRooms(rooms.filter(r => r.id !== id));
            if (setupMode === 'quick') setQuickRoomsCustomized(true);
          },
        },
      ]
    );
  };

  const insertExampleTip = (tip) => {
    const currentTips = editingRoom.tips.trim();
    const newTips = currentTips
      ? `${currentTips}\n• ${tip}`
      : `• ${tip}`;
    setEditingRoom({ ...editingRoom, tips: newTips });
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate property details
      if (!propertyName.trim() || !address.trim()) {
        Alert.alert('Required', 'Please enter property name and address');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate rooms
      if (rooms.length === 0) {
        Alert.alert('Required', 'Please add at least one room');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    const payload = {
      name: propertyName,
      address,
      securestay_listing_id: importedFromSecureStay?.id || null,
      units: [{
        name: 'Main Property',
        notes: '',
        rooms: rooms.map((room) => ({
          name: room.name,
          room_type: room.room_type,
          tips: room.tips,
        })),
      }],
    };

    console.log('📤 Sending property data:', JSON.stringify(payload, null, 2));
    console.log('🏠 Property name:', propertyName);
    console.log('📍 Address:', address);
    console.log('🚪 Rooms count:', rooms.length);
    console.log('📋 Rooms:', rooms.map(r => `${r.name} (${r.room_type})`));

    setLoading(true);
    try {
      const response = await api.post('/owner/properties', payload);
      console.log('✅ Server response:', JSON.stringify(response.data, null, 2));

      Alert.alert('Success', 'Property created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to Properties tab
            const parentNav = navigation.getParent();
            if (parentNav) {
              parentNav.navigate('Properties', { screen: 'PropertiesList' });
            } else {
              // Fallback: go back and then navigate
              navigation.goBack();
              setTimeout(() => {
                navigation.navigate('Properties');
              }, 100);
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Create property error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const getRoomIcon = (roomType) => {
    const suggestion = getRoomSuggestionByType(roomType);
    return suggestion?.icon || 'home-outline';
  };

  const getRoomLabel = (roomType) => {
    const suggestion = getRoomSuggestionByType(roomType);
    return suggestion?.label || 'Room';
  };

  // Render progress indicator - Modern Enhanced Version
  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        {/* Progress Line with gradient */}
        <View style={styles.progressLineBackground}>
          <View
            style={[
              styles.progressLineFill,
              { width: `${((step - 1) / 2) * 100}%` }
            ]}
          />
        </View>

        {/* Step 1 */}
        <View style={styles.progressStepWrapper}>
          <View style={[
            styles.progressDot,
            step >= 1 && styles.progressDotCurrent
          ]}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.progressNumber}>1</Text>
            </View>
          </View>
          <Text style={[styles.progressLabel, step === 1 && styles.progressLabelActive]}>
            Details
          </Text>
        </View>

        {/* Step 2 */}
        <View style={styles.progressStepWrapper}>
          <View style={[
            styles.progressDot,
            step >= 2 && styles.progressDotCurrent
          ]}>
            <View style={styles.stepNumberContainer}>
              <Text style={[styles.progressNumber, step < 2 && styles.progressNumberInactive]}>2</Text>
            </View>
          </View>
          <Text style={[styles.progressLabel, step === 2 && styles.progressLabelActive]}>
            Rooms
          </Text>
        </View>

        {/* Step 3 */}
        <View style={styles.progressStepWrapper}>
          <View style={[
            styles.progressDot,
            step >= 3 && styles.progressDotCurrent
          ]}>
            <View style={styles.stepNumberContainer}>
              <Text style={[styles.progressNumber, step < 3 && styles.progressNumberInactive]}>3</Text>
            </View>
          </View>
          <Text style={[styles.progressLabel, step === 3 && styles.progressLabelActive]}>
            Review
          </Text>
        </View>
      </View>
    </View>
  );

  // Step 1: Property Details
  const renderPropertyDetails = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Property Details</Text>
        <Text style={styles.stepSubtitle}>
          Enter basic information about your property
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.ssImportButton,
          !secureStayConnected && styles.ssImportButtonDisabled,
        ]}
        onPress={() => {
          if (secureStayConnected) {
            setShowSecureStayPicker(true);
          } else {
            Alert.alert(
              'Connect SecureStay first',
              'Add your SecureStay API key in Settings to auto-fill properties from your listings.',
              [
                { text: 'Not now', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => navigation.navigate('SecureStaySettings'),
                },
              ]
            );
          }
        }}
        activeOpacity={0.85}
      >
        <View style={styles.ssImportIcon}>
          <Ionicons
            name={secureStayConnected ? 'shield-checkmark' : 'link-outline'}
            size={22}
            color="#fff"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ssImportTitle}>
            {!secureStayConnected
              ? 'Connect SecureStay'
              : importedFromSecureStay
              ? 'Imported from SecureStay'
              : 'Search SecureStay listings'}
          </Text>
          <Text style={styles.ssImportSubtitle}>
            {!secureStayConnected
              ? 'Auto-fill properties from your SecureStay catalog'
              : importedFromSecureStay
              ? `${importedFromSecureStay.name} · tap to pick a different listing`
              : 'Type an address to autocomplete and pre-fill rooms'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </TouchableOpacity>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Property Name<Text style={styles.required}> *</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Sunset Beach House"
          value={propertyName}
          onChangeText={setPropertyName}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Address<Text style={styles.required}>  *</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., 123 Ocean Drive, Miami Beach, FL 33139"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />
      </View>
    </ScrollView>
  );

  // Step 2: Add Rooms
  const renderAddRooms = () => {
    // Calculate bottom padding: footer height (52px button + 10px padding) + tabBarHeight + button height (54px) + extra spacing (20px)
    const bottomPadding = 52 + 10 + tabBarHeight + 54 + 20;
    
    return (
      <ScrollView 
        style={styles.stepContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Add Rooms</Text>
          <Text style={styles.stepSubtitle}>
            Define rooms and inspection tips for each area
          </Text>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No rooms added yet</Text>
            <Text style={styles.emptyHint}>
              Tap "Add Room" below to get started
            </Text>
          </View>
        ) : (
          <View style={styles.roomsList}>
            {rooms.map((room, index) => (
              <View key={room.id} style={styles.roomSummaryCard}>
                <View style={styles.roomSummaryHeader}>
                  <View style={styles.roomSummaryLeft}>
                    <View style={styles.roomSummaryIconContainer}>
                      <Ionicons
                        name={getRoomIcon(room.room_type)}
                        size={24}
                        color="#215EEA"
                      />
                    </View>
                    <View style={styles.roomSummaryInfo}>
                      <Text style={styles.roomSummaryName}>{room.name}</Text>
                      <Text style={styles.roomSummaryType}>
                        {getRoomLabel(room.room_type)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.roomSummaryActions}>
                    <TouchableOpacity
                      onPress={() => startEditRoom(room)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="create-outline" size={22} color="#215EEA" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteRoom(room.id)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="trash-outline" size={22} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
                {room.tips && (
                  <Text style={styles.roomSummaryTips} numberOfLines={2}>
                    {room.tips}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addRoomButton}
          onPress={() => setShowRoomPicker(true)}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addRoomButtonText}>Add Room</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Step 3: Review
  const renderReview = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Review & Confirm</Text>
        <Text style={styles.stepSubtitle}>
          Check your property details before creating
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Property Information</Text>
        <View style={styles.reviewCard}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Name:</Text>
            <Text style={styles.reviewValue}>{propertyName}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Address:</Text>
            <Text style={styles.reviewValue}>{address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Rooms Added</Text>
          
        </View>

        {rooms.map((room) => (
          <View key={room.id} style={styles.reviewRoomCard}>
            <View style={styles.reviewRoomHeader}>
              <Ionicons
                name={getRoomIcon(room.room_type)}
                size={20}
                color="#215EEA"
                style={styles.reviewRoomIcon}
              />
              <Text style={styles.reviewRoomName}>{room.name}</Text>
            </View>
            <Text style={styles.reviewRoomType}>{getRoomLabel(room.room_type)}</Text>
            {room.tips && (
              <View style={styles.reviewRoomTips}>
                <Text style={styles.reviewRoomTipsLabel}>Tips:</Text>
                <Text style={styles.reviewRoomTipsText}>{room.tips}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // Quick Setup: single-screen smart-defaults flow that's now the default.
  const renderQuickSetup = () => {
    const previewRooms = getQuickRooms();
    // Hide the place-type / bathroom chips once the user has imported from
    // SecureStay or customized — those chips would overwrite their list.
    const showPresetChips = !importedFromSecureStay && !quickRoomsCustomized;

    return (
      <ScrollView
        style={styles.stepContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 80 }}
      >
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Add a Property</Text>
          <Text style={styles.stepSubtitle}>
            Tell us a bit about it — we'll set up the rest.
          </Text>
        </View>

        {/* SecureStay quick import (unchanged behavior) */}
        <TouchableOpacity
          style={[
            styles.ssImportButton,
            !secureStayConnected && styles.ssImportButtonDisabled,
          ]}
          onPress={() => {
            if (secureStayConnected) {
              setShowSecureStayPicker(true);
            } else {
              Alert.alert(
                'Connect SecureStay first',
                'Add your SecureStay API key in Settings to auto-fill properties from your listings.',
                [
                  { text: 'Not now', style: 'cancel' },
                  {
                    text: 'Open Settings',
                    onPress: () => navigation.navigate('SecureStaySettings'),
                  },
                ]
              );
            }
          }}
          activeOpacity={0.85}
        >
          <View style={styles.ssImportIcon}>
            <Ionicons
              name={secureStayConnected ? 'shield-checkmark' : 'link-outline'}
              size={22}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ssImportTitle}>
              {!secureStayConnected
                ? 'Connect SecureStay'
                : importedFromSecureStay
                  ? 'Imported from SecureStay'
                  : 'Search SecureStay listings'}
            </Text>
            <Text style={styles.ssImportSubtitle}>
              {!secureStayConnected
                ? 'Auto-fill properties from your SecureStay catalog'
                : importedFromSecureStay
                  ? `${importedFromSecureStay.name} · tap to pick a different listing`
                  : 'Type an address to autocomplete and pre-fill rooms'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Property Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Property Name<Text style={styles.required}> *</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sunset Beach House"
            value={propertyName}
            onChangeText={setPropertyName}
            placeholderTextColor="#999"
          />
        </View>

        {/* Address */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Address<Text style={styles.required}> *</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g., 123 Ocean Drive, Miami Beach, FL"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
            placeholderTextColor="#999"
          />
        </View>

        {/* Place Type Chips — hidden once user has imported from SS or
            edited the room list, since they'd overwrite the list. */}
        {showPresetChips && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>What kind of place is it?</Text>
              <View style={styles.chipRow}>
                {PLACE_TYPES.map((pt) => {
                  const selected = quickPlaceType === pt.id;
                  return (
                    <TouchableOpacity
                      key={pt.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setQuickPlaceType(pt.id)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={pt.icon}
                        size={16}
                        color={selected ? '#fff' : '#215EEA'}
                      />
                      <Text
                        style={[styles.chipText, selected && styles.chipTextSelected]}
                      >
                        {pt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bathroom Count */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>How many bathrooms?</Text>
              <View style={styles.chipRow}>
                {BATHROOM_OPTIONS.map((b) => {
                  const selected = quickBathrooms === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.chip, styles.chipCompact, selected && styles.chipSelected]}
                      onPress={() => setQuickBathrooms(b.id)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[styles.chipText, selected && styles.chipTextSelected]}
                      >
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Rooms list — interactive: edit / delete / add. */}
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Ionicons
              name={previewRooms.length > 0 ? 'checkmark-circle' : 'home-outline'}
              size={18}
              color={previewRooms.length > 0 ? '#33D39C' : '#94A3B8'}
            />
            <Text style={styles.previewTitle}>
              {previewRooms.length === 0
                ? 'No rooms yet — tap "Add Room" below'
                : importedFromSecureStay
                  ? `${previewRooms.length} room${previewRooms.length === 1 ? '' : 's'} from SecureStay`
                  : `${previewRooms.length} room${previewRooms.length === 1 ? '' : 's'} ready`}
            </Text>
          </View>

          {previewRooms.map((r) => (
            <View key={r.id} style={styles.quickRoomRow}>
              <Ionicons
                name={getRoomIcon(r.room_type)}
                size={18}
                color="#215EEA"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.quickRoomText} numberOfLines={1}>
                {r.name}
              </Text>
              <TouchableOpacity
                onPress={() => startEditRoom(r)}
                style={styles.quickRoomIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={18} color="#215EEA" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteRoom(r.id)}
                style={styles.quickRoomIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color="#F44336" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.quickAddRoomButton}
            onPress={() => setShowRoomPicker(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.quickAddRoomButtonText}>Add Room</Text>
          </TouchableOpacity>

          {!quickRoomsCustomized && !importedFromSecureStay && (
            <TouchableOpacity
              style={styles.customLink}
              onPress={handleSwitchToCustom}
              activeOpacity={0.7}
            >
              <Text style={styles.customLinkText}>
                Prefer the full wizard? Switch to manual setup →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Progress Indicator (custom mode only) */}
      {setupMode === 'custom' && renderProgress()}

      {/* Step Content */}
      <View style={styles.content}>
        {setupMode === 'quick' && renderQuickSetup()}
        {setupMode === 'custom' && step === 1 && renderPropertyDetails()}
        {setupMode === 'custom' && step === 2 && renderAddRooms()}
        {setupMode === 'custom' && step === 3 && renderReview()}
      </View>

      {/* Navigation Buttons */}
      <View style={[styles.footer, { paddingBottom: tabBarHeight }]}>
        {setupMode === 'quick' ? (
          <TouchableOpacity
            style={[styles.footerButton, styles.completeButton, styles.fullWidth]}
            onPress={handleQuickSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.completeButtonText}>Create Property</Text>
            )}
          </TouchableOpacity>
        ) : (
          <>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.footerButton, styles.backButton]}
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={20} color="#215EEA" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity
                style={[styles.footerButton, styles.nextButton, step === 1 && styles.fullWidth]}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.footerButton, styles.completeButton]}
                onPress={handleComplete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.completeButtonText}>Create Property</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

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
        onRequestClose={() => setEditingRoom(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {rooms.find(r => r.id === editingRoom?.id) ? 'Edit Room' : 'New Room'}
              </Text>
              <TouchableOpacity onPress={() => setEditingRoom(null)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.editRoomContent}
              keyboardShouldPersistTaps="handled"
            >
              {editingRoom && (
                <>
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
                    <Text style={styles.label}>Tips for AI & Cleaner</Text>
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
                  >
                    <Text style={styles.saveButtonText}>Save Room</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SecureStayListingPicker
        visible={showSecureStayPicker}
        onClose={() => setShowSecureStayPicker(false)}
        onPicked={(template) => {
          applySecureStayTemplate(template);
          setShowSecureStayPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // ===== Quick Setup Chips =====
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  chipCompact: {
    paddingHorizontal: 18,
    minWidth: 56,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#215EEA',
    borderColor: '#215EEA',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#215EEA',
    letterSpacing: -0.1,
  },
  chipTextSelected: {
    color: '#fff',
  },

  // ===== Quick Setup Preview =====
  previewSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  previewRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  previewRoomText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  quickRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  quickRoomText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  quickRoomIconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  quickAddRoomButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#215EEA',
  },
  quickAddRoomButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  customLink: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    alignItems: 'center',
  },
  customLinkText: {
    fontSize: 13,
    color: '#215EEA',
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  ssImportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#215EEA',
    marginBottom: 18,
    shadowColor: '#215EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ssImportButtonDisabled: {
    backgroundColor: '#7A8AA8',
    shadowOpacity: 0.1,
  },
  ssImportIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ssImportTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  ssImportSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  // Modern Enhanced Progress Bar
  progressContainer: {
    paddingVertical: 24,
    paddingHorizontal: 24,

  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: 6,
  },
  progressLineBackground: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    top: 22,
    zIndex: 0,
  },
  progressLineFill: {
    height: '100%',
    backgroundColor: '#215EEA',
    borderRadius: 2,
    minWidth: 0,
  },
  progressStepWrapper: {
    alignItems: 'center',
    zIndex: 1,
  },
  progressDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#E2E8F0',
  },
  progressDotActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#33D39C',
  },
  progressDotCurrent: {
    backgroundColor: '#215EEA',
    borderColor: '#215EEA',
    shadowColor: '#215EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  stepNumberContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkContainer: {
    marginTop: -3,
    marginLeft: -3,
  },
  progressNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  progressNumberInactive: {
    color: '#94A3B8',
  },
  progressLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  progressLabelActive: {
    color: '#215EEA',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    marginBottom: 80,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
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
  textArea: {
    height: 90,
    paddingTop: 15,
    textAlignVertical: 'top',
  },
  tipsTextArea: {
    height: 140,
    paddingTop: 15,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  roomsList: {
    marginBottom: 20,
  },
  roomSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  roomSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomSummaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomSummaryInfo: {
    flex: 1,
  },
  roomSummaryName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  roomSummaryType: {
    fontSize: 13,
    color: '#666',
  },
  roomSummaryActions: {
    flexDirection: 'row',
    gap: 2,
  },
  iconButton: {
    padding: 2,
  },
  roomSummaryTips: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  addRoomButton: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: '#215EEA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#215EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addRoomButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#215EEA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewRow: {
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  reviewRoomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewRoomIcon: {
    marginRight: 8,
  },
  reviewRoomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewRoomType: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  reviewRoomTips: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reviewRoomTipsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#215EEA',
    marginBottom: 6,
  },
  reviewRoomTipsText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  footer: {
    position: 'absolute',
    paddingTop: 10,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  fullWidth: {
    flex: 1,
  },
  backButton: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#d0e7ff',
  },
  backButtonText: {
    color: '#215EEA',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#215EEA',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#0a8f2bff',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  required: {
    color: 'red',
    marginHorizontal: 4,
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
  // Template Picker Styles
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
});
