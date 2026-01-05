# Subscription Product Setup Guide

This guide will walk you through setting up subscription products for both iOS and Android.

## Product ID
Your app uses: `property_subscription_monthly`

---

## iOS Setup (App Store Connect + StoreKit Configuration)

### Step 1: Set Up StoreKit Configuration (For Testing)

1. **Open Xcode Project**
   ```bash
   open ios/HostIQ.xcworkspace
   ```

2. **Configure StoreKit in Xcode Scheme**
   - Go to **Product > Scheme > Edit Scheme...** (or press `Cmd + <`)
   - Select **Run** in the left sidebar
   - Click the **Options** tab
   - Under **StoreKit Configuration**, select `Products.storekit`
   - ✅ **This is critical!** Without this, StoreKit won't load products

3. **Update StoreKit Configuration File**
   - File location: `ios/Products.storekit`
   - The file already has the product, but needs proper localizations
   - Open the file in Xcode (double-click it)
   - Fill in the product details:
     - **Display Name**: "Pricing Pro"
     - **Description**: "AI-powered pricing recommendations and market analysis"
     - **Price**: Update to $29.00 (currently shows $0.99)

4. **Run from Xcode**
   - ⚠️ **Important**: StoreKit Configuration only works when running from Xcode
   - Don't use Expo Go or `expo start` for testing StoreKit
   - Use: `expo run:ios` or run directly from Xcode

### Step 2: Set Up in App Store Connect (For Production)

1. **Log in to App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Select your app: **HostIQ**

2. **Create Subscription Group**
   - Go to **Features > In-App Purchases**
   - Click **+** to create a new subscription group
   - Name: "Property Subscriptions"

3. **Create Subscription Product**
   - Click **+** next to the subscription group
   - Select **Auto-Renewable Subscription**
   - Fill in:
     - **Reference Name**: "Property Subscription Monthly"
     - **Product ID**: `property_subscription_monthly` (must match exactly!)
     - **Subscription Duration**: 1 Month
     - **Price**: $29.00 USD
   
4. **Add Localizations**
   - Click **Add Localization**
   - Select **English (U.S.)**
   - Fill in:
     - **Display Name**: "Pricing Pro"
     - **Description**: "AI-powered pricing recommendations and market analysis for your properties"
   
5. **Set Up Free Trial (7-Day)**
   - Scroll to **Subscription Offers**
   - Click **+** to add an introductory offer
   - Select **Free Trial**
   - Duration: 7 days
   - Click **Save**

6. **Submit for Review**
   - Once all details are filled, click **Save**
   - The subscription will be in "Ready to Submit" status
   - You can test it in Sandbox before submitting

### Step 3: Test with Sandbox Account

1. **Create Sandbox Tester**
   - In App Store Connect, go to **Users and Access > Sandbox Testers**
   - Click **+** to create a new sandbox tester
   - Use a different email than your Apple ID

2. **Test in App**
   - Sign out of your Apple ID on the device/simulator
   - Run the app and try to purchase
   - When prompted, sign in with the sandbox tester account
   - The purchase will be free in sandbox mode

---

## Android Setup (Google Play Console)

### Step 1: Create Subscription Product in Google Play Console

1. **Log in to Google Play Console**
   - Go to https://play.google.com/console
   - Select your app: **HostIQ** (package: `com.hostiq.app`)

2. **Navigate to Subscriptions**
   - Go to **Monetize > Subscriptions**
   - Click **Create subscription**

3. **Fill in Product Details**
   - **Product ID**: `property_subscription_monthly` (must match exactly!)
   - **Name**: "Pricing Pro"
   - **Description**: "AI-powered pricing recommendations and market analysis for your properties"
   - **Billing period**: 1 month
   - **Price**: $29.00 USD

4. **Set Up Free Trial**
   - Scroll to **Free trial and introductory price**
   - Enable **Free trial**
   - Set duration: 7 days
   - Click **Save**

5. **Activate the Subscription**
   - After creating, click **Activate** on the subscription
   - Status should be "Active"

### Step 2: Test with License Testing

