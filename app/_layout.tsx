import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from '../src/store/store';
import GameEffectsManager from './components/GameEffectsManager';
import { AdVisibilityProvider } from '../src/context/AdVisibilityContext';
import { initializeAudioMode } from '../src/utils/audioConfig';
import Constants from 'expo-constants';

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

// Disable console.log in production for performance
if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  // Keep console.error for critical issues
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
    PlayMeGames: require('../assets/fonts/PlayMeGames.otf'),
  });

  // Initialize Google Mobile Ads (only in dev/production builds, not Expo Go)
  useEffect(() => {
    const isExpoGo = Constants.appOwnership === 'expo';

    if (isExpoGo) {
      if (__DEV__) console.log('📱 Running in Expo Go - skipping AdMob initialization');
      return;
    }

    // Dynamically import AdMob only when needed (not in Expo Go)
    import('react-native-google-mobile-ads')
      .then((mobileAdsModule) => {
        return mobileAdsModule.default().initialize();
      })
      .then(() => {
        if (__DEV__) console.log('📱 AdMob initialized');
      })
      .catch((error: Error) => {
        if (__DEV__) console.error('📱 AdMob initialization failed:', error);
      });
  }, []);

  // Initialize audio mode once at app startup
  useEffect(() => {
    initializeAudioMode()
      .then(() => {
        if (__DEV__) console.log('🎵 App-level audio mode initialized');
      })
      .catch((error) => {
        if (__DEV__) console.error('🎵 Failed to initialize audio mode:', error);
      });
  }, []);

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
        <GameEffectsManager />
        <AdVisibilityProvider>
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    animation: 'none',
                    animationEnabled: false,
                  }}
                >
                  <RouteTracker />
                      <Stack.Screen
                        name="index"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{
                          headerShown: false,
                        }}
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
                        name="geography-game"
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
                      <Stack.Screen
                        name="piggy-bank"
                        options={{
                          presentation: 'modal',
                          headerShown: false,
                          animation: 'none',
                        }}
                      />
                      <Stack.Screen
                        name="deli"
                        options={{
                          presentation: 'modal',
                          headerShown: false,
                          animation: 'none',
                        }}
                      />
                </Stack>
              </GestureHandlerRootView>
            </SafeAreaView>
          </SafeAreaProvider>
        </AdVisibilityProvider>
      </PersistGate>
    </Provider>
  );
}

/**
 * Route Tracker Component
 * Updates ad visibility based on current route
 */
function RouteTracker() {
  const pathname = usePathname();
  const { setCurrentRoute } = React.useContext(
    require('../src/context/AdVisibilityContext').AdVisibilityContext
  );

  React.useEffect(() => {
    if (pathname) {
      setCurrentRoute(pathname);
    }
  }, [pathname, setCurrentRoute]);

  return null;
}
