import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useGame } from '../../src/context/GameContext';
import { useTabBar } from '../../src/context/TabBarContext';

export default function TabLayout() {
  const gameContext = useGame();
  const tabBarContext = useTabBar();
  
  const isAfterSchool = gameContext?.isAfterSchool || false;
  const isTabBarVisible = tabBarContext?.isTabBarVisible || false;
  
  // Memoize screen options to prevent recreation on every render
  const screenOptions = React.useMemo(() => ({
    headerShown: false, // Disable tab headers for consistent spacing
    tabBarStyle: isTabBarVisible ? {
      backgroundColor: isAfterSchool ? '#000000' : undefined,
      height: 49, // Standard iOS tab bar height
      paddingBottom: 0,
    } : {
      display: 'none'
    },
    tabBarLabelStyle: {
      color: isAfterSchool ? '#ffffff' : undefined,
    },
    tabBarIconStyle: {
      tintColor: isAfterSchool ? '#ffffff' : undefined,
    }
  }), [isAfterSchool, isTabBarVisible]);
  
  return (
    <Tabs screenOptions={screenOptions}>
      {/* Main visible tabs */}
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🏠</Text>
          )
        }} 
      />
      <Tabs.Screen 
        name="jokers" 
        options={{ 
          title: "Jokers",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🃏</Text>
          )
        }} 
      />
      <Tabs.Screen 
        name="price-history" 
        options={{ 
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📊</Text>
          )
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>⚙️</Text>
          )
        }} 
      />
      
      {/* Hidden tabs - not shown in tab bar */}
      <Tabs.Screen name="market" options={{ 
        href: null // Hide from tab bar but keep accessible
      }} />
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
      <Tabs.Screen name="piggy-bank" options={{ 
        title: "Piggy Bank", 
        href: null // Hide from tab bar
      }} />
      <Tabs.Screen name="upgrades" options={{ 
        title: "Upgrades", 
        href: null // Hide from tab bar
      }} />
    </Tabs>
  );
}
