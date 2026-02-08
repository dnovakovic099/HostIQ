import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FEATURE_FLAGS } from '../config/constants';
import CleanerHistoryScreen from '../screens/Cleaner/CleanerHistoryScreen';
import CreateInspectionScreen from '../screens/Cleaner/CreateInspectionScreen';
import CaptureMediaScreen from '../screens/Cleaner/CaptureMediaScreen';
import RoomCaptureScreen from '../screens/Cleaner/RoomCaptureScreen';
// import VideoCaptureScreen from '../screens/Cleaner/VideoCaptureScreen'; // Temporarily disabled - missing expo-av
import ReviewAndSubmitScreen from '../screens/Cleaner/ReviewAndSubmitScreen';
import InspectionDetailScreen from '../screens/Common/InspectionDetailScreen';
import CleanerReportsScreen from '../screens/Cleaner/CleanerReportsScreen';
import PaymentSettingsScreen from '../screens/Cleaner/PaymentSettingsScreen';
import PaymentHistoryScreen from '../screens/Common/PaymentHistoryScreen';
import InventoryUpdateScreen from '../screens/Cleaner/InventoryUpdateScreen';
import CleaningReportScreen from '../screens/Common/CleaningReportScreen';

const Stack = createStackNavigator();

export default function CleanerStack() {
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
        name="CleanerHome" 
        component={CleanerHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateInspection"
        component={CreateInspectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CaptureMedia" 
        component={CaptureMediaScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RoomCapture" 
        component={RoomCaptureScreen}
        options={{ headerShown: false }}
      />
      {/* Temporarily disabled - missing expo-av
      <Stack.Screen 
        name="VideoCapture" 
        component={VideoCaptureScreen}
        options={{ headerShown: false }}
      />
      */}
      <Stack.Screen 
        name="ReviewAndSubmit" 
        component={ReviewAndSubmitScreen}
        options={{ title: 'Review & Submit' }}
      />
      <Stack.Screen 
        name="InspectionDetail" 
        component={InspectionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CleanerReports"
        component={CleanerReportsScreen}
        options={{ headerShown: false }}
      />
      {FEATURE_FLAGS.ENABLE_PAYMENTS && (
        <Stack.Screen
          name="PaymentSettings"
          component={PaymentSettingsScreen}
          options={{ title: 'Payment Settings' }}
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
        name="InventoryUpdate" 
        component={InventoryUpdateScreen}
        options={{ title: 'Update Inventory' }}
      />
      <Stack.Screen 
        name="CleaningReport" 
        component={CleaningReportScreen}
        options={{ title: 'Cleaning Report' }}
      />
    </Stack.Navigator>
  );
}

