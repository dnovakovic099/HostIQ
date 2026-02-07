import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../theme/colors';

// Apple HIG Tab Bar Colors
const COLORS = {
  background: colors.tabBar.background,         // iOS standard tab bar
  active: colors.tabBar.active,                 // iOS system blue
  inactive: colors.tabBar.inactive,             // iOS gray
  border: colors.tabBar.border,                 // iOS separator
};

export default function SimpleTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  const getIconName = (routeName, focused) => {
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

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
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
  label: {
    fontSize: 10,                               // iOS tab bar label
    marginTop: 1,
    fontWeight: '500',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
