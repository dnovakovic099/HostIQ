# React Native Subscription Implementation Guide

## Overview

This guide shows how to implement subscription display and purchase in your React Native iOS app using:
- Backend API: `GET /api/subscriptions/products` (product configuration)
- StoreKit (via react-native-iap): Fetch pricing from Apple
- Backend API: `POST /api/subscriptions/verify` (verify purchase)

## Prerequisites

### 1. Install Required Packages

```bash
npm install react-native-iap
# or
yarn add react-native-iap
```

For iOS, you'll also need to run:
```bash
cd ios && pod install
```

### 2. Backend API Endpoint

**Base URL**: Your API base URL (e.g., `http://localhost:3000/api` or your production URL)

## Implementation Steps

### Step 1: Setup react-native-iap

```javascript
// services/subscriptionService.js
import * as RNIap from 'react-native-iap';

// Product IDs - will be fetched from backend
let productIds = [];

// Initialize StoreKit connection
export async function initIAP() {
  try {
    await RNIap.initConnection();
    console.log('✅ StoreKit connection initialized');
  } catch (error) {
    console.error('❌ Failed to initialize StoreKit:', error);
    throw error;
  }
}

// Cleanup connection
export async function closeIAP() {
  try {
    await RNIap.endConnection();
    console.log('✅ StoreKit connection closed');
  } catch (error) {
    console.error('❌ Error closing StoreKit:', error);
  }
}
```

### Step 2: Fetch Product Configuration from Backend

```javascript
// services/apiService.js
import { getAuthToken } from './authService'; // Your auth service

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Development
  : 'https://your-production-api.com/api';  // Production

export async function fetchSubscriptionProducts() {
  try {
    const token = await getAuthToken(); // Get your JWT token
    
    const response = await fetch(`${API_BASE_URL}/subscriptions/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.products; // Array of product configurations
  } catch (error) {
    console.error('❌ Error fetching subscription products:', error);
    throw error;
  }
}
```

### Step 3: Fetch Pricing from Apple (StoreKit)

```javascript
// services/subscriptionService.js
import * as RNIap from 'react-native-iap';
import { fetchSubscriptionProducts } from './apiService';

// Combined product data (config + pricing)
export interface SubscriptionProduct {
  // From backend config
  product_id: string;
  name: string;
  description: string;
  duration: string;
  duration_months: number;
  features: string[];
  platform: string;
  
  // From StoreKit (Apple)
  price: string;              // e.g., "$9.99"
  currency: string;           // e.g., "USD"
  localizedPrice: string;     // e.g., "9,99 €"
  title: string;              // Localized title from App Store
  subscriptionPeriodUnit: string; // "MONTH", "WEEK", etc.
  subscriptionPeriodNumber: number;
  
  // Purchase state
  isAvailable: boolean;
}

export async function getSubscriptionProducts(): Promise<SubscriptionProduct[]> {
  try {
    // Step 1: Get product configuration from backend
    console.log('📡 Fetching product configuration from backend...');
    const configProducts = await fetchSubscriptionProducts();
    
    if (!configProducts || configProducts.length === 0) {
      console.warn('⚠️ No products found in backend configuration');
      return [];
    }

    // Step 2: Extract product IDs
    const productIds = configProducts.map(p => p.product_id);
    console.log('📦 Product IDs:', productIds);

    // Step 3: Fetch products from Apple StoreKit
    console.log('🍎 Fetching product pricing from Apple...');
    const appleProducts = await RNIap.getProducts({ skus: productIds });

    if (!appleProducts || appleProducts.length === 0) {
      console.warn('⚠️ No products found in App Store');
      // Return config without pricing
      return configProducts.map(config => ({
        ...config,
        price: 'Price unavailable',
        currency: '',
        localizedPrice: '',
        title: config.name,
        subscriptionPeriodUnit: '',
        subscriptionPeriodNumber: 0,
        isAvailable: false
      }));
    }

    // Step 4: Combine backend config with Apple pricing
    const combinedProducts = configProducts.map(config => {
      const appleProduct = appleProducts.find(
        p => p.productId === config.product_id
      );

      if (!appleProduct) {
        console.warn(`⚠️ Product ${config.product_id} not found in App Store`);
        return {
          ...config,
          price: 'Price unavailable',
          currency: '',
          localizedPrice: '',
          title: config.name,
          subscriptionPeriodUnit: '',
          subscriptionPeriodNumber: 0,
          isAvailable: false
        };
      }

      return {
        ...config,
        price: appleProduct.localizedPrice || appleProduct.price || '',
        currency: appleProduct.currency || '',
        localizedPrice: appleProduct.localizedPrice || '',
        title: appleProduct.title || config.name,
        subscriptionPeriodUnit: appleProduct.subscriptionPeriodUnit || '',
        subscriptionPeriodNumber: appleProduct.subscriptionPeriodNumber || 0,
        isAvailable: true
      };
    });

    console.log(`✅ Successfully loaded ${combinedProducts.length} subscription products`);
    return combinedProducts;
  } catch (error) {
    console.error('❌ Error getting subscription products:', error);
    throw error;
  }
}
```

### Step 4: Create Subscription Screen Component

```javascript
// screens/SubscriptionScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { getSubscriptionProducts, initIAP, closeIAP, purchaseSubscription } from '../services/subscriptionService';

