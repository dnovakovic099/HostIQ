import React from 'react';
import { View } from 'react-native';

// Mock requireNativeComponent for web
// Native components don't exist on web, so we return a simple View component
export function requireNativeComponent(componentName, componentInterface) {
  return function NativeComponent(props) {
    return <View {...props} />;
  };
}

export default requireNativeComponent;

