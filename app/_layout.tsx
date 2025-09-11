import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useState, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CandySalesProvider } from '../src/context/CandySalesContext';
import { DailyStatsProvider } from '../src/context/DailyStatsContext';
import { EventHandlerProvider } from '../src/context/EventHandlerContext';
import { FlavorTextProvider } from '../src/context/FlavorTextContext';
import { GameProvider } from '../src/context/GameContext';
import { InventoryProvider } from '../src/context/InventoryContext';
import { JokerProvider } from '../src/context/JokerContext';
import { SeedProvider } from '../src/context/SeedContext';
import { TabBarProvider } from '../src/context/TabBarContext';
import { WalletProvider, useWallet } from '../src/context/WalletContext';
import { ScoreboardProvider } from '../src/context/ScoreboardContext';
import CandyWarsTitleScreen from './components/CandyWarsTitleScreen';
import StudioTitleScreen from './components/StudioTitleScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function TitleScreenWrapper({ setShowTitleScreen }: { setShowTitleScreen: (show: boolean) => void }) {
  const { initializeWallet } = useWallet();

  const handleNewGame = (difficulty: 'easy' | 'medium' | 'hard') => {
    initializeWallet(difficulty);
    setShowTitleScreen(false);
  };

  return (
    <CandyWarsTitleScreen
      onNewGame={handleNewGame}
      onContinue={() => setShowTitleScreen(false)}
      onSettings={() => setShowTitleScreen(false)}
    />
  );
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
  const [showTitleScreen, setShowTitleScreen] = useState(false);

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
                {showStudioScreen ? (
                  <StudioTitleScreen
                    onComplete={() => {
                      setShowStudioScreen(false);
                      setShowTitleScreen(true);
                    }}
                  />
                ) : showTitleScreen ? (
                  <TitleScreenWrapper setShowTitleScreen={setShowTitleScreen} />
                ) : (
                  <JokerProvider>
                    <GameProvider>
                      <InventoryProvider>
                        <CandySalesProvider>
                          <DailyStatsProvider>
                            <EventHandlerProvider>
                              <ScoreboardProvider>
                                <TabBarProvider>
                                <Stack>
                                  <Stack.Screen
                                    name="(tabs)"
                                    options={{ headerShown: false }}
                                  />
                                  <Stack.Screen
                                    name="title-screen"
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
                                    name="debug-jokers"
                                    options={{ headerShown: false }}
                                  />
                                </Stack>
                                </TabBarProvider>
                              </ScoreboardProvider>
                            </EventHandlerProvider>
                          </DailyStatsProvider>
                        </CandySalesProvider>
                      </InventoryProvider>
                    </GameProvider>
                  </JokerProvider>
                )}
              </WalletProvider>
            </FlavorTextProvider>
          </SeedProvider>
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
