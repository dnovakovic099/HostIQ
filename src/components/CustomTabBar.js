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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Apple-inspired proportions: refined and balanced
const TAB_BAR_HEIGHT = 56; // Optimized height (iOS standard is 49-56)
const BALL_SIZE = 60;      // Proportional ball size (reduced from 70)
const BALL_RADIUS = BALL_SIZE / 2;

// Luxury Ruby color palette
const COLORS = {
  background: '#DC143C',     // Premium vibrant ruby
  ballBackground: '#B8102F', // Deeper ruby for active state
  activeIcon: '#FFFFFF',
  inactiveIcon: '#FFFFFF',
  activeText: '#FFFFFF',
  inactiveText: 'rgba(255, 255, 255, 0.8)',
};

/* =======================
   SVG CURVED BACKGROUND (Deep & Wide Dip)
======================= */
const CurvedTabBarBackground = ({ centerX }) => {
  // Proportionally adjusted for refined tab bar
  const dipDepth = 42;  // Refined depth for elegant curve
  const dipWidth = 56;  // Balanced width

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
                <Ionicons name={activeIconName} size={18} color={COLORS.activeIcon} />
                <Text style={styles.ballLabel} numberOfLines={1}>{activeLabel}</Text>
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
                  <Ionicons name={iconName} size={20} color={COLORS.inactiveIcon} />
                  <Text style={styles.label}>{label}</Text>
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
    backgroundColor: '#F8F9FB', // Gray background color used in most pages
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
    top: -BALL_RADIUS - 2, // Subtle elevation
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_RADIUS,
    backgroundColor: COLORS.ballBackground,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  ballContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.activeIcon,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingTop: 6,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
    color: COLORS.inactiveText,
    letterSpacing: -0.1,
  },
});