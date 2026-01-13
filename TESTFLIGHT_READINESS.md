# TestFlight Readiness Checklist

## ⚠️ Current Status

Your app is currently working **locally** with **StoreKit Configuration**, but there are critical differences for TestFlight:

### What Works Locally:
- ✅ StoreKit Configuration file (`Products.storekit`) - **Only works in Xcode**
- ✅ Product fetching and UI display
- ✅ Purchase flow UI

### What Won't Work in TestFlight:
- ❌ **StoreKit Configuration** - TestFlight uses **real StoreKit** from App Store Connect
- ❌ **Receipt verification** - Currently failing because:
  1. `APPLE_SHARED_SECRET` is not configured on your server
  2. StoreKit Configuration receipts cannot be validated with Apple's servers

---

## ✅ Required Steps for TestFlight

### 1. Set Up Product in App Store Connect

**Product ID:** `hostiq_pro_subscription`

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Select your app: **HostIQ**
3. Navigate to **Features > In-App Purchases**
4. Create a new **Auto-Renewable Subscription** (NOT consumable!)
5. Configure:
   - **Product ID:** `hostiq_pro_subscription` (must match exactly)
   - **Subscription Group:** Create "HostIQ Pro" group
   - **Display Name:** "HostIQ Pro"
   - **Description:** "Unlock premium property insights & tools."
   - **Price:** $29.00/month (or your desired price)
   - **Subscription Duration:** 1 month
   - **Free Trial:** 7 days (if you want the free trial)

6. **Submit for Review** (required before TestFlight can use it)

⚠️ **Important:** The product must be **approved** in App Store Connect before TestFlight users can purchase it.

---

### 2. Configure Server Environment Variable

Your server needs `APPLE_SHARED_SECRET` to verify receipts.

#### Get the Shared Secret:

1. In App Store Connect, go to **My Apps** → **HostIQ**
2. Click **App Information**
3. Scroll to **App-Specific Shared Secret**
4. Click **Generate** (if not already generated)
5. Copy the secret

#### Set on Your Server:

**Your App-Specific Shared Secret:**
```
12433b3d21c841e5b9d146e4979e03c8
```

**For local development (.env):**
1. Navigate to `roomify-server/` directory
2. Create or edit `.env` file (it's gitignored, so safe to add)
3. Add this line:
   ```bash
   APPLE_SHARED_SECRET=12433b3d21c841e5b9d146e4979e03c8
   ```
4. Restart your server

**For Docker deployment:**
1. Add to your `.env` file in `roomify-server/` directory:
   ```bash
   APPLE_SHARED_SECRET=12433b3d21c841e5b9d146e4979e03c8
   ```
2. The `docker-compose.yml` already references `${APPLE_SHARED_SECRET}` (line 74)
3. Restart Docker containers:
   ```bash
   docker compose down
   docker compose up -d
   ```

**For cloud hosting (Railway, Heroku, AWS, etc.):**
- Set as an environment variable in your hosting platform's dashboard:
  - Variable name: `APPLE_SHARED_SECRET`
  - Variable value: `12433b3d21c841e5b9d146e4979e03c8`
- Restart your server after adding it

---

### 3. TestFlight Behavior

When you push to TestFlight:

✅ **What Will Work:**
- Real StoreKit (no StoreKit Configuration needed)
- Product fetching from App Store Connect
- Purchase flow with real Apple sandbox accounts
- Receipt verification (once `APPLE_SHARED_SECRET` is set)

⚠️ **Important Notes:**
- TestFlight uses **sandbox receipts** (not production)
- Your server code already handles this - it auto-detects sandbox receipts (status 21007) and retries with sandbox URL
- TestFlight testers need **sandbox Apple IDs** (different from regular Apple IDs)

---

### 4. Testing with Sandbox Accounts

For TestFlight testing, you need:

1. **Sandbox Test Accounts:**
   - Create in App Store Connect → **Users and Access** → **Sandbox Testers**
   - Use a different email than your regular Apple ID
   - Testers must sign out of their regular Apple ID in Settings → App Store

2. **Test Purchase Flow:**
   - TestFlight build will use real StoreKit
   - Purchases are free (sandbox mode)
   - Receipts will be sandbox receipts (server handles this automatically)

---

## 🔍 Current Error Analysis

From your console logs, you're seeing:

```
❌ Receipt verification failed: [AxiosError: Request failed with status code 500]
❌ Failed to handle purchase: { [Error: Server configuration error] }
```

**Root Cause:**
- `APPLE_SHARED_SECRET` is not set on your server
- Server returns 500 error when trying to verify receipt

**Fix:**
- Set `APPLE_SHARED_SECRET` environment variable on your server
- Restart your server after setting it

---

## 📋 Pre-TestFlight Checklist

Before pushing to TestFlight, verify:

- [ ] Product `hostiq_pro_subscription` is created in App Store Connect
- [ ] Product is **submitted and approved** in App Store Connect
- [ ] `APPLE_SHARED_SECRET` is set on your server
- [ ] Server is restarted with new environment variable
- [ ] Product ID matches everywhere: `hostiq_pro_subscription`
- [ ] Sandbox test accounts are created in App Store Connect

---

## 🧪 Testing Locally Before TestFlight

To test receipt verification locally (without StoreKit Configuration):

1. **Use Sandbox Test Account:**
   - Sign out of regular Apple ID in Settings → App Store
   - Sign in with sandbox test account
   - Make a purchase (will be free in sandbox)

2. **Verify Server:**
   - Check server logs for receipt verification
   - Should see: `🍎 Receipt is sandbox, retrying with sandbox URL...`
   - Should succeed if `APPLE_SHARED_SECRET` is set

---

## 🚀 Summary

**For TestFlight to work:**

1. ✅ Product set up in App Store Connect (`hostiq_pro_subscription`)
2. ✅ `APPLE_SHARED_SECRET` configured on server
3. ✅ Product approved in App Store Connect
4. ✅ Sandbox test accounts created

**The good news:**
- Your code already handles sandbox receipts correctly
- No code changes needed - just configuration
- StoreKit Configuration was just for local testing

**After these steps, TestFlight will work!** 🎉
