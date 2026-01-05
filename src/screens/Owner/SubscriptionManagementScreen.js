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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import * as RNIap from 'react-native-iap';
import { SUBSCRIPTION_CONFIG } from '../../config/constants';

// Product IDs - These must match what you configure in App Store Connect & Google Play Console
const SUBSCRIPTION_SKUS = Platform.select({
  ios: ['property_subscription_monthly'], // Replace with your Apple product ID
  android: ['property_subscription_monthly'], // Replace with your Google product ID
});

export default function SubscriptionManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usage, setUsage] = useState(null);
  const [properties, setProperties] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [iapAvailable, setIapAvailable] = useState(false);

  const loadData = async () => {
    try {
      const [usageRes, propertiesRes, subscriptionsRes] = await Promise.all([
        api.get('/subscriptions/usage'),
        api.get('/owner/properties'),
        api.get('/subscriptions/my-subscriptions'),
      ]);

      setUsage(usageRes.data || null);
      
      // Handle new API format with separated manual and PMS properties
      let allProperties = [];
      if (propertiesRes.data.manualProperties) {
        allProperties = [
          ...(propertiesRes.data.manualProperties || []),
          ...(propertiesRes.data.pmsProperties || [])
        ];
      } else {
        // Fallback for old API format
        allProperties = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
      }
      
      setProperties(allProperties);
      setSubscriptions(Array.isArray(subscriptionsRes.data) ? subscriptionsRes.data : []);
    } catch (error) {
      console.error('Load subscription data error:', error);
      // Ensure states are set to empty arrays on error
      setUsage(null);
      setProperties([]);
      setSubscriptions([]);
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initialize IAP
  useEffect(() => {
    let purchaseUpdateSubscription;
    let purchaseErrorSubscription;

    const initIAP = async () => {
      try {
        console.log('🛒 Initializing IAP...');
        const result = await RNIap.initConnection();
        console.log('✅ IAP initialized:', result);
        setIapAvailable(true);

        // Set up purchase listeners
        purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
          console.log('📦 Purchase update:', purchase);
          
          const receipt = purchase.transactionReceipt;
          if (receipt) {
            // Purchase successful, validate with backend
            await finishPurchase(purchase);
          }
        });

        purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
          console.warn('❌ Purchase error:', error);
          if (error.code !== 'E_USER_CANCELLED') {
            Alert.alert('Purchase Error', error.message);
          }
        });

      } catch (error) {
        // IAP not available (Expo Go doesn't support native modules)
        console.log('ℹ️ IAP not available - running in Expo Go or simulator without entitlements');
        setIapAvailable(false);
      }
    };

    initIAP();

    // Cleanup
    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
      }
      RNIap.endConnection();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const finishPurchase = async (purchase) => {
    try {
      console.log('🔄 Finishing purchase and validating with backend...');

      const propertyId = purchase.productId.split('_')[0]; // Extract property ID from product ID (if encoded)
      
      if (Platform.OS === 'ios') {
        // Send Apple receipt to backend
        await api.post(`/subscriptions/properties/${propertyId}/apple`, {
          receiptData: purchase.transactionReceipt,
          transactionId: purchase.transactionId
        });
      } else {
        // Send Google purchase token to backend
        await api.post(`/subscriptions/properties/${propertyId}/google`, {
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken
        });
      }

      // Finish the transaction
      await RNIap.finishTransaction(purchase);
      console.log('✅ Purchase finished successfully');

      Alert.alert('Success!', 'Subscription activated! You now have unlimited image processing for this property.');
      loadData(); // Refresh subscription data

    } catch (error) {
      console.error('❌ Failed to finish purchase:', error);
      Alert.alert('Error', 'Failed to activate subscription. Please contact support.');
    }
  };

  const handleSubscribe = async (propertyId, propertyName) => {
    if (!iapAvailable) {
      Alert.alert('Error', 'In-app purchases are not available on this device');
      return;
    }

    try {
      console.log(`🛒 Starting IAP subscription for property ${propertyId}...`);

      // Get available subscriptions from the store
      // react-native-iap v12+ requires { skus: [...] } format
      const products = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
      console.log('📦 Available products:', products);

      if (!products || products.length === 0) {
        Alert.alert('Error', 'Subscription not available. Please try again later.');
        return;
      }

      const subscriptionProduct = products[0];

      // Show confirmation with actual price from the store
      Alert.alert(
        'Subscribe to Property',
        `Subscribe to "${propertyName}"?\n\nPrice: ${subscriptionProduct.localizedPrice}/month\n\nYou'll get unlimited image processing for this property.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe',
            onPress: async () => {
              try {
                console.log(`💳 Requesting subscription purchase...`);
                
                // For Android with offers, use requestSubscription with subscriptionOffers
                if (Platform.OS === 'android' && subscriptionProduct.subscriptionOfferDetails && subscriptionProduct.subscriptionOfferDetails.length > 0) {
                  const firstOffer = subscriptionProduct.subscriptionOfferDetails[0];
                  console.log('📋 Using subscription offer:', {
                    offerToken: firstOffer.offerToken,
                    basePlanId: firstOffer.basePlanId,
                    offerId: firstOffer.offerId
                  });

                  const subscriptionOffers = [{
                    sku: subscriptionProduct.productId,
                    offerToken: firstOffer.offerToken,
                  }];

                  console.log('🔄 Calling RNIap.requestSubscription with offers (Android):', {
                    sku: subscriptionProduct.productId,
                    subscriptionOffers: subscriptionOffers
                  });

                  // Use requestSubscription with subscriptionOffers for Android (v12 format)
                  await RNIap.requestSubscription({
                    sku: subscriptionProduct.productId,
                    subscriptionOffers: subscriptionOffers,
                  });
                } else {
                  // For iOS, use requestSubscription
                  const subscriptionRequest = {
                    sku: subscriptionProduct.productId,
                    appAccountToken: propertyId, // Store property ID for later validation (iOS only)
                  };

                  console.log('🔄 Requesting subscription with:', subscriptionRequest);
                  await RNIap.requestSubscription(subscriptionRequest);
                }

                console.log('✅ Purchase request sent');
              } catch (error) {
                console.error('❌ Purchase request failed:', error);
                if (error.code !== 'E_USER_CANCELLED') {
                  Alert.alert('Error', 'Failed to start purchase. Please try again.');
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Failed to get subscription products:', error);
      Alert.alert('Error', 'Failed to load subscription options. Please try again.');
    }
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
        {!properties || properties.length === 0 ? (
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
          Array.isArray(properties) && properties.map(renderPropertyCard)
        )}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            • Start with {usage?.free_image_limit || SUBSCRIPTION_CONFIG.FREE_IMAGE_LIMIT} free images{'\n'}
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
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  usageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 10,
    letterSpacing: -0.4,
  },
  usageStats: {
    alignItems: 'center',
    marginBottom: 12,
  },
  usageCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.8,
  },
  usageLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    letterSpacing: -0.1,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(60, 60, 67, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  usageHint: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  propertyAddress: {
    fontSize: 15,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
    letterSpacing: -0.1,
  },
  subscriptionDetails: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
    paddingTop: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 15,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
  },
  cancelButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#FF3B30',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
    letterSpacing: -0.2,
  },
  subscribeSection: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
    paddingTop: 10,
  },
  benefitsBox: {
    marginBottom: 10,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  benefitText: {
    fontSize: 15,
    color: '#3C3C43',
    letterSpacing: -0.2,
  },
  subscribeButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  infoText: {
    fontSize: 15,
    color: '#007AFF',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
});

