import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { FEATURE_FLAGS } from '../config/constants';
import SimpleTabBar from '../components/SimpleTabBar';
import CleanerStack from './CleanerStack';
import OwnerStack from './OwnerStack';
import SettingsStack from './SettingsStack';
import PropertiesScreen from '../screens/Owner/PropertiesScreen';
import PropertyDetailScreen from '../screens/Owner/PropertyDetailScreen';
import CreatePropertyScreen from '../screens/Owner/CreatePropertyScreen';
import InsightsScreen from '../screens/Owner/InsightsScreen';
import IssuesScreen from '../screens/Owner/IssuesScreen';
import InspectionDetailScreen from '../screens/Common/InspectionDetailScreen';
import PricingScreen from '../screens/Owner/PricingScreen';
import PayCleanerScreen from '../screens/Owner/PayCleanerScreen';
import PaymentHistoryScreen from '../screens/Common/PaymentHistoryScreen';
import InventoryScreen from '../screens/Owner/InventoryScreen';
import ValuableItemsScreen from '../screens/Owner/ValuableItemsScreen';
import SubscriptionScreen from '../screens/Owner/SubscriptionScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Properties Stack
function PropertiesStack() {
  return (
    <Stack.Navigator
      initialRouteName="PropertiesList"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0.5 },
          shadowOpacity: 0.1,
          shadowRadius: 0,
          elevation: 1,
          borderBottomWidth: 0.5,
          borderBottomColor: '#E5E5EA',
        },
        headerTintColor: '#4A90E2',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: '#1D1D1F',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="PropertiesList" 
        component={PropertiesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PropertyDetail" 
        component={PropertyDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateProperty" 
        component={CreatePropertyScreen}
        options={{ title: 'Create Property' }}
      />
      <Stack.Screen 
        name="Inventory" 
        component={InventoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ValuableItems" 
        component={ValuableItemsScreen}
        options={{ title: 'Valuable Items' }}
      />
    </Stack.Navigator>
  );
}

// Insights Stack (Cleaners + Property tabs)
function InsightsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0.5 },
          shadowOpacity: 0.1,
          shadowRadius: 0,
          elevation: 1,
          borderBottomWidth: 0.5,
          borderBottomColor: '#E5E5EA',
        },
        headerTintColor: '#4A90E2',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: '#1D1D1F',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="InsightsTabs" 
        component={InsightsScreen}
        options={{ title: 'Insights' }}
      />
      {FEATURE_FLAGS.ENABLE_PAYMENTS && (
        <Stack.Screen
          name="PayCleaner"
          component={PayCleanerScreen}
          options={{ title: 'Pay Cleaner' }}
        />
      )}
      {FEATURE_FLAGS.ENABLE_PAYMENTS && (
        <Stack.Screen
          name="PaymentHistory"
          component={PaymentHistoryScreen}
          options={{ title: 'Payment History' }}
        />
      )}
      <Stack.Screen 
        name="Issues" 
        component={IssuesScreen}
        options={{ title: 'Guest Issues' }}
      />
      <Stack.Screen 
        name="InspectionDetail" 
        component={InspectionDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Pricing Stack
function PricingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0.5 },
          shadowOpacity: 0.1,
          shadowRadius: 0,
          elevation: 1,
          borderBottomWidth: 0.5,
          borderBottomColor: '#E5E5EA',
        },
        headerTintColor: '#4A90E2',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: '#1D1D1F',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="PricingAnalysis" 
        component={PricingScreen}
        options={{ title: 'Market Analysis' }}
      />
    </Stack.Navigator>
  );
}

// Subscription Stack
function SubscriptionStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0.5 },
          shadowOpacity: 0.1,
          shadowRadius: 0,
          elevation: 1,
          borderBottomWidth: 0.5,
          borderBottomColor: '#E5E5EA',
        },
        headerTintColor: '#4A90E2',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: '#1D1D1F',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="SubscriptionList" 
        component={SubscriptionScreen}
        options={{ title: 'Subscriptions', headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  const { user } = useAuthStore();
  const isCleaner = user?.role === 'CLEANER';
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const [hasPMSConnected, setHasPMSConnected] = useState(false);

  // Check if user has PMS properties connected
  useEffect(() => {
    const checkPMSStatus = async () => {
      if (!isOwner) return;
      if (!FEATURE_FLAGS.ENABLE_PMS_INTEGRATION) return;

      try {
        // Check for PMS integrations
        const response = await api.get('/pms/integrations');
        const integrations = response.data || [];
        // User has PMS if any integration has properties synced
        const hasProperties = integrations.some(
          integration => integration.pms_properties && integration.pms_properties.length > 0
        );
        setHasPMSConnected(hasProperties);
      } catch (error) {
        // If error (no PMS endpoint or not connected), set to false
        setHasPMSConnected(false);
      }
    };

    checkPMSStatus();
  }, [isOwner]);

  return (
    <Tab.Navigator
      tabBar={(props) => <SimpleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {isCleaner && (
        <Tab.Screen 
          name="HomeTab" 
          component={CleanerStack}
          options={{ title: 'Home' }}
        />
      )}

      {isOwner && (
        <>
          <Tab.Screen 
            name="Inspections" 
            component={OwnerStack}
            options={{ title: 'Inspections' }}
          />
          <Tab.Screen 
            name="Properties" 
            component={PropertiesStack}
            options={{ title: 'Properties' }}
            listeners={({ navigation }) => ({
              focus: () => {
                // Always reset to PropertiesList when tab is focused
                // Get the nested stack navigator
                const state = navigation.getState();
                const propertiesRoute = state?.routes?.find(r => r.name === 'Properties');
                if (propertiesRoute?.state) {
                  const stackState = propertiesRoute.state;
                  const currentRoute = stackState.routes?.[stackState.index || 0];
                  const currentRouteName = currentRoute?.name;
                  
                  // Reset to PropertiesList if we're not already on it
                  // This ensures clicking the Properties tab always shows the list first
                  if (currentRouteName && currentRouteName !== 'PropertiesList') {
                    // Use the parent navigation to navigate within the nested stack
                    const parentNav = navigation.getParent();
                    if (parentNav) {
                      parentNav.navigate('Properties', { screen: 'PropertiesList' });
                    } else {
                      navigation.navigate('Properties', { screen: 'PropertiesList' });
                    }
                  }
                }
              },
            })}
          />
          <Tab.Screen 
            name="Insights" 
            component={InsightsStack}
            options={{ title: 'Insights' }}
          />
          {FEATURE_FLAGS.ENABLE_PRICING_TAB && (
            <Tab.Screen
              name="Pricing"
              component={PricingStack}
              options={{ title: 'Pricing' }}
            />
          )}
          {/*
            Temporarily hide the Subscription tab from the bottom bar.
            To re-enable, remove this comment block and restore the Tab.Screen.
          <Tab.Screen 
            name="Subscription" 
            component={SubscriptionStack}
            options={{ title: 'Subscription' }}
          />
          */}
        </>
      )}

      <Tab.Screen 
        name="Settings" 
        component={SettingsStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}


