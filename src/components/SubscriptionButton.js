import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../hooks/useSubscription';
import { colors } from '../theme/colors';

/**
 * Example component showing how to use the subscription hook
 * This can be used anywhere in the app where subscription purchase is needed
 */
export default function SubscriptionButton({ onPurchaseComplete, style, textStyle }) {
  const {
    isInitialized,
    isLoading,
    product,
    purchaseSubscription,
  } = useSubscription();

  const handlePress = async () => {
    if (!isInitialized) {
      alert('In-app purchases are not available on this device');
      return;
    }

    const result = await purchaseSubscription();
    if (result && onPurchaseComplete) {
      onPurchaseComplete(result);
    }
  };

  if (!isInitialized) {
    return (
      <TouchableOpacity style={[styles.button, styles.disabled, style]} disabled>
        <Text style={[styles.buttonText, textStyle]}>Purchases Unavailable</Text>
      </TouchableOpacity>
    );
  }

  const priceText = product?.localizedPrice 
    ? `Subscribe - ${product.localizedPrice}/month`
    : 'Subscribe';

  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.loading, style]}
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text style={[styles.buttonText, textStyle]}>{priceText}</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.icon} />
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary?.main || '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  disabled: {
    backgroundColor: '#CCCCCC',
  },
  loading: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  icon: {
    marginLeft: 4,
  },
});



