import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';
import biometricAuth from '../services/biometricAuth';

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

