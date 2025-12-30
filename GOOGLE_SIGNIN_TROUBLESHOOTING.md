# Google Sign-In Troubleshooting Guide

## Current Issue: Modal Not Appearing / Timeout

If you're experiencing:
- Google Sign-In modal not appearing
- Timeout errors after clicking "Sign up with Google"
- "Google Sign-In timeout after 60 seconds" error

## Critical Steps (Must Do First)

### 1. **REBUILD THE APP** ⚠️ CRITICAL

After updating `Info.plist`, you **MUST** rebuild the app. The changes won't take effect until you rebuild:

```bash
# Stop the current app/simulator
# Then:
cd ios && pod install && cd ..
npx expo run:ios
```

**Or in Xcode:**
1. Clean build folder: `Cmd+Shift+K`
2. Rebuild: `Cmd+B`
3. Run: `Cmd+R`

### 2. Verify Info.plist is Correct

Check that `ios/HostIQ/Info.plist` contains your REVERSED_CLIENT_ID:

```bash
grep -A 5 "CFBundleURLTypes" ios/HostIQ/Info.plist
```

You should see:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.hostiq.app</string>
        </array>
    </dict>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5</string>
        </array>
    </dict>
</array>
```

### 3. Verify Configuration

When the app starts, check console logs for:
```
✅ Google Sign-In configured successfully
   REVERSED_CLIENT_ID (for Info.plist): com.googleusercontent.apps.1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5
```

## Common Issues & Solutions

### Issue 1: Modal Never Appears

**Symptoms:**
- Clicking "Sign up with Google" does nothing
- Timeout error after 60 seconds
- No Google account picker appears

**Solutions:**

1. **Rebuild the app** (most common fix)
   ```bash
   cd ios && pod install && cd ..
   npx expo run:ios
   ```

2. **Check if native module is linked:**
   ```bash
   cd ios && pod install
   ```
   Make sure `@react-native-google-signin/google-signin` is in your `Podfile.lock`

3. **Verify Client ID:**
   - Make sure `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
   - It should be your **iOS Client ID** (not Web Client ID)
   - Format: `xxxxx-xxxxx.apps.googleusercontent.com`

4. **Check Info.plist:**
   - REVERSED_CLIENT_ID must be in `CFBundleURLTypes`
   - XML structure must be valid (no malformed tags)

5. **Try on a real device:**
   - Simulators sometimes have issues with Google Sign-In
   - Test on a physical iOS device

### Issue 2: Backend Timeout

**Symptoms:**
- Google Sign-In modal appears and works
- But backend request times out after 30-60 seconds

**Solutions:**

1. **Check backend is running:**
   ```bash
   # If using local backend
   curl http://localhost:3000/api/auth/google/mobile
   
   # Check backend logs
   docker compose logs -f
   ```

2. **Verify network connectivity:**
   - Check if you can reach the backend URL
   - Test with: `curl https://roomify-server-production.up.railway.app/api/auth/google/mobile`

3. **Check backend logs:**
   - Look for incoming requests
   - Check for errors in backend logs

4. **Increase timeout** (already done in code - 60 seconds)

### Issue 3: "Request was cancelled" Error

**Symptoms:**
- Error message: "Request was cancelled. Please try again..."

**Solutions:**

1. **Check internet connection:**
   - Ensure stable WiFi or cellular connection
   - Try switching networks

2. **Check backend accessibility:**
   - Verify backend URL is correct
   - Test backend endpoint manually

3. **Retry:**
   - Sometimes network hiccups cause this
   - Try again after a few seconds

## Diagnostic Steps

### Step 1: Check Configuration

When app starts, look for these logs:
```
🔍 Google Sign-In Config Debug:
   DIRECT_CLIENT_ID: null
   process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID: SET
   Final iosClientId: 1084030815170-cnkfs2...
✅ Google Sign-In configured successfully
```

If you see warnings or errors, fix them first.

### Step 2: Check Info.plist

Run this command to verify Info.plist:
```bash
grep -A 10 "CFBundleURLTypes" ios/HostIQ/Info.plist
```

Should show both URL schemes.

### Step 3: Test Sign-In Flow

1. Click "Sign up with Google"
2. Check console logs:
   - Should see: `🔵 Calling GoogleSignin.signIn()...`
   - Should see: `🔵 This should open the Google Sign-In modal`
3. **Modal should appear immediately**
4. If modal doesn't appear → Rebuild app

### Step 4: Check Backend

After Google Sign-In succeeds:
1. Should see: `✅ Successfully obtained Google ID token`
2. Should see: `🔵 Sending ID token to backend`
3. Should see: `✅ Backend response received: 200`

If backend times out:
- Check backend is running
- Check network connectivity
- Check backend logs

## Still Not Working?

### Last Resort Steps:

1. **Clean everything:**
   ```bash
   # Clean iOS build
   cd ios
   rm -rf build
   rm -rf Pods
   rm Podfile.lock
   pod install
   cd ..
   
   # Clean Metro cache
   npx expo start --clear
   
   # Rebuild
   npx expo run:ios
   ```

2. **Verify Google Cloud Console:**
   - Check your iOS Client ID is correct
   - Verify bundle ID matches: `com.hostiq.app`
   - Check OAuth consent screen is configured

3. **Check Xcode:**
   - Open project in Xcode
   - Check "Signing & Capabilities"
   - Verify bundle identifier is correct
   - Check for any warnings/errors

4. **Test with minimal code:**
   - Create a test button that only calls `GoogleSignin.signIn()`
   - See if modal appears
   - If not, it's a configuration issue

## Expected Flow

1. ✅ App starts → Google Sign-In configured
2. ✅ User clicks "Sign up with Google"
3. ✅ Google Sign-In modal appears **immediately**
4. ✅ User selects Google account
5. ✅ ID token received
6. ✅ ID token sent to backend
7. ✅ Backend responds with access/refresh tokens
8. ✅ User logged in

If step 3 fails → Rebuild app
If step 6 fails → Check backend

## Need More Help?

Check these resources:
- [Google Sign-In iOS Setup](https://github.com/react-native-google-signin/google-signin/blob/master/docs/ios-setup.md)
- Backend API docs: `GOOGLE_OAUTH_API_DOCUMENTATION.md`
- Frontend implementation: `FRONTEND_GOOGLE_AUTH_IMPLEMENTATION.md`

