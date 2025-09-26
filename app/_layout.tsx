import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useState } from 'react';
import { CopilotProvider } from 'react-native-copilot';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from '../src/store/store';
import StudioTitleScreen from './components/StudioTitleScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Disable Reanimated strict mode warnings via global variable
if (__DEV__) {
  global._WORKLET = false;
  global.__reanimatedLoggerConfig = {
    strict: false,
    level: 'warn',
  };
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CrayonPastel: require('../assets/fonts/CrayonPastel.otf'),
    PixeloidMono: require('../assets/fonts/PixeloidMono.ttf'),
    'La Machine Company 2': require('../assets/fonts/La Machine Company 2.ttf'),
    'Machiato Show': require('../assets/fonts/Machiato Show.ttf'),
    MoreCandy: require('../assets/fonts/MoreCandy.ttf'),
    Graffiti: require('../assets/fonts/Graffiti.ttf'),
    DonGraffiti: require('../assets/fonts/DonGraffiti.otf'),
  });
  const [showStudioScreen, setShowStudioScreen] = useState(true);

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <CopilotProvider
                overlay="svg"
                animated={true}
                backdropColor="rgba(0, 0, 0, 0.9)"
                labels={{
                  previous: 'Back',
                  next: 'Next',
                  skip: 'Skip',
                  finish: 'Got it!',
                }}
                tooltipStyle={{
                  fontSize: 16,
                }}
              >
                {showStudioScreen ? (
                  <StudioTitleScreen
                    onComplete={() => {
                      setShowStudioScreen(false);
                    }}
                  />
                ) : (
                  <Stack
                    screenOptions={{
                      animation: 'none',
                      animationEnabled: false,
                    }}
                  >
                    <Stack.Screen
                      name="index"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="(tabs)"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="title-screen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="story-screen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="computer-game"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="economy-game"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="history-game"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="home-ec-game"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="logic-game"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="math-game"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="art-game"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="recess-game"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="leaderboard"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="title-settings"
                      options={{ headerShown: false }}
                    />
                  </Stack>
                )}
              </CopilotProvider>
            </GestureHandlerRootView>
          </SafeAreaView>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
