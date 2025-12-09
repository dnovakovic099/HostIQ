import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../api/client';

const COLORS = {
  background: '#F1F5F9',
  card: '#FFFFFF',
  cardBorder: 'rgba(15, 23, 42, 0.06)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  accent: '#3B82F6',
  accentSoft: '#EFF6FF',
  danger: '#EF4444',
  warning: '#F97316',
  warningSoft: '#FFF7ED',
  divider: '#E2E8F0',
};

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
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            transparent
            animationType="fade"
            visible={showDatePicker}
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dueDate}
                  mode="datetime"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDueDate(selectedDate);
                    }
                  }}
                  style={styles.picker}
                />
              </View>
            </View>
          </Modal>
        ) : (
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
        )
      )}

      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.headerCard}>
              <View style={styles.headerIconWrapper}>
                <Ionicons name="person-circle" size={36} color={COLORS.accent} />
              </View>
              <View style={styles.headerTextWrapper}>
                <Text style={styles.headerTitle}>Assign to {cleanerName}</Text>
                <Text style={styles.headerSubtitle}>
                  Select units for upcoming cleanings
                </Text>
              </View>
            </View>

            <View style={styles.dateCard}>
              <Text style={styles.dateLabel}>Due date & time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
                <Text style={styles.dateText}>
                  {dueDate.toLocaleDateString()} • {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="home-outline" size={40} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyText}>No properties yet</Text>
            <Text style={styles.emptySubtext}>
              Add a property first before assigning cleaners
            </Text>
            <TouchableOpacity
              style={styles.addPropertyButton}
              onPress={() => navigation.navigate('Properties')}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.accent} />
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
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeader: {
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 12,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  dateCard: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 10,
  },
  dateText: {
    fontSize: 15,
    color: COLORS.accent,
    marginLeft: 10,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  propertyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  unitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 8,
  },
  unitItemSelected: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  unitInfo: {
    flex: 1,
  },
  unitName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  unitNotes: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: 4,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    marginTop: 20,
    gap: 6,
  },
  addPropertyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
  },
  noUnitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.warningSoft,
    borderRadius: 10,
    gap: 8,
  },
  noUnitsText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.warning,
  },
  footer: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
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
    backgroundColor: COLORS.accent,
    borderRadius: 12,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  pickerCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  pickerDone: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
  },
  picker: {
    marginTop: 4,
  },
});

