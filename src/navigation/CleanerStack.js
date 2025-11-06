import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CleanerHistoryScreen from '../screens/Cleaner/CleanerHistoryScreen';
import CreateInspectionScreen from '../screens/Cleaner/CreateInspectionScreen';
import CaptureMediaScreen from '../screens/Cleaner/CaptureMediaScreen';
// import VideoCaptureScreen from '../screens/Cleaner/VideoCaptureScreen'; // Temporarily disabled - missing expo-av
import ReviewAndSubmitScreen from '../screens/Cleaner/ReviewAndSubmitScreen';
import InspectionDetailScreen from '../screens/Common/InspectionDetailScreen';

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
        name="CleanerHome" 
        component={CleanerHistoryScreen}
        options={{ title: "HostIQ" }}
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
        options={{ title: 'Inspection Details' }}
      />
    </Stack.Navigator>
  );
}

