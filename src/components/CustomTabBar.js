import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
  Animated,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import colors from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAB_BAR_HEIGHT = 49;                      // iOS standard tab bar
const BALL_SIZE = 56;                           // More refined size
const BALL_RADIUS = BALL_SIZE / 2;

// IMPORTANT: For best App Store approval chances, use SimpleTabBar instead
// This custom curved tab bar may raise review concerns
const COLORS = {
  background: colors.tabBar.background,         // iOS standard
  ballBackground: colors.primary.main,          // iOS blue
  activeIcon: '#FFFFFF',
  inactiveIcon: colors.tabBar.inactive,
  activeText: '#FFFFFF',
  inactiveText: colors.tabBar.inactive,
};

/* =======================
   SVG CURVED BACKGROUND (Deep & Wide Dip)
======================= */
const CurvedTabBarBackground = ({ centerX }) => {
  // Adjusted for smaller tab bar
  const dipDepth = 50;  // Reduced depth proportionally
  const dipWidth = 60;  // Slightly reduced width

  return (
    <Svg
      width={SCREEN_WIDTH}
      height={TAB_BAR_HEIGHT + dipDepth + 10}
      style={{ position: 'absolute', top: 0, zIndex: 1 }}
    >
      <Path
        d={`
          M 0 0
          H ${centerX - dipWidth - 20}
          C ${centerX - dipWidth + 20} 0, ${centerX - dipWidth + 15} ${dipDepth}, ${centerX} ${dipDepth}
          C ${centerX + dipWidth - 15} ${dipDepth}, ${centerX + dipWidth - 20} 0, ${centerX + dipWidth + 20} 0
          H ${SCREEN_WIDTH}
          V ${TAB_BAR_HEIGHT + 10}
          H 0
          Z
        `}
        fill={COLORS.background}
      />
    </Svg>
  );
};

/* =======================
   CUSTOM TAB BAR
======================= */
export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const tabWidth = SCREEN_WIDTH / state.routes.length;

  const ballPosition = useRef(
    new Animated.Value(state.index * tabWidth + tabWidth / 2 - BALL_RADIUS)
  ).current;
  
  const curveCenterX = useRef(
    new Animated.Value(state.index * tabWidth + tabWidth / 2)
  ).current;

  const [centerX, setCenterX] = useState(state.index * tabWidth + tabWidth / 2);

  useEffect(() => {
    const targetX = state.index * tabWidth + tabWidth / 2 - BALL_RADIUS;
    const targetCenterX = state.index * tabWidth + tabWidth / 2;

    Animated.parallel([
      Animated.spring(ballPosition, {
        toValue: targetX,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }),
      Animated.spring(curveCenterX, {
        toValue: targetCenterX,
        useNativeDriver: false,
        tension: 100,
        friction: 12,
      }),
    ]).start();

    const listenerId = curveCenterX.addListener(({ value }) => {
      setCenterX(value);
    });
    
    return () => curveCenterX.removeListener(listenerId);
  }, [state.index, tabWidth]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* White background below tab bar to prevent content showing through */}
      <View style={styles.whiteBackground} />
      
      <View style={styles.tabBar}>
        <CurvedTabBarBackground centerX={centerX} />

        <Animated.View
          style={[
            styles.ball,
            { transform: [{ translateX: ballPosition }] },
          ]}
          pointerEvents="none"
        >
          {(() => {
            const activeRoute = state.routes[state.index];
            const activeOptions = descriptors[activeRoute.key].options;
            const activeLabel = activeOptions.tabBarLabel ?? activeOptions.title ?? activeRoute.name;
            
            let activeIconName = 'home';
            if (activeRoute.name === 'HomeTab') activeIconName = 'home';
            else if (activeRoute.name === 'Inspections') activeIconName = 'clipboard';
            else if (activeRoute.name === 'Properties') activeIconName = 'business';
            else if (activeRoute.name === 'Pricing') activeIconName = 'pricetag';
            else if (activeRoute.name === 'Insights') activeIconName = 'bar-chart';
            else if (activeRoute.name === 'Settings') activeIconName = 'settings';
            
            return (
              <View style={styles.ballContent}>
                <Ionicons name={activeIconName} size={20} color={COLORS.activeIcon} style={{ fontWeight: 'bold' }} />
                <Text style={[styles.ballLabel, { fontWeight: 'bold' }]} numberOfLines={1}>{activeLabel}</Text>
              </View>
            );
          })()}
        </Animated.View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            if (!isFocused) navigation.navigate(route.name);
          };

          let iconName = 'home-outline';
          if (route.name === 'Inspections') iconName = 'clipboard-outline';
          if (route.name === 'Properties') iconName = 'business-outline';
          if (route.name === 'Pricing') iconName = 'pricetag-outline';
          if (route.name === 'Insights') iconName = 'bar-chart-outline';
          if (route.name === 'Settings') iconName = 'settings-outline';

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem}>
              {!isFocused && (
                <>
                  <Ionicons name={iconName} size={22} color={COLORS.inactiveIcon} style={{ fontWeight: 'bold' }} />
                  <Text style={[styles.label, { fontWeight: 'bold' }]}>{label}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  whiteBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT + 34, // Extends below tab bar
    backgroundColor: colors.background.primary, // Gray background color used in most pages
    zIndex: 0,
  },
  tabBar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  ball: {
    position: 'absolute',
    top: -BALL_RADIUS,
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_RADIUS,
    backgroundColor: COLORS.ballBackground,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: colors.shadow.blue,           // Blue shadow for iOS blue ball
    shadowOpacity: 0.15,                        // More subtle
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  ballContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: COLORS.activeIcon,
    textAlign: 'center',
    marginTop: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingTop: 8, // Adjusted for smaller tab bar
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '500',
    color: COLORS.inactiveText,
  },
});