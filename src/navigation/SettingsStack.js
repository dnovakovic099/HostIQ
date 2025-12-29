import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SettingsScreen from '../screens/Common/SettingsScreen';
import TermsOfServiceScreen from '../screens/Common/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/Common/PrivacyPolicyScreen';

const Stack = createStackNavigator();

export default function SettingsStack() {
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
        name="SettingsMain" 
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TermsOfService" 
        component={TermsOfServiceScreen}
        options={{ title: 'Terms of Service' }}
      />
      <Stack.Screen 
        name="PrivacyPolicy" 
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacy Policy' }}
      />
    </Stack.Navigator>
  );
}

