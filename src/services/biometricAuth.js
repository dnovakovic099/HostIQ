import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';
const BIOMETRIC_PASSWORD_KEY = 'biometric_password';

class BiometricAuthService {
  // Check if device supports biometric authentication
  async isAvailable() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return { available: false, reason: 'Device does not support biometric authentication' };
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        return { available: false, reason: 'No biometric credentials enrolled on device' };
      }

      return { available: true };
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return { available: false, reason: 'Error checking biometric availability' };
    }
  }

  // Get supported biometric types
  async getSupportedTypes() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const supported = [];

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        supported.push('Face ID');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        supported.push('Touch ID / Fingerprint');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        supported.push('Iris');
      }

      return supported;
    } catch (error) {
      console.error('Error getting supported types:', error);
      return [];
    }
  }

  // Authenticate with biometrics
  async authenticate() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access HostIQ',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  // Check if biometric login is enabled
  async isBiometricEnabled() {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled:', error);
      return false;
    }
  }

  // Enable biometric login (store email and password for auto-login)
  async enableBiometric(email, password) {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
      await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  }

  // Disable biometric login
  async disableBiometric() {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY);
      return true;
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return false;
    }
  }

  // Get stored email for biometric login
  async getBiometricEmail() {
    try {
      return await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    } catch (error) {
      console.error('Error getting biometric email:', error);
      return null;
    }
  }

  // Get stored password for biometric login
  async getBiometricPassword() {
    try {
      return await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);
    } catch (error) {
      console.error('Error getting biometric password:', error);
      return null;
    }
  }

  // Get biometric type name for display
  async getBiometricTypeName() {
    const types = await this.getSupportedTypes();
    if (types.length === 0) return 'Biometric';
    if (types.includes('Face ID')) return 'Face ID';
    if (types.includes('Touch ID / Fingerprint')) return 'Touch ID';
    return types[0];
  }

  // Generic secure storage methods
  async storeValue(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      return false;
    }
  }

  async getStoredValue(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }

  async deleteStoredValue(key) {
    try {
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
      return false;
    }
  }
}

export default new BiometricAuthService();

