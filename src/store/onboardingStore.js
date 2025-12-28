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

  // Mark onboarding as seen
  markOnboardingSeen: async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      set({ hasSeenOnboarding: true });
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

  // Check if should show onboarding
  shouldShowOnboarding: () => {
    const state = get();
    return !state.hasSeenOnboarding && (!state.hasProperties || !state.hasCleaners);
  },

  // Reset onboarding (for testing/debugging)
  resetOnboarding: async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    set({ hasSeenOnboarding: false });
  }
}));
