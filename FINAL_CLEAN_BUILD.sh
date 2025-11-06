#!/bin/bash
set -e

echo "🧹 FINAL CLEAN BUILD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Kill any running Metro
echo "1️⃣  Killing Metro bundler..."
pkill -f "react-native" || true
pkill -f "metro" || true

# 2. Delete app from simulator
echo "2️⃣  Removing app from simulator..."
xcrun simctl uninstall booted com.darkonovakovic.HostIQ 2>/dev/null || echo "  (app not installed)"

# 3. Clean all caches
echo "3️⃣  Cleaning caches..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf ios/build
rm -rf ios/DerivedData
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true

# 4. Verify no .env file
echo "4️⃣  Checking for .env files..."
if [ -f .env ]; then
    echo "  ❌ Found .env - removing"
    rm .env
fi
echo "  ✅ No .env file"

# 5. Show configuration
echo "5️⃣  Current API configuration:"
grep "API_URL" src/config/api.js | head -1

# 6. Rebuild
echo ""
echo "6️⃣  Building app..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Look for these logs in Metro console:"
echo "  📡 API CONFIGURATION DEBUG"
echo "  Final API_URL: https://roomify-server-production.up.railway.app/api"
echo ""
sleep 2

npx expo start --clear
