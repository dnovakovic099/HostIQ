# How to Associate Subscription with App Version

## Step-by-Step Guide

### Prerequisites (Do These First)

Before you can associate the subscription:

1. **Subscription must be approved** (Status: "Ready to Submit")
   - Currently yours shows "Developer Action Needed" ❌
   - Fix the rejection first (see `FIND_REJECTION_REASON.md`)
   - Wait for approval (1-3 days)

2. **Build must be uploaded** to the version
   - You need at least one binary uploaded
   - Can upload via Xcode Archive or EAS Build

---

## Step 1: Navigate to Your App Version

### Option A: Using the Apps Menu

1. **In App Store Connect, click "Apps"** (top menu bar)

2. **Click on "HostIQ"** (your app tile/card)

3. **In the LEFT SIDEBAR, look for:**
   - "App Store" or
   - "iOS App" or  
   - "Version History"

4. **You should see your version:**
   - "1.0 Rejected" (your current version)
   - OR create a new version: "1.0.1"

5. **Click on the version number** to open the version page

---

### Option B: Using the Distribution Tab

1. **In App Store Connect, click "Distribution"** (top menu bar)

2. **Select "HostIQ"** from the list

3. **In the LEFT SIDEBAR, click "iOS App"**

4. **You'll see your version:**
   - Current version (1.0)
   - Or option to create new version

5. **Click on the version** to open it

---

## Step 2: Find "In-App Purchases and Subscriptions" Section

### On the Version Page:

The version page has many sections. You need to **scroll down** to find the right one.

**Typical section order (scroll down the page):**

1. App Information
2. Pricing and Availability  
3. App Privacy
4. Age Rating
5. **← Build** (upload build here if not done)
6. **← In-App Purchases and Subscriptions** (THIS IS WHAT YOU NEED!)
7. App Review Information
8. Version Information
9. Copyright

### What the Section Looks Like:

```
┌─────────────────────────────────────────┐
│ In-App Purchases and Subscriptions      │
│                                          │
│ [+] or [Manage] button                   │
│                                          │
│ (Empty or shows added purchases)         │
└─────────────────────────────────────────┘
```

### If You DON'T See This Section:

**Possible reasons:**

1. **No build uploaded yet**
   - Solution: Upload a build first (see Step 3)
   - The section only appears after you upload a build

2. **Wrong page**
   - Make sure you're on the VERSION page, not:
     - ❌ General app information page
     - ❌ Subscriptions management page
     - ❌ In-App Purchases creation page

3. **Subscription not approved**
   - Solution: Fix subscription issues first
   - Wait for "Ready to Submit" status

4. **Need to scroll more**
   - Solution: Scroll all the way down
   - It's usually near the bottom

---

## Step 3: Upload a Build (If Not Done Yet)

**IMPORTANT:** You must upload at least one build before the IAP section appears.

### Option A: Upload via Xcode

```bash
# 1. Navigate to project
cd /Users/alina/Documents/code/Darko-HostIQ-App/HostIQ

# 2. Open in Xcode
open ios/HostIQ.xcworkspace

# 3. In Xcode:
# - Select "Any iOS Device" or your device
# - Product → Archive
# - Wait for archive to complete (5-10 minutes)
# - Distribute App → App Store Connect
# - Upload
# - Wait for processing (10-30 minutes)
```

### Option B: Using EAS Build (Expo)

```bash
# If using Expo/EAS
eas build --platform ios --profile production

# After build completes, download and upload to App Store Connect
# Or configure EAS to auto-submit
```

### After Upload:

1. **Go back to App Store Connect**
2. **Refresh the version page**
3. **Wait 10-30 minutes** for build to process
4. **The "Build" section** should show your build
5. **The "In-App Purchases and Subscriptions" section** should now appear

---

## Step 4: Add Subscription to Version

### Once You See the Section:

1. **In "In-App Purchases and Subscriptions" section:**
   - Look for a **[+]** button or **"Manage"** button
   - Click it

2. **A modal/popup will appear:**
   - Shows list of available subscriptions and IAPs
   - You should see: "hostiq_pro_subscription" or "HostIQ Pro"

3. **Select your subscription:**
   - Click the checkbox next to "hostiq_pro_subscription"
   - OR click on the subscription row to select it

4. **Click "Done"** or **"Add"**
   - The subscription is now added to the version

5. **Verify it appears in the section:**
   - You should now see "HostIQ Pro" or "hostiq_pro_subscription" listed
   - Status should show next to it

6. **Click "Save"** in the top right
   - This saves the version with the subscription associated

---

## Step 5: Verify Association

### Check That It Worked:

1. **On the version page:**
   - Scroll to "In-App Purchases and Subscriptions" section
   - You should see your subscription listed:
     ```
     ┌─────────────────────────────────────────┐
     │ In-App Purchases and Subscriptions      │
     │                                          │
     │ ✓ HostIQ Pro (hostiq_pro_subscription)   │
     │                                          │
     └─────────────────────────────────────────┘
     ```

