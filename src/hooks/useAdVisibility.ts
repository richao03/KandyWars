import { useContext } from 'react';
import { AdVisibilityContext } from '../context/AdVisibilityContext';

/**
 * Hook to access ad visibility state
 *
 * @returns {object} Ad visibility state
 * @property {boolean} shouldShowAd - Whether ads should be visible on current screen
 * @property {function} setCurrentRoute - Update the current route for ad visibility logic
 * @property {string} currentRoute - Current route name
 *
 * @example
 * ```tsx
 * const { shouldShowAd, setCurrentRoute } = useAdVisibility();
 *
 * // In a screen component
 * useEffect(() => {
 *   setCurrentRoute('market');
 * }, []);
 *
 * // In AdBanner component
 * <View style={{ display: shouldShowAd ? 'flex' : 'none' }}>
 *   <BannerAd ... />
 * </View>
 * ```
 */
export function useAdVisibility() {
  const context = useContext(AdVisibilityContext);

  if (!context) {
    throw new Error('useAdVisibility must be used within AdVisibilityProvider');
  }

  return context;
}
