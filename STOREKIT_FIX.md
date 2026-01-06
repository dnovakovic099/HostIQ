# StoreKit Configuration Fix

## Issue
StoreKit was not finding products from the StoreKit Configuration file (`Products.storekit`).

## Root Cause
The code was using `RNIap.getProducts({ skus: productIds })` for subscription products, but **subscription products require `RNIap.getSubscriptions(productIds)`** instead.

## Fix Applied

### 1. Changed Product Fetching Method
**File:** `src/services/subscriptionService.js`

**Before:**
```javascript
const appleProducts = await RNIap.getProducts({ skus: productIds });
```

**After:**
```javascript
// For subscriptions, use getSubscriptions() with array of product IDs
appleProducts = await RNIap.getSubscriptions(productIds);
```

### 2. Improved StoreKit Initialization
Added a small delay after `initConnection()` to ensure StoreKit Configuration file is fully loaded:
```javascript
await RNIap.initConnection();
await new Promise(resolve => setTimeout(resolve, 100));
```

### 3. Enhanced Error Handling
Added detailed error logging to help debug StoreKit issues:
- Logs product IDs being requested
- Logs StoreKit error codes and messages
- Provides helpful debugging hints when products aren't found

## Xcode Configuration Checklist

To ensure StoreKit Configuration file works correctly:

1. **StoreKit Configuration File Location**
   - File: `ios/Products.storekit`
   - Should be in the iOS project directory

2. **Xcode Scheme Configuration**
   - Open Xcode project: `ios/HostIQ.xcworkspace`
   - Go to: **Product > Scheme > Edit Scheme...**
   - Select **Run** in the left sidebar
   - Go to **Options** tab
   - Under **StoreKit Configuration**, select `Products.storekit`
   - ✅ This is critical - without this, StoreKit won't load the configuration file

3. **Product ID Verification**
   - Product ID in StoreKit file: `property_subscription_monthly`
   - Must match exactly what backend returns in `product_id` field
   - Case-sensitive!

4. **Testing**
   - Run app from Xcode (not Expo Go) to use StoreKit Configuration
   - Check console logs for:
     - `📦 Product IDs to fetch from StoreKit:`
     - `✅ Found X products in StoreKit:`

## Testing the Fix

1. **Verify Backend Returns Product IDs**
   ```javascript
   // Should log: 📦 Product IDs to fetch from StoreKit: ['property_subscription_monthly']
   ```

2. **Verify StoreKit Finds Products**
   ```javascript
   // Should log: ✅ Found 1 products in StoreKit: [{ id: 'property_subscription_monthly', price: '$0.99' }]
   ```

3. **If Products Still Not Found**
   - Check Xcode scheme has StoreKit Configuration selected
   - Verify product ID matches exactly (case-sensitive)
   - Check console for detailed error messages
   - Ensure app is running from Xcode, not Expo Go

## Key Differences: getProducts vs getSubscriptions

- **`getProducts({ skus: [...] })`**: For consumable/non-consumable products
- **`getSubscriptions([...])`**: For subscription products (auto-renewable subscriptions)

Always use `getSubscriptions()` for subscription products!



