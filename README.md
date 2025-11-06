# Roomify Mobile App

React Native mobile application for property inspection and cleanliness verification.

## Quick Start

```bash
# Install dependencies
npm install

# Start Expo
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Features

### For Cleaners

- View today's assignments
- Start inspections
- Capture photos and videos
- Upload inspection media
- Submit for AI analysis
- View inspection history

### For Property Owners

- Portfolio dashboard with scores
- View all properties and units
- Review inspection results
- Manage team members
- Send invitations
- View billing and usage

## Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   └── client.js          # Axios client with interceptors
│   ├── config/
│   │   └── api.js             # API configuration
│   ├── navigation/
│   │   ├── AppNavigator.js    # Root navigator
│   │   ├── AuthStack.js       # Auth screens
│   │   ├── MainTabs.js        # Main tabs
│   │   ├── CleanerStack.js    # Cleaner screens
│   │   └── OwnerStack.js      # Owner screens
│   ├── screens/
│   │   ├── Auth/              # Login, Register, Invite
│   │   ├── Cleaner/           # Cleaner screens
│   │   ├── Owner/             # Owner screens
│   │   └── Common/            # Shared screens
│   └── store/
│       ├── authStore.js       # Authentication state
│       └── inspectionStore.js # Inspection state
├── App.js                      # App entry point
├── app.json                    # Expo configuration
└── package.json
```

## State Management

Using **Zustand** for lightweight state management:

### Auth Store

```javascript
import { useAuthStore } from './src/store/authStore';

const { user, login, logout, isAuthenticated } = useAuthStore();
```

### Inspection Store

```javascript
import { useInspectionStore } from './src/store/inspectionStore';

const { currentInspection, uploadedMedia } = useInspectionStore();
```

## Navigation

Built with **React Navigation v6**:

- Stack Navigation for hierarchical flows
- Tab Navigation for main sections
- Role-based routing (Cleaner vs Owner)

## API Integration

### Axios Client

Configured with:
- Base URL from environment
- Auth token injection
- Token refresh on 403
- Error handling

### Example Usage

```javascript
import api from '../api/client';

// Get data
const response = await api.get('/owner/properties');

// Post data
await api.post('/cleaner/inspections', { unit_id });

// Upload files
const formData = new FormData();
formData.append('files', file);
await api.post(`/cleaner/inspections/${id}/media`, formData);
```

## Camera & Media

Using **Expo Camera** and **Expo Image Picker**:

```javascript
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

// Request permissions
const { status } = await Camera.requestCameraPermissionsAsync();

// Take photo
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,
});

// Pick from library
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.All,
  allowsMultipleSelection: true,
});
```

## Styling

Using React Native StyleSheet:

- Consistent color scheme
- Responsive layouts
- Shadow effects for depth
- Platform-specific adjustments

### Theme Colors

```javascript
const colors = {
  primary: '#4A90E2',    // Blue
  success: '#4CAF50',    // Green
  warning: '#FF9800',    // Orange
  error: '#F44336',      // Red
  background: '#f5f5f5', // Light gray
  card: '#fff',          // White
  text: '#333',          // Dark gray
  textSecondary: '#666', // Medium gray
};
```

## Environment Configuration

The app uses the Railway production server by default:
```
https://roomify-server-production.up.railway.app/api
```

For local development, create a `.env` file to override:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

For physical device testing with local server, use your computer's IP:
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:3001/api
```

## Development

### Hot Reload

Expo provides fast refresh - changes appear instantly.

### Debugging

- Shake device to open dev menu
- Press `j` to open debugger
- Use React Native Debugger
- Check Expo dev tools in browser

### Testing on Devices

**iOS Simulator:**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

**Physical Device:**
1. Install Expo Go app
2. Scan QR code from `npm start`

## Building for Production

### iOS

```bash
expo build:ios
```

Requirements:
- Apple Developer account
- Valid certificates and provisioning profiles

### Android

```bash
expo build:android
```

Generates APK or AAB for Play Store.

## Common Issues

### Camera Not Working on Simulator

iOS simulator doesn't support camera. Use:
- Physical device
- Image picker instead

### Network Requests Failing

- Check API URL in `.env`
- Verify backend is running
- Use local IP for physical devices
- Check firewall settings

### Build Errors

```bash
# Clear cache
expo start -c

# Reset Metro bundler
rm -rf node_modules
npm install
```

## Performance Tips

1. **Image Optimization**
   - Compress images before upload
   - Use appropriate quality settings
   - Lazy load images

2. **Navigation**
   - Use `useFocusEffect` for screen-specific logic
   - Avoid nested navigators where possible

3. **State Management**
   - Keep stores minimal
   - Use selectors to prevent re-renders
   - Clear data when appropriate

## Deployment

### App Store (iOS)

1. Build with `expo build:ios`
2. Download IPA
3. Upload to App Store Connect
4. Submit for review

### Play Store (Android)

1. Build with `expo build:android`
2. Download AAB
3. Upload to Play Console
4. Submit for review

## Troubleshooting

### "Unable to resolve module"

```bash
npm install
expo start -c
```

### "Network request failed"

- Check API_URL
- Verify backend is running
- Test with Postman first

### Permission Denied

Check `app.json` permissions and request at runtime.

## License

MIT