2. **Status should be:**
   - "Ready to Submit" (if subscription is approved)
   - Or same as subscription status

---

## Visual Navigation Guide

### Full Path:

```
App Store Connect Homepage
    ↓
Apps (top menu)
    ↓
HostIQ (click app tile)
    ↓
iOS App (left sidebar)
    ↓
Version 1.0 (or 1.0.1)
    ↓
SCROLL DOWN ↓↓↓
    ↓
In-App Purchases and Subscriptions section
    ↓
Click [+] or [Manage]
    ↓
Select: hostiq_pro_subscription
    ↓
Click: Done
    ↓
Click: Save (top right)
    ↓
✅ DONE!
```

---

## Troubleshooting

### Problem 1: Can't Find "In-App Purchases and Subscriptions" Section

**Solution A: Upload a Build**
- The section only appears after uploading a build
- Archive and upload from Xcode
- Wait 10-30 minutes for processing

**Solution B: Create New Version**
- If version 1.0 is problematic
- Create version 1.0.1
- Upload build to new version
- Section should appear

**Solution C: Fix Subscription First**
- Subscription must be "Ready to Submit"
- Fix rejection issues
- Wait for approval
- Then try again

### Problem 2: Subscription Not in the List

**Possible reasons:**

1. **Subscription not approved**
   - Status must be "Ready to Submit"
   - Fix and wait for approval

2. **Looking at wrong type**
   - Make sure looking at "Subscriptions" not just "In-App Purchases"
   - Both should be in the same section

3. **Wrong app/account**
   - Verify you're in the correct app
   - Verify correct App Store Connect account

### Problem 3: Can't Click Save

**Possible reasons:**

1. **Changes not detected**
   - Make a small change (add/remove subscription)
   - Then Save button should activate

2. **Validation error**
   - Check for red error messages on the page
   - Fix any required fields
   - Then try saving again

3. **Build not selected**
   - Make sure a build is selected in the "Build" section
   - Upload build if none available

---

## Alternative Method: Via Subscription Page

Sometimes you can also associate from the subscription side:

1. **Go to:** Features → Subscriptions
2. **Click on:** HostIQ Pro
3. **Look for:** "Availability" or "Apps" section
4. **Select:** Which app versions to include
5. **Save**

(This method varies by App Store Connect interface version)

---

## What Happens After Association

### Immediate:

- ✅ Subscription is linked to your app version
- ✅ Shows in "In-App Purchases and Subscriptions" section
- ✅ Ready for submission (when you're ready)

### After 24-48 Hours:

- ✅ Subscription becomes available in sandbox
- ✅ TestFlight testers can test subscriptions
- ✅ Using sandbox test accounts

### After App Store Approval:

- ✅ Subscription goes live in production
- ✅ Real users can purchase
- ✅ Real money transactions

---

## Timeline Summary

### Today:
1. Fix subscription rejection (15 minutes)
2. Wait for approval (1-3 days)

### After Subscription Approved:
1. Upload build to version (30-60 minutes)
2. Wait for build processing (10-30 minutes)
3. Add subscription to version (5 minutes)
4. Save version

### After Association:
1. Wait 24-48 hours for sandbox availability
2. Test in TestFlight with sandbox accounts

---

## Quick Checklist

- [ ] Subscription approved (status: "Ready to Submit")
- [ ] Build uploaded to the version
- [ ] Build processing completed (10-30 min)
- [ ] Found "In-App Purchases and Subscriptions" section
- [ ] Clicked [+] or [Manage]
- [ ] Selected "hostiq_pro_subscription"
- [ ] Clicked Done
- [ ] Clicked Save
- [ ] Verified subscription appears in section
- [ ] Wait 24-48 hours for sandbox sync

---

## Still Stuck?

### Try This:

1. **Take a screenshot** of your version page (scroll all the way down)
2. **Take a screenshot** of the section list you see
3. **Share it** - I can tell you exactly what's missing

### Or Contact Apple:

1. **App Store Connect:** Click **?** (question mark icon)
2. **Contact Us**
3. **Select:** In-App Purchases and Subscriptions
4. **Ask:** "How do I add my subscription to my app version?"

---

## Summary

**To associate subscription with version:**

1. ✅ Fix subscription (get to "Ready to Submit")
2. ✅ Upload a build to your version
3. ✅ Go to version page in App Store Connect
4. ✅ Scroll down to "In-App Purchases and Subscriptions"
5. ✅ Click [+] or [Manage]
6. ✅ Select your subscription
7. ✅ Click Done and Save

**After this, wait 24-48 hours for sandbox availability, then you can test in TestFlight!**

Good luck! 🚀
