# Troubleshooting: "Subscription product not available in store"

## Problem
When clicking "Start 7-Day Free Trial" in **TestFlight**, you get the error:
- "Subscription product not available in store"
- Backend endpoint `/api/subscriptions/verify` is never called

## Root Cause
The error occurs **before** the backend is called. The app tries to fetch the product from App Store Connect, but StoreKit can't find it.

**⚠️ Important for TestFlight:**
- **StoreKit Configuration files DON'T work in TestFlight** - they only work when running from Xcode locally
- **TestFlight requires real App Store Connect products** that are properly configured and submitted

## Solution Steps

### For TestFlight (Your Current Situation)

Since you're using TestFlight, the subscription needs to be **submitted and associated with an app version**:

1. **Associate Subscription with App Version:**
   - Go to App Store Connect → Your App → App Store tab
   - Select your current version
   - Scroll to **In-App Purchases and Subscriptions** section
   - Click **+** and select `hostiq_pro_subscription`
   - Save the version

2. **Submit or Save:**
   - Click **Save** (or **Submit for Review**)
   - This associates the subscription with the app version

3. **Wait for Sandbox Availability:**
   - After submission, wait **24-48 hours**
   - The subscription will become available in TestFlight sandbox

4. **Test with Sandbox Account:**
   - Sign out of App Store on your device
   - Use a sandbox test account when prompted
   - The subscription should now be available!

See `TESTFLIGHT_SUBSCRIPTION_SETUP.md` for detailed steps.

### For iOS (Local Development)

#### Step 1: Enable StoreKit Configuration in Xcode Scheme

1. **Open Xcode:**
   ```bash
   open ios/HostIQ.xcworkspace
   ```

2. **Edit Scheme:**
   - Press `Cmd + <` (or Product > Scheme > Edit Scheme...)
   - Select **Run** in the left sidebar
   - Click the **Options** tab
   - Under **StoreKit Configuration**, select `Products.storekit`
   - Click **Close**

3. **Clean Build Folder:**
   - Press `Shift + Cmd + K` (or Product > Clean Build Folder)
   - This is important!

4. **Run from Xcode:**
   - Press `Cmd + R` (or Product > Run)
   - ⚠️ **Critical**: Must run from Xcode, NOT from Expo Go or `expo start`

#### Step 2: Add Free Trial to StoreKit Configuration

1. **Open StoreKit Configuration File:**
   - In Xcode, open `ios/Products.storekit`
   - Double-click the file to open in StoreKit editor

2. **Add Introductory Offer:**
   - Select the subscription product `hostiq_pro_subscription`
   - Click on "Introductory Offer" section
   - Add:
     - **Type**: Free Trial
     - **Duration**: 7 days
     - **Price**: $0.00

3. **Save the file**

#### Step 3: Verify Product ID Match

Check that product ID matches everywhere:
- Code: `hostiq_pro_subscription` (in `subscriptionService.js` line 6)
- StoreKit file: `hostiq_pro_subscription` (in `Products.storekit` line 101)
- Must be **exactly** the same (case-sensitive)

### For Android

1. **Create Subscription in Google Play Console:**
   - Go to https://play.google.com/console
   - Select your app
   - Go to **Monetize > Subscriptions**
   - Create subscription with ID: `hostiq_pro_subscription`
   - Add 7-day free trial
   - Activate the subscription

2. **Add License Tester:**
   - Go to **Settings > License testing**
   - Add your test account email

## Verification

After fixing, check console logs for:
- ✅ `✅ StoreKit returned 1 products`
- ✅ `✅ Product found: { productId: 'hostiq_pro_subscription', ... }`

If you still see:
- ❌ `⚠️ No products found in store`
- ❌ `❌ Product "hostiq_pro_subscription" not found`

Then check:
1. Are you running from Xcode? (Not Expo Go)
2. Is StoreKit Configuration selected in scheme?
3. Did you clean build folder?
4. Does product ID match exactly?

## Why Backend Isn't Called

The flow is:
1. User clicks "Start 7-Day Free Trial"
2. App calls `getAvailableProducts()` → queries StoreKit
3. StoreKit returns empty array → throws error
4. **Backend is never called** because purchase never starts

The backend endpoint `/api/subscriptions/verify` is only called **after** a successful purchase is initiated, which requires the product to be found in the store first.

## Next Steps

Once the product is found:
1. Purchase flow will start
2. User completes purchase in App Store/Google Play
3. `handlePurchaseUpdate()` is called
4. Backend endpoint `/api/subscriptions/verify` is called
5. Receipt is verified and subscription is saved