export default function SubscriptionScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
    
    return () => {
      closeIAP();
    };
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize StoreKit
      await initIAP();
      
      // Fetch products (config + pricing)
      const subscriptionProducts = await getSubscriptionProducts();
      setProducts(subscriptionProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.message);
      Alert.alert('Error', 'Failed to load subscription products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product) => {
    try {
      if (!product.isAvailable) {
        Alert.alert('Unavailable', 'This subscription is currently unavailable.');
        return;
      }

      Alert.alert(
        'Confirm Purchase',
        `Subscribe to ${product.name} for ${product.localizedPrice}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe',
            onPress: async () => {
              await purchaseSubscription(product.product_id);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to initiate purchase. Please try again.');
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.localizedPrice}</Text>
      </View>
      
      <Text style={styles.productDescription}>{item.description}</Text>
      <Text style={styles.productDuration}>{item.duration}</Text>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Features:</Text>
        {item.features.map((feature, index) => (
          <Text key={index} style={styles.featureItem}>
            ✓ {feature}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.subscribeButton,
          !item.isAvailable && styles.subscribeButtonDisabled
        ]}
        onPress={() => handlePurchase(item)}
        disabled={!item.isAvailable || loading}
      >
        <Text style={styles.subscribeButtonText}>
          {item.isAvailable ? 'Subscribe' : 'Unavailable'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Subscription</Text>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.product_id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 60
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  listContainer: {
    paddingBottom: 20
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  productDuration: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16
  },
  featuresContainer: {
    marginBottom: 20
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  featureItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    paddingLeft: 4
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  subscribeButtonDisabled: {
    backgroundColor: '#ccc'
  },
  subscribeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});
```

### Step 5: Handle Purchase and Verify Receipt

```javascript
// services/subscriptionService.js
import * as RNIap from 'react-native-iap';
import { getAuthToken } from './authService';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';

export async function purchaseSubscription(productId) {
  try {
    console.log(`🛒 Initiating purchase for ${productId}...`);

    // Request purchase from StoreKit
    const purchase = await RNIap.requestSubscription(productId, false); // false = not upgrade/downgrade

    console.log('✅ Purchase successful:', purchase.transactionReceipt);

    // Verify receipt with backend
    await verifyReceiptWithBackend(purchase.transactionReceipt);

    // Acknowledge purchase
    if (purchase.transactionReceipt) {
      await RNIap.finishTransaction(purchase);
      console.log('✅ Transaction finished');
    }

    return purchase;
  } catch (error) {
    console.error('❌ Purchase error:', error);
    
    if (error.code === 'E_USER_CANCELLED') {
      throw new Error('Purchase was cancelled');
    } else if (error.code === 'E_NETWORK_ERROR') {
      throw new Error('Network error. Please check your connection.');
    } else {
      throw new Error('Purchase failed. Please try again.');
    }
  }
}

async function verifyReceiptWithBackend(receiptData) {
  try {
    const token = await getAuthToken();
    
    console.log('📡 Verifying receipt with backend...');
    
    const response = await fetch(`${API_BASE_URL}/subscriptions/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        receiptData: receiptData
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Receipt verification failed');
    }

    console.log('✅ Receipt verified successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Receipt verification error:', error);
    throw error;
  }
}

// Listen for purchase updates (for subscriptions that auto-renew)
export function setupPurchaseListener(onPurchaseUpdate) {
  return RNIap.purchaseUpdatedListener((purchase) => {
    console.log('🔄 Purchase update:', purchase);
    verifyReceiptWithBackend(purchase.transactionReceipt)
      .then(() => {
        onPurchaseUpdate(purchase);
      })
      .catch(error => {
        console.error('Error verifying purchase update:', error);
      });
  });
}
```

### Step 6: Complete Service File

```javascript
// services/subscriptionService.js
import * as RNIap from 'react-native-iap';
import { fetchSubscriptionProducts } from './apiService';
import { getAuthToken } from './authService';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';

