import { Platform, Alert } from 'react-native';
import * as RNIap from 'react-native-iap';
import api from '../api/client';
import { API_ENDPOINTS } from '../config/api';

const PRODUCT_ID = 'property_subscription_monthly';

class SubscriptionService {
  constructor() {
    this.isInitialized = false;
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription = null;
    this.purchaseCallbacks = [];
  }

  onPurchaseComplete(callback) {
    this.purchaseCallbacks.push(callback);
    return () => {
      this.purchaseCallbacks = this.purchaseCallbacks.filter(cb => cb !== callback);
    };
  }

  notifyPurchaseComplete(result) {
    this.purchaseCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in purchase callback:', error);
      }
    });
  }

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('🛒 Initializing IAP connection...');
      await RNIap.initConnection();
      this.isInitialized = true;

      // Set up purchase listeners
      this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
        async (purchase) => {
          console.log('📦 Purchase update received:', purchase);
          await this.handlePurchaseUpdate(purchase);
        }
      );

      this.purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
        console.warn('❌ Purchase error:', error);
        if (error.code !== 'E_USER_CANCELLED') {
          Alert.alert('Purchase Error', error.message || 'An error occurred during purchase');
        }
      });

      console.log('✅ IAP connection initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
      this.isInitialized = false;
      return false;
    }
  }

  async cleanup() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }

    if (this.isInitialized) {
      try {
        await RNIap.endConnection();
        this.isInitialized = false;
      } catch (error) {
        console.error('Error ending IAP connection:', error);
      }
    }
  }

  async getAvailableProducts() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('IAP not available');
      }
    }

    try {
      const products = await RNIap.getSubscriptions([PRODUCT_ID]);
      return products || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async requestSubscription() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('IAP not available');
      }
    }

    try {
      // Get product info first to ensure it's available
      const products = await this.getAvailableProducts();
      if (!products || products.length === 0) {
        throw new Error('Subscription product not available in store');
      }

      const product = products[0];
      console.log('💳 Requesting subscription purchase for:', product.productId);

      // Request the subscription purchase
      // The purchaseUpdatedListener will handle the receipt verification
      await RNIap.requestSubscription({
        sku: product.productId,
      });

      return product;
    } catch (error) {
      console.error('Error requesting subscription:', error);
      if (error.code !== 'E_USER_CANCELLED') {
        throw error;
      }
      return null;
    }
  }

  async getReceiptData() {
    if (Platform.OS !== 'ios') {
      throw new Error('Receipt data retrieval is only available on iOS');
    }

    try {
      // Get the App Store receipt
      const receiptData = await RNIap.getReceiptIOS();
      if (!receiptData) {
        throw new Error('Receipt data not available');
      }

      // Receipt data from react-native-iap is already base64 encoded
      return receiptData;
    } catch (error) {
      console.error('Error getting receipt data:', error);
      throw error;
    }
  }

  async verifyReceipt(receiptData) {
    try {
      console.log('🔄 Verifying receipt with backend...');
      
      const response = await api.post(API_ENDPOINTS.SUBSCRIPTION_VERIFY, {
        receiptData,
      });

      console.log('✅ Receipt verified successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Receipt verification failed:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to verify receipt';

      throw new Error(errorMessage);
    }
  }

  async handlePurchaseUpdate(purchase) {
    try {
      console.log('🔄 Handling purchase update...');

      // Get receipt data from the purchase or refresh receipt
      let receiptData;
      
      if (Platform.OS === 'ios') {
        // For iOS, get the receipt data
        // react-native-iap provides transactionReceipt, but we should use getReceiptIOS for the full receipt
        try {
          receiptData = await this.getReceiptData();
        } catch (error) {
          // Fallback to transaction receipt if available
          if (purchase.transactionReceipt) {
            receiptData = purchase.transactionReceipt;
          } else {
            throw new Error('Could not retrieve receipt data');
          }
        }
      } else {
        // For Android, use purchase token
        throw new Error('Android purchases not implemented in this service');
      }

      // Verify receipt with backend
      const verificationResult = await this.verifyReceipt(receiptData);

      // Finish the transaction
      await RNIap.finishTransaction(purchase);
      console.log('✅ Transaction finished successfully');

      // Notify callbacks
      this.notifyPurchaseComplete({
        success: true,
        subscription: verificationResult.subscription,
      });

      return verificationResult;
    } catch (error) {
      console.error('❌ Failed to handle purchase:', error);
      
      // Still finish the transaction to avoid stuck purchases
      try {
        await RNIap.finishTransaction(purchase, false);
      } catch (finishError) {
        console.error('Error finishing transaction:', finishError);
      }

      // Notify callbacks of error
      this.notifyPurchaseComplete({
        success: false,
        error: error.message || 'Failed to verify purchase',
      });

      throw error;
    }
  }

  async purchaseSubscription() {
    try {
      // Initialize if needed
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('In-app purchases are not available on this device');
        }
      }

      // Request subscription purchase
      // The purchase flow will be handled by the purchaseUpdatedListener
      const product = await this.requestSubscription();
      return product;
    } catch (error) {
      console.error('Purchase subscription error:', error);
      throw error;
    }
  }

  async getSubscriptionStatus() {
    try {
      const response = await api.get(API_ENDPOINTS.SUBSCRIPTION_STATUS);
      return response.data;
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw error;
    }
  }
}

export default new SubscriptionService();

