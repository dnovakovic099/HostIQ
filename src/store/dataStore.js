import { create } from 'zustand';
import api from '../api/client';

export const useDataStore = create((set, get) => ({
  // Team data
  invites: [],
  invitesLoaded: false,

  // Insights data
  cleaners: [],
  cleanersLoaded: false,
  inspections: [],
  inspectionsLoaded: false,

  // Prefetch team invites (called from dashboard)
  prefetchInvites: async () => {
    try {
      const response = await api.get('/invites');
      set({ invites: response.data || [], invitesLoaded: true });
    } catch (error) {
      // Silent fail — screens will fetch on their own if needed
    }
  },

  // Prefetch cleaners + inspections for insights (called from dashboard)
  prefetchInsights: async () => {
    try {
      const [cleanersRes, inspectionsRes] = await Promise.all([
        api.get('/owner/cleaners', { params: { include: 'assignments' } }),
        api.get('/owner/inspections/recent?limit=100').catch(() => ({ data: [] })),
      ]);
      set({
        cleaners: cleanersRes.data || [],
        cleanersLoaded: true,
        inspections: inspectionsRes.data || [],
        inspectionsLoaded: true,
      });
    } catch (error) {
      // Silent fail
    }
  },

  // Update invites (after create/refresh)
  setInvites: (invites) => set({ invites, invitesLoaded: true }),

  // Update cleaners/inspections (after refresh)
  setCleaners: (cleaners) => set({ cleaners, cleanersLoaded: true }),
  setInspections: (inspections) => set({ inspections, inspectionsLoaded: true }),

  // Clear on logout
  clear: () => set({
    invites: [],
    invitesLoaded: false,
    cleaners: [],
    cleanersLoaded: false,
    inspections: [],
    inspectionsLoaded: false,
  }),
}));
