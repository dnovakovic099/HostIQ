#!/bin/bash

set -e

echo "🚀 Starting Metro bundler for physical device..."
echo ""

# Kill any existing Metro processes
echo "🧹 Stopping existing Metro processes..."
pkill -f "expo start" || true
pkill -f "metro" || true
sleep 2

# Get local IP address
echo "📡 Getting local network IP..."
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
if [ "$LOCAL_IP" = "localhost" ]; then
    echo "⚠️  Could not detect local IP. You may need to enter it manually."
    echo "   Find it with: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
else
    echo "✅ Local IP: $LOCAL_IP"
    echo ""
    echo "📱 In the app, enter this URL:"
    echo "   http://$LOCAL_IP:8081"
    echo ""
fi

# Start Metro with LAN access
echo "🚀 Starting Metro bundler..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Set environment to allow LAN connections
export EXPO_USE_FAST_REFRESH=true
export EXPO_NO_METRO_LAZY=1

# Start Expo with dev client
npx expo start --dev-client --lan


