import { Tabs, usePathname } from 'expo-router';
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, InteractionManager, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGame } from '../../src/hooks/useGame';
import { useTabBar } from '../../src/hooks/useTabBar';
import { SoundEffects } from '../../src/utils/soundEffects';
import GameHUD from '../components/GameHUD';

// Lazy load AdBanner for better initial render performance
const AdBanner = lazy(() => import('../components/AdBanner'));

// Animated tab button component
const AnimatedTabButton = (props: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = (e: any) => {
    // Play sound and haptic feedback
    SoundEffects.playRandomPop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate scale: grow to 1.3x then back to 1x
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Call original press handler
    props.onPress?.(e);
  };

  return (
    <Pressable {...props} onPress={handlePress}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {props.children}
      </Animated.View>
    </Pressable>
  );
};

export default function TabLayout() {
  const gameContext = useGame();
  const tabBarContext = useTabBar();
  const [shouldRenderAd, setShouldRenderAd] = useState(false);
  const pathname = usePathname();

  const isAfterSchool = gameContext?.isAfterSchool || false;
  const isTabBarVisible = tabBarContext?.isTabBarVisible || false;
  const day = gameContext?.day || 1;
  const showLunchMinigames = gameContext?.showLunchMinigames || false;

  // Determine GameHUD visibility and config based on current route
  const gameHUDConfig = useMemo(() => {
    // Don't show GameHUD on market or after-school (they have their own HUD)
    const shouldShow = pathname !== '/market' && pathname !== '/after-school';

    // Map routes to their GameHUD configurations (using actual pathname format)
    const routeConfig: Record<
      string,
      { header: string; location: string; bgColor: string; theme: 'school' | 'evening' }
    > = {
      '/jokers': { header: 'JOKERS', location: 'Collection', bgColor: '#00512C', theme: 'evening' },
      '/price-history': { header: 'Price History', location: 'History', bgColor: '#1a1a1a', theme: 'evening' },
      '/settings': { header: 'Game Settings', location: 'Office', bgColor: '#fef7e7', theme: 'school' },
      '/home': { header: 'Home', location: 'Home', bgColor: '#00512C', theme: 'evening' },
    };

    const config = routeConfig[pathname];

    return {
      visible: shouldShow && config !== undefined,
      customHeaderText: config?.header || 'Home',
      customLocationText: config?.location || 'Home',
      bgColor: config?.bgColor || '#000000',
      theme: (config?.theme || 'evening') as 'school' | 'evening',
    };
  }, [pathname]);

  // Set layout background to match current tab so GameHUD's semi-transparent overlay shows correctly
  const layoutBgColor = gameHUDConfig.bgColor;

  // Defer ad rendering until after initial UI is interactive
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      // Wait for UI to settle before rendering ad
      setShouldRenderAd(true);
    });

    return () => task.cancel();
  }, []);

  // Memoize screen options to prevent recreation on every render
  const screenOptions = React.useMemo(
    () => ({
      headerShown: false, // Disable tab headers for consistent spacing
      animation: 'none', // Disable animations for instant switching
      lazy: true, // Only mount screens when they're focused for the first time
      unmountOnBlur: false, // Keep screens mounted for better performance and state preservation
      tabBarStyle: isTabBarVisible
        ? {
            backgroundColor: '#000000',
            height: 49, // Standard iOS tab bar height
            paddingBottom: 0,
          }
        : {
            display: 'none',
          },
      tabBarLabelStyle: {
        color: '#fafafa',
        fontFamily: 'PixeloidMono',
      },
      tabBarIconStyle: {
        tintColor: isAfterSchool ? '#ffffff' : undefined,
      },
      tabBarButton: (props: any) => <AnimatedTabButton {...props} />,
    }),
    [isAfterSchool, isTabBarVisible]
  );

  return (
    <View style={{ flex: 1, backgroundColor: layoutBgColor }}>
      {/* Ad Banner at the top - lazy loaded and deferred for performance */}
      {shouldRenderAd && (
        <Suspense
          fallback={<View style={{ height: 50, backgroundColor: '#000' }} />}
        >
          <AdBanner />
        </Suspense>
      )}
      {/* Shared GameHUD - stays mounted across tab switches for smooth marquee */}
      <View style={{ opacity: gameHUDConfig.visible ? 1 : 0, height: gameHUDConfig.visible ? undefined : 0, overflow: 'hidden' }}>
        <GameHUD
          theme={gameHUDConfig.theme}
          customHeaderText={gameHUDConfig.customHeaderText}
          customLocationText={gameHUDConfig.customLocationText}
          showLunchMinigames={showLunchMinigames}
        />
      </View>
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
            tabBarIcon: ({ color, size }) => (
              <Image
                source={require('../../assets/images/emojis/joker.png')}
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
      </Tabs>
    </View>
  );
}
