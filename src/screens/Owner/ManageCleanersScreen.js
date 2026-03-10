import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { useDataStore } from '../../store/dataStore';
import colors from '../../theme/colors';

export default function ManageCleanersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const cachedCleaners = useDataStore((s) => s.cleaners);
  const cacheLoaded = useDataStore((s) => s.cleanersLoaded);
  const [cleaners, setCleaners] = useState(cacheLoaded ? cachedCleaners : []);
  const [loading, setLoading] = useState(!cacheLoaded);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [editingCleaner, setEditingCleaner] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Tab bar height: 60px (TAB_BAR_HEIGHT) + 50px (dipDepth) + safe area bottom
  const tabBarHeight = 15;

  useEffect(() => {
    // Always refresh in background — cached data is shown instantly
    fetchCleaners();
  }, []);

  // Refresh cleaners list when screen comes into focus
  // This ensures assignment counts are updated after deleting assignments
  useFocusEffect(
    useCallback(() => {
      fetchCleaners();
    }, [])
  );

  const fetchCleaners = async () => {
    try {
      const response = await api.get('/owner/cleaners', {
        params: { include: 'assignments' }
      });
      setCleaners(response.data);
      useDataStore.getState().setCleaners(response.data);
    } catch (error) {
      console.error('Error fetching cleaners:', error);
      if (!cacheLoaded) {
        Alert.alert('Error', 'Failed to load cleaners');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCleaner = async () => {
    if (!inviteEmail || !inviteName || !invitePassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (invitePassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setInviting(true);
    try {
      await api.post('/owner/cleaners/invite', {
        email: inviteEmail,
        name: inviteName,
        password: invitePassword,
      });
      Alert.alert('Success', 'Cleaner account created successfully!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      fetchCleaners();
    } catch (error) {
      console.error('Create cleaner error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create cleaner');
    } finally {
      setInviting(false);
    }
  };

  const handleEditPassword = (cleaner) => {
    console.log('🔐 handleEditPassword called with cleaner:', cleaner);
    if (!cleaner || !cleaner.id) {
      console.error('❌ Invalid cleaner object:', cleaner);
      Alert.alert('Error', 'Invalid cleaner information');
      return;
    }
    setEditingCleaner(cleaner);
    setNewPassword('');
    setShowEditPasswordModal(true);
    console.log('🔐 Modal should now be visible');
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (!editingCleaner || !editingCleaner.id) {
      Alert.alert('Error', 'Cleaner information is missing');
      return;
    }

    setUpdatingPassword(true);
    try {
      console.log('🔐 ========== STARTING PASSWORD UPDATE ==========');
      console.log('🔐 Updating password for cleaner:', editingCleaner.id);
      console.log('🔐 Cleaner name:', editingCleaner.name);
      console.log('🔐 New password length:', newPassword.length);
      console.log('🔐 API endpoint:', `/owner/cleaners/${editingCleaner.id}/password`);
      console.log('🔐 API base URL:', api.defaults?.baseURL || 'Not set');
      
      const requestData = {
        password: newPassword,
      };
      console.log('🔐 Request data:', { password: '***' }); // Don't log actual password
      
      console.log('🔐 Making API PUT request...');
      console.log('🔐 Full URL will be:', `${api.defaults?.baseURL || ''}/owner/cleaners/${editingCleaner.id}/password`);
      
      // Make the API call with explicit error handling
      let response;
      try {
        response = await api.put(`/owner/cleaners/${editingCleaner.id}/password`, requestData);
        console.log('🔐 API request completed');
        console.log('🔐 Response status:', response?.status);
        console.log('🔐 Response data:', response?.data);
      } catch (apiError) {
        console.error('🔐 API call failed:', apiError);
        console.error('🔐 Error details:', {
          message: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status,
          config: {
            url: apiError.config?.url,
            method: apiError.config?.method,
            baseURL: apiError.config?.baseURL
          }
        });
        throw apiError; // Re-throw to be caught by outer catch
      }
      
      // Verify we got a successful response
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      console.log('✅ Password update response:', response.data);
      
      // Only show success if we got a 200 status
      if (response.status === 200) {
        Alert.alert('Success', 'Password updated successfully');
        setShowEditPasswordModal(false);
        setNewPassword('');
        setEditingCleaner(null);
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Update password error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to update password';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleRemoveCleaner = (cleaner) => {
    // Check if cleaner has active assignments
    const hasAssignments = (cleaner._count?.assignments || 0) > 0;
    
    // If cleaner has active assignments, show info alert and prevent deletion
    if (hasAssignments) {
      Alert.alert(
        'Cannot Remove Cleaner',
        `This cleaner has ${cleaner._count?.assignments} active assignment${cleaner._count?.assignments > 1 ? 's' : ''}. You must cancel all assignments before removing them.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // If no assignments, show confirmation dialog
    Alert.alert(
      'Remove Cleaner',
      `Are you sure you want to remove ${cleaner.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/owner/cleaners/${cleaner.id}`);
              Alert.alert('Success', 'Cleaner removed');
              fetchCleaners();
            } catch (error) {
              console.error('Remove cleaner error:', error);
              const errorMessage = error.response?.data?.error || 'Failed to remove cleaner';
              Alert.alert('Cannot Remove Cleaner', errorMessage);
            }
          },
        },
      ]
    );
  };

  const renderCleaner = ({ item }) => {
    const navigateToAssignments = () => {
      navigation.navigate('CleanerAssignments', {
        cleanerId: item.id,
        cleanerName: item.name,
        assignments: item.assignments || [],
      });
    };

    return (
      <TouchableOpacity
        style={styles.cleanerCard}
        activeOpacity={0.7}
        onPress={navigateToAssignments}
      >
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={(e) => {
              console.log('🔐 Edit password button pressed for cleaner:', item.id);
              e.stopPropagation();
              e.preventDefault();
              handleEditPassword(item);
            }}
            onPressIn={(e) => {
              e.stopPropagation();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="lock-closed-outline" size={18} color="#0A84FF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={(e) => {
              e.stopPropagation();
              handleRemoveCleaner(item);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.cleanerHeader}>
          <LinearGradient
            colors={['#E3F2FD', '#BBDEFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cleanerAvatar}
          >
            <Text style={styles.cleanerAvatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          
          <View style={styles.cleanerInfo}>
            <Text style={styles.cleanerName}>{item.name}</Text>
            <Text style={styles.cleanerEmail}>{item.email}</Text>
            <TouchableOpacity
              style={styles.statPill}
              onPress={navigateToAssignments}
            >
              <Ionicons name="calendar-outline" size={14} color="#0A84FF" />
              <Text style={styles.cleanerStats}>
                {item._count?.assignments || 0} {(item._count?.assignments || 0) === 1 ? 'assignment' : 'assignments'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#0A84FF" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.assignButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('AssignCleaner', { cleanerId: item.id, cleanerName: item.name });
          }}
        >
          <View style={styles.assignButtonContent}>
            <Ionicons name="add-circle-outline" size={20} color="#0A84FF" />
            <Text style={styles.assignButtonText}>Assign New</Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, { paddingTop: insets.top }]}
      >
        {/* Decorative element */}
        <View style={styles.decorativeCircle}>
          <Ionicons name="people" size={70} color={colors.decorative.icon1} />
        </View>
        <SafeAreaView>
          <View style={styles.headerGradient}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name="people" size={22} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>My Cleaners</Text>
              <Text style={styles.headerSubtitle}>
                {cleaners.length} {cleaners.length === 1 ? 'cleaner' : 'cleaners'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      ) : (
      <FlatList
        data={cleaners}
        renderItem={renderCleaner}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient
              colors={['#E3F2FD', '#BBDEFB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIcon}
            >
              <Ionicons name="people-outline" size={48} color="#0A84FF" />
            </LinearGradient>
            <Text style={styles.emptyText}>No cleaners yet</Text>
            <Text style={styles.emptySubtext}>
              Add cleaners to manage your properties
            </Text>
          </View>
        }
      />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight }]}
        onPress={() => setShowInviteModal(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#0A84FF', '#0066CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="person-add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Cleaner Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Cleaner</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color="#3C3C43" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Cleaner Name"
              value={inviteName}
              onChangeText={setInviteName}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              value={invitePassword}
              onChangeText={setInvitePassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.button, inviting && styles.buttonDisabled]}
              onPress={handleInviteCleaner}
              disabled={inviting}
            >
              {inviting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Password Modal */}
      <Modal
        visible={showEditPasswordModal}
        animationType="slide"
        transparent={true}
        onShow={() => {
          console.log('🔐 Edit Password Modal shown');
          console.log('🔐 editingCleaner:', editingCleaner);
        }}
        onRequestClose={() => {
          console.log('🔐 Modal close requested');
          setShowEditPasswordModal(false);
          setNewPassword('');
          setEditingCleaner(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Update Password{editingCleaner ? ` - ${editingCleaner.name}` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditPasswordModal(false);
                  setNewPassword('');
                  setEditingCleaner(null);
                }}
              >
                <Ionicons name="close" size={24} color="#3C3C43" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter a new password for {editingCleaner?.name || 'this cleaner'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="New Password (min 6 characters)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, (updatingPassword || !newPassword || newPassword.length < 6) && styles.buttonDisabled]}
              onPress={() => {
                console.log('🔐 Update Password button pressed');
                console.log('🔐 editingCleaner:', editingCleaner);
                console.log('🔐 newPassword length:', newPassword?.length);
                handleUpdatePassword();
              }}
              disabled={updatingPassword || !newPassword || newPassword.length < 6}
            >
              {updatingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  // Header Gradient
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
  list: {
    padding: 16,
    paddingBottom: 180,
  },
  // Cleaner Card
  cleanerCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionButtonsContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 100,
    elevation: 10, // For Android
  },
  editButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  cleanerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  cleanerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cleanerAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A84FF',
  },
  cleanerInfo: {
    flex: 1,
    paddingRight: 32,
  },
  cleanerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 22,
    marginBottom: 4,
  },
  cleanerEmail: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(10, 132, 255, 0.10)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
  },
  cleanerStats: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
  },
  assignButton: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  assignButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  assignButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A84FF',
  },
  // Empty State
  empty: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#F2F2F7',
  },
  button: {
    height: 50,
    backgroundColor: '#0A84FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(10, 132, 255, 0.5)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


