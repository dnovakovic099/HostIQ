# Android Subscription Setup - Step by Step

Based on your Google Play Console screenshot, here's exactly what to do:

## Step 1: Complete Developer Account Setup (If Needed)

I see a banner: "To publish apps, finish setting up your developer account"

1. Click on the banner or go to **Settings > Developer account**
2. Complete any required information:
   - Contact phone number verification
   - Payment information
   - Developer account details

**Note:** You can still create subscriptions even if the app is in "Draft" status!

---

## Step 2: Navigate to Subscriptions

1. In Google Play Console, click on **"HostIQ"** (or click "View app" link)
2. In the left sidebar, look for **"Monetize"** section
3. Click on **"Subscriptions"**
   - If you don't see it, click the **"Monetize"** dropdown first

---

## Step 3: Create Your Subscription Product

1. Click the **"+ Create subscription"** button (usually at the top right)

2. **Fill in the subscription details:**

   **Basic Information:**
   - **Product ID**: `property_subscription_monthly`
     - ⚠️ **MUST match exactly** what's in your code!
     - No spaces, lowercase with underscores
   - **Name**: `Pricing Pro`
   - **Description**: 
     ```
     AI-powered pricing recommendations and market analysis for your properties. Get real-time market insights, optimal pricing suggestions, and maximize your rental income.
     ```

3. **Set Billing Period:**
   - **Billing period**: Select "1 month"
   - **Price**: 
     - Click "Add price"
     - Select "United States Dollar (USD)"
     - Enter: `29.00`
     - Click "Save"

4. **Set Up Free Trial (7-Day):**
   - Scroll down to **"Free trial and introductory price"**
   - Toggle **"Free trial"** ON
   - Set duration: **7 days**
   - Click "Save"

5. **Review and Activate:**
   - Review all details
   - Click **"Save"** at the bottom
   - After saving, click **"Activate"** button
   - Status should change to **"Active"**

---

## Step 4: Set Up License Testing (For Testing)

1. Go back to main menu: Click **"Settings"** in left sidebar
2. Click **"License testing"**
3. Under **"License testers"**, click **"Add email addresses"**
4. Add your Gmail account(s) that you'll use for testing
5. Click **"Save"**

**Important:** 
- Only these accounts can test purchases without being charged
- Use a different Gmail account than your developer account for testing

---

## Step 5: Test in Your App

1. **Build and install your app** on an Android device
   ```bash
   expo run:android
   ```

2. **Sign in with your license tester account** on the device
   - Go to Play Store app
   - Make sure you're signed in with the tester account

3. **Open your app** and navigate to the subscription screen

4. **Try to purchase:**
   - Click "Start 7-Day Free Trial"
   - The purchase should complete without charging
   - You'll see a test purchase notification

---

## Verification Checklist

After setup, verify:

✅ Subscription is **Active** (not Draft) in Google Play Console
✅ Product ID is exactly: `property_subscription_monthly`
✅ Price is set to $29.00/month
✅ Free trial is set to 7 days
✅ License tester account is added
✅ App is installed on device with tester account signed in

---

## Troubleshooting

### "Subscription not available in store"

**Check:**
1. Is subscription **Active**? (Not Draft)
2. Does Product ID match exactly? (case-sensitive)
3. Are you signed in with a license tester account?
4. Is the app signed with the correct keystore?
5. Wait a few minutes after creating - Google Play needs time to sync

### "You need permission to create new apps"

This message is about creating NEW apps, not subscriptions. You should be able to create subscriptions for your existing HostIQ app.

If you can't see "Subscriptions" option:
- Make sure you're viewing the HostIQ app (click "View app")
- Check that you have the right permissions
- Try refreshing the page

### App is in "Draft" status

**This is OK!** You can create and test subscriptions even if the app isn't published. The subscription just needs to be **Active**.

---

## Next Steps

1. ✅ Create subscription in Google Play Console
2. ✅ Set up license testing
3. ✅ Test purchase in app
4. ✅ Verify backend receives purchase verification
5. ✅ Test subscription status endpoint

---

## Quick Reference

**Product ID:** `property_subscription_monthly`
**Price:** $29.00/month
**Free Trial:** 7 days
**Package Name:** `com.hostiq.app`




