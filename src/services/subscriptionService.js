import { Platform, Alert } from 'react-native';
import * as RNIap from 'react-native-iap';
import api from '../api/client';
import { API_ENDPOINTS } from '../config/api';

const PRODUCT_ID = 'hostiq_pro_subscription';

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
      console.log('🔍 Fetching subscription products from store...');
      console.log('📦 Product ID:', PRODUCT_ID);
      console.log('📱 Platform:', Platform.OS);
      
      // react-native-iap v12+ requires { skus: [...] } format
      // Works for both iOS and Android
      const products = await RNIap.getSubscriptions({ skus: [PRODUCT_ID] });
      
      console.log('📦 Products returned:', products?.length || 0);
      if (products && products.length > 0) {
        console.log('✅ Product found:', {
          productId: products[0].productId,
          title: products[0].title,
          price: products[0].localizedPrice
        });
      } else {
        console.warn('⚠️ No products found in store');
        console.warn('   This usually means:');
        if (Platform.OS === 'ios') {
          console.warn('   1. StoreKit Configuration not enabled in Xcode scheme');
          console.warn('   2. App not running from Xcode (StoreKit only works in native builds)');
          console.warn('   3. Product ID mismatch with StoreKit Configuration file');
          console.warn('   4. Running in Expo Go (StoreKit doesn\'t work in Expo Go)');
        } else {
          console.warn('   1. Product not configured in Google Play Console');
          console.warn('   2. App not signed with correct keystore');
          console.warn('   3. Product ID mismatch');
        }
      }
      
      return products || [];
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      console.error('   Error code:', error?.code);
      console.error('   Error message:', error?.message);
      console.error('   Product ID requested:', PRODUCT_ID);
      
      // Provide more helpful error message
      if (error?.code === 'E_ITEM_NOT_AVAILABLE' || 
          error?.message?.includes('not available') ||
          error?.message?.includes('not found')) {
        const platformHint = Platform.OS === 'ios' 
          ? '\n\nFor iOS: Ensure StoreKit Configuration is enabled in Xcode scheme and app is running from Xcode.'
          : '\n\nFor Android: Ensure product is configured in Google Play Console.';
        throw new Error(`Product "${PRODUCT_ID}" not found in ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'} store.${platformHint}`);
      }
      
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
      console.log('🔍 Checking if product is available before purchase...');
      const products = await this.getAvailableProducts();
      if (!products || products.length === 0) {
        const errorMsg = Platform.OS === 'ios'
          ? `Subscription product "${PRODUCT_ID}" not found in App Store.\n\nTroubleshooting:\n1. Ensure StoreKit Configuration is enabled in Xcode scheme\n2. Run app from Xcode (not Expo Go)\n3. Check Products.storekit file has correct product ID`
          : `Subscription product "${PRODUCT_ID}" not found in Google Play.\n\nTroubleshooting:\n1. Ensure product is configured in Google Play Console\n2. Check product ID matches exactly`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
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
        price: product.localizedPrice,
        subscriptionOfferDetails: product.subscriptionOfferDetails?.length || 0
      });

      // For Android with offers, use requestSubscription with subscriptionOffers
      if (Platform.OS === 'android' && product.subscriptionOfferDetails && product.subscriptionOfferDetails.length > 0) {
        // Find the offer with the free-trial offer ID, or use the first available
        let selectedOffer = product.subscriptionOfferDetails.find(
          offer => offer.offerId === 'free-trial'
        );

        // Fallback to first offer if free-trial not found
        if (!selectedOffer) {
          selectedOffer = product.subscriptionOfferDetails[0];
        }

        console.log('📋 Using subscription offer:', {
          offerToken: selectedOffer.offerToken,
          basePlanId: selectedOffer.basePlanId,
          offerId: selectedOffer.offerId,
          pricingPhases: selectedOffer.pricingPhases?.length || 0
        });

        // Construct subscription offers array with proper structure
        const subscriptionOffers = [{
          sku: productId,
          offerToken: selectedOffer.offerToken,
        }];

        console.log('🔄 Calling RNIap.requestSubscription with offers (Android):', {
          sku: productId,
          subscriptionOffers: subscriptionOffers
        });

        // Use requestSubscription with subscriptionOffers for Android (v12 format)
        await RNIap.requestSubscription({
          sku: productId,
          subscriptionOffers: subscriptionOffers,
        });
      } else {
        // For iOS or Android without offers, use simple requestSubscription
        console.log('🔄 Calling RNIap.requestSubscription with:', { sku: productId });
        await RNIap.requestSubscription({
          sku: productId,
        });
      }

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
    if (Platform.OS === 'ios') {
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
    } else if (Platform.OS === 'android') {
      // For Android, we don't need to get receipt data separately
      // The purchase object contains the purchaseToken which is used for verification
      throw new Error('Android receipts are handled via purchase token in purchase object');
    } else {
      throw new Error('Platform not supported');
    }
  }

  async verifyReceipt(receiptData, purchaseToken = null, platform = null, androidPurchaseData = null) {
    try {
      console.log('🔄 Verifying receipt with backend...');
      
      const payload = {
        platform: platform || Platform.OS,
      };

      if (Platform.OS === 'ios') {
        payload.receiptData = receiptData;
      } else if (Platform.OS === 'android') {
        payload.purchaseToken = purchaseToken;
        payload.packageName = 'com.hostiq.app';
        if (androidPurchaseData) {
          payload.productId = androidPurchaseData.productId;
          payload.orderId = androidPurchaseData.orderId;
        }
      }
      
      const response = await api.post(API_ENDPOINTS.SUBSCRIPTION_VERIFY, payload);

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
      let receiptData = null;
      let purchaseToken = null;
      
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
      } else if (Platform.OS === 'android') {
        // For Android, use purchase token from the purchase object
        purchaseToken = purchase.purchaseToken;
        if (!purchaseToken) {
          throw new Error('Purchase token not available in purchase object');
        }
        console.log('📄 Android purchase token retrieved');
        console.log('📄 Purchase token preview:', purchaseToken?.substring(0, 50) + '...');
        console.log('📄 Product ID:', purchase.productId);
        console.log('📄 Order ID:', purchase.orderId);
      } else {
        throw new Error('Platform not supported');
      }

      // Verify receipt with backend
      // For Android, pass the purchase object data along with token
      const verificationResult = await this.verifyReceipt(
        receiptData, 
        purchaseToken, 
        Platform.OS,
        Platform.OS === 'android' ? {
          productId: purchase.productId,
          orderId: purchase.orderId,
        } : null
      );

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
      
      // If 404, return fallback product data from pricing page
      if (error.response?.status === 404) {
        console.warn('⚠️ Backend endpoint not found, using fallback product data');
        return [{
          product_id: 'hostiq_pro_subscription',
          name: 'Pricing Pro',
          description: 'AI-powered pricing recommendations and market analysis',
          duration: 'monthly',
          duration_months: 1,
          features: [
            'Real-Time Market Analysis',
            'AI Price Recommendations',
            'Availability-Based Pricing',
            'Visibility Insights'
          ],
          platform: Platform.OS,
          price: '$29',
          currency: 'USD'
        }];
      }
      
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

      // Step 3: Fetch subscription products from store (iOS StoreKit or Android Google Play)
      const storeName = Platform.OS === 'ios' ? 'Apple StoreKit' : 'Google Play';
      console.log(`🛒 Fetching subscription products from ${storeName}...`);
      console.log('📋 Requesting product IDs:', JSON.stringify(productIds));
      console.log('📋 Product IDs count:', productIds.length);
      
      let storeProducts = [];
      
      try {
        // For subscriptions, use getSubscriptions() with object containing skus array
        // react-native-iap v12+ requires { skus: [...] } format
        // Works for both iOS and Android
        console.log('🔄 Calling RNIap.getSubscriptions with:', { skus: productIds });
        storeProducts = await RNIap.getSubscriptions({ skus: productIds });
        
        console.log(`✅ ${storeName} returned ${storeProducts?.length || 0} products`);
        
        if (storeProducts && storeProducts.length > 0) {
          console.log('📦 Products found:');
          storeProducts.forEach((product, index) => {
            console.log(`  [${index + 1}] ${product.productId}:`, {
              title: product.title,
              price: product.localizedPrice,
              currency: product.currency,
              description: product.description?.substring(0, 50) + '...'
            });
          });
        } else {
          console.warn(`⚠️ ${storeName} returned empty array - no products found`);
          if (Platform.OS === 'ios') {
            console.warn('   This usually means:');
            console.warn('   1. Product IDs don\'t match StoreKit Configuration file');
            console.warn('   2. App is not running with StoreKit Configuration enabled');
            console.warn('   3. StoreKit Configuration file not properly loaded');
            console.warn('   4. Running through Expo Go (StoreKit only works in native builds)');
          } else {
            console.warn('   This usually means:');
            console.warn('   1. Product IDs don\'t match Google Play Console');
            console.warn('   2. Products not published in Google Play Console');
            console.warn('   3. App not signed with correct keystore');
            console.warn('   4. Running in debug mode without proper setup');
          }
        }
      } catch (storeError) {
        console.error(`❌ ${storeName} error fetching subscriptions:`, storeError);
        console.error('Error type:', typeof storeError);
        console.error('Error code:', storeError?.code);
        console.error('Error message:', storeError?.message);
        console.error('Error name:', storeError?.name);
        console.error('Requested product IDs:', JSON.stringify(productIds));
        
        // Detailed error handling
        if (storeError.code === 'E_ITEM_NOT_AVAILABLE' || 
            storeError.message?.includes('not available') ||
            storeError.message?.includes('not found')) {
          console.error('');
          console.error('═══════════════════════════════════════════════════════');
          console.error(`⚠️ PRODUCTS NOT FOUND IN ${storeName.toUpperCase()}`);
          console.error('═══════════════════════════════════════════════════════');
          console.error('Requested IDs:', productIds);
          console.error('Expected ID:  hostiq_pro_subscription');
          if (Platform.OS === 'ios') {
            console.error('');
            console.error('TROUBLESHOOTING STEPS:');
            console.error('1. ✅ Verify Xcode Scheme has StoreKit Configuration:');
            console.error('   Product > Scheme > Edit Scheme > Run > Options');
            console.error('   StoreKit Configuration: Products.storekit');
            console.error('');
            console.error('2. ✅ Verify product ID matches exactly (case-sensitive):');
            console.error('   Requested:', productIds[0]);
            console.error('   StoreKit file:', 'hostiq_pro_subscription');
            console.error('   Match:', productIds[0] === 'hostiq_pro_subscription');
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
          } else {
            console.error('');
            console.error('TROUBLESHOOTING STEPS:');
            console.error('1. ✅ Verify product ID matches exactly in Google Play Console');
            console.error('2. ✅ Ensure products are published (not just draft)');
            console.error('3. ✅ Check app is signed with correct keystore');
            console.error('4. ✅ Verify Google Play Billing is enabled in app');
          }
          console.error('═══════════════════════════════════════════════════════');
        } else if (storeError.code === 'E_SERVICE_ERROR' || 
                   storeError.message?.includes('connection')) {
          console.error(`⚠️ ${storeName} connection error - IAP may not be available`);
          console.error('   This can happen if running in Expo Go or simulator without proper setup');
        }
        
        throw storeError;
      }

      if (!storeProducts || storeProducts.length === 0) {
        const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
        console.warn(`⚠️ No products found in ${storeName}`);
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

      // Step 4: Combine backend config with store pricing (iOS or Android)
      const combinedProducts = configProducts.map(config => {
        const storeProduct = storeProducts.find(
          p => p.productId === config.product_id
        );

        if (!storeProduct) {
          const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
          console.warn(`⚠️ Product ${config.product_id} not found in ${storeName}`);
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
          price: storeProduct.localizedPrice || storeProduct.price || '',
          currency: storeProduct.currency || '',
          localizedPrice: storeProduct.localizedPrice || '',
          title: storeProduct.title || config.name,
          subscriptionPeriodUnit: storeProduct.subscriptionPeriodUnit || '',
          subscriptionPeriodNumber: storeProduct.subscriptionPeriodNumber || 0,
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

      // Get product info to check for subscription offers (Android)
      const products = await this.getAvailableProducts();
      const product = products?.find(p => p.productId === productId);

      if (!product) {
        throw new Error('Product not found in store');
      }

      console.log('📦 Product details:', {
        productId: product.productId,
        title: product.title,
        hasOffers: !!product.subscriptionOfferDetails?.length,
        offerCount: product.subscriptionOfferDetails?.length || 0
      });

      // For Android with offers, use requestSubscription with subscriptionOffers
      if (Platform.OS === 'android' && product.subscriptionOfferDetails && product.subscriptionOfferDetails.length > 0) {
        // Find the offer with the free-trial offer ID, or use the first available
        let selectedOffer = product.subscriptionOfferDetails.find(
          offer => offer.offerId === 'free-trial'
        );

        // Fallback to first offer if free-trial not found
        if (!selectedOffer) {
          selectedOffer = product.subscriptionOfferDetails[0];
        }

        console.log('📋 Using subscription offer:', {
          offerToken: selectedOffer.offerToken,
          basePlanId: selectedOffer.basePlanId,
          offerId: selectedOffer.offerId,
          pricingPhases: selectedOffer.pricingPhases?.length || 0
        });

        // Construct subscription offers array with proper structure
        const subscriptionOffers = [{
          sku: productId,
          offerToken: selectedOffer.offerToken,
        }];

        console.log('🔄 Calling RNIap.requestSubscription with offers (Android):', {
          sku: productId,
          subscriptionOffers: subscriptionOffers
        });

        // Use requestSubscription with subscriptionOffers for Android (v12 format)
        await RNIap.requestSubscription({
          sku: productId,
          subscriptionOffers: subscriptionOffers,
        });
      } else {
        // For iOS or Android without offers, use simple requestSubscription
        console.log('🔄 Calling RNIap.requestSubscription with:', { sku: productId });
        await RNIap.requestSubscription({
          sku: productId,
        });
      }

      console.log('✅ Purchase request sent - waiting for purchase update...');

      // Verify receipt with backend (handled by purchaseUpdatedListener)
      // The purchaseUpdatedListener will handle verification automatically

      return product;
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

