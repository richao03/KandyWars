import { Tabs } from 'expo-router';
import React from 'react';
import { useSegments } from 'expo-router';

export default function TabLayout() {
  const segments = useSegments();
  const currentPage = segments[segments.length - 1];
  const isAfterSchool = currentPage === 'after-school' || currentPage === 'study' || currentPage === 'deli';
  
  return (
    <Tabs screenOptions={{
      headerShown: false, // Disable tab headers for consistent spacing
      tabBarStyle: {
        backgroundColor: isAfterSchool ? '#000000' : undefined,
      },
      tabBarLabelStyle: {
        color: isAfterSchool ? '#ffffff' : undefined,
      },
      tabBarIconStyle: {
        tintColor: isAfterSchool ? '#ffffff' : undefined,
      }
    }}>
      <Tabs.Screen name="market" options={{ unmountOnBlur: false }} />
      <Tabs.Screen name="study" options={{ 
        title: "Study", 
        href: null // Hide from tab bar
      }} />
      <Tabs.Screen name="after-school" options={{ 
        title: "After School", 
        href: null // Hide from tab bar
      }} />
      <Tabs.Screen name="deli" options={{ 
        title: "Deli", 
        href: null // Hide from tab bar
      }} />
      <Tabs.Screen name="upgrades" options={{ title: "Upgrades" }} />
      <Tabs.Screen name="price-history" options={{ title: "History" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
