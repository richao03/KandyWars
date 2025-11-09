import React, { createContext, useCallback, useMemo, useState, useRef } from 'react';

/**
 * Ad Visibility Context
 *
 * Manages ad visibility across the app to enable hiding ads on specific screens
 * without destroying the ad component (performance optimization).
 *
 * Screens where ads are HIDDEN (not destroyed):
 * - Minigame screens (better performance during gameplay)
 * - Title/story screens (cleaner UX before main game)
 *
 * Screens where ads are VISIBLE:
 * - All tab screens (home, jokers, price-history, settings, market, after-school)
 * - Modal screens (ads in background but visible when modal closes)
 */

interface AdVisibilityContextType {
  shouldShowAd: boolean;
  setCurrentRoute: (route: string) => void;
  currentRoute: string;
}

export const AdVisibilityContext = createContext<AdVisibilityContextType>({
  shouldShowAd: true,
  setCurrentRoute: () => {},
  currentRoute: '',
});

interface AdVisibilityProviderProps {
  children: React.ReactNode;
}

/**
 * Routes where ads should be HIDDEN
 */
const HIDDEN_AD_ROUTES = [
  // Minigame screens
  'computer-game',
  'economy-game',
  'history-game',
  'home-ec-game',
  'logic-game',
  'math-game',
  'art-game',
  'recess-game',
  'geography-game',
  // Title/story screens
  'title-screen',
  'story-screen',
  'index', // Title screen route
  'title-settings', // Title screen settings
];

export function AdVisibilityProvider({ children }: AdVisibilityProviderProps) {
  const [currentRoute, setCurrentRouteState] = useState<string>('');
  const previousShouldShowRef = useRef<boolean>(true);

  const setCurrentRoute = useCallback((route: string) => {
    setCurrentRouteState((prevRoute) => {
      // Only update if route actually changed
      if (prevRoute === route) return prevRoute;

      if (__DEV__) {
        console.log('📱 Ad visibility - Route changed to:', route);
      }
      return route;
    });
  }, []);

  const shouldShowAd = useMemo(() => {
    // Hide ads on specified routes
    const shouldHide = HIDDEN_AD_ROUTES.some((hiddenRoute) =>
      currentRoute.includes(hiddenRoute)
    );

    const newShouldShow = !shouldHide;

    // Only log when visibility actually changes
    if (__DEV__ && previousShouldShowRef.current !== newShouldShow) {
      console.log(
        `📱 Ad visibility changed - Route: ${currentRoute}, Show ad: ${newShouldShow}`
      );
      previousShouldShowRef.current = newShouldShow;
    }

    return newShouldShow;
  }, [currentRoute]);

  const value = useMemo(
    () => ({
      shouldShowAd,
      setCurrentRoute,
      currentRoute,
    }),
    [shouldShowAd, setCurrentRoute, currentRoute]
  );

  return (
    <AdVisibilityContext.Provider value={value}>
      {children}
    </AdVisibilityContext.Provider>
  );
}
