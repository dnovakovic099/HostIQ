import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FEATURE_FLAGS } from '../../config/constants';

// Import sub-screens as components
import CleanersTabContent from './InsightsCleanersTab';
import PropertyTabContent from './InsightsPropertyTab';

const { width } = Dimensions.get('window');

const TABS = [
  { id: 'cleaners', label: 'Cleaners', icon: 'people' },
  { id: 'property', label: 'Property', icon: 'business' },
];

export default function InsightsScreen({ navigation }) {
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
    backgroundColor: '#F8FAFC',
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
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
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});
