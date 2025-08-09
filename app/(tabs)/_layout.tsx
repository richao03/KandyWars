import { Tabs } from 'expo-router';
import React from 'react';
import { useSegments } from 'expo-router';
import { useGame } from '../context/GameContext';

function MarketScreenOptions() {
  const { day, period } = useGame();
  return {
    title: `Day ${day} - Period ${period}`,
    unmountOnBlur: false
  };
}

export default function TabLayout() {
  const segments = useSegments();
  const isAfterSchool = segments[segments.length - 1] === 'after-school';
  
  return (
    <Tabs screenOptions={{
      headerStyle: {
        height: 60, // Reduce header height
        backgroundColor: isAfterSchool ? '#000000' : undefined,
      },
      headerTitleStyle: {
        fontSize: 16,
        color: isAfterSchool ? '#ffffff' : undefined,
      },
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
      <Tabs.Screen name="market" options={MarketScreenOptions} />
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
