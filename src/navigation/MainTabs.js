import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import CleanerStack from './CleanerStack';
import OwnerStack from './OwnerStack';
import SettingsScreen from '../screens/Common/SettingsScreen';
import PropertiesScreen from '../screens/Owner/PropertiesScreen';
import PropertyDetailScreen from '../screens/Owner/PropertyDetailScreen';
import CreatePropertyScreen from '../screens/Owner/CreatePropertyScreen';
import ListingOptimizationScreen from '../screens/Owner/ListingOptimizationScreen';
import IssuesScreen from '../screens/Owner/IssuesScreen';

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
        headerTintColor: '#007AFF',
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
    </Stack.Navigator>
  );
}

// Listing Insights Stack
function ListingInsightsStack() {
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
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: '#1D1D1F',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="ListingOptimization" 
        component={ListingOptimizationScreen}
        options={{ title: 'Listing Insights' }}
      />
    </Stack.Navigator>
  );
}

// Issues Stack
function IssuesStack() {
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
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: '#1D1D1F',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="IssuesList" 
        component={IssuesScreen}
        options={{ title: 'Guest Issues' }}
      />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  const { user } = useAuthStore();
  const isCleaner = user?.role === 'CLEANER';
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';

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
          } else if (route.name === 'Insights') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Issues') {
            iconName = focused ? 'warning' : 'warning-outline';
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
            component={ListingInsightsStack}
            options={{ title: 'Insights' }}
          />
          <Tab.Screen 
            name="Issues" 
            component={IssuesStack}
            options={{ title: 'Issues' }}
          />
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


