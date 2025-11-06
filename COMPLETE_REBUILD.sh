#!/bin/bash
set -e

echo "🔧 COMPLETE APP REBUILD FOR RAILWAY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /Users/darkonovakovic/software/roomify/mobile

# 1. Verify configuration
echo "1️⃣  Checking configuration..."
if grep -q "roomify-server-production.up.railway.app" src/config/api.js; then
    echo "✅ Config file points to Railway"
else
    echo "❌ Config file doesn't point to Railway!"
    exit 1
fi

if [ -f .env ]; then
    echo "❌ Found .env file - removing it"
    rm .env
fi

# 2. Clean everything
echo ""
echo "2️⃣  Cleaning all caches and builds..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf ios/build
rm -rf ios/DerivedData
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
echo "✅ All caches cleared"

# 3. Delete app from simulator
echo ""
echo "3️⃣  Removing app from simulator..."
xcrun simctl uninstall booted com.darkonovakovic.HostIQ 2>/dev/null || echo "App not on simulator (ok)"

# 4. Verify server is accessible
echo ""
echo "4️⃣  Testing Railway server connection..."
if curl -s -f -m 5 https://roomify-server-production.up.railway.app/health > /dev/null 2>&1; then
    echo "✅ Railway server is accessible"
else
    echo "⚠️  Warning: Could not reach Railway server"
fi

# 5. Build fresh
echo ""
echo "5️⃣  Building app..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run ios

