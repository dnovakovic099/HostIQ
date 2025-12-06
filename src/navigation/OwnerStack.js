import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OwnerDashboardScreen from '../screens/Owner/OwnerDashboardScreen';
import PropertiesScreen from '../screens/Owner/PropertiesScreen';
import PropertyDetailScreen from '../screens/Owner/PropertyDetailScreen';
import InspectionDetailScreen from '../screens/Common/InspectionDetailScreen';
import TeamScreen from '../screens/Owner/TeamScreen';
import BillingScreen from '../screens/Owner/BillingScreen';
import ManageCleanersScreen from '../screens/Owner/ManageCleanersScreen';
import CreatePropertyScreen from '../screens/Owner/CreatePropertyScreen';
import AssignCleanerScreen from '../screens/Owner/AssignCleanerScreen';
import InspectionReportsScreen from '../screens/Owner/InspectionReportsScreen';
import ListingOptimizationScreen from '../screens/Owner/ListingOptimizationScreen';
import SubscriptionManagementScreen from '../screens/Owner/SubscriptionManagementScreen';
import PMSSettingsScreen from '../screens/Owner/PMSSettingsScreen';
import IssuesScreen from '../screens/Owner/IssuesScreen';
import RoomTemplatesScreen from '../screens/Owner/RoomTemplatesScreen';
import CleaningReportScreen from '../screens/Common/CleaningReportScreen';

const Stack = createStackNavigator();

export default function OwnerStack() {
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
        name="OwnerDashboard" 
        component={OwnerDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="ManageCleaners" 
        component={ManageCleanersScreen}
        options={{ title: 'Manage Cleaners' }}
      />
      <Stack.Screen 
        name="CreateProperty" 
        component={CreatePropertyScreen}
        options={{ title: 'Create Property' }}
      />
      <Stack.Screen 
        name="AssignCleaner" 
        component={AssignCleanerScreen}
        options={{ title: 'Assign Cleaner' }}
      />
      <Stack.Screen 
        name="InspectionReports" 
        component={InspectionReportsScreen}
        options={{ title: 'Inspection Reports' }}
      />
      <Stack.Screen 
        name="ListingOptimization" 
        component={ListingOptimizationScreen}
        options={{ title: 'Listing Optimization' }}
      />
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
        name="InspectionDetail" 
        component={InspectionDetailScreen}
        options={{ title: 'Inspection Details' }}
      />
      <Stack.Screen 
        name="TeamManagement" 
        component={TeamScreen}
        options={{ title: 'Team Management' }}
      />
      <Stack.Screen 
        name="Billing" 
        component={BillingScreen}
        options={{ title: 'Billing & Plans' }}
      />
      <Stack.Screen 
        name="SubscriptionManagement" 
        component={SubscriptionManagementScreen}
        options={{ title: 'Subscriptions' }}
      />
      <Stack.Screen 
        name="PMSSettings" 
        component={PMSSettingsScreen}
        options={{ title: 'PMS Integration' }}
      />
      <Stack.Screen 
        name="Issues" 
        component={IssuesScreen}
        options={{ title: 'Guest Issues' }}
      />
      <Stack.Screen 
        name="RoomTemplates" 
        component={RoomTemplatesScreen}
        options={{ title: 'Room Templates' }}
      />
      <Stack.Screen 
        name="CleaningReport" 
        component={CleaningReportScreen}
        options={{ title: 'Cleaning Report' }}
      />
    </Stack.Navigator>
  );
}

