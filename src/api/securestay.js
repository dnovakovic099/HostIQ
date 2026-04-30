import api from './client';

/**
 * Thin wrapper around /api/securestay endpoints.
 * Auth + base URL are handled by the shared axios client.
 */

export async function getStatus() {
  const { data } = await api.get('/securestay/status');
  return data;
}

export async function connect(apiKey) {
  const { data } = await api.post('/securestay/connect', { api_key: apiKey });
  return data;
}

export async function disconnect() {
  const { data } = await api.delete('/securestay/disconnect');
  return data;
}

export async function getAssignmentIssues(assignmentId) {
  const { data } = await api.get(`/securestay/assignments/${assignmentId}/issues`);
  return data;
}

export async function refreshAssignmentIssues(assignmentId) {
  const { data } = await api.post(`/securestay/assignments/${assignmentId}/refresh`);
  return data;
}

export async function listSecureStayListings({ q, page, limit } = {}) {
  const params = {};
  if (q && q.trim()) params.q = q.trim();
  if (page) params.page = page;
  if (limit) params.limit = limit;
  const { data } = await api.get('/securestay/listings', { params });
  return data; // { source, connected, count, total, listings, ... }
}

export async function getSecureStayListingTemplate(listingId) {
  const { data } = await api.get(`/securestay/listings/${listingId}/template`);
  return data; // { listing, template }
}

export async function importSecureStayProperty(payload) {
  const { data } = await api.post('/securestay/import-property', payload);
  return data;
}
