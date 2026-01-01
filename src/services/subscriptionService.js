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
      console.log('🛒 Initializing StoreKit connection...');
      console.log('📱 Platform:', Platform.OS);
      console.log('📱 Is iOS:', Platform.OS === 'ios');
      
      const connectionResult = await RNIap.initConnection();
      console.log('📡 initConnection result:', connectionResult);
      
      // Small delay to ensure StoreKit is fully ready
      // This helps StoreKit Configuration file to be loaded
      console.log('⏳ Waiting for StoreKit to be ready...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      this.isInitialized = true;
      console.log('✅ StoreKit connection initialized and ready');

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
      // react-native-iap v12+ requires { skus: [...] } format
      const products = await RNIap.getSubscriptions({ skus: [PRODUCT_ID] });
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
      
      // Validate product object
      if (!product || !product.productId) {
        console.error('❌ Invalid product object:', product);
        throw new Error('Invalid product information. Please try again.');
      }
      
      const productId = product.productId;
      console.log('💳 Requesting subscription purchase for:', productId);
      console.log('📦 Product details:', {
        productId: productId,
        title: product.title,
        price: product.localizedPrice
      });

      // Request the subscription purchase
      // react-native-iap v12+ requires object format: { sku: productId }
      // The purchaseUpdatedListener will handle the receipt verification
      console.log('🔄 Calling RNIap.requestSubscription with:', { sku: productId });
      await RNIap.requestSubscription({
        sku: productId,
      });

      console.log('✅ Purchase request sent successfully');
      return product;
    } catch (error) {
      console.error('Error requesting subscription:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        name: error?.name
      });
      
      // Handle cancellation gracefully
      if (error && typeof error === 'object' && 'code' in error && error.code === 'E_USER_CANCELLED') {
        return null;
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async getReceiptData() {
    if (Platform.OS !== 'ios') {
      throw new Error('Receipt data retrieval is only available on iOS');
    }

    try {
      // Get the App Store receipt
      // Note: When using StoreKit Configuration for testing, receipts are test receipts
      // The backend should handle these correctly (may need sandbox validation)
      console.log('📄 Fetching receipt data from device...');
      const receiptData = await RNIap.getReceiptIOS();
      
      if (!receiptData) {
        throw new Error('Receipt data not available');
      }

      // Receipt data from react-native-iap is already base64 encoded
      console.log('✅ Receipt data retrieved, length:', receiptData.length);
      return receiptData;
    } catch (error) {
      console.error('❌ Error getting receipt data:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code
      });
      throw error;
    }
  }

  async verifyReceipt(receiptData) {
    try {
      console.log('🔄 Verifying receipt with backend...');
      
      const response = await api.post(API_ENDPOINTS.SUBSCRIPTION_VERIFY, {
        receiptData,
      });

      // Handle response format: { success: true, subscription: {...} }
      if (response.data?.success && response.data.subscription) {
        console.log('✅ Receipt verified successfully:', response.data.subscription);
        return response.data;
      } else if (response.data?.subscription) {
        // Fallback for response without success flag
        console.log('✅ Receipt verified successfully:', response.data.subscription);
        return response.data;
      } else {
        throw new Error('Invalid response format from receipt verification');
      }
    } catch (error) {
      console.error('❌ Receipt verification failed:', error);
      
      // Handle error response format: { error: "...", details: "...", status: ... }
      if (error.response?.data) {
        const errorData = error.response.data;
        const errorMessage = errorData.error || errorData.message || 'Failed to verify receipt';
        const errorDetails = errorData.details || '';
        const errorStatus = errorData.status;
        
        const fullError = new Error(errorMessage);
        fullError.details = errorDetails;
        fullError.status = errorStatus;
        throw fullError;
      }
      
      const errorMessage = error.message || 'Failed to verify receipt';
      throw new Error(errorMessage);
    }
  }

  async handlePurchaseUpdate(purchase) {
    try {
      console.log('🔄 Handling purchase update...');
      console.log('📦 Purchase object:', {
        transactionId: purchase?.transactionId,
        productId: purchase?.productId,
        transactionReceipt: purchase?.transactionReceipt ? 'present' : 'missing',
        purchaseToken: purchase?.purchaseToken,
        hasTransactionDate: !!purchase?.transactionDate
      });

      // Validate purchase object
      if (!purchase) {
        throw new Error('Purchase object is missing');
      }

      // Get receipt data from the purchase or refresh receipt
      let receiptData;
      
      if (Platform.OS === 'ios') {
        // For iOS, try multiple methods to get receipt data
        // StoreKit Configuration receipts might need special handling
        try {
          // First, try to get the full receipt from the device
          receiptData = await this.getReceiptData();
          console.log('✅ Got receipt from getReceiptIOS()');
        } catch (error) {
          console.warn('⚠️ getReceiptIOS() failed, trying transactionReceipt:', error.message);
          
          // Fallback to transaction receipt if available
          if (purchase.transactionReceipt) {
            receiptData = purchase.transactionReceipt;
            console.log('✅ Using transactionReceipt from purchase object');
          } else {
            // Last resort: try to get receipt again with a delay
            console.warn('⚠️ No transactionReceipt, retrying getReceiptIOS after delay...');
            await new Promise(resolve => setTimeout(resolve, 500));
            receiptData = await this.getReceiptData();
            console.log('✅ Got receipt on retry');
          }
        }

        if (!receiptData) {
          throw new Error('Could not retrieve receipt data');
        }

        console.log('📄 Receipt data length:', receiptData?.length || 0);
        console.log('📄 Receipt data preview:', receiptData?.substring(0, 100) + '...');
      } else {
        // For Android, use purchase token
        throw new Error('Android purchases not implemented in this service');
      }

      // Verify receipt with backend
      const verificationResult = await this.verifyReceipt(receiptData);

      // Finish the transaction - ensure purchase object is valid
      // Note: transactionId might be '0' for StoreKit Configuration testing
      const hasValidTransactionId = purchase?.transactionId && 
                                   purchase.transactionId !== '0' && 
                                   purchase.transactionId !== 0;
      
      if (purchase && hasValidTransactionId) {
        try {
          await RNIap.finishTransaction(purchase);
          console.log('✅ Transaction finished successfully');
        } catch (finishError) {
          console.error('⚠️ Error finishing transaction:', finishError);
          // Don't throw - verification succeeded, transaction finishing is secondary
        }
      } else {
        console.warn('⚠️ Cannot finish transaction - invalid transactionId');
        console.warn('Purchase object details:', {
          hasPurchase: !!purchase,
          transactionId: purchase?.transactionId,
          transactionIdType: typeof purchase?.transactionId,
          productId: purchase?.productId,
          transactionDate: purchase?.transactionDate
        });
        // For StoreKit Configuration, transactionId might be '0' which is normal
        // We'll skip finishing in this case as it's a test transaction
        if (purchase?.transactionId === '0' || purchase?.transactionId === 0) {
          console.log('ℹ️ StoreKit Configuration test transaction - skipping finishTransaction');
        }
      }

      // Notify callbacks
      this.notifyPurchaseComplete({
        success: true,
        subscription: verificationResult.subscription,
      });

      return verificationResult;
    } catch (error) {
      console.error('❌ Failed to handle purchase:', error);
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        status: error?.status,
        code: error?.code
      });
      
      // Still try to finish the transaction to avoid stuck purchases
      // But only if purchase object is valid and has a real transactionId
      // Note: transactionId might be '0' for StoreKit Configuration testing
      try {
        const hasValidTransactionId = purchase && 
                                     purchase.transactionId && 
                                     purchase.transactionId !== '0' && 
                                     purchase.transactionId !== 0 &&
                                     purchase.transactionId !== '';
        
        if (hasValidTransactionId) {
          try {
            await RNIap.finishTransaction(purchase, false);
            console.log('✅ Transaction finished (after error)');
          } catch (finishError) {
            // Only log if it's not about missing transactionId
            if (!finishError?.message?.includes('transactionId') && 
                !finishError?.message?.includes('undefined')) {
              console.error('❌ Error finishing transaction:', finishError);
              console.error('Finish error details:', {
                message: finishError?.message,
                code: finishError?.code
              });
            } else {
              console.log('ℹ️ Skipping finishTransaction - invalid transactionId (expected for StoreKit Configuration)');
            }
          }
        } else {
          // For StoreKit Configuration test transactions, this is normal
          const isStoreKitTest = purchase?.transactionId === '0' || 
                                purchase?.transactionId === 0 || 
                                !purchase?.transactionId;
          
          if (isStoreKitTest) {
            console.log('ℹ️ StoreKit Configuration test transaction - skipping finishTransaction (this is normal)');
          } else {
            console.warn('⚠️ Cannot finish transaction - purchase object invalid:', {
              hasPurchase: !!purchase,
              transactionId: purchase?.transactionId,
              transactionIdType: typeof purchase?.transactionId
            });
          }
        }
      } catch (transactionError) {
        // Catch any errors in the transaction finishing logic itself
        console.warn('⚠️ Error in transaction finishing logic:', transactionError?.message);
        // Don't throw - this is just cleanup
      }

      // Notify callbacks of error
      this.notifyPurchaseComplete({
        success: false,
        error: error.message || 'Failed to verify purchase',
        details: error.details,
        status: error.status
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
      
      // Handle response format: 
      // { is_active: true, status: "ACTIVE", platform: "ios", ... } or
      // { is_active: false, status: null, has_subscription: false, ... }
      const status = response.data;
      
      // Ensure consistent format
      return {
        is_active: status.is_active || false,
        status: status.status || null,
        platform: status.platform || null,
        product_id: status.product_id || null,
        expiration_date: status.expiration_date || null,
        auto_renewing: status.auto_renewing || false,
        has_subscription: status.has_subscription !== undefined ? status.has_subscription : (status.is_active || false),
        purchase_date: status.purchase_date || null,
        subscription: status.subscription || status, // Support both formats
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      
      // If 404 or no subscription, return default inactive status
      if (error.response?.status === 404) {
        return {
          is_active: false,
          status: null,
          platform: null,
          product_id: null,
          expiration_date: null,
          auto_renewing: false,
          has_subscription: false,
          purchase_date: null,
        };
      }
      
      throw error;
    }
  }

  // New methods following the guide pattern
  async fetchSubscriptionProductsFromBackend() {
    try {
      console.log('📡 Fetching product configuration from backend...');
      const response = await api.get(API_ENDPOINTS.SUBSCRIPTION_PRODUCTS);
      
      // Handle response format: { success: true, products: [...] }
      const products = response.data?.success 
        ? (response.data.products || [])
        : (response.data?.products || response.data || []);
      
      console.log(`✅ Fetched ${products.length} products from backend`);
      return products;
    } catch (error) {
      console.error('❌ Error fetching subscription products from backend:', error);
      throw error;
    }
  }

  async getSubscriptionProducts() {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('IAP not available');
        }
      }

      // Step 1: Get product configuration from backend
      console.log('📡 Fetching product configuration from backend...');
      const configProducts = await this.fetchSubscriptionProductsFromBackend();
      
      if (!configProducts || configProducts.length === 0) {
        console.warn('⚠️ No products found in backend configuration');
        return [];
      }

      // Step 2: Extract product IDs
      const productIds = configProducts.map(p => p.product_id);
      console.log('📦 Product IDs to fetch from StoreKit:', productIds);

      // Step 3: Fetch subscription products from Apple StoreKit
      // IMPORTANT: Use getSubscriptions() for subscription products, not getProducts()
      console.log('🍎 Fetching subscription products from Apple StoreKit...');
      console.log('📋 Requesting product IDs:', JSON.stringify(productIds));
      console.log('📋 Product IDs count:', productIds.length);
      
      let appleProducts = [];
      
      try {
        // For subscriptions, use getSubscriptions() with object containing skus array
        // react-native-iap v12+ requires { skus: [...] } format
        console.log('🔄 Calling RNIap.getSubscriptions with:', { skus: productIds });
        appleProducts = await RNIap.getSubscriptions({ skus: productIds });
        
        console.log(`✅ StoreKit returned ${appleProducts?.length || 0} products`);
        
        if (appleProducts && appleProducts.length > 0) {
          console.log('📦 Products found:');
          appleProducts.forEach((product, index) => {
            console.log(`  [${index + 1}] ${product.productId}:`, {
              title: product.title,
              price: product.localizedPrice,
              currency: product.currency,
              description: product.description?.substring(0, 50) + '...'
            });
          });
        } else {
          console.warn('⚠️ StoreKit returned empty array - no products found');
          console.warn('   This usually means:');
          console.warn('   1. Product IDs don\'t match StoreKit Configuration file');
          console.warn('   2. App is not running with StoreKit Configuration enabled');
          console.warn('   3. StoreKit Configuration file not properly loaded');
          console.warn('   4. Running through Expo Go (StoreKit only works in native builds)');
        }
      } catch (storeKitError) {
        console.error('❌ StoreKit error fetching subscriptions:', storeKitError);
        console.error('Error type:', typeof storeKitError);
        console.error('Error code:', storeKitError?.code);
        console.error('Error message:', storeKitError?.message);
        console.error('Error name:', storeKitError?.name);
        console.error('Requested product IDs:', JSON.stringify(productIds));
        
        // Detailed error handling
        if (storeKitError.code === 'E_ITEM_NOT_AVAILABLE' || 
            storeKitError.message?.includes('not available') ||
            storeKitError.message?.includes('not found')) {
          console.error('');
          console.error('═══════════════════════════════════════════════════════');
          console.error('⚠️ PRODUCTS NOT FOUND IN STOREKIT');
          console.error('═══════════════════════════════════════════════════════');
          console.error('Requested IDs:', productIds);
          console.error('Expected ID:  property_subscription_monthly');
          console.error('');
          console.error('TROUBLESHOOTING STEPS:');
          console.error('1. ✅ Verify Xcode Scheme has StoreKit Configuration:');
          console.error('   Product > Scheme > Edit Scheme > Run > Options');
          console.error('   StoreKit Configuration: Products.storekit');
          console.error('');
          console.error('2. ✅ Verify product ID matches exactly (case-sensitive):');
          console.error('   Requested:', productIds[0]);
          console.error('   StoreKit file:', 'property_subscription_monthly');
          console.error('   Match:', productIds[0] === 'property_subscription_monthly');
          console.error('');
          console.error('3. ✅ Ensure app is running from Xcode (not Expo Go)');
          console.error('   StoreKit Configuration only works in native builds');
          console.error('');
          console.error('4. ✅ Check StoreKit Configuration file exists:');
          console.error('   ios/Products.storekit');
          console.error('');
          console.error('5. ✅ Try cleaning build folder:');
          console.error('   Product > Clean Build Folder (Shift+Cmd+K)');
          console.error('   Then rebuild and run from Xcode');
          console.error('═══════════════════════════════════════════════════════');
        } else if (storeKitError.code === 'E_SERVICE_ERROR' || 
                   storeKitError.message?.includes('connection')) {
          console.error('⚠️ StoreKit connection error - IAP may not be available');
          console.error('   This can happen if running in Expo Go or simulator without proper setup');
        }
        
        throw storeKitError;
      }

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

  async purchaseSubscriptionById(productId) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('IAP not available');
        }
      }

      console.log(`🛒 Initiating purchase for ${productId}...`);

      // Request purchase from StoreKit
      // react-native-iap v12+ requires object format: { sku: productId }
      // Note: requestSubscription doesn't return a purchase object directly
      // The purchaseUpdatedListener will receive the purchase event
      await RNIap.requestSubscription({
        sku: productId,
      });

      console.log('✅ Purchase request sent - waiting for purchase update...');

      // Verify receipt with backend (handled by purchaseUpdatedListener)
      // The purchaseUpdatedListener will handle verification automatically

      return purchase;
    } catch (error) {
      console.error('❌ Purchase error:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        name: error?.name,
        isError: error instanceof Error,
        isString: typeof error === 'string'
      });
      
      // Handle different error types safely
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'E_USER_CANCELLED') {
          throw new Error('Purchase was cancelled');
        } else if (error.code === 'E_NETWORK_ERROR') {
          throw new Error('Network error. Please check your connection.');
        }
      }
      
      // If error is a string, use it directly
      if (typeof error === 'string') {
        throw new Error(error);
      }
      
      // Otherwise, use error message or default
      const errorMessage = error?.message || error?.toString() || 'Purchase failed. Please try again.';
      throw new Error(errorMessage);
    }
  }
}

export default new SubscriptionService();

