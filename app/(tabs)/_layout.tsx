import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'react-native';
import { useGame } from '../../src/hooks/useGame';
import { useTabBar } from '../../src/hooks/useTabBar';

export default function TabLayout() {
  const gameContext = useGame();
  const tabBarContext = useTabBar();

  const isAfterSchool = gameContext?.isAfterSchool || false;
  const isTabBarVisible = tabBarContext?.isTabBarVisible || false;

  // Memoize screen options to prevent recreation on every render
  const screenOptions = React.useMemo(
    () => ({
      headerShown: false, // Disable tab headers for consistent spacing
      animation: 'none', // Disable animations for instant switching
      tabBarStyle: isTabBarVisible
        ? {
            backgroundColor: isAfterSchool ? '#000000' : undefined,
            height: 49, // Standard iOS tab bar height
            paddingBottom: 0,
          }
        : {
            display: 'none',
          },
      tabBarLabelStyle: {
        color: isAfterSchool ? '#ffffff' : undefined,
        fontFamily: 'PixeloidMono',
      },
      tabBarIconStyle: {
        tintColor: isAfterSchool ? '#ffffff' : undefined,
      },
    }),
    [isAfterSchool, isTabBarVisible]
  );

  return (
      <Tabs screenOptions={screenOptions} initialRouteName="market">
        {/* Main visible tabs */}
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Image
                source={require('../../assets/images/emojis/home.png')}
                style={{
                  width: size || 24,
                  height: size || 24,
                }}
                resizeMode="contain"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="jokers"
          options={{
            title: 'Jokers',
            tabBarIcon: ({ color, size }) => {
              return (
                <Image
                  source={require('../../assets/images/emojis/joker.png')}
                  style={{
                    width: size || 24,
                    height: size || 24,
                  }}
                  resizeMode="contain"
                />
              );
            },
          }}
        />
        <Tabs.Screen
          name="price-history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => (
              <Image
                source={require('../../assets/images/emojis/chart.png')}
                style={{
                  width: size || 24,
                  height: size || 24,
                }}
                resizeMode="contain"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Image
                source={require('../../assets/images/emojis/gear.png')}
                style={{
                  width: size || 24,
                  height: size || 24,
                }}
                resizeMode="contain"
              />
            ),
          }}
        />

        {/* Hidden tabs but accessible via navigation */}
        <Tabs.Screen
          name="market"
          options={{
            href: null, // Hide from tab bar but keep accessible
          }}
        />
        <Tabs.Screen
          name="after-school"
          options={{
            title: 'After School',
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="upgrades"
          options={{
            title: 'Upgrades',
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
  );
}
