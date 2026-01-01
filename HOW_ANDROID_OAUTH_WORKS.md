# How Android Automatically Uses the Correct OAuth Client

## 🔍 The Question
**"How does Android automatically use the Android OAuth Client based on package name + SHA-1?"**

## ✅ The Answer

Android uses a **built-in mechanism** in Google Play Services that automatically matches your app to the correct OAuth client. You don't need to explicitly configure the Android Client ID in your code.

---

## 🛠️ Where the Configuration Comes From

### 1. **Package Name** (applicationId)

**File**: `/android/app/build.gradle`

```gradle
android {
    namespace 'com.hostiq.app'
    defaultConfig {
        applicationId 'com.hostiq.app'  // ← This is your package name
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.1"
    }
    // ...
}
```

**This is where your package name comes from**: `com.hostiq.app`

---

### 2. **SHA-1 Certificate Fingerprint**

**File**: `/android/app/build.gradle`

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')  // ← This keystore contains the certificate
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
}
```

**The keystore file** (`/android/app/debug.keystore`) contains the certificate that produces the SHA-1 fingerprint:
```
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

---

## 🔄 How It Works When You Call `GoogleSignin.signIn()`

### Step-by-Step Process:

```javascript
// In your React Native code:
const userInfo = await GoogleSignin.signIn();
```

When you call this, here's what happens under the hood:

### 1️⃣ **Native Module Reads App Configuration**
The `@react-native-google-signin/google-signin` native Android module automatically:
- Reads the **package name** from your app: `com.hostiq.app`
- Extracts the **SHA-1** from the signing certificate in the keystore
- Gets the **webClientId** you configured (for backend auth)

### 2️⃣ **Google Play Services Gets Involved**
The native module calls Google Play Services on the device:

```java
// Native Android code (internal to the library)
GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
    .requestIdToken(webClientId)  // Your Web Client ID from config
    .requestEmail()
    .build();

GoogleSignInClient mGoogleSignInClient = GoogleSignIn.getClient(activity, gso);
```

### 3️⃣ **Google Servers Match the OAuth Client**
Google Play Services sends a request to Google's servers with:
- **Package name**: `com.hostiq.app`
- **SHA-1**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- **Web Client ID**: (from your config)

Google's servers look for an **Android OAuth Client** that matches:
```
✓ Package name: com.hostiq.app
✓ SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

### 4️⃣ **Result**
- ✅ **If found**: Google returns tokens, sign-in succeeds
- ❌ **If not found**: Returns `DEVELOPER_ERROR` (what you're seeing now)

---

## 📋 Where the Package Name + SHA-1 Matching Happens

### In Your Code (`src/config/googleAuth.js`):

```javascript
GoogleSignin.configure({
  webClientId: webClientId,  // ← Web Client ID for backend auth
  iosClientId: iosClientId,  // ← Only used on iOS
  // No androidClientId needed! ← Android uses package + SHA-1 matching
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});
```

**Notice**: There's no `androidClientId` parameter! 

### In the Native Android Module:

The `@react-native-google-signin/google-signin` library handles this automatically:

1. **Reads your app's package name** from `AndroidManifest.xml` (generated from `build.gradle`)
2. **Reads the SHA-1** from the keystore when the app is signed
3. **Sends both to Google** when requesting authentication
4. **Google matches** these to your Android OAuth Client in Cloud Console

---

## 🎯 Why This Design?

### Security Benefits:

1. **App Signature Verification**: The SHA-1 ensures only YOUR app (signed with YOUR keystore) can use the OAuth client
2. **No Hardcoding**: You don't need to put the Android Client ID in your code (less exposure)
3. **Automatic Matching**: Google handles the complexity server-side

### Comparison with iOS:

| Platform | How OAuth Client is Selected |
|----------|------------------------------|
| **iOS** | Explicitly configured via `iosClientId` parameter |
| **Android** | Automatically matched via package name + SHA-1 |

---

## 🔍 How to Verify This is Working

### 1. Check Android Manifest (Generated)

After building, check `/android/app/build/intermediates/merged_manifests/debug/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.hostiq.app">  <!-- ← Package name -->
    ...
</manifest>
```

### 2. Check the Native Library Logs

When you run the app, the Google Sign-In SDK logs show:

```
D/GoogleSignInCommon: Attempting to retrieve account info
D/GoogleSignInCommon: Package: com.hostiq.app
D/GoogleSignInCommon: Signature: <SHA-1 hash>
```

### 3. Google Cloud Console Matching

When you create the Android OAuth Client in Google Cloud Console:

```
Android OAuth Client
├─ Package name: com.hostiq.app          ← Must match
├─ SHA-1: 5E:8F:16:06:...                ← Must match
└─ Client ID: 123456-xyz.apps.googleusercontent.com  ← Auto-generated
```

Google's servers use the package + SHA-1 you provided to match incoming sign-in requests.

---

## 📝 Summary

### **Where it's configured:**

1. **Package Name**: 
   - Defined in: `/android/app/build.gradle` → `applicationId 'com.hostiq.app'`
   - Used automatically by: Google Play Services

2. **SHA-1 Fingerprint**:
   - Generated from: `/android/app/debug.keystore`
   - Extracted automatically when: App is signed during build
   - Used automatically by: Google Play Services

3. **Matching Happens**:
   - When: You call `GoogleSignin.signIn()`
   - Where: Google's servers
   - How: Package name + SHA-1 lookup in OAuth clients table

### **What you need to do:**

✅ Create Android OAuth Client in Google Cloud Console with:
   - Package name: `com.hostiq.app`
   - SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

❌ You DON'T need to:
   - Add the Android Client ID to your code
   - Configure anything else in `googleAuth.js` for Android
   - Add any Android-specific configuration beyond the Google Sign-In plugin in `app.json`

---

## 🎓 Additional Technical Details

### The Google Sign-In Flow (Android):

```
┌─────────────────────┐
│  Your React Native  │
│       App           │
│                     │
│ GoogleSignin.signIn()│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Native Android      │
│ Module              │
│ (@react-native-     │
│  google-signin)     │
└──────────┬──────────┘
           │ Reads package name & SHA-1
           │ from app configuration
           ▼
┌─────────────────────┐
│ Google Play         │
│ Services            │
│ (on device)         │
└──────────┬──────────┘
           │ Sends:
           │ - Package: com.hostiq.app
           │ - SHA-1: 5E:8F:16:06:...
           │ - Web Client ID
           ▼
┌─────────────────────┐
│ Google's            │
│ OAuth Servers       │
│                     │
│ Looks up Android    │
│ OAuth Client with   │
│ matching pkg + SHA-1│
└──────────┬──────────┘
           │
           │ ✅ Match found? Return tokens
           │ ❌ No match? Return DEVELOPER_ERROR
           ▼
    Back to your app
```

---

## 📚 References

- **Package Name**: Automatically read from `AndroidManifest.xml` (generated from `build.gradle`)
- **SHA-1**: Automatically read from app signature (from keystore)
- **Matching Logic**: Handled by Google Play Services + Google OAuth servers
- **No Code Changes Needed**: It's all automatic!

The beauty of this system is that **you never need to handle the Android Client ID directly** - Google does it all for you based on your app's identity (package + signature).
