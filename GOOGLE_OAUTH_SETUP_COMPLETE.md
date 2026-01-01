# Google OAuth Setup Guide - Complete Configuration

## 📋 Required OAuth Clients in Google Cloud Console

You need **3 different OAuth Client IDs** in Google Cloud Console:

### 1. ✅ Web Application (Web Client ID)
- **Type**: Web application
- **Has Client Secret**: YES ✓
- **Used for**: Backend authentication, server-side auth
- **Configuration**: Add authorized redirect URIs for your backend
- **Example**: `123456789-abc123defg.apps.googleusercontent.com`

### 2. ✅ iOS Application (iOS Client ID)  
- **Type**: iOS
- **Has Client Secret**: NO
- **Used for**: iOS app sign-in
- **Configuration**: Add iOS bundle ID
- **Example**: `1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5.apps.googleusercontent.com`
- **You already have this**: ✓

### 3. ✅ Android Application (Android Client ID)
- **Type**: Android
- **Has Client Secret**: NO
- **Used for**: Android app sign-in
- **Configuration**: 
  - Package name: `com.hostiq.app`
  - SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- **Example**: `123456789-xyz789.apps.googleusercontent.com`

---

## 🔧 How to Get Your Web Client ID

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find the OAuth Client with **Type: Web application**
3. If you don't have one, create it:
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `HostIQ Web Client` (or any name)
   - Authorized redirect URIs: Add your backend URLs (if needed)
   - Click "Create"
4. Copy the **Client ID** (it has a secret - that's how you know it's the Web Client ID)

---

## 📝 Update Your .env File

Add these variables to your `.env` file:

```env
# Web Client ID (the one with a secret - used for backend auth)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com

# iOS Client ID (you already have this one)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5.apps.googleusercontent.com

# Reversed Client ID for iOS URL scheme (you already have this)
REVERSE_CLIENT_ID=com.googleusercontent.apps.1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5

# Your API URL
EXPO_PUBLIC_API_URL=http://10.10.30.98:3000/api
```

**Replace `YOUR_WEB_CLIENT_ID.apps.googleusercontent.com` with your actual Web Client ID from Google Cloud Console.**

---

## 🎯 How Google Sign-In Works with These Client IDs

### On Android:
1. User taps "Sign in with Google"
2. Android automatically uses the **Android OAuth Client** that matches:
   - Package name: `com.hostiq.app`
   - SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
3. User signs in and app receives an **ID token**
4. App sends ID token to your backend
5. Backend verifies token using the **Web Client ID**
6. Backend creates/authenticates user and returns JWT tokens

### On iOS:
1. User taps "Sign in with Google"
2. iOS uses the **iOS OAuth Client** configured in the app
3. Same flow as Android from step 3 onwards

### The `webClientId` Parameter:
- This is used for **backend authentication**
- It tells Google to also return a token that can be verified by your backend
- Your backend uses this to verify the user's identity server-side

---

## ✅ Complete Setup Checklist

- [ ] **Web OAuth Client** created in Google Cloud Console
- [ ] **iOS OAuth Client** created in Google Cloud Console (✓ you have this)
- [ ] **Android OAuth Client** created in Google Cloud Console with SHA-1
- [ ] **`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`** added to `.env`
- [ ] **`EXPO_PUBLIC_GOOGLE_CLIENT_ID`** in `.env` (✓ you have this)
- [ ] Restart Metro bundler after updating `.env`
- [ ] Reload the app (press `r` in Metro terminal)
- [ ] Test Google Sign-In

---

## 🚀 After Updating .env

1. **Stop the Metro bundler** (Ctrl+C in the terminal)
2. **Restart the app**:
   ```bash
   npx expo run:android
   ```
   OR if dev client is already installed:
   ```bash
   npm start
   # Press 'a' to open on Android
   ```
3. **Test Google Sign-In** - it should now work! 🎉

---

## 🐛 Troubleshooting

### If you get DEVELOPER_ERROR:
✅ **Make sure you created the Android OAuth Client with**:
   - Package name: `com.hostiq.app`
   - SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - Wait 5-10 minutes after creating it

### If you get "Invalid client ID":
✅ **Check that**:
   - You're using the Web Client ID (the one with a secret)
   - The Client ID is in the same Google Cloud project
   - You've enabled the Google+ API or People API in the project

### If sign-in works but backend returns error:
✅ **Check that**:
   - Your backend is verifying the token with the correct Web Client ID
   - Your backend has the Google+ API or People API enabled
   - Your backend is properly configured to accept ID tokens

---

## 📚 Summary

**What you currently have**:
- ✅ iOS Client ID: `1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5.apps.googleusercontent.com`
- ✅ Reversed Client ID: `com.googleusercontent.apps.1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5`

**What you need to add**:
- ⬜ Web Client ID (get from Google Cloud Console - the one with a secret)
- ⬜ Android OAuth Client (create with package name + SHA-1)

**Environment variables**:
```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your_web_client_id>
EXPO_PUBLIC_GOOGLE_CLIENT_ID=1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5.apps.googleusercontent.com
REVERSE_CLIENT_ID=com.googleusercontent.apps.1084030815170-cnkfs277vgvc4m5l1jfma1onpt9cphm5
```
