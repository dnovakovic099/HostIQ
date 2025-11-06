# Clear Old Tokens

The app is connecting but has old tokens from the local server.

## Solution

**On the simulator, shake the device and:**
1. Press "Reload"
2. If that doesn't work, press "Debug" → "Clear AsyncStorage"

## OR

**In the app:**
1. Try to login - if it fails, the old token should be cleared
2. Close the app completely (swipe up from home)
3. Reopen the app

## OR

**From command line:**
```bash
# Erase all simulator data (nuclear option)
xcrun simctl erase booted

# Then reinstall
cd /Users/darkonovakovic/software/roomify/mobile
npm run ios
```

## What to Look For

After clearing, you should see in Metro console:
```
📡 API CONFIGURATION DEBUG
Final API_URL: https://roomify-server-production.up.railway.app/api
```

Then try logging in with:
- Email: `owner@hostiq.com`
- Password: `password123`

