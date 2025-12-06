import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';

// Match dashboard colors
const COLORS = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  cardBorder: 'rgba(0,0,0,0.04)',
  text: {
    primary: '#1A1D21',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
  },
  accent: '#2563EB',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  divider: '#F1F3F5',
};

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
        <ActivityIndicator size="small" color={COLORS.accent} />
      </View>
    );
  }

  if (!usage) return null;

  const percentage = Math.min(100, (usage.images_processed / usage.free_image_limit) * 100);
  const isNearLimit = percentage > 80;
  const isAtLimit = usage.is_limit_reached;

  const getProgressColor = () => {
    if (isAtLimit) return COLORS.error;
    if (isNearLimit) return COLORS.warning;
    return COLORS.accent;
  };

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
        activeOpacity={0.7}
      >
        <Ionicons
          name={isAtLimit ? 'alert-circle' : 'images-outline'}
          size={18}
          color={isAtLimit ? COLORS.error : COLORS.accent}
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
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${getProgressColor()}12` }]}>
            <Ionicons
              name={isAtLimit ? 'alert-circle-outline' : 'images-outline'}
              size={20}
              color={getProgressColor()}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Free Image Usage</Text>
            <Text style={styles.subtitle}>
              {usage.images_processed} / {usage.free_image_limit} used
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} />
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentage}%`,
                backgroundColor: getProgressColor(),
              },
            ]}
          />
        </View>

        {isAtLimit ? (
          <View style={styles.message}>
            <Text style={styles.messageTextAlert}>
              Limit reached. Subscribe to properties to continue.
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
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  containerAlert: {
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
    backgroundColor: `${COLORS.error}06`,
  },
  containerWarning: {
    borderWidth: 1,
    borderColor: `${COLORS.warning}30`,
    backgroundColor: `${COLORS.warning}06`,
  },
  containerCompact: {
    padding: 8,
  },
  content: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  progressBarContainer: {
    height: 5,
    backgroundColor: COLORS.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  message: {
    marginTop: 2,
  },
  messageTextAlert: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
  },
  messageTextWarning: {
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.accent}10`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  compactContainerAlert: {
    backgroundColor: `${COLORS.error}10`,
  },
  compactText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  compactTextAlert: {
    color: COLORS.error,
  },
});

