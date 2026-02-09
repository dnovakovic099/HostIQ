# 🔧 CRITICAL FIX: StoreKit Configuration Not Loading

## What Was Wrong

Your StoreKit Configuration file path in the Xcode scheme was **incorrect**:
- ❌ **Before**: `../Products.storekit` (looking one directory up - WRONG)
- ✅ **After**: `Products.storekit` (correct relative path)

**This has been FIXED automatically.**

---

## How to Test the Fix (Step-by-Step)

### CRITICAL: You MUST run from Xcode

StoreKit Configuration **ONLY works** when:
1. Running from Xcode directly
2. NOT from `expo start` or Expo Go
3. NOT from the Terminal with `npx expo run:ios`

### Step 1: Open Project in Xcode

```bash
cd /Users/alina/Documents/code/Darko-HostIQ-App/HostIQ
open ios/HostIQ.xcworkspace
```

**IMPORTANT:** Open `.xcworkspace` NOT `.xcodeproj`

### Step 2: Verify Scheme Settings

1. In Xcode, click the scheme dropdown (next to the play button)
2. Select **Edit Scheme...** (or press `Cmd + <`)
3. Click **Run** in the left sidebar
4. Click the **Options** tab
5. Verify **StoreKit Configuration** shows: `Products.storekit`
   - ✅ Should say `Products.storekit` (correct)
   - ❌ NOT `../Products.storekit` (this was the bug)
6. Click **Close**

### Step 3: Clean Build Folder

This is **CRITICAL** - old builds cache the wrong path:

```
In Xcode: Product > Clean Build Folder
Or press: Shift + Cmd + K
```

### Step 4: Select Your Target Device

In Xcode:
- Click the device dropdown (next to the scheme)
- Select either:
  - A simulator (e.g., "iPhone 15 Pro")
  - Your physical device (if connected)

### Step 5: Run from Xcode

**Press `Cmd + R`** or click the Play button in Xcode

**DO NOT:**
- ❌ Run `npm start` or `expo start`
- ❌ Run `npx expo run:ios`
- ❌ Use Expo Go app

**ONLY:**
- ✅ Run directly from Xcode with the Play button

---

## What You Should See

### ✅ Success Indicators (in Metro logs)

```
🛒 Initializing StoreKit connection...
✅ StoreKit connection initialized and ready
🔍 Fetching subscription products from store...
📦 Products returned: 1
✅ Product found: {
  productId: 'hostiq_pro_subscription',
  title: 'HostIQ Pro',
  price: '$0.99'
}
```

### ❌ If You Still See Errors

```
⚠️ No products found in store
❌ Product "hostiq_pro_subscription" not found
```

Then check:
1. **Did you run from Xcode?** (Not Terminal/Expo)
2. **Did you clean build folder?** (`Shift + Cmd + K`)
3. **Is the correct scheme selected?** (Should be "HostIQ")
4. **Did you open .xcworkspace?** (Not .xcodeproj)

---

## Understanding the Error Messages

### The JSON Parse Error

```
SyntaxError: "undefined" is not valid JSON
```

This is happening because:
1. StoreKit can't find products (due to wrong path)
2. An error object somewhere is `undefined`
3. Code tries to `JSON.parse(undefined)` → crash

**This should disappear** once StoreKit loads correctly.

### The "Product Not Found" Error

```
ERROR ❌ Subscription product "hostiq_pro_subscription" not found in App Store.
```

This happens because:
1. The app calls `getAvailableProducts()`
2. StoreKit Configuration file isn't loaded (wrong path)
3. Returns empty array
4. Your code throws this helpful error

**This should disappear** once you run from Xcode with the corrected path.

---

## Why This Happens

### The Flow:
1. User clicks "Start 7-Day Free Trial"
2. App calls `subscriptionService.requestSubscription()`
3. This calls `getAvailableProducts()`
4. `react-native-iap` queries StoreKit
5. **StoreKit looks for configuration file**
6. If path is wrong → returns empty array
7. App throws error **before** purchase starts
8. Backend is **never called** (purchase never initiated)

### The Fix:
- Scheme file now has correct path: `Products.storekit`
- When you run from Xcode, StoreKit will find it
- Products will load successfully
- Purchase flow will work

---

## TestFlight vs. Local Testing

### Local Development (Current - Use StoreKit Configuration)
- ✅ Run from Xcode
- ✅ StoreKit Configuration file (`Products.storekit`)
- ✅ Test transactions (not real money)
- ✅ Instant testing, no waiting

### TestFlight (Later - Use App Store Connect)
- ❌ StoreKit Configuration **does not work** in TestFlight
- ✅ Requires real products in App Store Connect
- ✅ Requires subscription linked to app version
- ⏰ Takes 24-48 hours for sandbox availability
- 📱 Use sandbox test account

**For now, focus on local testing with Xcode.**

---

## Quick Troubleshooting Checklist

- [ ] Fixed scheme path (already done ✅)
- [ ] Opened `.xcworkspace` in Xcode
- [ ] Verified StoreKit Configuration shows `Products.storekit`
- [ ] Cleaned build folder (`Shift + Cmd + K`)
- [ ] Selected simulator or device
- [ ] Pressed `Cmd + R` to run from Xcode
- [ ] **NOT** running from Terminal or Expo Go
- [ ] Checking Metro logs for success messages

---

## Next Steps After Fix Works

Once you see "✅ Product found" in the logs:

1. **Test the purchase flow**
   - Click "Start 7-Day Free Trial"
   - Complete the mock purchase
   - Verify backend receives the receipt

2. **Check backend verification**
   - Watch for logs: `🔄 Verifying receipt with backend...`
   - Should see: `✅ Receipt verified successfully`

3. **For TestFlight later**
   - Follow `TESTFLIGHT_SUBSCRIPTION_SETUP.md`
   - Link subscription to app version in App Store Connect
   - Wait 24-48 hours
   - Test with sandbox account

---

## Still Having Issues?

If after following these steps you still see errors:

1. **Check the Metro bundler logs carefully**
   - Look for the specific error message
   - Share the full error output

2. **Verify Products.storekit file**
   ```bash
   cat ios/Products.storekit | grep "hostiq_pro_subscription"
   ```
   - Should show the product ID

3. **Check Xcode scheme file**
   ```bash
   cat ios/HostIQ.xcodeproj/xcshareddata/xcschemes/HostIQ.xcscheme | grep StoreKit
   ```
   - Should show `Products.storekit` (not `../Products.storekit`)

4. **Try restarting Xcode**
   - Sometimes Xcode caches old scheme settings
   - Close Xcode completely
   - Reopen `ios/HostIQ.xcworkspace`
   - Clean build folder again

---

## Summary

**What was fixed:**
- ✅ StoreKit Configuration file path in Xcode scheme

**What you need to do:**
1. Open `ios/HostIQ.xcworkspace` in Xcode
2. Clean build folder (`Shift + Cmd + K`)
3. Run with `Cmd + R` (from Xcode only)
4. Watch logs for "✅ Product found"

**This should resolve your "product not found" error immediately.**
