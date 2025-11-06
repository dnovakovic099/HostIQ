import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';

export default function SubscriptionManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usage, setUsage] = useState(null);
  const [properties, setProperties] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const loadData = async () => {
    try {
      const [usageRes, propertiesRes, subscriptionsRes] = await Promise.all([
        api.get('/subscriptions/usage'),
        api.get('/owner/properties'),
        api.get('/subscriptions/my-subscriptions'),
      ]);

      setUsage(usageRes.data);
      setProperties(propertiesRes.data);
      setSubscriptions(subscriptionsRes.data);
    } catch (error) {
      console.error('Load subscription data error:', error);
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSubscribe = async (propertyId, propertyName) => {
    Alert.alert(
      'Subscribe to Property',
      `Subscribe to "${propertyName}" for $5.00/month?\n\nThis will allow unlimited image processing for this property.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            try {
              await api.post(`/subscriptions/properties/${propertyId}`);
              Alert.alert('Success', 'Subscription activated!');
              loadData();
            } catch (error) {
              console.error('Subscribe error:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to subscribe');
            }
          },
        },
      ]
    );
  };

  const handleCancelSubscription = async (propertyId, propertyName) => {
    Alert.alert(
      'Cancel Subscription',
      `Are you sure you want to cancel the subscription for "${propertyName}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/subscriptions/properties/${propertyId}`);
              Alert.alert('Cancelled', 'Subscription has been cancelled');
              loadData();
            } catch (error) {
              console.error('Cancel subscription error:', error);
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  };

  const getPropertySubscription = (propertyId) => {
    return subscriptions.find(sub => sub.property_id === propertyId);
  };

  const renderUsageCard = () => {
    if (!usage) return null;

    const percentage = Math.min(100, (usage.images_processed / usage.free_image_limit) * 100);
    const isNearLimit = percentage > 80;
    const isAtLimit = usage.is_limit_reached;

    return (
      <View style={styles.usageCard}>
        <View style={styles.usageHeader}>
          <Ionicons 
            name={isAtLimit ? "alert-circle" : "image-outline"} 
            size={28} 
            color={isAtLimit ? "#F44336" : "#4A90E2"} 
          />
          <Text style={styles.usageTitle}>Free Image Usage</Text>
        </View>

        <View style={styles.usageStats}>
          <Text style={styles.usageCount}>
            {usage.images_processed} / {usage.free_image_limit}
          </Text>
          <Text style={styles.usageLabel}>images processed</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${percentage}%`,
                backgroundColor: isAtLimit ? '#F44336' : isNearLimit ? '#FF9800' : '#4A90E2'
              }
            ]} 
          />
        </View>

        {isAtLimit ? (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#F44336" />
            <Text style={styles.warningText}>
              You've reached your free limit. Subscribe to properties below to continue.
            </Text>
          </View>
        ) : isNearLimit ? (
          <View style={[styles.warningBox, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="alert-circle-outline" size={20} color="#FF9800" />
            <Text style={[styles.warningText, { color: '#E65100' }]}>
              {usage.remaining_free_images} free images remaining
            </Text>
          </View>
        ) : (
          <Text style={styles.usageHint}>
            {usage.remaining_free_images} free images remaining
          </Text>
        )}
      </View>
    );
  };

  const renderPropertyCard = (property) => {
    const subscription = getPropertySubscription(property.id);
    const hasSubscription = subscription?.status === 'ACTIVE';

    return (
      <View key={property.id} style={styles.propertyCard}>
        <View style={styles.propertyHeader}>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>{property.name}</Text>
            <Text style={styles.propertyAddress} numberOfLines={1}>
              {property.address}
            </Text>
          </View>
          {hasSubscription && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>

        {hasSubscription ? (
          <View style={styles.subscriptionDetails}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subscription:</Text>
              <Text style={styles.priceValue}>$5.00/month</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelSubscription(property.id, property.name)}
            >
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.subscribeSection}>
            <View style={styles.benefitsBox}>
              <Text style={styles.benefitsTitle}>Subscribe for unlimited access:</Text>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark" size={16} color="#34C759" />
                <Text style={styles.benefitText}>Unlimited image processing</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark" size={16} color="#34C759" />
                <Text style={styles.benefitText}>AI-powered inspections</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark" size={16} color="#34C759" />
                <Text style={styles.benefitText}>Priority support</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => handleSubscribe(property.id, property.name)}
            >
              <Text style={styles.subscribeButtonText}>Subscribe - $5.00/month</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Management</Text>
        <Text style={styles.subtitle}>
          Manage your free tier usage and property subscriptions
        </Text>
      </View>

      {renderUsageCard()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Properties</Text>
        {properties.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No properties yet</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('CreateProperty')}
            >
              <Text style={styles.addButtonText}>Add Property</Text>
            </TouchableOpacity>
          </View>
        ) : (
          properties.map(renderPropertyCard)
        )}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            • Start with {usage?.free_image_limit || 100} free images{'\n'}
            • Subscribe to individual properties for unlimited access{'\n'}
            • Cancel anytime, no commitment
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  usageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  usageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  usageStats: {
    alignItems: 'center',
    marginBottom: 16,
  },
  usageCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  usageLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  usageHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: '#666',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  subscriptionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F44336',
  },
  subscribeSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  benefitsBox: {
    marginBottom: 12,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
  },
  subscribeButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});

