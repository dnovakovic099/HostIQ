// Mock for react-native-reanimated on web
// This library is optional for react-native-gesture-handler
// When gesture-handler tries to require it, we provide a minimal mock

const { View } = require('react-native');

const mockReanimated = {
  Value: class Value {
    constructor(value) {
      this.value = value;
    }
  },
  View: View,
  createAnimatedComponent: (component) => component,
  useSharedValue: (init) => ({ value: init }),
  useAnimatedStyle: () => ({}),
  useAnimatedGestureHandler: () => ({}),
  useAnimatedReaction: () => {},
  useDerivedValue: () => ({ value: 0 }),
  withSpring: (toValue) => toValue,
  withTiming: (toValue) => toValue,
  withDecay: (config) => config.velocity || 0,
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  Easing: {
    linear: () => {},
    ease: () => {},
    quad: () => {},
    cubic: () => {},
  },
};

// Support both CommonJS and ES6 imports
module.exports = mockReanimated;
module.exports.default = mockReanimated;

