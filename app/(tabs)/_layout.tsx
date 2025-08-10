import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useGame } from '../context/GameContext';

export default function TabLayout() {
  const { isAfterSchool } = useGame();
  
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
    </Tabs>
  );
}
