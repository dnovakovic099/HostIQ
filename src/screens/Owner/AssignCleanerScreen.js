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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../api/client';

const COLORS = {
  background: '#F8FAFC',
  backgroundGradientStart: '#F1F5F9',
  backgroundGradientEnd: '#E0E7FF',
  card: '#FFFFFF',
  cardBorder: 'rgba(15, 23, 42, 0.08)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#3B82F6',
  accentDark: '#2563EB',
  accentLight: '#60A5FA',
  accentSoft: '#EFF6FF',
  accentGradientStart: '#60A5FA',
  accentGradientEnd: '#3B82F6',
  success: '#10B981',
  successSoft: '#D1FAE5',
  danger: '#EF4444',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  divider: '#E2E8F0',
  shadow: 'rgba(59, 130, 246, 0.15)',
  shadowDark: 'rgba(15, 23, 42, 0.1)',
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
        <View style={styles.propertyHeader}>
          <View style={styles.propertyIconWrapper}>
            <Ionicons name="business" size={20} color={COLORS.accent} />
          </View>
          <View style={styles.propertyHeaderText}>
            <Text style={styles.propertyName}>{item.name}</Text>
            {item.address && <Text style={styles.propertyAddress}>{item.address}</Text>}
          </View>
          <View style={styles.unitCountBadge}>
            <Text style={styles.unitCountText}>{units.length}</Text>
          </View>
        </View>

        <View style={styles.unitsList}>
          {units.length === 0 ? (
            <View style={styles.noUnitsContainer}>
              <View style={styles.noUnitsIconWrapper}>
                <Ionicons name="alert-circle" size={22} color={COLORS.warning} />
              </View>
              <View style={styles.noUnitsTextWrapper}>
                <Text style={styles.noUnitsTitle}>No units available</Text>
                <Text style={styles.noUnitsText}>
                  Add units to this property first
                </Text>
              </View>
            </View>
          ) : (
            units.map((unit, index) => {
              const isSelected = selectedUnits.includes(unit.id);
              return (
                <TouchableOpacity
                  key={unit.id}
                  style={[
                    styles.unitItem,
                    isSelected && styles.unitItemSelected,
                    index === units.length - 1 && styles.unitItemLast,
                  ]}
                  onPress={() => toggleUnitSelection(unit.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.unitCheckbox}>
                    {isSelected ? (
                      <LinearGradient
                        colors={[COLORS.accentGradientStart, COLORS.accentGradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.checkboxSelected}
                      >
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </LinearGradient>
                    ) : (
                      <View style={styles.checkboxUnselected} />
                    )}
                  </View>
                  <View style={styles.unitInfo}>
                    <Text style={[styles.unitName, isSelected && styles.unitNameSelected]}>
                      {unit.name}
                    </Text>
                    {unit.notes && (
                      <Text style={styles.unitNotes} numberOfLines={1}>
                        {unit.notes}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
            animationType="slide"
            visible={showDatePicker}
            onRequestClose={() => setShowDatePicker(false)}
          >
            <TouchableOpacity 
              style={styles.pickerOverlay}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            >
              <View style={styles.pickerContainer} onStartShouldSetResponder={() => true}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Select Date & Time</Text>
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
            </TouchableOpacity>
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
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <LinearGradient
              colors={['#DBEAFE', '#BFDBFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerCard}
            >
              <View style={styles.headerIconWrapper}>
                <View style={styles.headerIconInner}>
                  <Ionicons name="person" size={28} color={COLORS.accent} />
                </View>
              </View>
              <View style={styles.headerTextWrapper}>
                <Text style={styles.headerTitle}>Assign to {cleanerName}</Text>
                <Text style={styles.headerSubtitle}>
                  Select units for upcoming cleanings
                </Text>
              </View>
             
            </LinearGradient>

            <View style={styles.dateCard}>
              <View style={styles.dateLabelRow}>
                <Ionicons name="calendar" size={18} color={COLORS.accent} />
                <Text style={styles.dateLabel}>Due date & time</Text>
              </View>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dateButtonContent}>
                  <View style={styles.dateIconWrapper}>
                    <Ionicons name="time-outline" size={22} color={COLORS.accent} />
                  </View>
                  <View style={styles.dateTextWrapper}>
                    <Text style={styles.dateTextPrimary}>
                      {dueDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </Text>
                    <Text style={styles.dateTextSecondary}>
                      {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Properties & Units</Text>
              <Text style={styles.sectionSubtitle}>
                Tap units to assign cleaning tasks
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrapper}>
              <LinearGradient
                colors={['#DBEAFE', COLORS.accentSoft]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconGradient}
              >
                <Ionicons name="home-outline" size={48} color={COLORS.accent} />
              </LinearGradient>
            </View>
            <Text style={styles.emptyText}>No properties yet</Text>
            <Text style={styles.emptySubtext}>
              Add a property first before assigning cleaners
            </Text>
            <TouchableOpacity
              style={styles.addPropertyButton}
              onPress={() => navigation.navigate('Properties')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.accentGradientStart, COLORS.accentGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addPropertyButtonGradient}
              >
                <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
                <Text style={styles.addPropertyButtonText}>Go to Properties</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.assignButton,
            (assigning || selectedUnits.length === 0) && styles.buttonDisabled,
          ]}
          onPress={handleAssign}
          disabled={assigning || selectedUnits.length === 0}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              assigning || selectedUnits.length === 0
                ? ['#CBD5E1', '#94A3B8']
                : [COLORS.accentGradientStart, COLORS.accentGradientEnd]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.assignButtonGradient}
          >
            {assigning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
                <Text style={styles.assignButtonText}>
                  Create Assignments ({selectedUnits.length})
                </Text>
              </>
            )}
          </LinearGradient>
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
    backgroundColor: COLORS.background,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerIconWrapper: {
    marginRight: 14,
  },
  headerIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  headerDecoration: {
    marginLeft: 8,
  },
  dateCard: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateButton: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  dateIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateTextWrapper: {
    flex: 1,
  },
  dateTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  dateTextSecondary: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  propertyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  propertyIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  propertyHeaderText: {
    flex: 1,
  },
  propertyName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  propertyAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  unitCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  unitCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  unitsList: {
    gap: 10,
  },
  unitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unitItemSelected: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  unitItemLast: {
    marginBottom: 0,
  },
  unitCheckbox: {
    marginRight: 12,
  },
  checkboxSelected: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxUnselected: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.card,
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
  unitNameSelected: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  unitNotes: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  selectedIndicator: {
    marginLeft: 8,
  },
  noUnitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningSoft,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noUnitsIconWrapper: {
    marginRight: 10,
  },
  noUnitsTextWrapper: {
    flex: 1,
  },
  noUnitsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: 2,
  },
  noUnitsText: {
    fontSize: 13,
    color: COLORS.warning,
    opacity: 0.8,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyText: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  addPropertyButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  addPropertyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 10,
  },
  addPropertyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footer: {
    backgroundColor: COLORS.card,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  assignButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  assignButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  assignButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pickerCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
    minWidth: 60,
  },
  pickerDone: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  picker: {
    marginTop: 8,
  },
});

