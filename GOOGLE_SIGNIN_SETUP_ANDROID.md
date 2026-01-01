# Google Sign-In Setup for Android - HostIQ

## ✅ What's Done

1. ✅ **Custom Development Client Built** - No longer using Expo Go
2. ✅ **Google Sign-In Plugin Configured** - Added to app.json
3. ✅ **App Runs Successfully** on Android device
4. ✅ **Google Sign-In Code Configured** - Using your iOS Client ID

## 🔧 What You Need to Do Now

### Fix DEVELOPER_ERROR - Add SHA-1 to Google Cloud Console

The app is showing `DEVELOPER_ERROR` because your Android app's certificate fingerprint isn't registered in Google Cloud Console.

#### Your Debug SHA-1 Certificate:
```
SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

#### Steps:

1. **Go to Google Cloud Console**
   - URL: https://console.cloud.google.com/apis/credentials
   - Select your project (the one with your OAuth credentials)

2. **Create Android OAuth Client ID**
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Android**
   - Name: `HostIQ Android` (or any name you prefer)
   - Package name: **`com.hostiq.app`** (MUST match your app.json)
   - SHA-1 certificate fingerprint: **`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`**
   - Click "Create"

3. **Wait 5-10 minutes** for Google to propagate the changes

4. **Reload the App**
   - Press `r` in the terminal to reload
   - OR: Close the app and reopen it
   - Try Google Sign-In again

## 📱 Current App Configuration

- **Package Name**: `com.hostiq.app`
- **Debug Keystore**: `/home/faizan/code/luxury_lodging_host/HostIQ/android/app/debug.keystore`
- **iOS Client ID**: Configured from `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- **Reversed Client ID**: `com.googleusercontent.apps.1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5`

## 🎯 After Adding SHA-1

Once you've added the SHA-1 to Google Cloud Console:

1. Wait 5-10 minutes
2. In the terminal where Metro is running, press `r` to reload
3. Try Google Sign-In again
4. It should now work! 🎉

## 🐛 Troubleshooting

### If you still get DEVELOPER_ERROR:

1. **Verify the package name** in Google Cloud Console matches: `com.hostiq.app`
2. **Verify the SHA-1** matches exactly (copy-paste from this document)
3. **Wait longer** - sometimes Google takes up to 15 minutes to propagate
4. **Check you have both**:
   - iOS OAuth Client ID (for the web client ID in code)
   - Android OAuth Client ID (for the Android app)

### If you get SIGN_IN_CANCELLED:

This is normal - it means the user cancelled the sign-in flow.

### To get SHA-1 again in the future:

```bash
cd android && ./gradlew signingReport
```

Look for the SHA1 under the `:app:signingReport` section, `Variant: debug`.

## 📝 For Production

When you build for production, you'll need to:

1. Generate a release keystore
2. Get the SHA-1 from your release keystore
3. Add the release SHA-1 to Google Cloud Console as well
4. Keep both debug and release SHA-1s registered

## 🚀 Running the App

To run the app with the custom development client:

```bash
npx expo run:android
```

OR, if the development client is already installed on your device:

```bash
npm start
# Then press 'a' to open on Android
```

## ✨ Benefits of Custom Dev Client

Now that you have a custom development client:

- ✅ Native modules work (Google Sign-In, Camera, etc.)
- ✅ No more "module not available in Expo Go" errors
- ✅ Test your app exactly as it will work in production
- ✅ Faster development iteration

## 📚 Related Files

- `/android/app/build.gradle` - Configured with Play Store variant
- `/app.json` - Configured with Google Sign-In plugin
- `/src/config/googleAuth.js` - Google Sign-In configuration
- `/package.json` - Downgraded react-native-svg to fix build issues
