import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@onboarding_completed';

export const useOnboardingStore = create((set, get) => ({
  hasSeenOnboarding: false,
  hasProperties: false,
  hasCleaners: false,
  isLoading: true,

  // Load onboarding state from AsyncStorage
  loadOnboardingState: async () => {
    try {
      const hasSeenStr = await AsyncStorage.getItem(ONBOARDING_KEY);
      const hasSeen = hasSeenStr === 'true';
      set({ hasSeenOnboarding: hasSeen, isLoading: false });
      return hasSeen;
    } catch (error) {
      console.error('Error loading onboarding state:', error);
      set({ isLoading: false });
      return false;
    }
  },

  // Mark onboarding as seen (only if user has properties, otherwise it will show again)
  markOnboardingSeen: async () => {
    try {
      const state = get();
      // Only mark as seen if user has properties, otherwise it will show again next time
      if (state.hasProperties) {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        set({ hasSeenOnboarding: true });
      } else {
        // Don't persist dismissal if no properties - clear any existing seen flag
        await AsyncStorage.removeItem(ONBOARDING_KEY);
        set({ hasSeenOnboarding: false });
      }
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  },

  // Update data counts
  updateCounts: (properties, cleaners) => {
    set({
      hasProperties: properties > 0,
      hasCleaners: cleaners > 0
    });
  },

  // Check if should show onboarding (always show when no properties, regardless of previous dismissal)
  shouldShowOnboarding: () => {
    const state = get();
    return !state.hasProperties;
  },

  // Reset onboarding (for testing/debugging)
  resetOnboarding: async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    set({ hasSeenOnboarding: false });
  }
}));
