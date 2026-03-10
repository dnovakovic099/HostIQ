import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Platform, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FEATURE_FLAGS } from '../config/constants';
import OwnerDashboardScreen from '../screens/Owner/OwnerDashboardScreen';
import PropertiesScreen from '../screens/Owner/PropertiesScreen';
import PropertyDetailScreen from '../screens/Owner/PropertyDetailScreen';
import InspectionDetailScreen from '../screens/Common/InspectionDetailScreen';
import TeamScreen from '../screens/Owner/TeamScreen';
import BillingScreen from '../screens/Owner/BillingScreen';
import ManageCleanersScreen from '../screens/Owner/ManageCleanersScreen';
import CreatePropertyScreen from '../screens/Owner/CreatePropertyScreen';
import AssignCleanerScreen from '../screens/Owner/AssignCleanerScreen';
import CleanerAssignmentsScreen from '../screens/Owner/CleanerAssignmentsScreen';
import InspectionReportsScreen from '../screens/Owner/InspectionReportsScreen';
import ListingOptimizationScreen from '../screens/Owner/ListingOptimizationScreen';
import SubscriptionManagementScreen from '../screens/Owner/SubscriptionManagementScreen';
import SubscriptionScreen from '../screens/Owner/SubscriptionScreen';
import PMSSettingsScreen from '../screens/Owner/PMSSettingsScreen';
import IssuesScreen from '../screens/Owner/IssuesScreen';
import RoomTemplatesScreen from '../screens/Owner/RoomTemplatesScreen';
import CleaningReportScreen from '../screens/Common/CleaningReportScreen';
import AirbnbDisputeReportScreen from '../screens/Owner/AirbnbDisputeReportScreen';
import colors from '../theme/colors';

// Custom header component matching PropertiesScreen style
function DisputeReportHeader({ navigation, route }) {
  const insets = useSafeAreaInsets();
  
  return (
    <LinearGradient
      colors={colors.gradients.dashboardHeader}
      locations={colors.gradients.dashboardHeaderLocations}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[headerStyles.headerWrapper, Platform.OS === 'android' && { paddingTop: insets.top }]}
    >
      {Platform.OS === 'ios' ? (
        <SafeAreaView>
          <View style={headerStyles.headerGradient}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={headerStyles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={headerStyles.headerIconWrapper}>
              <View style={headerStyles.headerIconInner}>
                <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
              </View>
            </View>
            <View style={headerStyles.headerTextWrapper}>
              <Text style={headerStyles.headerTitle}>Dispute Report</Text>
              <Text style={headerStyles.headerSubtitle}>Official Documentation</Text>
            </View>
          </View>
        </SafeAreaView>
      ) : (
        <View style={headerStyles.headerGradient}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={headerStyles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={headerStyles.headerIconWrapper}>
            <View style={headerStyles.headerIconInner}>
              <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
            </View>
          </View>
          <View style={headerStyles.headerTextWrapper}>
            <Text style={headerStyles.headerTitle}>Dispute Report</Text>
            <Text style={headerStyles.headerSubtitle}>Official Documentation</Text>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const headerStyles = StyleSheet.create({
  headerWrapper: {
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 18,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerIconWrapper: {
    marginRight: 14,
  },
  headerIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },
});

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
        headerTintColor: '#215EEA',
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
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ManageCleaners" 
        component={ManageCleanersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateProperty" 
        component={CreatePropertyScreen}
        options={{ title: 'Create Property' }}
      />
      <Stack.Screen 
        name="AssignCleaner" 
        component={AssignCleanerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CleanerAssignments" 
        component={CleanerAssignmentsScreen}
        options={{ headerShown: false }}
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
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="InspectionDetail" 
        component={InspectionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TeamManagement" 
        component={TeamScreen}
        options={{ title: 'Team Management' }}
      />
      {FEATURE_FLAGS.ENABLE_BILLING && (
        <Stack.Screen
          name="Billing"
          component={BillingScreen}
          options={{ title: 'Billing & Plans' }}
        />
      )}
      {FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS && (
        <Stack.Screen
          name="SubscriptionManagement"
          component={SubscriptionManagementScreen}
          options={{ title: 'Subscriptions' }}
        />
      )}
      {FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS && (
        <Stack.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{ title: 'Choose Subscription' }}
        />
      )}
      {FEATURE_FLAGS.ENABLE_PMS_INTEGRATION && (
        <Stack.Screen
          name="PMSSettings"
          component={PMSSettingsScreen}
          options={{ title: 'PMS Integration' }}
        />
      )}
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
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AirbnbDisputeReport" 
        component={AirbnbDisputeReportScreen}
        options={{ 
          header: (props) => <DisputeReportHeader {...props} />,
        }}
      />
    </Stack.Navigator>
  );
}

