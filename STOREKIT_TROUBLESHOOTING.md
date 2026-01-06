# StoreKit Troubleshooting Guide

## Current Status
- ✅ Xcode Scheme configured with StoreKit Configuration file
- ✅ Product ID matches: `property_subscription_monthly`
- ✅ Code updated to use `getSubscriptions()` instead of `getProducts()`
- ✅ Enhanced debugging added

## Enhanced Debugging

The code now includes comprehensive logging. When you run the app, check the console for:

### Initialization Logs
```
🛒 Initializing StoreKit connection...
📱 Platform: ios
📡 initConnection result: ...
⏳ Waiting for StoreKit to be ready...
✅ StoreKit connection initialized and ready
```

### Product Fetching Logs
```
📡 Fetching product configuration from backend...
📦 Product IDs to fetch from StoreKit: ["property_subscription_monthly"]
🍎 Fetching subscription products from Apple StoreKit...
📋 Requesting product IDs: ["property_subscription_monthly"]
🔄 Calling RNIap.getSubscriptions with: ["property_subscription_monthly"]
```

### Success Logs
```
✅ StoreKit returned 1 products
📦 Products found:
  [1] property_subscription_monthly: { title: "...", price: "$0.99", ... }
```

### Error Logs
If products aren't found, you'll see detailed troubleshooting information.

## Common Issues & Solutions

### Issue 1: Products Not Found (E_ITEM_NOT_AVAILABLE)

**Symptoms:**
- Console shows: `⚠️ PRODUCTS NOT FOUND IN STOREKIT`
- `getSubscriptions()` returns empty array or throws error

**Solutions:**

1. **Verify StoreKit Configuration Path**
   - Open Xcode: `ios/HostIQ.xcworkspace`
   - Check scheme: Product > Scheme > Edit Scheme > Run > Options
   - StoreKit Configuration should show: `Products.storekit`
   - If path shows `../Products.storekit`, try changing to just `Products.storekit`

2. **Verify Product ID Match**
   - Backend returns: Check console for `📦 Product IDs to fetch from StoreKit:`
   - StoreKit file: `ios/Products.storekit` line 101: `"productID" : "property_subscription_monthly"`
   - Must match **exactly** (case-sensitive, no extra spaces)

3. **Clean Build**
   ```bash
   # In Xcode:
   Product > Clean Build Folder (Shift+Cmd+K)
   
   # Then rebuild:
   Product > Build (Cmd+B)
   ```

4. **Verify Running from Xcode**
   - StoreKit Configuration **only works** when running from Xcode
   - Does NOT work in Expo Go
   - Does NOT work when running via `expo start` and opening in Expo Go
   - Must run: `expo run:ios` or run directly from Xcode

5. **Check StoreKit Configuration File Location**
   - File should be at: `ios/Products.storekit`
   - Should be added to Xcode project (check in Xcode file navigator)
   - Should be in "Copy Bundle Resources" build phase

### Issue 2: StoreKit Connection Errors

**Symptoms:**
- `❌ Failed to initialize StoreKit`
- `E_SERVICE_ERROR` or connection errors

**Solutions:**

1. **Ensure Native Build**
   - Must be running native iOS build, not Expo Go
   - Run: `npx expo run:ios` or build from Xcode

2. **Check react-native-iap Installation**
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Verify iOS Deployment Target**
   - StoreKit 2 requires iOS 15.0+
   - Check in Xcode: Target > General > Deployment Info

### Issue 3: Products Return Empty Array (No Error)

**Symptoms:**
- No error thrown, but `appleProducts.length === 0`
- Console shows: `⚠️ StoreKit returned empty array`

**Solutions:**

1. **Check Product ID Format**
   - Ensure backend returns: `product_id: "property_subscription_monthly"`
   - No leading/trailing spaces
   - Exact case match

2. **Verify StoreKit Configuration is Active**
   - In Xcode, when running, check if StoreKit Configuration is actually loaded
   - Try adding a breakpoint and checking StoreKit state

3. **Test with Hardcoded Product ID**
   Temporarily test with hardcoded ID to isolate the issue:
   ```javascript
   const testProducts = await RNIap.getSubscriptions(['property_subscription_monthly']);
   console.log('Test products:', testProducts);
   ```

## Testing Steps

1. **Run from Xcode**
   ```bash
   # Open Xcode
   open ios/HostIQ.xcworkspace
   
   # Select device/simulator
   # Press Cmd+R to run
   ```

2. **Check Console Logs**
   - Look for the detailed logs mentioned above
   - Check for any error codes or messages

3. **Verify Product ID Flow**
   ```
   Backend API → product_id → StoreKit → Products found?
   ```

4. **Test Product Fetching**
   - Navigate to subscription screen
   - Check console for product fetching logs
   - Verify products are found

## Debug Checklist

- [ ] Running from Xcode (not Expo Go)
- [ ] StoreKit Configuration selected in scheme
- [ ] Product ID matches exactly (case-sensitive)
- [ ] StoreKit Configuration file exists at `ios/Products.storekit`
- [ ] File is added to Xcode project
- [ ] Clean build performed
- [ ] Console shows detailed logs
- [ ] No connection errors

## Next Steps if Still Not Working

1. **Check Console Output**
   - Copy all console logs related to StoreKit
   - Look for specific error codes

2. **Verify Backend Response**
   - Check what `product_id` the backend is returning
   - Ensure it matches StoreKit file exactly

3. **Test StoreKit Directly**
   - Try fetching products with hardcoded ID
   - This isolates if issue is with product ID or StoreKit setup

4. **Check Xcode Build Settings**
   - Ensure StoreKit framework is linked
   - Check deployment target is iOS 15.0+

5. **Verify react-native-iap Version**
   - Current: `^12.13.0`
   - Check if there are known issues with this version

## Additional Resources

- [react-native-iap Documentation](https://github.com/dooboolab/react-native-iap)
- [Apple StoreKit Configuration Guide](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)
- [StoreKit Testing Best Practices](https://developer.apple.com/documentation/storekit/in-app_purchase)



