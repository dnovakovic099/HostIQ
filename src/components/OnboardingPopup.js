import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const OnboardingPopup = ({
  visible,
  hasProperties,
  hasCleaners,
  onClose,
  onAddProperty,
  onAddCleaner
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={['#B8D4E8', '#A8C5E0']}
            style={styles.header}
          >
            <Ionicons name="hand-right" size={32} color="#FFF" />
            <Text style={styles.welcomeText}>Welcome to HostIQ!</Text>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.subtitle}>Let's get you set up</Text>

            {!hasProperties && (
              <TouchableOpacity style={styles.actionItem} onPress={onAddProperty}>
                <View style={styles.checkContainer}>
                  <Ionicons name="square-outline" size={24} color="#4A90E2" />
                </View>
                <Text style={styles.actionText}>Add your first property</Text>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}

            {!hasCleaners && (
              <TouchableOpacity style={styles.actionItem} onPress={onAddCleaner}>
                <View style={styles.checkContainer}>
                  <Ionicons name="square-outline" size={24} color="#4A90E2" />
                </View>
                <Text style={styles.actionText}>Invite your cleaning team</Text>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.skipButton} onPress={onClose}>
              <Text style={styles.skipText}>I'll do this later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
  },
  content: {
    padding: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#3C3C43',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    marginBottom: 12,
  },
  checkContainer: {
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  skipButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

export default OnboardingPopup;