1. **Add License Testers**
   - Go to **Settings > License testing**
   - Add your Gmail account(s) to the testers list
   - These accounts can test purchases without being charged

2. **Test in App**
   - Install the app on a device with a tester account
   - Try to purchase the subscription
   - The purchase will be processed but won't charge the account

### Step 3: Publish Subscription (Optional for Testing)

- You can test subscriptions even if the app isn't published
- But the subscription must be **Active** in Google Play Console
- Use **Internal testing** or **Closed testing** track for testing

---

## Troubleshooting

### iOS: "Product not available in store"

**Checklist:**
1. ✅ Is StoreKit Configuration selected in Xcode scheme?
   - Product > Scheme > Edit Scheme > Run > Options > StoreKit Configuration
2. ✅ Are you running from Xcode (not Expo Go)?
   - StoreKit Configuration only works in native builds
3. ✅ Does the product ID match exactly?
   - Code: `property_subscription_monthly`
   - StoreKit file: `property_subscription_monthly`
   - Must be case-sensitive match!
4. ✅ Is the StoreKit file properly formatted?
   - Open `ios/Products.storekit` in Xcode to verify
5. ✅ Try cleaning build folder:
   - Product > Clean Build Folder (Shift+Cmd+K)
   - Then rebuild and run

**For Production (App Store Connect):**
1. ✅ Is the subscription created in App Store Connect?
2. ✅ Is it in "Ready to Submit" or "Approved" status?
3. ✅ Are you using a sandbox tester account?
4. ✅ Is the app signed with the correct provisioning profile?

### Android: "Product not available in store"

**Checklist:**
1. ✅ Is the subscription created in Google Play Console?
2. ✅ Is the subscription **Active** (not Draft)?
3. ✅ Does the product ID match exactly?
   - Code: `property_subscription_monthly`
   - Google Play Console: `property_subscription_monthly`
4. ✅ Is the app signed with the correct keystore?
   - Debug builds use debug keystore
   - Release builds need release keystore
5. ✅ Are you using a license tester account?
6. ✅ Is Google Play Billing enabled in your app?
   - Check `android/app/build.gradle` for billing library

### Both Platforms: General Issues

1. **Network Issues**
   - Ensure device has internet connection
   - Check if App Store/Play Store is accessible

2. **Account Issues**
   - iOS: Sign out of Apple ID, use sandbox tester
   - Android: Use license tester account

3. **App Not Published**
   - iOS: Can test with StoreKit Configuration or Sandbox
   - Android: Can test with license testers even if not published

4. **Product ID Mismatch**
   - Double-check product ID in:
     - Code (`src/services/subscriptionService.js`)
     - StoreKit file (`ios/Products.storekit`)
     - App Store Connect
     - Google Play Console
   - Must be **exactly** the same (case-sensitive!)

---

## Quick Test Commands

### iOS
```bash
# Clean and rebuild
cd ios
rm -rf build
pod install
cd ..

# Run from Xcode or:
expo run:ios
```

### Android
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..

# Run
expo run:android
```

---

## Verification Steps

After setup, verify:

1. **iOS:**
   - Run app from Xcode
   - Check console logs for: `✅ StoreKit returned X products`
   - Product should appear in subscription screen

2. **Android:**
   - Run app on device/emulator
   - Check console logs for: `✅ Google Play returned X products`
   - Product should appear in subscription screen

3. **Both:**
   - Product should show correct price
   - "Start 7-Day Free Trial" button should work
   - Purchase flow should complete

---

## Next Steps After Setup

1. ✅ Test purchase flow on both platforms
2. ✅ Verify backend receives purchase verification
3. ✅ Test subscription status endpoint
4. ✅ Test subscription renewal
5. ✅ Test cancellation flow

---

## Need Help?

If you're still having issues:
1. Check console logs for specific error messages
2. Verify product IDs match exactly
3. Ensure you're testing with the correct accounts (sandbox/license testers)
4. Make sure StoreKit Configuration is selected in Xcode scheme (iOS)
5. Verify subscription is Active in Google Play Console (Android)




