# TestFlight Subscription Setup - "Ready to Submit" Status

## Current Situation
- ✅ Subscription `hostiq_pro_subscription` exists in App Store Connect
- ✅ Status: "Ready to Submit"
- ❌ Product not available in TestFlight yet

## Why It's Not Available
Even though the subscription exists, **"Ready to Submit" means it hasn't been linked to an app version yet**. For TestFlight, you need to:

1. **Associate the subscription with an app version** (link them together in App Store Connect)
2. **Wait for sandbox availability** (24-48 hours after association)

**What "Associate with App Version" Means:**
- You need to go to your app's version page in App Store Connect
- Add the subscription to that version's "In-App Purchases and Subscriptions" section
- This links the subscription to your app so TestFlight can find it
- You can do this without submitting the entire app for review

## Solution: Submit Subscription with App Version

According to Apple's requirements (shown in the blue info box):
> "Your first subscription must be submitted with a new app version. Create your subscription, then select it from the app's In-App Purchases and Subscriptions section on the version page before submitting the version to App Review."

### Step 1: Associate Subscription with App Version

Since your version 1.0 is rejected, you have two options:

#### Option A: Add Subscription to Existing Version (Even if Rejected)

1. **Go to Your App Version:**
   - In App Store Connect, you're already on **HostIQ** → **Distribution** tab
   - In the left sidebar, you should see **"iOS App"** with **"1.0 Rejected"**
   - Click on **"1.0 Rejected"** (or the version number) to open it

2. **Find "In-App Purchases and Subscriptions" Section:**
   - Scroll down on the version page
   - Look for a section called **"In-App Purchases and Subscriptions"** or **"In-App Purchases"**
   - It might be near the bottom, after "App Store" section

3. **Add Subscription:**
   - In that section, click **+** (plus button) to add
   - Select `hostiq_pro_subscription` from the dropdown/list
   - Click **Done**

4. **Save:**
   - Click **"Save"** button at the top right
   - You don't need to click "Add for Review" - just saving is enough

#### Option B: Create a New Version (If Option A Doesn't Work)

If you can't find the "In-App Purchases and Subscriptions" section on the rejected version:

1. **Create New Version:**
   - In the left sidebar, click **"Add Platform"** or look for **"+"** next to iOS App
   - Create version 1.0.1 (or increment the version number)
   - This creates a fresh version you can work with

2. **Add Subscription to New Version:**
   - On the new version page, scroll to **"In-App Purchases and Subscriptions"** section
   - Click **+** and select `hostiq_pro_subscription`
   - Click **Save**

### Step 2: Save the Version

**Important:** You don't need to submit the entire app for review! Just saving is enough.

1. **Click "Save"** at the top right of the version page
   - This saves the association between the subscription and app version
   - You don't need to click "Submit for Review" unless you want to submit the app

2. **What happens:**
   - The subscription is now linked to your app version
   - This makes it available for TestFlight (after sandbox propagation)
   - The app version can remain in "Prepare for Submission" status

**Note:** Some users report that clicking "Save" is enough, while others find that the subscription becomes available faster if you at least save the version. You don't need to fully submit the app to App Review just to test subscriptions in TestFlight.

### Step 3: Save the Version (If Not Already Saved)

1. **Click "Save"** button at the top right (if it's not grayed out)
   - This ensures the association is saved
   - You don't need to click "Add for Review" - just saving is enough

### Step 4: Wait for Sandbox Availability

After saving:
- ⏰ **Wait 24-48 hours** for the subscription to become available in sandbox
- Apple needs time to propagate the subscription to their sandbox environment
- The subscription will be available in TestFlight once it's in the sandbox

**Note:** This wait time is normal and required by Apple. You cannot skip this step.

### Step 5: Verify in TestFlight (After 24-48 Hours)

1. **Install TestFlight build** on your device
2. **Sign out of App Store:**
   - Settings → App Store → Sign Out
3. **Try to purchase:**
   - When prompted, sign in with a **sandbox test account**
   - The subscription should now be available!

## Alternative: Quick Test Without Full Submission

If you want to test immediately without waiting:

1. **Use StoreKit Configuration locally:**
   - Run from Xcode (not TestFlight)
   - StoreKit Configuration file will work locally
   - This is only for development testing

2. **For TestFlight, you must:**
   - Submit the subscription with an app version
   - Wait for sandbox availability
   - Use sandbox test accounts

## Checklist

- [ ] Subscription `hostiq_pro_subscription` exists in App Store Connect
- [ ] Subscription status is "Ready to Submit" or better
- [ ] Subscription is associated with an app version
- [ ] App version is saved (or submitted)
- [ ] Wait 24-48 hours for sandbox availability
- [ ] Test in TestFlight with sandbox test account

## Troubleshooting

### Still Not Available After 48 Hours?

1. **Check Subscription Status:**
   - Go back to App Store Connect
   - Verify subscription is still "Ready to Submit" or "Waiting for Review"
   - If it shows errors, fix them

2. **Verify Association:**
   - Check that subscription is listed in app version's "In-App Purchases and Subscriptions" section

3. **Check Sandbox Test Account:**
   - Ensure you're using a sandbox test account (not your regular Apple ID)
   - Sign out of App Store before testing

4. **Check Console Logs:**
   - Look for specific error messages
   - Verify product ID matches: `hostiq_pro_subscription`

## Important Notes

- **StoreKit Configuration sync** only works when running from Xcode locally
- **TestFlight uses real App Store Connect products**, not StoreKit Configuration files
- **First subscription must be submitted with an app version** (Apple requirement)
- **Sandbox availability takes 24-48 hours** after submission

## Next Steps

1. Associate subscription with app version (Step 1)
2. Save or submit the version (Step 2)
3. Wait 24-48 hours (Step 3)
4. Test in TestFlight with sandbox account (Step 4)

Once these steps are complete, the subscription will be available in TestFlight! 🎉
