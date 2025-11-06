import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
// import * as DocumentPicker from 'expo-document-picker';
import api from '../../api/client';

export default function PropertiesScreen({ navigation }) {
  const [properties, setProperties] = useState([]);
  const [pmsProperties, setPmsProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingPMSProperty, setEditingPMSProperty] = useState(null);
  const [pmsRoomCount, setPmsRoomCount] = useState('');
  const [pmsNotes, setPmsNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [])
  );

  const fetchProperties = async () => {
    try {
      const response = await api.get('/owner/properties');
      
      // Handle new API format with separated manual and PMS properties
      if (response.data.manualProperties) {
        console.log('📋 Manual properties fetched:', response.data.manualProperties.length);
        console.log('🔗 PMS properties fetched:', response.data.pmsProperties?.length || 0);
        
        response.data.manualProperties.forEach(prop => {
          console.log(`   ${prop.name}:`);
          console.log(`     - rating: ${prop.rating}`);
          console.log(`     - hasLowRating: ${prop.hasLowRating}`);
        });
        
        setProperties(response.data.manualProperties);
        setPmsProperties(response.data.pmsProperties || []);
      } else {
        // Fallback for old API format
        console.log('📋 Properties fetched:', response.data.length);
        setProperties(response.data);
        setPmsProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      Alert.alert('Error', 'Failed to load properties');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProperties();
  };

  const handleDownloadTemplate = async () => {
    try {
      const baseUrl = api.defaults.baseURL || 'https://roomify-server-production.up.railway.app';
      const templateUrl = `${baseUrl}/api/owner/properties/csv-template`;
      
      Alert.alert(
        'Download Template',
        'Opening template in browser. Save the file and fill it out with your properties.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => Linking.openURL(templateUrl) }
        ]
      );
    } catch (error) {
      console.error('Error downloading template:', error);
      Alert.alert('Error', 'Failed to download template');
    }
  };

  const handleEditPMSProperty = (property) => {
    navigation.navigate('PropertyDetail', { 
      propertyId: property.id,
      isPMS: true 
    });
  };

  const handleSavePMSProperty = async () => {
    try {
      setSaving(true);
      await api.put(`/pms/properties/${editingPMSProperty.id}`, {
        room_count: pmsRoomCount ? parseInt(pmsRoomCount) : null,
        notes: pmsNotes || null
      });

      Alert.alert('Success', 'Property updated successfully');
      setEditingPMSProperty(null);
      fetchProperties();
    } catch (error) {
      console.error('Error updating PMS property:', error);
      Alert.alert('Error', 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePMSProperty = (property) => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to delete "${property.name}"? This will only remove it from your view, not from ${property.pmsProvider}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/pms/properties/${property.id}`);
              Alert.alert('Success', 'Property deleted successfully');
              fetchProperties();
            } catch (error) {
              console.error('Error deleting PMS property:', error);
              Alert.alert('Error', 'Failed to delete property');
            }
          }
        }
      ]
    );
  };

  const handleUploadCSV = async () => {
    Alert.alert('Coming Soon', 'CSV upload will be available in the next update');
    // Temporarily disabled due to native module issue
    // try {
    //   const result = await DocumentPicker.getDocumentAsync({
    //     type: 'text/csv',
    //     copyToCacheDirectory: true
    //   });

    //   if (result.canceled) {
    //     return;
    //   }

    //   const file = result.assets[0];
      
    //   setUploading(true);

    //   // Create FormData
    //   const formData = new FormData();
    //   formData.append('csv', {
    //     uri: file.uri,
    //     name: file.name,
    //     type: file.mimeType || 'text/csv'
    //   });

    //   const response = await api.post('/owner/properties/bulk-upload', formData, {
    //     headers: {
    //       'Content-Type': 'multipart/form-data',
    //     },
    //   });

    //   const { created, failed, created_properties, failed_properties } = response.data;

    //   let message = `Successfully created ${created} ${created === 1 ? 'property' : 'properties'}`;
    //   if (failed > 0) {
    //     message += `\n\nFailed: ${failed}\n${failed_properties.map(f => `- ${f.name}: ${f.error}`).join('\n')}`;
    //   }

    //   Alert.alert(
    //     'Upload Complete',
    //     message,
    //     [{ text: 'OK', onPress: () => fetchProperties() }]
    //   );
    // } catch (error) {
    //   console.error('Error uploading CSV:', error);
    //   Alert.alert(
    //     'Upload Failed',
    //     error.response?.data?.error || error.message || 'Failed to upload CSV file'
    //   );
    // } finally {
    //   setUploading(false);
    // }
  };

  const renderProperty = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
    >
      {item.hasLowRating && (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.warningText}>
            Low Rating: {item.rating}
          </Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={32} color="#4A90E2" />
        </View>
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyName}>{item.name}</Text>
          <Text style={styles.address}>{item.address}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ccc" />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.stat}>
          <Ionicons name="home-outline" size={16} color="#666" />
          <Text style={styles.statText}>{item._count.units} units</Text>
        </View>
        {item.rating && !item.hasLowRating && (
          <View style={[styles.stat, { marginLeft: 16 }]}>
            <Ionicons name="star" size={16} color="#FFB800" />
            <Text style={styles.statText}>{item.rating}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPMSProperty = ({ item }) => (
    <TouchableOpacity 
      style={styles.pmsCard}
      onPress={() => handleEditPMSProperty(item)}
    >
      <View style={styles.pmsBadge}>
        <Ionicons name="cloud" size={10} color="#6366F1" />
        <Text style={styles.pmsBadgeText}>{item.pmsProvider}</Text>
      </View>
      <View style={styles.pmsCardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="business-outline" size={24} color="#6366F1" />
        </View>
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyName}>{item.name}</Text>
          {item.nickname && <Text style={styles.pmsNickname}>{item.nickname}</Text>}
          <Text style={styles.address}>{item.address || item.city || 'No address'}</Text>
          
          {item.room_count !== null && item.room_count !== undefined && (
            <View style={styles.pmsRoomCount}>
              <Ionicons name="bed-outline" size={12} color="#6B7280" />
              <Text style={styles.pmsRoomCountText}>
                {item.room_count} {item.room_count === 1 ? 'room' : 'rooms'}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
      {item.notes && (
        <View style={styles.pmsNotesPreview}>
          <Ionicons name="document-text-outline" size={12} color="#6B7280" />
          <Text style={styles.pmsNotesPreviewText} numberOfLines={1}>{item.notes}</Text>
        </View>
      )}
      <TouchableOpacity 
        style={styles.pmsDeleteButton}
        onPress={(e) => {
          e.stopPropagation();
          handleDeletePMSProperty(item);
        }}
      >
        <Ionicons name="trash-outline" size={14} color="#DC2626" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {properties.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="business-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No properties yet</Text>
          <Text style={styles.emptySubtext}>Create your first property or upload multiple</Text>
          
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateProperty')}
          >
            <Text style={styles.createButtonText}>Create Property</Text>
          </TouchableOpacity>

          <View style={styles.csvSection}>
            <Text style={styles.csvSectionTitle}>Bulk Upload via CSV</Text>
            <View style={styles.csvButtons}>
              <TouchableOpacity
                style={styles.csvButton}
                onPress={handleDownloadTemplate}
              >
                <Ionicons name="download-outline" size={18} color="#4A90E2" />
                <Text style={styles.csvButtonText}>Download Template</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.csvButton, styles.uploadButton]}
                onPress={handleUploadCSV}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                    <Text style={styles.uploadButtonText}>Upload CSV</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.csvButtonsRow}>
              <TouchableOpacity
                style={styles.csvButtonCompact}
                onPress={handleDownloadTemplate}
              >
                <Ionicons name="download-outline" size={16} color="#4A90E2" />
                <Text style={styles.csvButtonCompactText}>Template</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.csvButtonCompact, styles.uploadButtonCompact]}
                onPress={handleUploadCSV}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.uploadButtonCompactText}>Upload CSV</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pmsButton}
                onPress={() => navigation.navigate('PMSSettings')}
              >
                <Ionicons name="cloud-outline" size={16} color="#6366F1" />
                <Text style={styles.pmsButtonText}>PMS</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={properties}
            renderItem={renderProperty}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListHeaderComponent={
              pmsProperties.length > 0 ? (
                <View style={styles.pmsSectionContainer}>
                  <Text style={styles.pmsSection}>PMS Listings</Text>
                  {pmsProperties.map(pmsProp => (
                    <View key={pmsProp.id}>
                      {renderPMSProperty({ item: pmsProp })}
                    </View>
                  ))}
                  <Text style={styles.pmsSectionFooter}>Manual Properties</Text>
                </View>
              ) : null
            }
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('CreateProperty')}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* Edit PMS Property Modal */}
      <Modal
        visible={editingPMSProperty !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingPMSProperty(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Property</Text>
              <TouchableOpacity onPress={() => setEditingPMSProperty(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {editingPMSProperty && (
                <>
                  <Text style={styles.propertyNameTitle}>{editingPMSProperty.name}</Text>
                  <Text style={styles.propertyAddress}>{editingPMSProperty.address}</Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Number of Rooms</Text>
                    <TextInput
                      style={styles.input}
                      value={pmsRoomCount}
                      onChangeText={setPmsRoomCount}
                      placeholder="e.g., 3"
                      keyboardType="number-pad"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={pmsNotes}
                      onChangeText={setPmsNotes}
                      placeholder="Add any notes about this property..."
                      multiline
                      numberOfLines={4}
                      placeholderTextColor="#999"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditingPMSProperty(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePMSProperty}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
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
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  csvSection: {
    marginTop: 30,
    width: '100%',
    paddingHorizontal: 20,
  },
  csvSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  csvButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  csvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    backgroundColor: '#fff',
    gap: 8,
  },
  csvButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  uploadButton: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  uploadButtonText: {
    color: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  csvButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  csvButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A90E2',
    backgroundColor: '#fff',
    gap: 6,
  },
  csvButtonCompactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  uploadButtonCompact: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  uploadButtonCompactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  pmsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6366F1',
    backgroundColor: '#fff',
    gap: 4,
    marginLeft: 8,
  },
  pmsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  pmsSectionContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    backgroundColor: '#f5f5f5',
  },
  pmsSection: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pmsSectionFooter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pmsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  pmsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    gap: 3,
    marginBottom: 8,
  },
  pmsBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pmsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  pmsNickname: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 1,
  },
  pmsNote: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  pmsRoomCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  pmsRoomCountText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  pmsNotesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  pmsNotesPreviewText: {
    flex: 1,
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  pmsDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalBody: {
    padding: 20,
  },
  propertyNameTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


