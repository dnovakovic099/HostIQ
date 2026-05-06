import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import { useOnboardingStore, FIRST_RUN_STAGES } from '../store/onboardingStore';

// Clean iOS-style Tab Bar Colors
const COLORS = {
  background: '#F8F8F8',                        // Light gray background (iOS standard)
  active: '#007AFF',                            // iOS blue for active
  inactive: '#3C3C43',                          // Dark gray/black for inactive
  border: '#E5E5E5',                            // Subtle gray border
};

// Tabs whose value is unlocked by data the user doesn't have yet during
// first-run. These stay tappable (per UX call) but render at reduced
// opacity so the eye is drawn to the active funnel instead.
const FIRST_RUN_DIMMED_TABS = new Set(['Insights', 'Pricing']);

export default function SimpleTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const getFirstRunStage = useOnboardingStore((s) => s.getFirstRunStage);
  // Subscribe to the underlying flags so the tab bar re-renders the
  // moment a stage transition happens.
  const hasSeenDemoInspection = useOnboardingStore(
    (s) => s.hasSeenDemoInspection
  );
  const hasRealProperties = useOnboardingStore((s) => s.hasRealProperties);
  const stage = getFirstRunStage();
  const isFirstRun = stage !== FIRST_RUN_STAGES.GRADUATED;
  // Reference flags so React understands they're dependencies of the
  // re-render. Not strictly needed for zustand selectors but keeps lint
  // and intent clear.
  void hasSeenDemoInspection;
  void hasRealProperties;

  const getIconName = (routeName, focused) => {
    // Filled icons for active, outline for inactive (iOS standard)
    const icons = {
      HomeTab: focused ? 'home' : 'home-outline',
      Inspections: focused ? 'clipboard' : 'clipboard-outline',
      Properties: focused ? 'business' : 'business-outline',
      Insights: focused ? 'bar-chart' : 'bar-chart-outline',
      Pricing: focused ? 'pricetag' : 'pricetag-outline',
      Subscription: focused ? 'card' : 'card-outline',
      Settings: focused ? 'settings' : 'settings-outline',
    };
    return icons[routeName] || 'help-circle-outline';
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              if (isFocused) {
                // If already on this tab, reset to the root screen (iOS standard behavior)
                navigation.navigate(route.name, {
                  screen: route.state?.routeNames?.[0],
                });
              } else {
                navigation.navigate(route.name);
              }
            }
          };

          // Dim (don't lock) tabs whose value depends on data the user
          // doesn't have during first-run. Still tappable — they'll see
          // an educational empty state if they explore.
          const isDimmed =
            isFirstRun &&
            !isFocused &&
            FIRST_RUN_DIMMED_TABS.has(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isDimmed && styles.tabDimmed]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={getIconName(route.name, isFocused)}
                size={24}
                color={isFocused ? COLORS.active : COLORS.inactive}
              />
              <Text style={[
                styles.label,
                { color: isFocused ? COLORS.active : COLORS.inactive }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderTopWidth: 0.5,                        // Hairline border
    borderTopColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    minHeight: 49,                              // iOS standard tab bar height
    backgroundColor: COLORS.background,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,                              // Tighter spacing
    paddingBottom: 2,
  },
  tabDimmed: {
    opacity: 0.38,
  },
  label: {
    fontSize: 10,                               // iOS tab bar label
    marginTop: 1,
    fontWeight: '500',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
