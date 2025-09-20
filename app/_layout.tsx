import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CopilotProvider } from 'react-native-copilot';
import { CandySalesProvider } from '../src/context/CandySalesContext';
import { DailyStatsProvider } from '../src/context/DailyStatsContext';
import { EventHandlerProvider } from '../src/context/EventHandlerContext';
import { FlavorTextProvider } from '../src/context/FlavorTextContext';
import { GameProvider } from '../src/context/GameContext';
import { InventoryProvider } from '../src/context/InventoryContext';
import { JokerProvider } from '../src/context/JokerContext';
import { SeedProvider } from '../src/context/SeedContext';
import { TabBarProvider } from '../src/context/TabBarContext';
import { WalletProvider } from '../src/context/WalletContext';
import { ScoreboardProvider } from '../src/context/ScoreboardContext';
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
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SeedProvider>
            <FlavorTextProvider>
              <WalletProvider>
                <JokerProvider>
                  <GameProvider>
                    <InventoryProvider>
                      <CandySalesProvider>
                        <DailyStatsProvider>
                          <EventHandlerProvider>
                            <ScoreboardProvider>
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
                                >
                                  <TabBarProvider>
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
                                  </TabBarProvider>
                                </CopilotProvider>
                            </ScoreboardProvider>
                          </EventHandlerProvider>
                        </DailyStatsProvider>
                      </CandySalesProvider>
                    </InventoryProvider>
                  </GameProvider>
                </JokerProvider>
              </WalletProvider>
            </FlavorTextProvider>
          </SeedProvider>
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
