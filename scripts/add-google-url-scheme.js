#!/usr/bin/env node

/**
 * Helper script to add REVERSED_CLIENT_ID to Info.plist
 * 
 * Usage:
 * 1. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file
 * 2. Run: node scripts/add-google-url-scheme.js
 * 
 * Or manually:
 * 1. Check console logs when app starts - it shows your REVERSED_CLIENT_ID
 * 2. Open ios/HostIQ/Info.plist
 * 3. Add the REVERSED_CLIENT_ID to CFBundleURLTypes array
 */

const fs = require('fs');
const path = require('path');

const infoPlistPath = path.join(__dirname, '../ios/HostIQ/Info.plist');

// Get REVERSED_CLIENT_ID from environment or calculate it
const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

if (!clientId) {
  console.error('❌ Error: EXPO_PUBLIC_GOOGLE_CLIENT_ID not found in environment variables');
  console.log('\nPlease set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file');
  process.exit(1);
}

// Calculate REVERSED_CLIENT_ID
const reversedClientId = clientId.split('.').reverse().join('.');

console.log('📋 Google Sign-In URL Scheme Helper');
console.log('=====================================');
console.log('Client ID:', clientId);
console.log('REVERSED_CLIENT_ID:', reversedClientId);
console.log('\n📝 Add this to ios/HostIQ/Info.plist inside CFBundleURLTypes array:');
console.log('\n<dict>');
console.log('  <key>CFBundleURLSchemes</key>');
console.log('  <array>');
console.log(`    <string>${reversedClientId}</string>`);
console.log('  </array>');
console.log('</dict>\n');

// Try to read and update Info.plist automatically
if (fs.existsSync(infoPlistPath)) {
  try {
    let infoPlist = fs.readFileSync(infoPlistPath, 'utf8');
    
    // Check if REVERSED_CLIENT_ID already exists
    if (infoPlist.includes(reversedClientId)) {
      console.log('✅ REVERSED_CLIENT_ID already exists in Info.plist');
      return;
    }
    
    // Find CFBundleURLTypes and add the new entry
    const urlTypesMatch = infoPlist.match(/<key>CFBundleURLTypes<\/key>\s*<array>([\s\S]*?)<\/array>/);
    
    if (urlTypesMatch) {
      const urlTypesContent = urlTypesMatch[1];
      
      // Check if there's already a Google URL scheme entry
      if (urlTypesContent.includes('googleusercontent')) {
        console.log('⚠️  A Google URL scheme entry already exists. Please verify it matches:', reversedClientId);
        return;
      }
      
      // Add the new entry before closing </array>
      const newEntry = `\n\t\t<dict>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${reversedClientId}</string>\n\t\t\t</array>\n\t\t</dict>`;
      const updatedContent = infoPlist.replace(
        /(<key>CFBundleURLTypes<\/key>\s*<array>[\s\S]*?)(<\/array>)/,
        `$1${newEntry}\n\t$2`
      );
      
      // Create backup
      fs.writeFileSync(infoPlistPath + '.backup', infoPlist);
      fs.writeFileSync(infoPlistPath, updatedContent);
      
      console.log('✅ Successfully added REVERSED_CLIENT_ID to Info.plist');
      console.log('📦 Backup saved to:', infoPlistPath + '.backup');
      console.log('\n⚠️  Next steps:');
      console.log('1. Rebuild the app: cd ios && pod install && cd .. && npx expo run:ios');
      console.log('2. Or if using Xcode: Clean build folder and rebuild');
    } else {
      console.log('⚠️  Could not find CFBundleURLTypes in Info.plist. Please add manually using the XML above.');
    }
  } catch (error) {
    console.error('❌ Error updating Info.plist:', error.message);
    console.log('\nPlease add manually using the XML structure shown above.');
  }
} else {
  console.log('⚠️  Info.plist not found at:', infoPlistPath);
  console.log('Please add manually using the XML structure shown above.');
}

