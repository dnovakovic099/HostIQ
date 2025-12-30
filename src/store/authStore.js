import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';
import biometricAuth from '../services/biometricAuth';
import { useOnboardingStore } from './onboardingStore';
import GoogleSignin, { getIsConfigured, getReversedClientIdForInfoPlist } from '../config/googleAuth';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,
  biometricAvailable: false,
  biometricEnabled: false,

  setTokens: async (accessToken, refreshToken, user) => {
    try {
      await SecureStore.setItemAsync('accessToken', accessToken);
      if (refreshToken) {
        await SecureStore.setItemAsync('refreshToken', refreshToken);
      }
      set({ 
        accessToken, 
        refreshToken, 
        user, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  },

  loadToken: async () => {
    try {
      // Check biometric availability
      const { available } = await biometricAuth.isAvailable();
      const enabled = await biometricAuth.isBiometricEnabled();
      
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      
      if (accessToken) {
        // Try to get user info
        try {
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          set({ 
            accessToken, 
            refreshToken, 
            user: response.data, 
            isAuthenticated: true,
            isLoading: false,
            biometricAvailable: available,
            biometricEnabled: enabled
          });
        } catch (error) {
          // Token might be expired, try refresh
          if (refreshToken) {
            await get().refreshAccessToken();
          } else {
            set({ 
              isLoading: false, 
              isAuthenticated: false,
              biometricAvailable: available,
              biometricEnabled: enabled
            });
          }
        }
      } else {
        set({ 
          isLoading: false, 
          isAuthenticated: false,
          biometricAvailable: available,
          biometricEnabled: enabled
        });
      }
    } catch (error) {
      console.error('Error loading token:', error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }

    try {
      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken } = response.data;
      await SecureStore.setItemAsync('accessToken', accessToken);
      set({ accessToken });
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await get().logout();
      return false;
    }
  },

  login: async (email, password, rememberMe = false) => {
    try {
      console.log('🔐 Attempting login to:', api.defaults.baseURL);
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;
      await get().setTokens(accessToken, refreshToken, user);
      
      // Save or clear credentials based on rememberMe
      if (rememberMe) {
        await biometricAuth.storeValue('saved_email', email);
        await biometricAuth.storeValue('saved_password', password);
        await biometricAuth.storeValue('remember_me', 'true');
      } else {
        await biometricAuth.deleteStoredValue('saved_email');
        await biometricAuth.deleteStoredValue('saved_password');
        await biometricAuth.deleteStoredValue('remember_me');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      // Better error handling for different error types
      let errorMessage = 'Login failed';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response (network error)
        errorMessage = 'Cannot reach server. Please check your internet connection.';
      } else {
        // Something else went wrong
        errorMessage = error.message || 'Login failed';
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  },

  signInWithGoogle: async (role) => {
    try {
      set({ isLoading: true });
      
      // Check if GoogleSignin module is available
      if (!GoogleSignin || typeof GoogleSignin.signIn !== 'function') {
        throw new Error('Google Sign-In module is not available. Please rebuild the app after installing the package.');
      }

      // CRITICAL: Check if GoogleSignin is configured before calling signIn()
      // This prevents native crashes
      if (!getIsConfigured()) {
        const reversedClientId = getReversedClientIdForInfoPlist();
        let errorMsg = 'Google Sign-In is not configured. ';
        errorMsg += 'Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment variables or set DIRECT_CLIENT_ID in src/config/googleAuth.js';
        if (reversedClientId) {
          errorMsg += `\n\nAlso, make sure to add the REVERSED_CLIENT_ID to Info.plist:\n${reversedClientId}`;
        }
        throw new Error(errorMsg);
      }

      // Verify configuration exists - this is critical to prevent crashes
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 
                         process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      if (!webClientId || webClientId === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
        throw new Error('Google Sign-In is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment variables or set DIRECT_CLIENT_ID in src/config/googleAuth.js');
      }

      console.log('🔵 Starting Google Sign-In...');
      console.log('🔵 GoogleSignin module available:', !!GoogleSignin);
      console.log('🔵 signIn function available:', typeof GoogleSignin.signIn === 'function');
      console.log('🔵 Client ID configured:', webClientId ? 'YES' : 'NO');
      console.log('🔵 GoogleSignin.configure() called:', getIsConfigured() ? 'YES' : 'NO');
      
      // Additional diagnostic check for iOS
      if (Platform.OS === 'ios') {
        try {
          const currentUser = await GoogleSignin.getCurrentUser();
          console.log('🔵 Current Google user:', currentUser ? 'Signed in' : 'Not signed in');
        } catch (e) {
          console.log('🔵 Could not check current user (normal if not signed in)');
        }
      }

      // Check if Google Play Services are available (Android)
      if (Platform.OS === 'android') {
        try {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        } catch (playServicesError) {
          console.error('Google Play Services error:', playServicesError);
          throw new Error('Google Play Services not available. Please update Google Play Services.');
        }
      }

      // Check if user is already signed in and sign out first
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          console.log('🔵 User already signed in, signing out first...');
          await GoogleSignin.signOut();
          console.log('✅ Signed out successfully');
        }
      } catch (signOutError) {
        console.log('⚠️ Sign out check/action failed (non-critical):', signOutError);
        // Continue anyway - might not be signed in
      }

      // Get user info from Google
      let userInfo;
      try {
        console.log('🔵 Calling GoogleSignin.signIn()...');
        console.log('🔵 This should open the Google Sign-In modal');
        
        // For iOS, double-check configuration before calling native method
        if (Platform.OS === 'ios') {
          const reversedClientId = getReversedClientIdForInfoPlist();
          if (!reversedClientId) {
            throw new Error('REVERSED_CLIENT_ID not found. Make sure EXPO_PUBLIC_GOOGLE_CLIENT_ID is set correctly.');
          }
          console.log('🔵 REVERSED_CLIENT_ID:', reversedClientId);
          console.log('🔵 ⚠️ Make sure this value is added to Info.plist CFBundleURLSchemes!');
        }
        
        // Wrap signIn in additional error handling to catch native crashes
        let signInPromise;
        try {
          signInPromise = GoogleSignin.signIn();
          console.log('🔵 signIn() called, waiting for user interaction...');
        } catch (immediateError) {
          // Catch synchronous errors
          console.error('❌ Immediate error calling signIn():', immediateError);
          throw new Error(`Failed to initiate Google Sign-In: ${immediateError?.message || 'Unknown error'}. Make sure REVERSED_CLIENT_ID is in Info.plist.`);
        }
        
        // Timeout after 60 seconds - modal should appear immediately if configured correctly
        // Store timeout ID so we can clear it if sign-in succeeds
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            // Don't log here - will be logged in catch block if timeout actually wins
            const reversedClientId = getReversedClientIdForInfoPlist();
            reject(new Error(`Google Sign-In timeout. The sign-in modal did not appear. This usually means:\n\n1. The app needs to be rebuilt after Info.plist changes\n2. REVERSED_CLIENT_ID in Info.plist: ${reversedClientId || 'NOT FOUND'}\n3. Make sure you've run: cd ios && pod install && cd ..\n4. Rebuild the app completely (not just reload)\n\nIf Info.plist is correct, try:\n- Clean build folder\n- Delete derived data\n- Rebuild app`));
          }, 60000);
        });
        
        try {
          userInfo = await Promise.race([signInPromise, timeoutPromise]);
          // Clear timeout if sign-in succeeded (prevents timeout from firing and causing unhandled rejection)
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          console.log('✅ Google Sign-In successful, userInfo:', userInfo ? 'received' : 'null');
        } catch (error) {
          // Clear timeout on error
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          throw error;
        }
      } catch (signInError) {
        console.error('❌ Google Sign-In error:', signInError);
        console.error('Error type:', typeof signInError);
        console.error('Error code:', signInError?.code);
        console.error('Error message:', signInError?.message);
        console.error('Error name:', signInError?.name);
        
        // Handle timeout errors with helpful message
        if (signInError?.message?.includes('timeout')) {
          const reversedClientId = getReversedClientIdForInfoPlist();
          return {
            success: false,
            error: signInError.message || 'Google Sign-In timed out. The sign-in modal did not appear. This usually means the app needs to be rebuilt after Info.plist changes. Make sure to:\n\n1. Clean build (Product > Clean Build Folder in Xcode)\n2. Rebuild the app completely (not just reload)\n3. Verify REVERSED_CLIENT_ID in Info.plist matches your Client ID'
          };
        }
        
        // Handle cancellation gracefully
        if (signInError?.code === 'SIGN_IN_CANCELLED' || 
            signInError?.code === '-5' ||
            signInError?.code === '10' ||
            signInError?.message?.includes('cancelled') ||
            signInError?.message?.includes('user_cancelled')) {
          return { 
            success: false, 
            error: 'Sign in was cancelled' 
          };
        }
        
        // Handle configuration errors
        if (signInError?.message?.includes('not configured') || 
            signInError?.message?.includes('configuration')) {
          const reversedClientId = getReversedClientIdForInfoPlist();
          let errorMsg = 'Google Sign-In is not properly configured. Please check your Client ID settings.';
          if (reversedClientId && Platform.OS === 'ios') {
            errorMsg += `\n\nFor iOS, make sure to add the REVERSED_CLIENT_ID to Info.plist URL schemes: ${reversedClientId}`;
          }
          return {
            success: false,
            error: errorMsg
          };
        }
        
        // Handle iOS-specific URL scheme errors
        if (Platform.OS === 'ios') {
          const reversedClientId = getReversedClientIdForInfoPlist();
          
          // Check for URL scheme related errors
          if (signInError?.message?.includes('URL scheme') ||
              signInError?.message?.includes('CFBundleURLSchemes') ||
              signInError?.code === '10' || // Common iOS configuration error code
              signInError?.message?.includes('REVERSED_CLIENT_ID') ||
              signInError?.name === 'NativeError') {
            return {
              success: false,
              error: `iOS configuration error: Missing REVERSED_CLIENT_ID in Info.plist.\n\nTo fix:\n1. Open ios/HostIQ/Info.plist\n2. Add this inside CFBundleURLTypes array:\n<dict>\n  <key>CFBundleURLSchemes</key>\n  <array>\n    <string>${reversedClientId || 'YOUR_REVERSED_CLIENT_ID'}</string>\n  </array>\n</dict>\n\nYour REVERSED_CLIENT_ID: ${reversedClientId || 'Check console logs on app start'}`
            };
          }
          
          // Generic iOS crash - likely missing URL scheme
          if (!signInError?.code && !signInError?.message) {
            return {
              success: false,
              error: `iOS crash detected. Most likely missing REVERSED_CLIENT_ID in Info.plist.\n\nAdd this to Info.plist CFBundleURLTypes:\n<dict>\n  <key>CFBundleURLSchemes</key>\n  <array>\n    <string>${reversedClientId || 'YOUR_REVERSED_CLIENT_ID'}</string>\n  </array>\n</dict>`
            };
          }
        }
        
        // Re-throw to be handled by outer catch
        throw signInError;
      }

      // Extract ID token - handle different response structures
      const idToken = userInfo.data?.idToken || userInfo.idToken || userInfo?.idToken;

      if (!idToken) {
        console.error('No ID token received from Google. UserInfo:', userInfo);
        try {
          console.error('UserInfo structure:', JSON.stringify(userInfo, null, 2));
        } catch (e) {
          console.error('Could not stringify userInfo');
        }
        throw new Error('Failed to get ID token from Google. Please try again.');
      }

      console.log('✅ Successfully obtained Google ID token');
      console.log('🔵 Sending ID token to backend:', '/auth/google/mobile');

      // Send ID token to backend
      let response;
      try {
        console.log('🔵 Preparing to send request to backend...');
        console.log('🔵 ID Token length:', idToken?.length || 0);
        
        const requestBody = {
          idToken: idToken,
        };
        
        // Include role if provided
        if (role) {
          requestBody.role = role;
        }
        
        response = await api.post('/auth/google/mobile', requestBody, {
          timeout: 60000, // 60 seconds timeout (increased for slower networks)
        });
        console.log('✅ Backend response received:', response.status);
      } catch (backendError) {
        console.error('❌ Backend error:', backendError);
        console.error('Error code:', backendError.code);
        console.error('Error message:', backendError.message);
        console.error('Response status:', backendError.response?.status);
        console.error('Response data:', backendError.response?.data);
        
        // Handle request aborted/cancelled errors
        if (backendError.code === 'ECONNABORTED' || 
            backendError.message?.includes('aborted') ||
            backendError.message?.includes('cancelled') ||
            backendError.name === 'CanceledError') {
          // Check if it's a timeout
          if (backendError.message?.includes('timeout')) {
            return {
              success: false,
              error: 'Backend request timed out. The server may be slow or unreachable. Please:\n\n1. Check your internet connection\n2. Verify the backend server is running\n3. Try again in a moment'
            };
          }
          return {
            success: false,
            error: 'Request was cancelled. Please try again. Make sure you have a stable internet connection.'
          };
        }
        
        // Handle timeout errors
        if (backendError.code === 'ETIMEDOUT' || backendError.message?.includes('timeout')) {
          return {
            success: false,
            error: 'Backend request timed out. Please:\n\n1. Check your internet connection\n2. Verify the backend server is running and accessible\n3. Try again in a moment'
          };
        }
        
        // Handle network errors
        if (backendError.code === 'ERR_NETWORK' || 
            (backendError.request && !backendError.response)) {
          return {
            success: false,
            error: 'Cannot reach server. Please check your internet connection and ensure the backend is running.'
          };
        }
        
        // Handle specific backend errors
        if (backendError.response?.status === 400) {
          const errors = backendError.response.data?.errors;
          const errorMessage = backendError.response.data?.error;
          
          // Check if error requires role selection
          if (errorMessage === 'requiresRoleSelection' || 
              errorMessage?.includes('role selection') ||
              errorMessage?.includes('role is required')) {
            return {
              success: false,
              error: 'requiresRoleSelection'
            };
          }
          
          if (errors && Array.isArray(errors)) {
            const errorMsg = errors.map(e => e.msg).join(', ');
            return {
              success: false,
              error: `Invalid request: ${errorMsg}`
            };
          }
          return {
            success: false,
            error: errorMessage || 'Invalid ID token. Please try again.'
          };
        }
        
        if (backendError.response?.status === 500) {
          return {
            success: false,
            error: backendError.response.data?.error || 'Server error during authentication. Please try again.'
          };
        }
        
        if (backendError.response?.data?.error) {
          return {
            success: false,
            error: backendError.response.data.error
          };
        }
        
        // Generic error
        return {
          success: false,
          error: backendError.message || 'An unexpected error occurred. Please try again.'
        };
      }

      // Validate response structure
      if (!response?.data) {
        console.error('❌ Invalid backend response:', response);
        return {
          success: false,
          error: 'Invalid response from server. Please try again.'
        };
      }

      const { accessToken, refreshToken, user } = response.data;

      if (!accessToken || !user) {
        console.error('❌ Missing required data in response:', { accessToken: !!accessToken, user: !!user });
        return {
          success: false,
          error: 'Incomplete response from server. Please try again.'
        };
      }

      // Store tokens securely
      await get().setTokens(accessToken, refreshToken, user);
      
      // Reset onboarding state for new users
      const onboardingStore = useOnboardingStore.getState();
      await onboardingStore.resetOnboarding();

      console.log('✅ Google Sign-In completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
      
      let errorMessage = 'Google sign-in failed';
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        errorMessage = 'Sign in was cancelled';
      } else if (error.code === 'IN_PROGRESS') {
        errorMessage = 'Sign in is already in progress';
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        errorMessage = 'Google Play Services not available';
      } else if (error.message && error.message.includes('not configured')) {
        errorMessage = error.message;
      } else if (error.response) {
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Cannot reach server. Please check your internet connection.';
      } else {
        errorMessage = error.message || 'Google sign-in failed. Please check your configuration.';
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      set({ isLoading: false });
    }
  },

  biometricLogin: async () => {
    try {
      // Check if biometric is enabled
      const enabled = await biometricAuth.isBiometricEnabled();
      if (!enabled) {
        return { success: false, error: 'Biometric login not enabled' };
      }

      // Authenticate with biometrics
      const authenticated = await biometricAuth.authenticate();
      if (!authenticated) {
        return { success: false, error: 'Biometric authentication failed' };
      }

      // Get stored credentials
      const email = await biometricAuth.getBiometricEmail();
      const password = await biometricAuth.getBiometricPassword();
      
      if (!email || !password) {
        await biometricAuth.disableBiometric();
        return { success: false, error: 'No stored credentials found. Please login again.' };
      }

      // Perform actual login with stored credentials
      const result = await get().login(email, password, true);
      return result;
    } catch (error) {
      console.error('Biometric login error:', error);
      return { success: false, error: 'Biometric login failed' };
    }
  },

  enableBiometric: async () => {
    const { user } = get();
    if (!user?.email) {
      return { success: false, error: 'No user logged in' };
    }

    const { available, reason } = await biometricAuth.isAvailable();
    if (!available) {
      return { success: false, error: reason };
    }

    // Require biometric authentication before enabling
    const authenticated = await biometricAuth.authenticate();
    if (!authenticated) {
      return { success: false, error: 'Authentication failed' };
    }

    // Get the stored password (from remember me)
    const savedPassword = await biometricAuth.getStoredValue('saved_password');
    if (!savedPassword) {
      return { success: false, error: 'Password not found. Please login again with "Remember Me" enabled.' };
    }

    const enabled = await biometricAuth.enableBiometric(user.email, savedPassword);
    if (enabled) {
      set({ biometricEnabled: true });
      return { success: true };
    }

    return { success: false, error: 'Failed to enable biometric' };
  },

  disableBiometric: async () => {
    const disabled = await biometricAuth.disableBiometric();
    if (disabled) {
      set({ biometricEnabled: false });
      return { success: true };
    }
    return { success: false };
  },

  register: async (email, password, name, role) => {
    try {
      const response = await api.post('/auth/register', { 
        email, 
        password, 
        name, 
        role 
      });
      const { accessToken, refreshToken, user } = response.data;
      await get().setTokens(accessToken, refreshToken, user);
      
      // Reset onboarding state for new users so they see the welcome modal
      const onboardingStore = useOnboardingStore.getState();
      await onboardingStore.resetOnboarding();
      
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  },

  logout: async () => {
    const { refreshToken, accessToken } = get();
    
    try {
      // Sign out from Google if signed in
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          await GoogleSignin.signOut();
        }
      } catch (error) {
        console.log('Google sign out error (non-critical):', error);
      }

      if (refreshToken && accessToken) {
        await api.post('/auth/logout', { refreshToken }, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    
    // Keep biometric settings intact on logout
    const biometricEnabled = await biometricAuth.isBiometricEnabled();
    
    set({ 
      user: null, 
      accessToken: null, 
      refreshToken: null, 
      isAuthenticated: false,
      biometricEnabled
    });
  },

  getRole: () => {
    return get().user?.role || null;
  },
}));

