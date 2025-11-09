import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useAdVisibility } from '../../src/hooks/useAdVisibility';

/**
 * AdBanner Component
 *
 * Displays a standard 320x50 banner ad using Google AdMob.
 * Optimized for performance with dedicated ad units for each platform.
 *
 * SETUP INSTRUCTIONS FOR PRODUCTION:
 * ===================================
 * 1. Go to https://admob.google.com and sign in
 * 2. Select your app (or create one if needed)
 * 3. Navigate to "Ad units" section
 * 4. Click "Add ad unit" → Select "Banner"
 * 5. Configure the banner:
 *    - Name: "Standard Banner 320x50 iOS" (or Android)
 *    - Ad type: Banner
 *    - Size: Standard (320x50)
 * 6. Copy the Ad Unit ID (format: ca-app-pub-XXXXX/YYYYY)
 * 7. Replace the placeholders below with your actual Ad Unit IDs
 *
 * NOTE: Create SEPARATE ad units for iOS and Android for better
 * optimization and analytics tracking.
 */

/**
 * Dedicated Ad Unit Configuration
 * Using standard 320x50 banner size for optimal performance
 */
const AD_UNITS = {
  STANDARD_BANNER: {
    ios: __DEV__
      ? TestIds.BANNER
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/STANDARD-IOS-320x50', // Replace with your iOS ad unit ID
    android: __DEV__
      ? TestIds.BANNER
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/STANDARD-ANDROID-320x50', // Replace with your Android ad unit ID
  },
};

// Select the appropriate ad unit based on platform
const AD_UNIT_ID = Platform.select({
  ios: AD_UNITS.STANDARD_BANNER.ios,
  android: AD_UNITS.STANDARD_BANNER.android,
}) || TestIds.BANNER;

interface AdBannerProps {
  /**
   * Whether to show the ad banner
   * Set to false to hide ads (e.g., for premium users)
   * NOTE: This still keeps the ad mounted for performance
   */
  visible?: boolean;
}

function AdBanner({ visible = true }: AdBannerProps) {
  const { shouldShowAd } = useAdVisibility();

  // Combine manual visibility prop with route-based visibility
  const isVisible = visible && shouldShowAd;

  /**
   * PERFORMANCE OPTIMIZATION: Hide instead of destroy
   *
   * Instead of returning null (which destroys the component), we hide it using
   * display: 'none' and opacity: 0. This prevents expensive unmount/remount cycles
   * and keeps the ad loaded in memory for instant show/hide.
   *
   * Benefits:
   * - Faster screen transitions (no ad recreation)
   * - Reduced memory allocation/deallocation
   * - Smoother user experience
   * - Maintains ad state and reduces ad request frequency
   */

  return (
    <View
      style={[
        styles.container,
        !isVisible && styles.hidden, // Hide instead of destroying
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'} // Disable touch when hidden
    >
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.BANNER} // Standard 320x50 banner (optimized for dedicated ad unit)
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // For GDPR compliance
        }}
        onAdLoaded={() => {
          if (__DEV__) console.log('📱 Ad loaded successfully');
        }}
        onAdFailedToLoad={(error) => {
          if (__DEV__) console.log('📱 Ad failed to load:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: {
    display: 'none', // Hide from layout
    opacity: 0, // Make invisible (backup)
    height: 0, // Collapse height
    overflow: 'hidden', // Hide any overflow
  },
});

// Memoize component to prevent unnecessary re-renders
// Only re-render if visibility prop changes
export default React.memo(AdBanner, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible;
});
