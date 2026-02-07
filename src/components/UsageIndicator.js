import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { SUBSCRIPTION_CONFIG } from '../config/constants';
import colors from '../theme/colors';

// Use centralized colors
const COLORS = {
  primary: colors.primary.main,
  primaryLight: colors.background.lightBlue,
  text: {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    tertiary: colors.ios.gray,
  },
  success: colors.status.success,
  warning: colors.status.warning,
  warningLight: colors.accent.warningLightAlt,
  error: colors.status.error,
  errorLight: colors.background.lightRed,
  progressBg: colors.border.light,
};

export default function UsageIndicator({ navigation, compact = false }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await api.get('/subscriptions/usage');
      setUsage(response.data);
    } catch (error) {
      console.error('Load usage error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!usage) return null;

  // Use default limit of 10, or cap at 10 if API returns higher value
  const freeImageLimit = Math.min(usage.free_image_limit || SUBSCRIPTION_CONFIG.FREE_IMAGE_LIMIT, SUBSCRIPTION_CONFIG.FREE_IMAGE_LIMIT);
  const percentage = Math.min(100, (usage.images_processed / freeImageLimit) * 100);
  const isNearLimit = percentage > 80;
  const isAtLimit = usage.is_limit_reached;

  const getProgressColor = () => {
    if (isAtLimit) return COLORS.error;
    if (isNearLimit) return COLORS.warning;
    return COLORS.primary;
  };

  const getIconBg = () => {
    if (isAtLimit) return COLORS.errorLight;
    if (isNearLimit) return COLORS.warningLight;
    return COLORS.primaryLight;
  };

  const handlePress = () => {
    // Temporarily commented out - redirects to Subscriptions screen
    // if (navigation) {
    //   navigation.navigate('SubscriptionManagement');
    // }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, isAtLimit && styles.compactContainerAlert]}
        onPress={handlePress}
        activeOpacity={0.6}
      >
        <Ionicons
          name={isAtLimit ? 'alert-circle' : 'images-outline'}
          size={18}
          color={isAtLimit ? COLORS.error : COLORS.primary}
        />
        <Text style={[styles.compactText, isAtLimit && styles.compactTextAlert]}>
          {usage.remaining_free_images} free images
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.6}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>
          <Ionicons
            name={isAtLimit ? 'alert-circle-outline' : 'images-outline'}
            size={22}
            color={getProgressColor()}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Free Image Usage</Text>
          <Text style={styles.subtitle}>
            {usage.images_processed} / {freeImageLimit} used
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      </View>

      <View style={styles.progressBarBg}>
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

      {(isAtLimit || isNearLimit) && (
        <Text style={[styles.messageText, { color: getProgressColor() }]}>
          {isAtLimit 
            ? 'Limit reached. Upgrade to continue.' 
            : `${usage.remaining_free_images} free images remaining`}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  containerCompact: {
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,                                  // More refined
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,                               // iOS body
    fontWeight: '600',                          // Semibold
    color: COLORS.text.primary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,                               // iOS subheadline
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.progressBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  compactContainerAlert: {
    backgroundColor: COLORS.errorLight,
  },
  compactText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  compactTextAlert: {
    color: COLORS.error,
  },
});
