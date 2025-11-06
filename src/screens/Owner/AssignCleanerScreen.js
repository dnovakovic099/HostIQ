import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../api/client';

export default function AssignCleanerScreen({ route, navigation }) {
  const { cleanerId, cleanerName } = route.params;
  const [properties, setProperties] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/owner/properties');
      console.log('📦 Raw API response:', response.data);
      
      // API returns { manualProperties: [...], pmsProperties: [...] }
      const manualProperties = response.data.manualProperties || [];
      const pmsProperties = response.data.pmsProperties || [];
      const allProperties = [...manualProperties, ...pmsProperties];
      
      console.log('📦 Manual Properties:', manualProperties.length);
      console.log('📦 PMS Properties:', pmsProperties.length);
      console.log('📦 Total Properties:', allProperties.length);
      
      if (allProperties.length > 0) {
        console.log('📦 First property:', JSON.stringify(allProperties[0], null, 2));
      }
      
      setProperties(allProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert('Error', 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const toggleUnitSelection = (unitId) => {
    if (selectedUnits.includes(unitId)) {
      setSelectedUnits(selectedUnits.filter((id) => id !== unitId));
    } else {
      setSelectedUnits([...selectedUnits, unitId]);
    }
  };

  const handleAssign = async () => {
    if (selectedUnits.length === 0) {
      Alert.alert('Error', 'Please select at least one unit');
      return;
    }

    setAssigning(true);
    try {
      await api.post('/owner/assignments/bulk', {
        cleaner_id: cleanerId,
        unit_ids: selectedUnits,
        due_at: dueDate.toISOString(),
      });

      Alert.alert('Success', 'Assignments created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Assignment error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create assignments');
    } finally {
      setAssigning(false);
    }
  };

  const renderProperty = ({ item }) => {
    const units = item.units || [];
    
    return (
      <View style={styles.propertyCard}>
        <Text style={styles.propertyName}>{item.name}</Text>
        {item.address && <Text style={styles.propertyAddress}>{item.address}</Text>}

        {units.length === 0 ? (
          <View style={styles.noUnitsContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#F97316" />
            <Text style={styles.noUnitsText}>
              No units in this property. Add units first.
            </Text>
          </View>
        ) : (
          units.map((unit) => (
            <TouchableOpacity
              key={unit.id}
              style={[
                styles.unitItem,
                selectedUnits.includes(unit.id) && styles.unitItemSelected,
              ]}
              onPress={() => toggleUnitSelection(unit.id)}
            >
              <View style={styles.unitInfo}>
                <Text style={styles.unitName}>{unit.name}</Text>
                {unit.notes && (
                  <Text style={styles.unitNotes} numberOfLines={1}>
                    {unit.notes}
                  </Text>
                )}
              </View>
              <Ionicons
                name={
                  selectedUnits.includes(unit.id)
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={24}
                color={selectedUnits.includes(unit.id) ? '#4A90E2' : '#ccc'}
              />
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assign to {cleanerName}</Text>
        <Text style={styles.headerSubtitle}>
          Select units and set due date
        </Text>
      </View>

      <View style={styles.dateSelector}>
        <Text style={styles.dateLabel}>Due Date & Time:</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#4A90E2" />
          <Text style={styles.dateText}>
            {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dueDate}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDueDate(selectedDate);
            }
          }}
        />
      )}

      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="home-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No properties yet</Text>
            <Text style={styles.emptySubtext}>
              Add a property first before assigning cleaners
            </Text>
            <TouchableOpacity
              style={styles.addPropertyButton}
              onPress={() => navigation.navigate('Properties')}
            >
              <Ionicons name="add-circle" size={20} color="#4A90E2" />
              <Text style={styles.addPropertyButtonText}>Go to Properties</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {selectedUnits.length} units selected
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.assignButton,
            (assigning || selectedUnits.length === 0) && styles.buttonDisabled,
          ]}
          onPress={handleAssign}
          disabled={assigning || selectedUnits.length === 0}
        >
          {assigning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.assignButtonText}>Create Assignments</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  dateSelector: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  list: {
    padding: 15,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  unitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  unitItemSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  unitInfo: {
    flex: 1,
  },
  unitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  unitNotes: {
    fontSize: 12,
    color: '#999',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  addPropertyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  noUnitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    gap: 8,
  },
  noUnitsText: {
    flex: 1,
    fontSize: 14,
    color: '#F97316',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryRow: {
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  assignButton: {
    height: 50,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#93BFED',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});



