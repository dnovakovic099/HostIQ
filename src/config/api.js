// API Configuration
// Uses Railway production server
export const API_URL = 'https://roomify-server-production.up.railway.app/api';
// export const API_URL = 'http://10.0.0.252:3001/api'; // Point to local server for testing (use machine IP for iOS)

// Debug logging
console.log('════════════════════════════════════════════════════');
console.log('📡 API CONFIGURATION DEBUG');
console.log('════════════════════════════════════════════════════');
console.log('EXPO_PUBLIC_API_URL env var:', process.env.EXPO_PUBLIC_API_URL);
console.log('Final API_URL:', API_URL);
console.log('════════════════════════════════════════════════════');

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  
  // Invites
  INVITES: '/invites',
  ACCEPT_INVITE: '/invites/accept',
  
  // Owner
  PROPERTIES: '/owner/properties',
  UNITS: (propertyId) => `/owner/properties/${propertyId}/units`,
  OWNER_INSPECTIONS: '/owner/inspections',
  ASSIGNMENTS: '/owner/assignments',
  
  // Cleaner
  CLEANER_ASSIGNMENTS: '/cleaner/assignments',
  START_ASSIGNMENT: (id) => `/cleaner/assignments/${id}/start`,
  CLEANER_INSPECTIONS: '/cleaner/inspections',
  UPLOAD_MEDIA: (id) => `/cleaner/inspections/${id}/media`,
  SUBMIT_INSPECTION: (id) => `/cleaner/inspections/${id}/submit`,
  
  // Inspections
  INSPECTION_DETAIL: (id) => `/inspections/${id}`,
  INSPECTION_STATUS: (id) => `/inspections/${id}/status`,
  
  // Billing
  PLANS: '/billing/plans',
  SUBSCRIPTION: '/billing/subscription',
  SUBSCRIBE: '/billing/subscribe',
  USAGE: '/billing/usage',
};


