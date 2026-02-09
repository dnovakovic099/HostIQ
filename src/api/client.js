import axios from 'axios';
import { API_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

console.log('════════════════════════════════════════════════════');
console.log('🌐 API CLIENT INITIALIZATION');
console.log('Base URL:', API_URL);
console.log('Should be: https://roomify-server-production.up.railway.app/api');
console.log('════════════════════════════════════════════════════');

const client = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 minutes for photo uploads on mobile networks
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
client.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 API Request:', config.method.toUpperCase(), config.url);

    // Log request payload/data
    if (config.data) {
      try {
        const requestData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        const dataString = JSON.stringify(requestData, null, 2);
        if (dataString.length > 2000) {
          console.log('📤 Request Payload (truncated):', dataString.substring(0, 2000) + '...');
        } else {
          console.log('📤 Request Payload:', dataString);
        }
      } catch (error) {
        console.log('📤 Request Payload: [Unable to stringify]', typeof config.data);
      }
    }

    // Log query parameters for GET requests
    if (config.params && Object.keys(config.params).length > 0) {
      try {
        const paramsString = JSON.stringify(config.params, null, 2);
        console.log('📤 Request Params:', paramsString);
      } catch (error) {
        console.log('📤 Request Params: [Unable to stringify]', typeof config.params);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
client.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', response.config.method.toUpperCase(), response.config.url, '→', response.status);

    // Log response data (truncate if too large for readability)
    try {
      const responseData = response.data;
      const dataString = JSON.stringify(responseData, null, 2);
      if (dataString.length > 2000) {
        console.log('📦 Response Data (truncated):', dataString.substring(0, 2000) + '...');
      } else {
        console.log('📦 Response Data:', dataString);
      }
    } catch (error) {
      console.log('📦 Response Data: [Unable to stringify]', typeof response.data);
    }

    return response;
  },
  async (error) => {
    // Safely log error information, handling timeout and network errors
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'UNKNOWN';
    const status = error.response?.status || (error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NO_RESPONSE');
    const errorMessage = error.message || 'Unknown error';

    // Safely stringify error data to avoid JSON parsing issues
    let errorData = null;
    try {
      if (error.response?.data) {
        errorData = typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);
      }
    } catch (e) {
      errorData = '[Unable to serialize error data]';
    }

    console.log('❌ API Error:', method, url, '→', status, errorMessage);
    if (errorData) {
      console.log('❌ Error Details:', errorData.length > 500 ? errorData.substring(0, 500) + '...' : errorData);
    }

    const originalRequest = error.config;

    // If error is 403 and we haven't already tried to refresh
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
          return Promise.reject(error);
        }

        console.log('🔄 Attempting token refresh...');
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        await SecureStore.setItemAsync('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        console.log('✅ Token refreshed, retrying request...');
        return client(originalRequest);
      } catch (refreshError) {
        console.log('❌ Token refresh failed, clearing tokens');
        // Refresh failed, clear tokens
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;


