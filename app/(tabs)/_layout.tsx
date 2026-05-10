import { Tabs, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGame } from '../../src/hooks/useGame';
import { useTabBar } from '../../src/hooks/useTabBar';
import { SoundEffects } from '../../src/utils/soundEffects';
import GameHUD from '../components/GameHUD';
import TutorialOverlay from '../components/TutorialOverlay';
import {
  advanceTutorial,
  selectTutorialStep,
  skipTutorial,
} from '../../src/store/slices/tutorialSlice';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';

// AdBanner is rendered globally in the root layout (app/_layout.tsx) so it
// shows on every screen except the title-screen flow.

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
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const tutorialStep = useAppSelector(selectTutorialStep);

  // Auto-advance step 8 → 9 when the player reaches the Jokers tab,
  // and step 10 → 11 when the player reaches the Home tab.
  useEffect(() => {
    if (tutorialStep === 8 && pathname === '/jokers') {
      dispatch(advanceTutorial());
    } else if (tutorialStep === 10 && pathname === '/home') {
      dispatch(advanceTutorial());
    }
  }, [tutorialStep, pathname, dispatch]);

  // Measure the Jokers tab button at its real on-screen position so the tutorial
  // spotlight lines up regardless of device size, safe-area inset, or how the
  // tab bar handles `paddingBottom`. measureInWindow returns coordinates in the
  // device window, but the overlay's absoluteFill is relative to the layout root
  // View (which may be offset by the status bar / nav header). So we also
  // measure the layout root's window offset and subtract it.
  const layoutRootRef = useRef<View>(null);
  const jokersTabRef = useRef<View>(null);
  const homeTabRef = useRef<View>(null);
  const layoutOffsetRef = useRef({ x: 0, y: 0 });
  const jokersTabWindowRectRef = useRef<
    { x: number; y: number; width: number; height: number } | undefined
  >(undefined);
  const homeTabWindowRectRef = useRef<
    { x: number; y: number; width: number; height: number } | undefined
  >(undefined);
  const [jokersTabRect, setJokersTabRect] = useState<
    { x: number; y: number; width: number; height: number } | undefined
  >(undefined);
  const [homeTabRect, setHomeTabRect] = useState<
    { x: number; y: number; width: number; height: number } | undefined
  >(undefined);

  const applyOffset = useCallback(
    (
      win: { x: number; y: number; width: number; height: number } | undefined,
      setter: React.Dispatch<
        React.SetStateAction<
          { x: number; y: number; width: number; height: number } | undefined
        >
      >
    ) => {
      if (!win) return;
      const offset = layoutOffsetRef.current;
      const next = {
        x: win.x - offset.x,
        y: win.y - offset.y,
        width: win.width,
        height: win.height,
      };
      setter((prev) => {
        if (
          prev &&
          prev.x === next.x &&
          prev.y === next.y &&
          prev.width === next.width &&
          prev.height === next.height
        ) {
          return prev;
        }
        return next;
      });
    },
    []
  );

  const recomputeJokersTabRect = useCallback(() => {
    applyOffset(jokersTabWindowRectRef.current, setJokersTabRect);
  }, [applyOffset]);

  const recomputeHomeTabRect = useCallback(() => {
    applyOffset(homeTabWindowRectRef.current, setHomeTabRect);
  }, [applyOffset]);

  const measureLayoutRoot = useCallback(() => {
    if (!layoutRootRef.current) return;
    requestAnimationFrame(() => {
      layoutRootRef.current?.measureInWindow((x, y) => {
        layoutOffsetRef.current = { x, y };
        recomputeJokersTabRect();
        recomputeHomeTabRect();
      });
    });
  }, [recomputeJokersTabRect, recomputeHomeTabRect]);

  const measureJokersTab = useCallback(() => {
    if (!jokersTabRef.current) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        jokersTabRef.current?.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            jokersTabWindowRectRef.current = { x, y, width, height };
            recomputeJokersTabRect();
          }
        });
      });
    });
  }, [recomputeJokersTabRect]);

  const measureHomeTab = useCallback(() => {
    if (!homeTabRef.current) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        homeTabRef.current?.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            homeTabWindowRectRef.current = { x, y, width, height };
            recomputeHomeTabRect();
          }
        });
      });
    });
  }, [recomputeHomeTabRect]);

  // Re-measure when the tutorial reaches a step that needs a tab-bar spotlight.
  // Step 9's "All" tab spotlight lives inside the jokers screen; step 11 is a
  // centered modal that doesn't need a measurement.
  useEffect(() => {
    if (tutorialStep === 8) {
      measureLayoutRoot();
      measureJokersTab();
    } else if (tutorialStep === 10) {
      measureLayoutRoot();
      measureHomeTab();
    }
  }, [tutorialStep, measureLayoutRoot, measureJokersTab, measureHomeTab]);

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
            height: 49,
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
    <View
      ref={layoutRootRef}
      onLayout={measureLayoutRoot}
      collapsable={false}
      style={{ flex: 1, backgroundColor: layoutBgColor }}
    >
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
            tabBarButton: (props: any) => (
              <View
                ref={homeTabRef}
                onLayout={measureHomeTab}
                collapsable={false}
                style={{ flex: 1 }}
              >
                <AnimatedTabButton {...props} />
              </View>
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
            tabBarButton: (props: any) => (
              <View
                ref={jokersTabRef}
                onLayout={measureJokersTab}
                collapsable={false}
                style={{ flex: 1 }}
              >
                <AnimatedTabButton {...props} />
              </View>
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

      {/* Tutorial overlay for steps 8 (Jokers tab spotlight), 10 (Home tab
          spotlight), and 11 (congrats). Step 9 (All-tab spotlight) is rendered
          inside jokers.tsx where the tab lives. Rendered at the layout level
          so it persists across tab switches. */}
      {(tutorialStep === 8 ||
        tutorialStep === 10 ||
        tutorialStep === 11) && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <TutorialOverlay
            tutorialStep={tutorialStep}
            measurements={{ jokersTab: jokersTabRect, homeTab: homeTabRect }}
            onAdvance={() => dispatch(advanceTutorial())}
            onSkip={() => dispatch(skipTutorial())}
          />
        </View>
      )}
    </View>
  );
}

