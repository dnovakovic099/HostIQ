import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';

export default function UsageIndicator({ navigation, compact = false }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Only load usage data once on mount, not on every focus
  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      console.log('📊 Loading usage data...');
      const response = await api.get('/subscriptions/usage');
      console.log('📊 Usage data received:', response.data);
      setUsage(response.data);
    } catch (error) {
      console.error('Load usage error:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color="#4A90E2" />
      </View>
    );
  }

  if (!usage) return null;

  const percentage = Math.min(100, (usage.images_processed / usage.free_image_limit) * 100);
  const isNearLimit = percentage > 80;
  const isAtLimit = usage.is_limit_reached;

  const handlePress = () => {
    if (navigation) {
      navigation.navigate('SubscriptionManagement');
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          isAtLimit && styles.compactContainerAlert,
        ]}
        onPress={handlePress}
      >
        <Ionicons
          name={isAtLimit ? 'alert-circle' : 'image-outline'}
          size={20}
          color={isAtLimit ? '#F44336' : '#4A90E2'}
        />
        <Text style={[styles.compactText, isAtLimit && styles.compactTextAlert]}>
          {usage.remaining_free_images} free images
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isAtLimit && styles.containerAlert,
        isNearLimit && !isAtLimit && styles.containerWarning,
      ]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isAtLimit ? 'alert-circle' : 'image-outline'}
              size={24}
              color={isAtLimit ? '#F44336' : isNearLimit ? '#FF9800' : '#4A90E2'}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Free Image Usage</Text>
            <Text style={styles.subtitle}>
              {usage.images_processed} / {usage.free_image_limit} used
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentage}%`,
                backgroundColor: isAtLimit
                  ? '#F44336'
                  : isNearLimit
                  ? '#FF9800'
                  : '#4A90E2',
              },
            ]}
          />
        </View>

        {isAtLimit ? (
          <View style={styles.message}>
            <Text style={styles.messageTextAlert}>
              ⚠️ Limit reached. Subscribe to properties to continue.
            </Text>
          </View>
        ) : isNearLimit ? (
          <View style={styles.message}>
            <Text style={styles.messageTextWarning}>
              {usage.remaining_free_images} free images remaining
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  containerAlert: {
    borderWidth: 2,
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  containerWarning: {
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  containerCompact: {
    padding: 8,
  },
  content: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  message: {
    marginTop: 4,
  },
  messageTextAlert: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '500',
  },
  messageTextWarning: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  compactContainerAlert: {
    backgroundColor: '#FFEBEE',
  },
  compactText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1565C0',
  },
  compactTextAlert: {
    color: '#C62828',
  },
});

