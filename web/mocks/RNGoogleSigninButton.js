import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Mock component for web - Google Sign-In native button is not available on web
export const RNGoogleSigninButton = ({ style, onPress, ...props }) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      {...props}
    >
      <Text style={styles.text}>Sign in with Google</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RNGoogleSigninButton;

