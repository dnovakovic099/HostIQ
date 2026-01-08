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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';

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
  
  // Tab bar height: 60px (TAB_BAR_HEIGHT) + 50px (dipDepth) + safe area bottom
  const tabBarHeight = 110 + insets.bottom;

  useEffect(() => {
    if (mode === 'preset') {
      loadProperties();
    }
  }, [mode]);

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
      // Create custom property and unit
      await api.post('/cleaner/custom-property', {
        property_name: propertyName,
        property_address: propertyAddress,
        unit_name: unitName,
        unit_notes: unitNotes,
      });

      Alert.alert(
        'Success',
        'Property created! Inspection will be done when the owner adds rooms.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
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

  if (!mode) {
    return (
      <SafeAreaView style={styles.container}>
       

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
                      <Ionicons name="business" size={28} color="#3B82F6" />
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
                      <Ionicons name="create-outline" size={28} color="#3B82F6"  />
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
      </SafeAreaView>
    );
  }

  if (mode === 'preset') {
    return (
      <SafeAreaView style={styles.container}>
       

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loaderText}>Loading properties...</Text>
            </View>
          ) : !selectedProperty ? (
            <View>
              <View style={styles.sectionHeader}>
                <Ionicons name="business-outline" size={20} color="#3B82F6" />
                <Text style={styles.sectionHeaderText}>Choose a property</Text>
              </View>
              {properties.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="business-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyStateText}>No properties available</Text>
                  <Text style={styles.emptyStateSubtext}>Contact your administrator to get assigned to properties</Text>
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
                      <Ionicons name="business" size={20} color="#3B82F6" />
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
                  <Ionicons name="home-outline" size={20} color="#3B82F6" />
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
                        color={selectedUnit?.id === unit.id ? "#3B82F6" : "#3B82F6"} 
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
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}

              {selectedUnit && selectedUnit.rooms && selectedUnit.rooms.length > 0 && (
                <View style={styles.roomTipsSection}>
                  <View style={styles.roomTipsHeader}>
                    <View style={styles.roomTipsIconContainer}>
                      <Ionicons name="information-circle" size={18} color="#3B82F6" />
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
      </SafeAreaView>
    );
  }

  // Custom mode
  return (
    <SafeAreaView style={styles.container}>
      

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight + 20 }]}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderIconContainer}>
            <Ionicons name="business-outline" size={20} color="#3B82F6" />
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
            <Ionicons name="home-outline" size={20} color="#3B82F6" />
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
              <Text style={styles.buttonText}>Create Property</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
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
    backgroundColor: '#3B82F6',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
    borderLeftColor: '#3B82F6',
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
    borderLeftColor: '#3B82F6',
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


