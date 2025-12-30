import { GoogleSignin } from '@react-native-google-signin/google-signin';

// IMPORTANT: For React Native Google Sign-In, use your iOS Client ID from Google Cloud Console
// The iOS Client ID is the one you created in GCP with application type "iOS" (it has no secret)
// Even though the parameter is called "webClientId", you should use your iOS Client ID here

// Option 1: Set directly here (QUICKEST FIX - set your iOS Client ID here)
// Replace null with your actual iOS Client ID from Google Cloud Console
// Example: const DIRECT_CLIENT_ID = '123456789-abcdefgh.apps.googleusercontent.com';
const DIRECT_CLIENT_ID = null; // ⬅️ SET YOUR iOS CLIENT ID HERE

// Option 2: Use environment variable (preferred for production)
const iosClientId = DIRECT_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Debug: Log what we're getting
console.log('🔍 Google Sign-In Config Debug:');
console.log('   DIRECT_CLIENT_ID:', DIRECT_CLIENT_ID ? 'SET' : 'null');
console.log('   process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ? 'SET' : 'undefined');
console.log('   process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:', process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ? 'SET' : 'undefined');
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
if (iosClientId && iosClientId !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
  try {
    GoogleSignin.configure({
      // Use your iOS Client ID here (the one from GCP with type "iOS")
      // The parameter name "webClientId" is misleading - it should be your iOS Client ID
      webClientId: iosClientId,
      // iosClientId is optional - can be the same as webClientId or omitted
      iosClientId: iosClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    isConfigured = true;
    configuredClientId = iosClientId;
    reversedClientId = getReversedClientId(iosClientId);
    console.log('✅ Google Sign-In configured successfully');
    console.log('   Using iOS Client ID:', iosClientId.substring(0, 20) + '...');
    console.log('   REVERSED_CLIENT_ID (for Info.plist):', reversedClientId);
    console.log('   ⚠️ Make sure REVERSED_CLIENT_ID is added to Info.plist URL schemes!');
  } catch (error) {
    console.error('❌ Error configuring Google Sign-In:', error);
    isConfigured = false;
  }
} else {
  console.warn('⚠️ Google Sign-In not configured: Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  console.warn('   Set EXPO_PUBLIC_GOOGLE_CLIENT_ID to your iOS Client ID from Google Cloud Console');
  console.warn('   The iOS Client ID is the one you created with application type "iOS" (no secret)');
}

// Export helper functions
export const getIsConfigured = () => isConfigured;
export const getReversedClientIdForInfoPlist = () => reversedClientId;
export const getConfiguredClientId = () => configuredClientId;

export default GoogleSignin;

