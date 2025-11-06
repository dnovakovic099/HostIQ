#!/bin/bash
set -e

echo "🚀 REBUILDING APP FOR RAILWAY SERVER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /Users/darkonovakovic/software/roomify/mobile

echo "1️⃣  Verifying no .env file..."
if [ -f .env ]; then
    echo "❌ Found .env file! Removing it..."
    rm .env
fi
echo "✅ No .env file"

echo ""
echo "2️⃣  Checking configuration..."
grep "roomify-server-production.up.railway.app" src/config/api.js && echo "✅ Config points to Railway"

echo ""
echo "3️⃣  Clearing all caches..."
rm -rf .expo node_modules/.cache ios/build 2>/dev/null || true

echo ""
echo "4️⃣  Starting Metro with clean cache..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After Metro starts, press 'i' to build for iOS"
echo ""
echo "LOOK FOR THESE LOGS:"
echo "  📡 API CONFIGURATION DEBUG"
echo "  Final API_URL: https://roomify-server-production.up.railway.app/api"
echo ""

npm start -- --reset-cache
