#!/bin/bash

set -e

echo "🔧 Fixing iOS build issues..."

# Kill any running Xcode processes
echo "📱 Killing Xcode processes..."
pkill -9 -f Xcode || true
pkill -9 -f xcodebuild || true
pkill -9 -f com.apple.CoreSimulator || true
sleep 2

# Clean DerivedData for HostIQ
echo "🧹 Cleaning DerivedData..."
DERIVED_DATA_PATH="$HOME/Library/Developer/Xcode/DerivedData/HostIQ-*"
if ls $DERIVED_DATA_PATH 1> /dev/null 2>&1; then
    rm -rf $DERIVED_DATA_PATH
    echo "✅ Cleaned DerivedData"
else
    echo "ℹ️  No DerivedData found to clean"
fi

# Clean iOS build folder
echo "🧹 Cleaning iOS build folder..."
cd ios
rm -rf build
rm -rf Pods/build
echo "✅ Cleaned iOS build folder"

# Clean Xcode build cache
echo "🧹 Cleaning Xcode module cache..."
rm -rf ~/Library/Developer/Xcode/DerivedData/ModuleCache.noindex 2>/dev/null || true
rm -rf ~/Library/Caches/com.apple.dt.Xcode 2>/dev/null || true

echo "✅ Cleanup complete!"
echo ""
echo "You can now try running: npx expo run:ios --device"


