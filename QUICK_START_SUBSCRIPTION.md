# Quick Start: Fix "Subscription Product Not Available"

## Most Common Issue: StoreKit Configuration Not Set in Xcode

### For iOS (Most Likely Issue)

**Step 1: Open Xcode**
```bash
open ios/HostIQ.xcworkspace
```

**Step 2: Set StoreKit Configuration in Scheme**
1. Press `Cmd + <` (or Product > Scheme > Edit Scheme...)
2. Select **Run** on the left
3. Click **Options** tab
4. Under **StoreKit Configuration**, select `Products.storekit`
5. Click **Close**

**Step 3: Clean and Rebuild**
```bash
# In Xcode: Product > Clean Build Folder (Shift+Cmd+K)
# Then: Product > Run (Cmd+R)
```

**Step 4: Verify**
- Check console logs for: `✅ StoreKit returned 1 products`
- Product should now be available!

---

## For Android

**Step 1: Create Subscription in Google Play Console**
1. Go to https://play.google.com/console
2. Select your app
3. Go to **Monetize > Subscriptions**
4. Click **Create subscription**
5. Fill in:
   - Product ID: `property_subscription_monthly`
   - Name: "Pricing Pro"
   - Price: $29.00/month
   - Free trial: 7 days
6. Click **Activate**

**Step 2: Add License Tester**
1. Go to **Settings > License testing**
2. Add your Gmail account
3. Save

**Step 3: Test**
- Run app on device with tester account
- Product should now be available!

---

## Still Not Working?

### Check These:

1. **Product ID Match**
   - Code: `property_subscription_monthly`
   - StoreKit/Play Console: `property_subscription_monthly`
   - Must be **exactly** the same!

2. **Running from Correct Place**
   - iOS: Must run from Xcode (not Expo Go)
   - Android: Can run from anywhere, but needs Play Console setup

3. **Account Issues**
   - iOS: Use sandbox tester account
   - Android: Use license tester account

4. **Console Logs**
   - Look for error messages in console
   - Check what product IDs are being requested

---

## Need More Help?

See the full guide: `SUBSCRIPTION_SETUP_GUIDE.md`




