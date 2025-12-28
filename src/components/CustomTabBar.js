import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_HEIGHT = 65;

const COLORS = {
  background: '#FFFFFF',
  activeIcon: '#3B82F6',
  inactiveIcon: '#94A3B8',
  activeText: '#3B82F6',
  inactiveText: '#94A3B8',
  border: '#E2E8F0',
};

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

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

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName = 'home-outline';
          if (route.name === 'HomeTab') iconName = isFocused ? 'home' : 'home-outline';
          else if (route.name === 'Inspections') iconName = isFocused ? 'clipboard' : 'clipboard-outline';
          else if (route.name === 'Properties') iconName = isFocused ? 'business' : 'business-outline';
          else if (route.name === 'Pricing') iconName = isFocused ? 'pricetag' : 'pricetag-outline';
          else if (route.name === 'Insights') iconName = isFocused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'Settings') iconName = isFocused ? 'settings' : 'settings-outline';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? COLORS.activeIcon : COLORS.inactiveIcon}
              />
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? COLORS.activeText : COLORS.inactiveText }
                ]}
              >
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
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});