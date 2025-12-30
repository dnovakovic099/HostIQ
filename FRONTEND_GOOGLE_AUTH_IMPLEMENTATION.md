# React Native Google OAuth Implementation Guide

This guide provides step-by-step instructions for implementing Google Sign-In authentication in your React Native app.

## 📋 Prerequisites

- React Native app (Expo or bare React Native)
- Google OAuth Client ID (iOS) from Google Cloud Console
- Backend API endpoint: `POST /api/auth/google/mobile`

## 🚀 Implementation Steps

### Step 1: Install Google Sign-In Package

#### For Expo Managed Workflow:

```bash
npx expo install @react-native-google-signin/google-signin
```

#### For Bare React Native:

```bash
npm install @react-native-google-signin/google-signin

# iOS
cd ios && pod install && cd ..

# Android - Add to android/build.gradle
# (See package documentation for Android setup)
```

### Step 2: Configure Google Sign-In

Create a configuration file or add to your app initialization:

```javascript
// config/googleAuth.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', // From Google Cloud Console (iOS client)
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Optional: iOS-specific client ID
  offlineAccess: true, // If you want to access Google API on behalf of the user FROM YOUR SERVER
  forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below.
});

export default GoogleSignin;
```

**Important:** Use the **iOS Client ID** from Google Cloud Console (the one without a secret).

### Step 3: Create Authentication Service

Create a service file to handle Google authentication:

