import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import EventModal from './components/EventModal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { CandySalesProvider } from '../src/context/CandySalesContext';
import { DailyStatsProvider } from '../src/context/DailyStatsContext';
import { EventHandlerProvider } from '../src/context/EventHandlerContext';
import { FlavorTextProvider } from '../src/context/FlavorTextContext';
import { GameProvider } from '../src/context/GameContext';
import { InventoryProvider } from '../src/context/InventoryContext';
import { JokerProvider } from '../src/context/JokerContext';
import { SeedProvider } from '../src/context/SeedContext';
import { WalletProvider } from '../src/context/WalletContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'CrayonPastel': require('../assets/fonts/CrayonPastel.otf'),
  });

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
          <JokerProvider>
            <GameProvider>
              <InventoryProvider>
                <WalletProvider>
                  <CandySalesProvider>
                    <DailyStatsProvider>
                      <EventHandlerProvider>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
                      name="gym-game" 
                      options={{ headerShown: false }} 
                    />
                    <Stack.Screen 
                      name="debug-jokers" 
                      options={{ headerShown: false }} 
                    />
                  </Stack>
                      </EventHandlerProvider>
                    </DailyStatsProvider>
                  </CandySalesProvider>
                </WalletProvider>
              </InventoryProvider>
            </GameProvider>
          </JokerProvider>
        </FlavorTextProvider>
          </SeedProvider>
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}