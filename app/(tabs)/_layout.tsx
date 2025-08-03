import { Tabs } from 'expo-router';
import { SeedProvider } from '../context/SeedContext';
import { WalletProvider } from '../context/WalletContext';

export default function TabLayout() {
  return (
    <WalletProvider>
      <SeedProvider>
        <Tabs>
          <Tabs.Screen name="market" options={{ title: "Market" }} />
          <Tabs.Screen name="upgrades" options={{ title: "Upgrades" }} />
          <Tabs.Screen name="price-history" options={{ title: "History" }} />
          <Tabs.Screen name="settings" options={{ title: "Settings" }} />
        </Tabs>
      </SeedProvider>
    </WalletProvider>
  );
}
