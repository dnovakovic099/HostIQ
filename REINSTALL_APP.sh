#!/bin/bash

echo "🗑️  Removing app from simulator..."
xcrun simctl uninstall booted com.darkonovakovic.HostIQ 2>/dev/null || echo "App not found on simulator (this is ok)"

echo "🧹 Cleaning build folders..."
rm -rf ios/build
rm -rf .expo
rm -rf node_modules/.cache

echo "🔨 Rebuilding and reinstalling app..."
cd "$(dirname "$0")"
npm run ios

echo "✅ App reinstalled!"
