# Google OAuth Fix Guide

## Current Issues

1. **App crashes** when clicking "Sign up with Google" - This is because the REVERSED_CLIENT_ID is missing from `Info.plist`
2. **Backend endpoint** is correctly configured: `POST /api/auth/google/mobile`

## Root Cause

The Google Sign-In SDK requires the REVERSED_CLIENT_ID to be added to iOS `Info.plist` file in the `CFBundleURLTypes` array. This is **required** for iOS apps to handle the OAuth callback.

## Solution Steps

### Step 1: Get Your REVERSED_CLIENT_ID

When you start the app, check the console logs. You should see:
```
✅ Google Sign-In configured successfully
   REVERSED_CLIENT_ID (for Info.plist): com.googleusercontent.apps.xxxxx-xxxxx
```

**OR** run the helper script:
```bash
node scripts/add-google-url-scheme.js
```

This will show you the exact REVERSED_CLIENT_ID you need.

### Step 2: Add REVERSED_CLIENT_ID to Info.plist

**Option A: Use the Helper Script (Recommended)**
```bash
node scripts/add-google-url-scheme.js
```

This will automatically add the REVERSED_CLIENT_ID to `ios/HostIQ/Info.plist`.

**Option B: Manual Edit**

1. Open `ios/HostIQ/Info.plist`
2. Find the `CFBundleURLTypes` array (around line 25)
3. Add this entry **inside** the array (after the existing `com.hostiq.app` entry):

```xml
<dict>
    <key>CFBundleURLSchemes</key>
    <array>
        <string>YOUR_REVERSED_CLIENT_ID_HERE</string>
    </array>
</dict>
```

Replace `YOUR_REVERSED_CLIENT_ID_HERE` with the value from Step 1.

**Example:** If your Client ID is `123456789-abcdefgh.apps.googleusercontent.com`, your REVERSED_CLIENT_ID is `com.googleusercontent.apps.123456789-abcdefgh`

### Step 3: Rebuild the App

After updating Info.plist, you **must** rebuild the app:

```bash
cd ios && pod install && cd ..
npx expo run:ios
```

Or if using Xcode:
1. Clean build folder (Cmd+Shift+K)
2. Rebuild (Cmd+B)

### Step 4: Verify Configuration

Make sure you have:
- ✅ `EXPO_PUBLIC_GOOGLE_CLIENT_ID` set in your `.env` file (your iOS Client ID from Google Cloud Console)
- ✅ REVERSED_CLIENT_ID added to `Info.plist` (from Step 2)
- ✅ App rebuilt after Info.plist changes

## Backend Endpoint

The backend endpoint is correctly configured:
- **Endpoint:** `POST /api/auth/google/mobile`
- **Base URL:** `https://roomify-server-production.up.railway.app/api`
- **Full URL:** `https://roomify-server-production.up.railway.app/api/auth/google/mobile`
- **Request Body:** `{ "idToken": "..." }`
- **Response:** `{ "accessToken": "...", "refreshToken": "...", "user": {...} }`

The frontend code is already calling this endpoint correctly.

## Testing

After completing the steps above:

1. Start the app
2. Click "Sign up with Google"
3. The app should:
   - Open Google Sign-In modal (not crash)
   - Allow you to select a Google account
   - Send the ID token to the backend
   - Receive and store the access/refresh tokens
   - Log you in successfully

## Troubleshooting

### Still Crashing?

1. **Verify REVERSED_CLIENT_ID is in Info.plist:**
   ```bash
   grep -A 5 "CFBundleURLTypes" ios/HostIQ/Info.plist
   ```
   You should see your REVERSED_CLIENT_ID in the output.

2. **Check console logs:**
   - Look for the REVERSED_CLIENT_ID value when app starts
   - Check for any error messages

3. **Verify Client ID:**
   - Make sure `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
   - It should be your **iOS Client ID** (not Web Client ID)
   - Format: `xxxxx-xxxxx.apps.googleusercontent.com`

### Backend Errors?

1. **Check network connectivity:**
   - Verify you can reach the backend server
   - Check API logs: `docker compose logs -f` (if running locally)

2. **Check ID token:**
   - The ID token should be a long JWT string
   - It should come from Google Sign-In SDK, not be manually created

3. **Check backend response:**
   - Look at console logs for API request/response
   - Check for 400/500 errors
   - Verify backend is running and accessible

## Environment Variables

Make sure these are set in your `.env` file:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_API_URL=https://roomify-server-production.up.railway.app/api
```

## Additional Resources

- [Google Sign-In iOS Setup](https://github.com/react-native-google-signin/google-signin/blob/master/docs/ios-setup.md)
- Backend API Documentation: `GOOGLE_OAUTH_API_DOCUMENTATION.md`

