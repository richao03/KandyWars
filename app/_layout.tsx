import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import EventModal from './components/EventModal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { DailyStatsProvider } from './context/DailyStatsContext';
import { EventHandlerProvider } from './context/EventHandlerContext';
import { FlavorTextProvider } from './context/FlavorTextContext';
import { GameProvider } from './context/GameContext';
import { InventoryProvider } from './context/InventoryContext';
import { JokerProvider } from './context/JokerContext';
import { SeedProvider } from './context/SeedContext';
import { WalletProvider } from './context/WalletContext';

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