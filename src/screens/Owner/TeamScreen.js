import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

export default function TeamScreen() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'CLEANER' });

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const response = await api.get('/invites');
      setInvites(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!newInvite.email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      await api.post('/invites/create', newInvite);
      setModalVisible(false);
      setNewInvite({ email: '', role: 'CLEANER' });
      fetchInvites();
      Alert.alert('Success', 'Invitation sent!');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create invite');
    }
  };

  const getStatusColor = (invite) => {
    if (invite.accepted_at) return '#4CAF50';
    if (new Date(invite.expires_at) < new Date()) return '#F44336';
    return '#FF9800';
  };

  const getStatusText = (invite) => {
    if (invite.accepted_at) return 'Accepted';
    if (new Date(invite.expires_at) < new Date()) return 'Expired';
    return 'Pending';
  };

  const renderInvite = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons
            name={item.role === 'CLEANER' ? 'person' : 'briefcase'}
            size={24}
            color="#4A90E2"
          />
        </View>
        <View style={styles.inviteInfo}>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.role}>{item.role}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
            {getStatusText(item)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.infoText}>
            Created {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {item.property && (
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={14} color="#666" />
            <Text style={styles.infoText}>{item.property.name}</Text>
          </View>
        )}
      </View>
    </View>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team Members</Text>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {invites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No team members yet</Text>
          <Text style={styles.emptySubtext}>Invite cleaners to join your team</Text>
        </View>
      ) : (
        <FlatList
          data={invites}
          renderItem={renderInvite}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Team Member</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={newInvite.email}
              onChangeText={(text) => setNewInvite({ ...newInvite, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Role:</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  newInvite.role === 'CLEANER' && styles.roleButtonActive,
                ]}
                onPress={() => setNewInvite({ ...newInvite, role: 'CLEANER' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    newInvite.role === 'CLEANER' && styles.roleButtonTextActive,
                  ]}
                >
                  Cleaner
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  newInvite.role === 'OWNER' && styles.roleButtonActive,
                ]}
                onPress={() => setNewInvite({ ...newInvite, role: 'OWNER' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    newInvite.role === 'OWNER' && styles.roleButtonTextActive,
                  ]}
                >
                  Owner
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCreateInvite}
            >
              <Text style={styles.modalButtonText}>Send Invitation</Text>
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
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inviteButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
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
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inviteInfo: {
    flex: 1,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  roleButton: {
    flex: 1,
    height: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  roleButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});









