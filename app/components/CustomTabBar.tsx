import { router, usePathname } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CustomTabBar() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Market',
      route: '/market',
      icon: require('../../assets/images/emojis/home.png'),
    },
    {
      name: 'Jokers',
      route: '/(tabs)/jokers',
      icon: require('../../assets/images/emojis/joker.png'),
    },
    {
      name: 'History',
      route: '/(tabs)/price-history',
      icon: require('../../assets/images/emojis/chart.png'),
    },
    {
      name: 'Settings',
      route: '/(tabs)/settings',
      icon: require('../../assets/images/emojis/gear.png'),
    },
  ];

  const handleTabPress = (route: string) => {
    if (route.startsWith('/(tabs)/')) {
      // Navigate to actual tab screens
      router.push(route);
    } else {
      // For market, just navigate (already on it, will do nothing)
      router.replace(route);
    }
  };

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route ||
          (tab.route === '/market' && pathname === '/market');

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab.route)}
            activeOpacity={0.7}
          >
            <Image
              source={tab.icon}
              style={[
                styles.tabIcon,
                isActive && styles.tabIconActive,
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 49,
    paddingBottom: 0,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    width: 24,
    height: 24,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'PixeloidMono',
    color: '#999999',
  },
  tabLabelActive: {
    color: '#000000',
  },
});
