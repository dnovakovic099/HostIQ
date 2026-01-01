import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import subscriptionService from '../services/subscriptionService';
import api from '../api/client';
import { API_ENDPOINTS } from '../config/api';

export const useSubscription = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const initialized = await subscriptionService.initialize();
        setIsInitialized(initialized);

        if (initialized) {
          // Load product info
          try {
            const products = await subscriptionService.getAvailableProducts();
            if (products && products.length > 0) {
              setProduct(products[0]);
            }
          } catch (err) {
            console.warn('Could not load product info:', err);
          }

          // Load subscription status
          try {
            const status = await subscriptionService.getSubscriptionStatus();
            setSubscriptionStatus(status);
          } catch (err) {
            console.warn('Could not load subscription status:', err);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
      }
    };

    initialize();

    // Set up purchase completion listener
    const unsubscribe = subscriptionService.onPurchaseComplete((result) => {
      if (result.success) {
        // Refresh subscription status
        refreshSubscriptionStatus();
        setError(null);
      } else {
        setError(result.error);
      }
    });

    return () => {
      unsubscribe();
      subscriptionService.cleanup();
    };
  }, [refreshSubscriptionStatus]);

  const purchaseSubscription = useCallback(async () => {
    if (!isInitialized) {
      Alert.alert('Error', 'In-app purchases are not available on this device');
      return null;
    }

    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'iOS subscription purchases are only available on iOS devices');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await subscriptionService.purchaseSubscription();
      // The purchaseUpdatedListener in subscriptionService will handle verification
      // Purchase completion will be notified via the callback set up in useEffect
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to start subscription purchase';
      setError(errorMessage);
      
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Error', errorMessage);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const refreshSubscriptionStatus = useCallback(async () => {
    try {
      const status = await subscriptionService.getSubscriptionStatus();
      setSubscriptionStatus(status);
      return status;
    } catch (err) {
      console.error('Error refreshing subscription status:', err);
      setError(err.message);
      return null;
    }
  }, []);

  return {
    isInitialized,
    isLoading,
    product,
    subscriptionStatus,
    error,
    purchaseSubscription,
    refreshSubscriptionStatus,
    // Handle both flat format (is_active) and nested format (subscription.is_active)
    isActive: subscriptionStatus?.is_active || subscriptionStatus?.subscription?.is_active || false,
  };
};

