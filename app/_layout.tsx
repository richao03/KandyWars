import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { DailyStatsProvider } from './context/DailyStatsContext';
import { FlavorTextProvider } from './context/FlavorTextContext';
import { GameProvider } from './context/GameContext';
import { InventoryProvider } from './context/InventoryContext';
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
          <GameProvider>
            <InventoryProvider>
              <WalletProvider>
                <DailyStatsProvider>
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
                  </Stack>
                </DailyStatsProvider>
              </WalletProvider>
            </InventoryProvider>
          </GameProvider>
        </FlavorTextProvider>
          </SeedProvider>
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}