// Initialize StoreKit connection
export async function initIAP() {
  try {
    await RNIap.initConnection();
    console.log('✅ StoreKit connection initialized');
  } catch (error) {
    console.error('❌ Failed to initialize StoreKit:', error);
    throw error;
  }
}

// Cleanup connection
export async function closeIAP() {
  try {
    await RNIap.endConnection();
    console.log('✅ StoreKit connection closed');
  } catch (error) {
    console.error('❌ Error closing StoreKit:', error);
  }
}

// Get subscription products (config + pricing)
export async function getSubscriptionProducts() {
  try {
    // Get config from backend
    const configProducts = await fetchSubscriptionProducts();
    
    if (!configProducts || configProducts.length === 0) {
      return [];
    }

    // Get pricing from Apple
    const productIds = configProducts.map(p => p.product_id);
    const appleProducts = await RNIap.getProducts({ skus: productIds });

    // Combine both
    return configProducts.map(config => {
      const appleProduct = appleProducts.find(p => p.productId === config.product_id);
      return {
        ...config,
        price: appleProduct?.localizedPrice || '',
        currency: appleProduct?.currency || '',
        localizedPrice: appleProduct?.localizedPrice || '',
        title: appleProduct?.title || config.name,
        subscriptionPeriodUnit: appleProduct?.subscriptionPeriodUnit || '',
        subscriptionPeriodNumber: appleProduct?.subscriptionPeriodNumber || 0,
        isAvailable: !!appleProduct
      };
    });
  } catch (error) {
    console.error('❌ Error getting subscription products:', error);
    throw error;
  }
}

// Purchase subscription
export async function purchaseSubscription(productId) {
  try {
    const purchase = await RNIap.requestSubscription(productId, false);
    await verifyReceiptWithBackend(purchase.transactionReceipt);
    
    if (purchase.transactionReceipt) {
      await RNIap.finishTransaction(purchase);
    }
    
    return purchase;
  } catch (error) {
    console.error('❌ Purchase error:', error);
    throw error;
  }
}

// Verify receipt with backend
async function verifyReceiptWithBackend(receiptData) {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/subscriptions/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ receiptData })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Receipt verification failed');
  }

  return data;
}

// Setup purchase listener for renewals
export function setupPurchaseListener(onPurchaseUpdate) {
  return RNIap.purchaseUpdatedListener((purchase) => {
    verifyReceiptWithBackend(purchase.transactionReceipt)
      .then(() => onPurchaseUpdate(purchase))
      .catch(error => console.error('Error verifying purchase update:', error));
  });
}

// Export API service function (if needed separately)
export { fetchSubscriptionProducts };
```

### Step 7: Usage in Your App

```javascript
// App.js or navigation setup
import SubscriptionScreen from './screens/SubscriptionScreen';

// Add to your navigation stack
<Stack.Screen 
  name="Subscription" 
  component={SubscriptionScreen} 
/>
```

## Testing

### 1. Development Testing (Sandbox)

1. Create a sandbox test account in App Store Connect
2. Sign out of your Apple ID in Settings
3. Run the app and try to purchase
4. Sign in with sandbox test account when prompted
5. Complete purchase (sandbox - no real charge)

### 2. Check Backend Logs

After purchase, check your backend logs for:
- `🍎 Verifying Apple subscription receipt for user...`
- `✅ Apple receipt validated`
- `✅ Created new subscription for user...`

## Error Handling

Common error codes from react-native-iap:
- `E_USER_CANCELLED`: User cancelled the purchase
- `E_NETWORK_ERROR`: Network connection issue
- `E_SERVICE_ERROR`: App Store service error
- `E_UNKNOWN`: Unknown error

## Important Notes

1. **Product IDs must match**: The `product_id` in your backend must exactly match the Product ID in App Store Connect
2. **Sandbox vs Production**: Use sandbox for testing, production for release
3. **Receipt Validation**: Always verify receipts with your backend (never trust client-side only)
4. **Transaction Completion**: Always call `finishTransaction()` after successful verification

## API Endpoints Summary

- `GET /api/subscriptions/products` - Get product configuration
- `POST /api/subscriptions/verify` - Verify purchase receipt
- `GET /api/subscriptions/status` - Get user's current subscription status

## Next Steps

1. Install `react-native-iap` package
2. Implement the service files above
3. Create the SubscriptionScreen component
4. Test with sandbox account
5. Integrate into your app navigation

