import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@onboarding_completed';
const DEMO_SEEN_KEY = '@demo_inspection_seen';

// First-run stages drive which dashboard chrome the user sees:
//   - 'pre_demo'   → user just signed up, only demo data, hasn't tapped demo
//                    inspection yet. Dashboard is minimal: hello + a single
//                    "Watch HostIQ check a real cleaning" anchor card.
//   - 'post_demo'  → user has tapped the demo inspection at least once but
//                    still has no real property. Dashboard shows hello +
//                    "Add your first real property" anchor card + demo card.
//   - 'graduated'  → user has at least one real property. Full dashboard
//                    chrome (stats grid, quick actions, etc.) appears.
export const FIRST_RUN_STAGES = {
  PRE_DEMO: 'pre_demo',
  POST_DEMO: 'post_demo',
  GRADUATED: 'graduated',
};

export const useOnboardingStore = create((set, get) => ({
  hasSeenOnboarding: false,
  hasSeenDemoInspection: false,
  hasProperties: false,
  hasRealProperties: false,
  hasCleaners: false,
  isLoading: true,

  // Load both onboarding flags from AsyncStorage in parallel.
  loadOnboardingState: async () => {
    try {
      const [hasSeenStr, demoSeenStr] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        AsyncStorage.getItem(DEMO_SEEN_KEY),
      ]);
      const hasSeen = hasSeenStr === 'true';
      const demoSeen = demoSeenStr === 'true';
      set({
        hasSeenOnboarding: hasSeen,
        hasSeenDemoInspection: demoSeen,
        isLoading: false,
      });
      return hasSeen;
    } catch (error) {
      console.error('Error loading onboarding state:', error);
      set({ isLoading: false });
      return false;
    }
  },

  // Mark onboarding as seen — persisted permanently.
  markOnboardingSeen: async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      set({ hasSeenOnboarding: true });
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  },

  // Mark that the user has viewed the demo inspection at least once.
  // This transitions the dashboard from pre_demo → post_demo state.
  markDemoInspectionSeen: async () => {
    try {
      await AsyncStorage.setItem(DEMO_SEEN_KEY, 'true');
      set({ hasSeenDemoInspection: true });
    } catch (error) {
      console.error('Error saving demo-seen state:', error);
    }
  },

  // Update data counts. We track both total properties and "real" (non-demo)
  // properties separately so the first-run state machine can decide whether
  // the user has truly graduated.
  updateCounts: (properties, cleaners, realProperties) => {
    set({
      hasProperties: properties > 0,
      hasRealProperties:
        typeof realProperties === 'number' ? realProperties > 0 : properties > 0,
      hasCleaners: cleaners > 0,
    });
  },

  // Compute the current first-run stage from store state. Centralized here
  // so every screen agrees on what the user is seeing.
  getFirstRunStage: () => {
    const state = get();
    if (state.hasRealProperties) return FIRST_RUN_STAGES.GRADUATED;
    if (state.hasSeenDemoInspection) return FIRST_RUN_STAGES.POST_DEMO;
    return FIRST_RUN_STAGES.PRE_DEMO;
  },

  // Legacy helper — preserved so older callers still compile. The new
  // dashboard funnel does NOT use the OnboardingPopup modal anymore; it
  // renders an inline first-run state instead.
  shouldShowOnboarding: () => {
    const state = get();
    return !state.hasSeenOnboarding;
  },

  // Reset all onboarding flags (for testing/debugging and on logout).
  resetOnboarding: async () => {
    await Promise.all([
      AsyncStorage.removeItem(ONBOARDING_KEY),
      AsyncStorage.removeItem(DEMO_SEEN_KEY),
    ]);
    set({ hasSeenOnboarding: false, hasSeenDemoInspection: false });
  },
}));
