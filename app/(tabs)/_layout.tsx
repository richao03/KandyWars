import { Tabs } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { FlavorTextProvider } from '../context/FlavorTextContext';
import { GameProvider } from '../context/GameContext';
import { InventoryProvider } from '../context/InventoryContext';
import { SeedProvider } from '../context/SeedContext';
import { WalletProvider } from '../context/WalletContext';
import { useGame } from '../context/GameContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function MarketScreenOptions() {
  const { day, period } = useGame();
  return {
    title: `Day ${day} - Period ${period}`,
    unmountOnBlur: false
  };
}

function TabsWithContext() {
  return (
    <Tabs screenOptions={{
      headerStyle: {
        height: 60, // Reduce header height
      },
      headerTitleStyle: {
        fontSize: 16,
      }
    }}>
      <Tabs.Screen name="market" options={MarketScreenOptions} />
      <Tabs.Screen name="study" options={{ 
        title: "Study", 
        href: null // Hide from tab bar
      }} />
      <Tabs.Screen name="upgrades" options={{ title: "Upgrades" }} />
      <Tabs.Screen name="price-history" options={{ title: "History" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

export default function TabLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'CrayonPastel': require('../../assets/fonts/CrayonPastel.otf'),
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SeedProvider>
        <FlavorTextProvider>
          <GameProvider>
            <InventoryProvider>
              <WalletProvider>
                <TabsWithContext />
              </WalletProvider>
            </InventoryProvider>
          </GameProvider>
        </FlavorTextProvider>
      </SeedProvider>
    </GestureHandlerRootView>
  );
}