```javascript
// services/authService.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { API_BASE_URL } from '../config';

class AuthService {
  constructor() {
    this.apiBaseUrl = API_BASE_URL; // e.g., 'http://localhost:3000/api'
  }

  /**
   * Sign in with Google
   * @returns {Promise<{accessToken: string, refreshToken: string, user: object}>}
   */
  async signInWithGoogle() {
    try {
      // Check if Google Play Services are available (Android)
      await GoogleSignin.hasPlayServices();

      // Get user info from Google
      const userInfo = await GoogleSignin.signIn();

      // Extract ID token
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('Failed to get ID token from Google');
      }

      // Send ID token to backend
      const response = await fetch(`${this.apiBaseUrl}/auth/google/mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: idToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();

      // Store tokens securely
      await this.storeTokens(data.accessToken, data.refreshToken);
      await this.storeUser(data.user);

      return data;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        throw new Error('Sign in was cancelled');
      } else if (error.code === 'IN_PROGRESS') {
        throw new Error('Sign in is already in progress');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw new Error('Google Play Services not available');
      }
      
      throw error;
    }
  }

  /**
   * Sign out from Google
   */
  async signOut() {
    try {
      await GoogleSignin.signOut();
      await this.clearTokens();
      await this.clearUser();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Check if user is signed in
   */
  async isSignedIn() {
    try {
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user from Google
   */
  async getCurrentUser() {
    try {
      return await GoogleSignin.getCurrentUser();
    } catch (error) {
      return null;
    }
  }

  /**
   * Store tokens securely (use AsyncStorage or SecureStore)
   */
  async storeTokens(accessToken, refreshToken) {
    // Using Expo SecureStore (recommended)
    const SecureStore = require('expo-secure-store').default;
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);

    // Or using AsyncStorage (less secure, but works)
    // import AsyncStorage from '@react-native-async-storage/async-storage';
    // await AsyncStorage.setItem('accessToken', accessToken);
    // await AsyncStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Get stored tokens
   */
  async getTokens() {
    const SecureStore = require('expo-secure-store').default;
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    return { accessToken, refreshToken };
  }

  /**
   * Clear stored tokens
   */
  async clearTokens() {
    const SecureStore = require('expo-secure-store').default;
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  }

  /**
   * Store user data
   */
  async storeUser(user) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Get stored user data
   */
  async getUser() {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const userJson = await AsyncStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Clear user data
   */
  async clearUser() {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('user');
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    try {
      const { refreshToken } = await this.getTokens();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      await this.storeTokens(data.accessToken, refreshToken);

      return data.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.clearTokens();
      throw error;
    }
  }
}

export default new AuthService();
```

### Step 4: Create Authentication Context (Optional but Recommended)

Create a React Context for managing authentication state:

```javascript
// context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const storedUser = await authService.getUser();
      const { accessToken } = await authService.getTokens();

      if (storedUser && accessToken) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    try {
      setLoading(true);
      const data = await authService.signInWithGoogle();
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    signIn,
    signOut,
    refreshToken: authService.refreshAccessToken.bind(authService),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### Step 5: Create Sign-In Component

Create a button component for Google Sign-In:

```javascript
// components/GoogleSignInButton.js
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

const GoogleSignInButton = () => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await signIn();
      // Navigation will be handled by your navigation logic
    } catch (error) {
      console.error('Sign in failed:', error);
      // Show error message to user
      alert(error.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleSignIn}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>Sign in with Google</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GoogleSignInButton;
```

### Step 6: Setup App with Auth Provider

Wrap your app with the AuthProvider:

```javascript
// App.js
import React from 'react';
import { AuthProvider } from './context/AuthContext';
import Navigation from './navigation';
import GoogleSignin from './config/googleAuth';

export default function App() {
  // Initialize Google Sign-In
  React.useEffect(() => {
    // GoogleSignin is already configured in config/googleAuth.js
  }, []);

  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
```

### Step 7: Create Protected Route Component

Create a component to protect routes that require authentication:

```javascript
// components/ProtectedRoute.js
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return children;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProtectedRoute;
```

### Step 8: Create API Client with Token Management

Create an API client that automatically includes the access token:

```javascript
// services/apiClient.js
import authService from './authService';

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const { accessToken } = await authService.getTokens();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      // If token expired, try to refresh
      if (response.status === 401 && accessToken) {
        const newAccessToken = await authService.refreshAccessToken();
        config.headers.Authorization = `Bearer ${newAccessToken}`;
        
        const retryResponse = await fetch(`${this.baseURL}${endpoint}`, config);
        return this.handleResponse(retryResponse);
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  async handleResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export default new ApiClient('http://localhost:3000/api'); // Update with your API URL
```

## 📝 Required Environment Variables

Add to your `.env` file or config:

```javascript
// config/index.js
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Development
  : 'https://your-production-api.com/api';  // Production

export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```

## 🧪 Testing

1. **Test Sign-In Flow:**
   ```javascript
   // In your component
   const handleTest = async () => {
     try {
       const result = await authService.signInWithGoogle();
       console.log('Sign in successful:', result);
     } catch (error) {
       console.error('Sign in failed:', error);
     }
   };
   ```

2. **Test Token Storage:**
   ```javascript
   const tokens = await authService.getTokens();
   console.log('Stored tokens:', tokens);
   ```

3. **Test API Calls:**
   ```javascript
   // After signing in
   const user = await apiClient.get('/auth/me');
   console.log('Current user:', user);
   ```

## 🔧 Troubleshooting

### Common Issues:

1. **"SIGN_IN_REQUIRED" error:**
   - Make sure Google Sign-In is properly configured
   - Check that you're using the correct Client ID

2. **"PLAY_SERVICES_NOT_AVAILABLE" (Android):**
   - Ensure Google Play Services are installed on the device
   - Test on a real device or emulator with Google Play Services

3. **"Network request failed":**
   - Check your API base URL
   - Ensure backend server is running
   - Check network connectivity

4. **Token not being stored:**
   - Make sure you've installed `expo-secure-store` or `@react-native-async-storage/async-storage`
   - Check storage permissions

## 📚 Additional Resources

- [@react-native-google-signin/google-signin Documentation](https://github.com/react-native-google-signin/google-signin)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

## ✅ Implementation Checklist

- [ ] Install Google Sign-In package
- [ ] Configure Google Sign-In with Client ID
- [ ] Create authentication service
- [ ] Create AuthContext (optional)
- [ ] Create sign-in button component
- [ ] Setup protected routes
- [ ] Create API client with token management
- [ ] Test sign-in flow
- [ ] Test token refresh
- [ ] Test API calls with authentication
- [ ] Handle error cases
- [ ] Test on both iOS and Android

## 🎯 Backend API Endpoints

Your backend provides these endpoints:

- `POST /api/auth/google/mobile` - Authenticate with Google ID token
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user (requires authentication)
- `POST /api/auth/logout` - Logout (requires authentication)

All authenticated endpoints require the `Authorization: Bearer <accessToken>` header.

