import React, { useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import CleanerStack from './CleanerStack';
import OwnerStack from './OwnerStack';
import SettingsScreen from '../screens/Common/SettingsScreen';
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Properties Stack
function PropertiesStack() {
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
        name="PropertiesList" 
        component={PropertiesScreen}
        options={{ title: 'My Properties' }}
      />
      <Stack.Screen 
        name="PropertyDetail" 
        component={PropertyDetailScreen}
        options={{ title: 'Property Details' }}
      />
      <Stack.Screen 
        name="CreateProperty" 
        component={CreatePropertyScreen}
        options={{ title: 'Create Property' }}
      />
      <Stack.Screen 
        name="Inventory" 
        component={InventoryScreen}
        options={{ title: 'Inventory' }}
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
      <Stack.Screen 
        name="PayCleaner" 
        component={PayCleanerScreen}
        options={{ title: 'Pay Cleaner' }}
      />
      <Stack.Screen 
        name="PaymentHistory" 
        component={PaymentHistoryScreen}
        options={{ title: 'Payment History' }}
      />
      <Stack.Screen 
        name="Issues" 
        component={IssuesScreen}
        options={{ title: 'Guest Issues' }}
      />
      <Stack.Screen 
        name="InspectionDetail" 
        component={InspectionDetailScreen}
        options={{ title: 'Inspection Details' }}
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

export default function MainTabs() {
  const { user } = useAuthStore();
  const isCleaner = user?.role === 'CLEANER';
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const [hasPMSConnected, setHasPMSConnected] = useState(false);

  // Check if user has PMS properties connected
  useEffect(() => {
    const checkPMSStatus = async () => {
      if (!isOwner) return;
      
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
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Inspections') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'Properties') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Pricing') {
            iconName = focused ? 'pricetag' : 'pricetag-outline';
          } else if (route.name === 'Insights') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
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
          />
          <Tab.Screen 
            name="Insights" 
            component={InsightsStack}
            options={{ title: 'Insights' }}
          />
          {hasPMSConnected && (
            <Tab.Screen 
              name="Pricing" 
              component={PricingStack}
              options={{ title: 'Pricing' }}
            />
          )}
        </>
      )}

      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ headerShown: true }}
      />
    </Tab.Navigator>
  );
}


