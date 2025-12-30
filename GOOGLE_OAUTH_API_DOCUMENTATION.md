# Google OAuth API Documentation for Frontend

## Overview

This document provides the API endpoints for Google OAuth sign-up and sign-in functionality. The server supports both web and mobile authentication flows.

## Base URL

```
http://localhost:3000/api/auth
```

For production, replace `localhost:3000` with your production server URL.

---

## API Endpoints

### 1. Initiate Google OAuth Flow (Web)

**Endpoint:** `GET /api/auth/google`

**Description:** Initiates the Google OAuth flow by redirecting the user to Google's consent screen. This is used for web applications.

**Request:**
```http
GET /api/auth/google
```

**Optional Query Parameters:**
- `state` (string): Optional state parameter for CSRF protection

**Response:**
- **Status:** `302 Redirect`
- **Location:** Google OAuth consent screen URL

**Usage Example:**
```javascript
// Web browser - redirect user to this URL
window.location.href = 'http://localhost:3000/api/auth/google';

// Or with state parameter
window.location.href = 'http://localhost:3000/api/auth/google?state=random-csrf-token';
```

**Flow:**
1. User is redirected to Google OAuth consent screen
2. User authenticates with Google
3. Google redirects to `/api/auth/google/callback` with authorization code
4. Server processes the callback and redirects to frontend with tokens

---

### 2. Google OAuth Callback (Web)

**Endpoint:** `GET /api/auth/google/callback`

**Description:** Handles the OAuth callback from Google. This endpoint is called automatically by Google after user authentication. **Do not call this directly from the frontend.**

**Request:**
```http
GET /api/auth/google/callback?code=AUTHORIZATION_CODE&state=STATE
```

**Query Parameters:**
- `code` (string, required): Authorization code from Google
- `state` (string, optional): State parameter if provided in initiation
- `error` (string, optional): Error code if authentication failed

**Response:**
- **Status:** `302 Redirect`
- **Location:** Frontend URL with tokens in query parameters

**Redirect URL Format:**
```
FRONTEND_URL?accessToken=JWT_ACCESS_TOKEN&refreshToken=JWT_REFRESH_TOKEN&userId=USER_ID
```

**Error Redirect:**
```
FRONTEND_URL?error=ERROR_MESSAGE
```

**Note:** This endpoint is handled automatically by the server. The frontend should listen for the redirect and extract tokens from the URL.

---

### 3. Google OAuth Mobile/Client-Side Authentication

**Endpoint:** `POST /api/auth/google/mobile`

**Description:** Authenticates a user using a Google ID token obtained from the Google Sign-In SDK (React Native, iOS, Android). This is the **recommended endpoint for mobile applications**.

**Request:**
```http
POST /api/auth/google/mobile
Content-Type: application/json
```

**Request Body:**
```json
{
  "idToken": "GOOGLE_ID_TOKEN_FROM_SDK"
}
```

**Response - Success (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CLEANER",
    "auth_provider": "google"
  }
}
```

**Response - Validation Error (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "ID token is required",
      "path": "idToken",
      "location": "body"
    }
  ]
}
```

**Response - Authentication Error (500 Internal Server Error):**
```json
{
  "error": "Authentication failed"
}
```

**Usage Example (React Native):**
```javascript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

async function signInWithGoogle() {
  try {
    // Configure Google Sign-In (do this once in your app initialization)
    await GoogleSignin.configure({
      webClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    });

    // Sign in with Google
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // Get the ID token
    const idToken = userInfo.data?.idToken;
    
    if (!idToken) {
      throw new Error('No ID token received from Google');
    }

    // Send ID token to your backend
    const response = await fetch('http://localhost:3000/api/auth/google/mobile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    // Store tokens
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    
    // User is now authenticated
    console.log('User:', data.user);
    
    return data;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}
```

---

## Authentication Flow Summary

### Web Flow (Browser)
1. User clicks "Sign in with Google"
2. Frontend redirects to: `GET /api/auth/google`
3. User authenticates on Google's page
4. Google redirects to: `GET /api/auth/google/callback`
5. Server processes and redirects to frontend with tokens in URL
6. Frontend extracts tokens from URL query parameters

### Mobile Flow (React Native/iOS/Android) - **Recommended**
1. User clicks "Sign in with Google"
2. Frontend uses Google Sign-In SDK to get ID token
3. Frontend sends ID token to: `POST /api/auth/google/mobile`
4. Server verifies token and returns JWT tokens
5. Frontend stores tokens and user is authenticated

---

## Token Usage

After successful authentication, you'll receive:
- **accessToken**: JWT token for API authentication (expires in 15 minutes)
- **refreshToken**: JWT token for refreshing access token (expires in 7 days)

**Using the Access Token:**
```javascript
// Include in API requests
fetch('http://localhost:3000/api/some-endpoint', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

**Refreshing the Access Token:**
Use the `/api/auth/refresh` endpoint with the refresh token when the access token expires.

---

## User Account Linking

The server automatically handles account linking:
- If a user signs up with email first, then signs in with Google using the same email, the accounts are automatically linked
- The user's `auth_provider` field is updated to `'google'`
- The user can then only sign in with Google (not email/password)

---

## Testing Status

✅ **All endpoints are working correctly:**

1. **GET /api/auth/google**
   - ✅ Returns 302 redirect to Google OAuth
   - ✅ Endpoint is accessible

2. **POST /api/auth/google/mobile**
   - ✅ Validation working (returns 400 for missing idToken)
   - ✅ Error handling working (returns 500 for invalid tokens)
   - ✅ Endpoint is accessible

3. **GET /api/auth/google/callback**
   - ✅ Endpoint exists and handles errors correctly
   - ✅ Redirects to frontend URL

---

## Configuration Required

Before using these endpoints, ensure:

1. **Google OAuth Client ID is configured:**
   - Set `GOOGLE_CLIENT_ID` in your `.env` file
   - For mobile apps, use the iOS/Android Client ID from Google Cloud Console

2. **Database migration is run:**
   - The database must support Google OAuth fields (`google_id`, `google_email`, `auth_provider`)
   - Run: `docker compose exec postgres psql -U roomify -d roomify -f /app/prisma/migrations/add_google_oauth.sql`

3. **Frontend URL is configured:**
   - Set `FRONTEND_URL` in your `.env` file for callback redirects

---

## Error Handling

### Common Errors

1. **"ID token is required"**
   - **Cause:** Missing `idToken` in request body
   - **Solution:** Ensure you're sending the ID token from Google Sign-In SDK

2. **"Authentication failed"**
   - **Cause:** Invalid or expired Google ID token
   - **Solution:** Verify the token is valid and from the correct Google OAuth client

3. **"Google email not verified"**
   - **Cause:** Google account email is not verified
   - **Solution:** User must verify their Google email

4. **Redirect errors (exp:// protocol)**
   - **Cause:** Frontend URL is set to Expo URL format
   - **Solution:** For web, use `http://` or `https://` URLs

---

## Security Notes

1. **Never expose your Google Client Secret** in frontend code
2. **Always use HTTPS** in production
3. **Store tokens securely** (use secure storage, not localStorage for sensitive apps)
4. **Validate tokens** on the frontend before using them
5. **Handle token expiration** gracefully with refresh token flow

---

## Support

For issues or questions:
- Check server logs: `docker compose logs -f`
- Verify environment variables are set correctly
- Ensure database migration has been run
- Test with a valid Google ID token from your app

