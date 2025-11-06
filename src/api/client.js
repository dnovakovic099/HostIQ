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
    return response;
  },
  async (error) => {
    console.log('❌ API Error:', error.config?.method?.toUpperCase(), error.config?.url, '→', error.response?.status, error.response?.data);
    
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


