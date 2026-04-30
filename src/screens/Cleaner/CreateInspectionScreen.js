import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import colors from '../../theme/colors';
import SecureStayListingPicker from '../../components/SecureStayListingPicker';
import {
  getStatus as getSecureStayStatus,
  importSecureStayProperty,
} from '../../api/securestay';
import { FEATURE_FLAGS } from '../../config/constants';

export default function CreateInspectionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(null); // 'preset' or 'custom'
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Custom property fields
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitNotes, setUnitNotes] = useState('');
  // Pulled from SecureStay if the cleaner imports a listing.
  const [importedListingId, setImportedListingId] = useState(null);
  const [importedRooms, setImportedRooms] = useState([]); // [{ name, room_type, tips }]
  const [importedHeadline, setImportedHeadline] = useState(null); // string for badge

  // SecureStay
  const [secureStayConnected, setSecureStayConnected] = useState(false);
  const [showSSPicker, setShowSSPicker] = useState(false);
  const [importingFromSS, setImportingFromSS] = useState(false);

  // Tab bar height: 60px (TAB_BAR_HEIGHT) + 50px (dipDepth) + safe area bottom
  const tabBarHeight = 110 + insets.bottom;

  useEffect(() => {
    if (mode === 'preset') {
      loadProperties();
    }
  }, [mode]);

  // Check SecureStay status whenever we land on a mode where it matters.
  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_SECURESTAY) return;
    if (mode !== 'custom' && mode !== 'preset') return;
    let alive = true;
    (async () => {
      try {
        const s = await getSecureStayStatus();
        if (!alive) return;
        setSecureStayConnected(!!s?.connected);
      } catch {
        if (alive) setSecureStayConnected(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode]);

  const applySecureStayTemplate = (template) => {
    if (!template) return;
    setPropertyName(template.name || '');
    setPropertyAddress(template.address || '');
    setUnitName('Main Property');
    const tplRooms = template.units?.[0]?.rooms || [];
    setImportedRooms(
      tplRooms.map((r) => ({
        name: r.name,
        room_type: r.room_type || null,
        tips: r.tips || '',
      }))
    );
    setImportedListingId(template.securestay_listing_id || null);
    const counts = template.counts || {};
    const summaryBits = [];
    if (typeof counts.bedrooms === 'number') summaryBits.push(`${counts.bedrooms} bd`);
    if (typeof counts.bathrooms === 'number') summaryBits.push(`${counts.bathrooms} ba`);
    summaryBits.push(`${tplRooms.length} rooms`);
    setImportedHeadline(`${template.name} · ${summaryBits.join(' · ')}`);
  };

  const clearImport = () => {
    setImportedListingId(null);
    setImportedRooms([]);
    setImportedHeadline(null);
  };

  const promptConnectSecureStay = () => {
    Alert.alert(
      'Connect SecureStay first',
      'Add your SecureStay API key in Settings to import properties from your listings.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            const parent = navigation.getParent();
            if (parent) parent.navigate('Settings', { screen: 'SecureStaySettings' });
            else navigation.navigate('Settings');
          },
        },
      ]
    );
  };

  // Preset-mode quick path: import a listing as a brand-new property under
  // the cleaner's owner, auto-assign the cleaner, then refresh the list and
  // pre-select the new property.
  const handlePresetSecureStayImport = async (template) => {
    setImportingFromSS(true);
    try {
      const tplRooms = template.units?.[0]?.rooms || [];
      const created = await importSecureStayProperty({
        name: template.name,
        address: template.address,
        timezone: 'America/Los_Angeles',
        securestay_listing_id: template.securestay_listing_id,
        units: [
          {
            name: 'Main Property',
            rooms: tplRooms.map((r) => ({
              name: r.name,
              room_type: r.room_type,
              tips: r.tips || '',
            })),
          },
        ],
      });
      // Refresh property list and try to select the new one
      await loadProperties();
      const newId = created?.id;
      if (newId) {
        setSelectedProperty({
          id: newId,
          name: created.name,
          address: created.address,
        });
      }
      Alert.alert(
        'Imported',
        `${template.name} was added with ${tplRooms.length} rooms. Pick the unit to start cleaning.`
      );
    } catch (err) {
      console.error('SecureStay preset import failed:', err);
      Alert.alert(
        'Import failed',
        err.response?.data?.error || err.message || 'Could not import listing.'
      );
    } finally {
      setImportingFromSS(false);
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      loadUnits(selectedProperty.id);
    }
  }, [selectedProperty]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const response = await api.get('/cleaner/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Load properties error:', error);
      Alert.alert('Error', 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async (propertyId) => {
    setLoading(true);
    try {
      const response = await api.get(`/cleaner/properties/${propertyId}/units`);
      console.log('📦 Loaded units:', JSON.stringify(response.data, null, 2));
      setUnits(response.data);

      // Auto-select if there's only one unit
      if (response.data.length === 1) {
        console.log('✅ Auto-selecting single unit:', response.data[0].name);
        setSelectedUnit(response.data[0]);
      }
    } catch (error) {
      console.error('Load units error:', error);
      Alert.alert('Error', 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!propertyName || !propertyAddress || !unitName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/cleaner/custom-property', {
        property_name: propertyName,
        property_address: propertyAddress,
        unit_name: unitName,
        unit_notes: unitNotes,
        securestay_listing_id: importedListingId || null,
        rooms: importedRooms.length > 0 ? importedRooms : undefined,
      });

      const successMsg =
        importedRooms.length > 0
          ? `Property created with ${importedRooms.length} rooms. You can start an inspection from "Select Property".`
          : 'Property created! Inspection will be done when the owner adds rooms.';

      Alert.alert('Success', successMsg, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Create custom property error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreset = async () => {
    if (!selectedUnit) {
      Alert.alert('Error', 'Please select a unit');
      return;
    }

    console.log('🏠 Selected unit:', selectedUnit.name);
    console.log('📍 Rooms count:', selectedUnit.rooms?.length || 0);
    console.log('📋 Rooms data:', JSON.stringify(selectedUnit.rooms, null, 2));

    setLoading(true);
    try {
      const inspectionResponse = await api.post('/cleaner/inspections', {
        unit_id: selectedUnit.id,
      });

      const roomsToPass = selectedUnit.rooms || [];
      console.log('✈️ Navigating with rooms:', roomsToPass.length);

      navigation.navigate('CaptureMedia', {
        inspectionId: inspectionResponse.data.id,
        propertyName: selectedProperty.name,
        unitName: selectedUnit.name,
        unitId: selectedUnit.id, // For valuable items
        rooms: roomsToPass,
      });
    } catch (error) {
      console.error('Create preset inspection error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create inspection';
      Alert.alert(
        'Inspection Not Ready',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Render gradient header component
  const renderGradientHeader = (title, subtitle) => (
    <LinearGradient
      colors={colors.gradients.dashboardHeader}
      locations={colors.gradients.dashboardHeaderLocations}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.headerWrapper, { paddingTop: insets.top }]}
    >
      {/* Decorative element */}
      <View style={styles.decorativeCircle}>
        <Ionicons name="clipboard" size={70} color={colors.decorative.icon1} />
      </View>
      <View style={{ width: '100%' }}>
        <View style={styles.headerGradient}>
          <TouchableOpacity
            onPress={() => mode ? setMode(null) : navigation.goBack()}
            style={styles.headerBackButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerIconWrapper}>
            <View style={styles.headerIconInner}>
              <Ionicons name="clipboard" size={22} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  if (!mode) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderGradientHeader('Create Inspection', 'Start a new property inspection')}

        <ScrollView style={styles.modeContainer} contentContainerStyle={styles.modeContent}>
          <View style={styles.welcomeSection}>
            <Text style={styles.subtitle}>How would you like to create the inspection?</Text>
            <Text style={styles.subtitleHint}>Choose an option below to get started</Text>
          </View>

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode('preset')}
            activeOpacity={0.8}
          >
            <View style={styles.modeIconContainer}>
              <Ionicons name="business" size={28} color="#215EEA" />
            </View>
            <Text style={styles.modeButtonTitle}>Select Property</Text>
            <Text style={styles.modeButtonDescription}>
              Choose from your assigned properties
            </Text>
            <View style={styles.modeArrow}>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode('custom')}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIconContainer, styles.modeIconContainerSecondary]}>
              <Ionicons name="create-outline" size={28} color="#215EEA" />
            </View>
            <Text style={styles.modeButtonTitle}>Custom Property</Text>
            <Text style={styles.modeButtonDescription}>
              Enter property details manually
            </Text>
            <View style={styles.modeArrow}>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (mode === 'preset') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderGradientHeader('Select Property', selectedProperty ? selectedProperty.name : 'Choose a property')}

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#215EEA" />
              <Text style={styles.loaderText}>Loading properties...</Text>
            </View>
          ) : !selectedProperty ? (
            <View>
              {FEATURE_FLAGS.ENABLE_SECURESTAY && (
                <TouchableOpacity
                  style={[
                    styles.ssImportButton,
                    !secureStayConnected && styles.ssImportButtonDisabled,
                  ]}
                  onPress={() =>
                    secureStayConnected ? setShowSSPicker(true) : promptConnectSecureStay()
                  }
                  activeOpacity={0.85}
                  disabled={importingFromSS}
                >
                  <View style={styles.ssImportIcon}>
                    {importingFromSS ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons
                        name={secureStayConnected ? 'shield-checkmark' : 'link-outline'}
                        size={22}
                        color="#fff"
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ssImportTitle}>
                      {!secureStayConnected
                        ? 'Connect SecureStay'
                        : importingFromSS
                        ? 'Importing…'
                        : '+ Add property from SecureStay'}
                    </Text>
                    <Text style={styles.ssImportSubtitle} numberOfLines={2}>
                      {!secureStayConnected
                        ? 'Connect in Settings to add new properties from your listings'
                        : 'Auto-create the property + rooms in one tap'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              )}

              <View style={styles.sectionHeader}>
                <Ionicons name="business-outline" size={20} color="#215EEA" />
                <Text style={styles.sectionHeaderText}>Choose a property</Text>
              </View>
              {properties.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="business-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyStateText}>No properties available</Text>
                  <Text style={styles.emptyStateSubtext}>Contact your administrator or add one from SecureStay above.</Text>
                </View>
              ) : (
                properties.map((property) => (
                  <TouchableOpacity
                    key={property.id}
                    style={styles.listItem}
                    onPress={() => setSelectedProperty(property)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listItemIcon}>
                      <Ionicons name="business" size={20} color="#215EEA" />
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{property.name}</Text>
                      <Text style={styles.listItemSubtitle}>{property.address}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            <View>
              <View style={styles.breadcrumb}>
                <TouchableOpacity onPress={() => setSelectedProperty(null)} style={styles.breadcrumbItem}>
                  <Text style={styles.breadcrumbText}>{selectedProperty.name}</Text>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                <Text style={styles.breadcrumbActive}>Select Unit</Text>
              </View>

              {units.length > 1 && (
                <View style={styles.sectionHeader}>
                  <Ionicons name="home-outline" size={20} color="#215EEA" />
                  <Text style={styles.sectionHeaderText}>Choose a unit</Text>
                </View>
              )}

              {units.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="home-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyStateText}>No units available</Text>
                  <Text style={styles.emptyStateSubtext}>This property has no units yet</Text>
                </View>
              ) : (
                units.map((unit) => (
                  <TouchableOpacity
                    key={unit.id}
                    style={[
                      styles.listItem,
                      selectedUnit?.id === unit.id && styles.listItemSelected,
                    ]}
                    onPress={() => setSelectedUnit(unit)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.listItemIcon,
                      selectedUnit?.id === unit.id && styles.listItemIconSelected
                    ]}>
                      <Ionicons
                        name={selectedUnit?.id === unit.id ? "home" : "home-outline"}
                        size={20}
                        color={selectedUnit?.id === unit.id ? "#215EEA" : "#215EEA"}
                      />
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={[
                        styles.listItemTitle,
                        selectedUnit?.id === unit.id && styles.listItemTitleSelected
                      ]}>
                        {unit.name}
                      </Text>
                      {unit.notes && (
                        <Text style={[
                          styles.listItemSubtitle,
                          selectedUnit?.id === unit.id && styles.listItemSubtitleSelected
                        ]}>
                          {unit.notes}
                        </Text>
                      )}
                    </View>
                    {selectedUnit?.id === unit.id && (
                      <View style={styles.checkmarkContainer}>
                        <Ionicons name="checkmark-circle" size={24} color="#33D39C" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}

              {selectedUnit && selectedUnit.rooms && selectedUnit.rooms.length > 0 && (
                <View style={styles.roomTipsSection}>
                  <View style={styles.roomTipsHeader}>
                    <View style={styles.roomTipsIconContainer}>
                      <Ionicons name="information-circle" size={18} color="#215EEA" />
                    </View>
                    <View style={styles.roomTipsHeaderText}>
                      <Text style={styles.roomTipsTitle}>Room Guidelines</Text>
                      <Text style={styles.roomTipsCount}>{selectedUnit.rooms.length} rooms</Text>
                    </View>
                  </View>
                  <Text style={styles.roomTipsSubtitle}>
                    Follow these guidelines when inspecting each room:
                  </Text>
                  {selectedUnit.rooms.map((room) => (
                    room.tips && (
                      <View key={room.id} style={styles.roomTipCard}>
                        <View style={styles.roomTipHeader}>
                          <Ionicons name="bed-outline" size={14} color="#6B7280" />
                          <Text style={styles.roomTipName}>{room.name}</Text>
                        </View>
                        <Text style={styles.roomTipText}>{room.tips}</Text>
                      </View>
                    )
                  ))}
                </View>
              )}

              {selectedUnit && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, !selectedUnit && styles.buttonDisabled]}
                  onPress={handleCreatePreset}
                  disabled={!selectedUnit || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={20} color="#FFFFFF" />
                      <Text style={styles.buttonText}>Start Inspection</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        <SecureStayListingPicker
          visible={showSSPicker}
          onClose={() => setShowSSPicker(false)}
          onPicked={async (template) => {
            setShowSSPicker(false);
            await handlePresetSecureStayImport(template);
          }}
        />
      </View>
    );
  }

  // Custom mode
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderGradientHeader('Custom Property', 'Enter property details')}

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight + 20 }]}
      >
        {FEATURE_FLAGS.ENABLE_SECURESTAY && (
          <TouchableOpacity
            style={[
              styles.ssImportButton,
              !secureStayConnected && styles.ssImportButtonDisabled,
            ]}
            onPress={() =>
              secureStayConnected ? setShowSSPicker(true) : promptConnectSecureStay()
            }
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
                  : importedHeadline
                  ? 'Imported from SecureStay'
                  : 'Import from SecureStay'}
              </Text>
              <Text style={styles.ssImportSubtitle} numberOfLines={2}>
                {!secureStayConnected
                  ? 'Connect in Settings to auto-fill name, address and rooms'
                  : importedHeadline
                  ? `${importedHeadline} · tap to change`
                  : 'Search your listings and pre-fill everything'}
              </Text>
            </View>
            {importedHeadline ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  clearImport();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={22} color="#fff" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderIconContainer}>
            <Ionicons name="business-outline" size={20} color="#215EEA" />
          </View>
          <Text style={styles.sectionHeaderText}>Property Details</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Property Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Beach House Rental"
            placeholderTextColor="#94A3B8"
            value={propertyName}
            onChangeText={setPropertyName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Property Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="e.g., 123 Ocean Drive, Miami, FL"
            placeholderTextColor="#94A3B8"
            value={propertyAddress}
            onChangeText={setPropertyAddress}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderIconContainer}>
            <Ionicons name="home-outline" size={20} color="#215EEA" />
          </View>
          <Text style={styles.sectionHeaderText}>Unit Details</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Unit Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Unit 101, Main Floor"
            placeholderTextColor="#94A3B8"
            value={unitName}
            onChangeText={setUnitName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes <Text style={styles.optional}>(Optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional information about the unit..."
            placeholderTextColor="#94A3B8"
            value={unitNotes}
            onChangeText={setUnitNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        {importedRooms.length > 0 && (
          <View style={styles.importedRoomsBox}>
            <View style={styles.importedRoomsHeader}>
              <Ionicons name="bed-outline" size={16} color="#215EEA" />
              <Text style={styles.importedRoomsTitle}>
                Rooms from SecureStay ({importedRooms.length})
              </Text>
            </View>
            {importedRooms.map((r, idx) => (
              <Text key={`${r.name}-${idx}`} style={styles.importedRoomLine}>
                • {r.name}
                {r.room_type ? `  ·  ${r.room_type}` : ''}
              </Text>
            ))}
            <Text style={styles.importedRoomsHint}>
              These will be created with the property. You can adjust them after.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            (!propertyName || !propertyAddress || !unitName) && styles.buttonDisabled,
          ]}
          onPress={handleCreateCustom}
          disabled={!propertyName || !propertyAddress || !unitName || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {importedRooms.length > 0 ? 'Create Property + Rooms' : 'Create Property'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <SecureStayListingPicker
        visible={showSSPicker}
        onClose={() => setShowSSPicker(false)}
        onPicked={(template) => {
          applySecureStayTemplate(template);
          setShowSSPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Gradient Header Styles
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
  // Legacy styles (kept for compatibility)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  modeContainer: {
    flex: 1,
  },
  modeContent: {
    padding: 20,
    paddingTop: 32,
  },
  welcomeSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeIconContainerSecondary: {
    backgroundColor: '#EFF6FF',
  },
  modeButtonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  modeButtonDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modeArrow: {
    position: 'absolute',
    right: 20,
    top: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    gap: 8,
  },
  sectionHeaderIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  inputMultiline: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  textArea: {
    height: 120,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#215EEA',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
  importedRoomsBox: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0E7FF',
    padding: 14,
    marginBottom: 16,
  },
  importedRoomsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  importedRoomsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#215EEA',
  },
  importedRoomLine: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 20,
  },
  importedRoomsHint: {
    marginTop: 8,
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  loader: {
    marginTop: 50,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listItemSelected: {
    borderLeftWidth: 4,
    borderLeftColor: '#215EEA',
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemIconSelected: {
    backgroundColor: '#DBEAFE',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  listItemTitleSelected: {
    color: '#1F2937',
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  listItemSubtitleSelected: {
    color: '#6B7280',
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  breadcrumbItem: {
    paddingVertical: 4,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  breadcrumbActive: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roomTipsSection: {
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roomTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomTipsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomTipsHeaderText: {
    marginLeft: 10,
    flex: 1,
  },
  roomTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  roomTipsCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  roomTipsSubtitle: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  roomTipCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#215EEA',
  },
  roomTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  roomTipName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  roomTipText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
});


