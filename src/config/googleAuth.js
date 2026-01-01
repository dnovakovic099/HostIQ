import { GoogleSignin } from '@react-native-google-signin/google-signin';

// IMPORTANT: React Native Google Sign-In requires different Client IDs:
// 1. Web Client ID (has secret) - Used for backend authentication (webClientId parameter)
// 2. iOS Client ID (no secret) - Used for iOS app (iosClientId parameter)
// 3. Android Client ID (no secret) - Automatically used based on package name + SHA-1

// DIRECT_CLIENT_ID fallback - Set this directly in the file if env vars are not available
// Format: 'YOUR_CLIENT_ID.apps.googleusercontent.com'
const DIRECT_CLIENT_ID = null; // Set this if EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not available

// Get Web Client ID (the one with a secret in Google Cloud Console)
// This is used for backend authentication
// Fallback order: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID -> DIRECT_CLIENT_ID -> EXPO_PUBLIC_GOOGLE_CLIENT_ID (iOS client ID as last resort)
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 
                   DIRECT_CLIENT_ID || 
                   process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// Get iOS Client ID (the one you created for iOS in Google Cloud Console)
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Debug: Log what we're getting
const envWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const envIosClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
console.log('🔍 Google Sign-In Config Debug:');
console.log('   process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:', envWebClientId ? 'SET' : 'undefined');
console.log('   process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID (iOS):', envIosClientId ? 'SET' : 'undefined');
console.log('   DIRECT_CLIENT_ID:', DIRECT_CLIENT_ID ? 'SET' : 'not set');
if (webClientId) {
  let source = 'unknown';
  if (envWebClientId && webClientId === envWebClientId) source = 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID';
  else if (DIRECT_CLIENT_ID && webClientId === DIRECT_CLIENT_ID) source = 'DIRECT_CLIENT_ID';
  else if (envIosClientId && webClientId === envIosClientId) source = 'EXPO_PUBLIC_GOOGLE_CLIENT_ID (fallback)';
  console.log(`   Final webClientId: ${webClientId.substring(0, 30)}... (source: ${source})`);
} else {
  console.log('   Final webClientId: NOT SET');
}
console.log('   Final iosClientId:', iosClientId ? `${iosClientId.substring(0, 30)}...` : 'NOT SET');

// Helper function to generate REVERSED_CLIENT_ID for iOS URL scheme
const getReversedClientId = (clientId) => {
  if (!clientId) return null;
  const parts = clientId.split('.');
  return parts.reverse().join('.');
};

// Track configuration status
let isConfigured = false;
let configuredClientId = null;
let reversedClientId = null;

// Only configure if we have a valid Client ID
if (webClientId && webClientId !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
  try {
    GoogleSignin.configure({
      // Web Client ID (the one with a secret) - used for backend authentication
      // For Android, this is required. For iOS, it's optional if iosClientId is set
      webClientId: webClientId,
      // iOS Client ID (optional) - iOS-specific client ID
      iosClientId: iosClientId,
      // Request offline access to get refresh token
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    isConfigured = true;
    configuredClientId = webClientId;
    reversedClientId = getReversedClientId(iosClientId || webClientId);
    console.log('✅ Google Sign-In configured successfully');
    console.log('   Using Web Client ID:', webClientId.substring(0, 20) + '...');
    if (iosClientId && iosClientId !== webClientId) {
      console.log('   Using iOS Client ID:', iosClientId.substring(0, 20) + '...');
      console.log('   REVERSED_CLIENT_ID (for Info.plist):', reversedClientId);
      console.log('   ⚠️ Make sure REVERSED_CLIENT_ID is added to Info.plist URL schemes!');
    }
  } catch (error) {
    console.error('❌ Error configuring Google Sign-In:', error);
    isConfigured = false;
  }
} else {
  console.warn('⚠️ Google Sign-In not configured: Missing Web Client ID');
  console.warn('   Options:');
  console.warn('   1. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file');
  console.warn('   2. Set DIRECT_CLIENT_ID in src/config/googleAuth.js');
  console.warn('   3. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID (will be used as fallback)');
  console.warn('   The Web Client ID is the one with a client secret (type: Web application)');
}

// Export helper functions
export const getIsConfigured = () => isConfigured;
export const getReversedClientIdForInfoPlist = () => reversedClientId;
export const getConfiguredClientId = () => configuredClientId;

export default GoogleSignin;

