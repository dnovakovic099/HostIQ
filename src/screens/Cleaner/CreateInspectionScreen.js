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
import api from '../../api/client';

export default function CreateInspectionScreen({ navigation }) {
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
      const customResponse = await api.post('/cleaner/custom-property', {
        property_name: propertyName,
        property_address: propertyAddress,
        unit_name: unitName,
        unit_notes: unitNotes,
      });

      const unitId = customResponse.data.unit.id;

      // Create inspection
      const inspectionResponse = await api.post('/cleaner/inspections', {
        unit_id: unitId,
      });

      Alert.alert(
        'Success',
        'Inspection created! Now you can capture photos and videos.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('CaptureMedia', {
                inspectionId: inspectionResponse.data.id,
                propertyName: propertyName,
                unitName: unitName,
              }),
          },
        ]
      );
    } catch (error) {
      console.error('Create custom inspection error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create inspection');
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
        rooms: roomsToPass,
      });
    } catch (error) {
      console.error('Create preset inspection error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create inspection');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#60A5FA" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Inspection</Text>
        </View>

        <View style={styles.modeContainer}>
          <Text style={styles.subtitle}>How would you like to create the inspection?</Text>

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode('preset')}
          >
            <Ionicons name="business" size={48} color="#3B82F6" />
            <Text style={styles.modeButtonTitle}>Select Property</Text>
            <Text style={styles.modeButtonDescription}>
              Choose from your assigned properties
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMode('custom')}
          >
            <Ionicons name="create" size={48} color="#3B82F6" />
            <Text style={styles.modeButtonTitle}>Custom Property</Text>
            <Text style={styles.modeButtonDescription}>
              Enter property details manually
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'preset') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#60A5FA" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Property</Text>
        </View>

        <ScrollView style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
          ) : !selectedProperty ? (
            <View>
              <Text style={styles.label}>Choose a property:</Text>
              {properties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={styles.listItem}
                  onPress={() => setSelectedProperty(property)}
                >
                  <Ionicons name="business" size={24} color="#3B82F6" />
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{property.name}</Text>
                    <Text style={styles.listItemSubtitle}>{property.address}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#475569" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              {units.length > 1 && (
                <Text style={styles.label}>Choose a unit at {selectedProperty.name}:</Text>
              )}
              {units.map((unit) => (
                <TouchableOpacity
                  key={unit.id}
                  style={[
                    styles.listItem,
                    selectedUnit?.id === unit.id && styles.listItemSelected,
                  ]}
                  onPress={() => setSelectedUnit(unit)}
                >
                  <Ionicons name="home" size={24} color="#3B82F6" />
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{unit.name}</Text>
                    {unit.notes && (
                      <Text style={styles.listItemSubtitle}>{unit.notes}</Text>
                    )}
                  </View>
                  {selectedUnit?.id === unit.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}

              {selectedUnit && (
                <View style={styles.debugSection}>
                  <Text style={styles.debugText}>
                    🔍 Debug: Rooms found: {selectedUnit.rooms?.length || 0}
                  </Text>
                </View>
              )}

              {selectedUnit && selectedUnit.rooms && selectedUnit.rooms.length > 0 && (
                <View style={styles.roomTipsSection}>
                  <View style={styles.roomTipsHeader}>
                    <Ionicons name="information-circle" size={20} color="#60A5FA" />
                    <Text style={styles.roomTipsTitle}>Room Tips ({selectedUnit.rooms.length} rooms)</Text>
                  </View>
                  <Text style={styles.roomTipsSubtitle}>
                    Follow these guidelines when inspecting each room:
                  </Text>
                  {selectedUnit.rooms.map((room) => (
                    room.tips && (
                      <View key={room.id} style={styles.roomTipCard}>
                        <Text style={styles.roomTipName}>{room.name}</Text>
                        <Text style={styles.roomTipText}>{room.tips}</Text>
                      </View>
                    )
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, !selectedUnit && styles.buttonDisabled]}
                onPress={handleCreatePreset}
                disabled={!selectedUnit || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Inspection</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Custom mode
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMode(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#60A5FA" />
        </TouchableOpacity>
        <Text style={styles.title}>Custom Property</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Property Details</Text>

        <Text style={styles.label}>Property Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Beach House Rental"
          value={propertyName}
          onChangeText={setPropertyName}
        />

        <Text style={styles.label}>Property Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 123 Ocean Drive, Miami, FL"
          value={propertyAddress}
          onChangeText={setPropertyAddress}
          multiline
        />

        <Text style={styles.sectionTitle}>Unit Details</Text>

        <Text style={styles.label}>Unit Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Unit 101, Main Floor"
          value={unitName}
          onChangeText={setUnitName}
        />

        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Additional information about the unit..."
          value={unitNotes}
          onChangeText={setUnitNotes}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!propertyName || !propertyAddress || !unitName) && styles.buttonDisabled,
          ]}
          onPress={handleCreateCustom}
          disabled={!propertyName || !propertyAddress || !unitName || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Inspection</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark slate background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
    backgroundColor: '#1E293B',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  modeContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 30,
    textAlign: 'center',
  },
  modeButton: {
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 16,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modeButtonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginTop: 15,
    marginBottom: 5,
  },
  modeButtonDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginTop: 10,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
  },
  textArea: {
    height: 100,
    paddingTop: 15,
    textAlignVertical: 'top',
  },
  button: {
    height: 50,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#475569',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 50,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  listItemSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 2,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 15,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  roomTipsSection: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  roomTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomTipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#60A5FA',
    marginLeft: 8,
  },
  roomTipsSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  roomTipCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  roomTipName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 6,
  },
  roomTipText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  debugSection: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    padding: 12,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FBBF24',
  },
  debugText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FCD34D',
    textAlign: 'center',
  },
});


