const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@react-native-google-signin/google-signin'],
      },
    },
    argv
  );

  // Resolve native component issues for web
  config.resolve.alias = {
    ...config.resolve.alias,
    // Mock requireNativeComponent for web
    '@react-native-google-signin/google-signin/lib/module/RNGoogleSiginButton': require.resolve('./web/mocks/RNGoogleSigninButton.js'),
    // Handle react-native-reanimated optional dependency
    'react-native-reanimated': require.resolve('./web/mocks/react-native-reanimated.js'),
  };

  // Add plugins to handle native component issues
  config.plugins = config.plugins || [];
  
  // Replace the problematic RNGoogleSigninButton file that uses requireNativeComponent
  // Note: The library has a typo in the filename (RNGoogleSiginButton instead of RNGoogleSigninButton)
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /@react-native-google-signin\/google-signin\/lib\/module\/RNGoogleSiginButton/,
      require.resolve('./web/mocks/RNGoogleSigninButton.js')
    )
  );

  return config;
};

