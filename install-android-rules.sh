#!/bin/bash
# Script to install Android udev rules

echo "Installing Android udev rules..."
sudo cp "$(dirname "$0")/51-android.rules" /etc/udev/rules.d/51-android.rules
sudo chmod a+r /etc/udev/rules.d/51-android.rules
sudo udevadm control --reload-rules
sudo udevadm trigger

echo ""
echo "✓ udev rules installed successfully!"
echo ""
echo "Please unplug and replug your Android device, then run:"
echo "  adb devices"
echo ""

