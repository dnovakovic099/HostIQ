#!/bin/bash

set -e

echo "🔧 Fixing iOS Provisioning Profile..."
echo ""

# Clean DerivedData
echo "🧹 Cleaning DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/HostIQ-* 2>/dev/null || true

# Clean build folder
echo "🧹 Cleaning build folder..."
cd ios
rm -rf build 2>/dev/null || true

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📱 Next steps:"
echo ""
echo "1. Open Xcode:"
echo "   open ios/HostIQ.xcworkspace"
echo ""
echo "2. In Xcode:"
echo "   - Select 'HostIQ' project in the navigator"
echo "   - Select 'HostIQ' target"
echo "   - Go to 'Signing & Capabilities' tab"
echo "   - Make sure 'Automatically manage signing' is CHECKED"
echo "   - Select team 'Solutions 41labs (48AXH55PRT)'"
echo "   - Xcode will automatically create the provisioning profile"
echo ""
echo "3. After Xcode creates the profile, run:"
echo "   npx expo run:ios --device"
echo ""

