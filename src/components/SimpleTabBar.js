import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#FFFFFF',
  active: '#007AFF',
  inactive: '#8E8E93',
  border: '#E5E5EA',
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
            if (!isFocused) {
              navigation.navigate(route.name);
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
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    minHeight: 50,
    backgroundColor: COLORS.background,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
