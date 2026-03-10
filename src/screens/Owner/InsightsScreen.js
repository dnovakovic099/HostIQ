import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FEATURE_FLAGS } from '../../config/constants';
import colors from '../../theme/colors';

// Import sub-screens as components
import CleanersTabContent from './InsightsCleanersTab';
import PropertyTabContent from './InsightsPropertyTab';

const { width } = Dimensions.get('window');

const TABS = [
  { id: 'cleaners', label: 'Cleaners', icon: 'people' },
  { id: 'property', label: 'Property', icon: 'business' },
];

export default function InsightsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('cleaners');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return;

    const tabIndex = TABS.findIndex(t => t.id === tabId);

    // Fade out, switch, fade in
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: tabIndex,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setActiveTab(tabId);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const tabWidth = (width - 32 - 8) / TABS.length;
  const indicatorLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 4 + tabWidth],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, { paddingTop: insets.top }]}
      >
        {/* Decorative element */}
        <View style={styles.decorativeCircle}>
          <Ionicons name="bar-chart" size={70} color={colors.decorative.icon1} />
        </View>
        <SafeAreaView>
          <View style={styles.headerGradient}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name="bar-chart" size={22} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>Insights</Text>
              <Text style={styles.headerSubtitle}>Track team performance</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {FEATURE_FLAGS.ENABLE_INSIGHTS_PROPERTY_TAB && (
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            <Animated.View
              style={[
                styles.tabIndicator,
                { left: indicatorLeft, width: tabWidth }
              ]}
            />
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={styles.tab}
                onPress={() => handleTabChange(tab.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`}
                  size={18}
                  color={activeTab === tab.id ? '#FFFFFF' : '#6B7280'}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.id && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {FEATURE_FLAGS.ENABLE_INSIGHTS_PROPERTY_TAB ? (
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {activeTab === 'cleaners' ? (
            <CleanersTabContent navigation={navigation} />
          ) : (
            <PropertyTabContent navigation={navigation} />
          )}
        </Animated.View>
      ) : (
        <View style={styles.content}>
          <CleanersTabContent navigation={navigation} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  // Header (match reference pattern)
  headerWrapper: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.decorative.circle1,
    top: -30,
    right: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 14,
  },
  headerBackButton: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconWrapper: {
    marginRight: 12,
  },
  headerIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.85,
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: colors.primary?.main || '#0A84FF',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0A84FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 1,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});
