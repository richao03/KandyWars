import { Tabs } from 'expo-router';
import { FlavorTextProvider } from '../context/FlavorTextContext';
import { GameProvider } from '../context/GameContext';
import { InventoryProvider } from '../context/InventoryContext';
import { SeedProvider } from '../context/SeedContext';
import { WalletProvider } from '../context/WalletContext';

export default function TabLayout() {
  return (
    <SeedProvider>
      <FlavorTextProvider>
        <GameProvider>
          <InventoryProvider>
            <WalletProvider>

              <Tabs>
                <Tabs.Screen name="market" options={{ title: "Market" }} />
                <Tabs.Screen name="upgrades" options={{ title: "Upgrades" }} />
                <Tabs.Screen name="price-history" options={{ title: "History" }} />
                <Tabs.Screen name="settings" options={{ title: "Settings" }} />
              </Tabs>

            </WalletProvider>
          </InventoryProvider>
        </GameProvider>
      </FlavorTextProvider>
    </SeedProvider>
  );
}
