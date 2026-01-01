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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';

export default function ManageCleanersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [cleaners, setCleaners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);
  
  // Tab bar height: 60px (TAB_BAR_HEIGHT) + 50px (dipDepth) + safe area bottom
  const tabBarHeight = 15;

  useEffect(() => {
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
      // Try to fetch cleaners with assignments included
      // If the API supports it, assignments will be included; otherwise it will just return cleaners
      const response = await api.get('/owner/cleaners', {
        params: { include: 'assignments' }
      });
      setCleaners(response.data);
    } catch (error) {
      console.error('Error fetching cleaners:', error);
      Alert.alert('Error', 'Failed to load cleaners');
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

  const handleRemoveCleaner = (cleaner) => {
    // Check if cleaner has active assignments
    const hasAssignments = (cleaner._count?.assignments || 0) > 0;
    const warningMessage = hasAssignments 
      ? `This cleaner has ${cleaner._count?.assignments} active assignment${cleaner._count?.assignments > 1 ? 's' : ''}. You must cancel all assignments before removing them.`
      : `Are you sure you want to remove ${cleaner.name}?`;

    Alert.alert(
      'Remove Cleaner',
      warningMessage,
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
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveCleaner(item)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>

        <View style={styles.cleanerHeader}>
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
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
              <Ionicons name="calendar-outline" size={14} color="#548EDD" />
              <Text style={styles.cleanerStats}>
                {item._count?.assignments || 0} {(item._count?.assignments || 0) === 1 ? 'assignment' : 'assignments'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#548EDD" />
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
            <Ionicons name="add-circle-outline" size={20} color="#548EDD" />
            <Text style={styles.assignButtonText}>Assign New</Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#548EDD" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Gradient */}
      <LinearGradient
        colors={['#548EDD', '#4A7FD4', '#3F70CB', '#3561C2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, Platform.OS === 'android' && { paddingTop: insets.top }]}
      >
        {Platform.OS === 'ios' ? (
          <SafeAreaView>
            <View style={styles.headerGradient}>
              <View style={styles.headerIconWrapper}>
                <View style={styles.headerIconInner}>
                  <Ionicons name="people" size={28} color="#FFFFFF" />
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
        ) : (
          <View style={styles.headerGradient}>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name="people" size={28} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>My Cleaners</Text>
              <Text style={styles.headerSubtitle}>
                {cleaners.length} {cleaners.length === 1 ? 'cleaner' : 'cleaners'}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <FlatList
        data={cleaners}
        renderItem={renderCleaner}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient
              colors={['#DBEAFE', '#BFDBFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIcon}
            >
              <Ionicons name="people-outline" size={48} color="#548EDD" />
            </LinearGradient>
            <Text style={styles.emptyText}>No cleaners yet</Text>
            <Text style={styles.emptySubtext}>
              Add cleaners to manage your properties
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight }]}
        onPress={() => setShowInviteModal(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#548EDD', '#4A7FD4']}
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
                <Ionicons name="close" size={24} color="#333" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  // Header Gradient
  headerWrapper: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 18,
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
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
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
    borderColor: '#E0E7FF',
    ...Platform.select({
      ios: {
        shadowColor: '#548EDD',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
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
    color: '#548EDD',
  },
  cleanerInfo: {
    flex: 1,
    paddingRight: 32,
  },
  cleanerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 4,
  },
  cleanerEmail: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
  },
  cleanerStats: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  assignButton: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
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
    color: '#548EDD',
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
        shadowColor: '#548EDD',
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
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#6B7280',
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
        shadowColor: '#548EDD',
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
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  button: {
    height: 50,
    backgroundColor: '#548EDD',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#93BFED',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


