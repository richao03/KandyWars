import Constants from 'expo-constants';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useAdVisibility } from '../../src/hooks/useAdVisibility';

// Dynamically import AdMob types only when available
let BannerAd: any;
let BannerAdSize: any;
let TestIds: any;

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    const adMobModule = require('react-native-google-mobile-ads');
    BannerAd = adMobModule.BannerAd;
    BannerAdSize = adMobModule.BannerAdSize;
    TestIds = adMobModule.TestIds;
  } catch (error) {
    console.warn('Google Mobile Ads not available');
  }
}

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
const TEST_AD_UNIT = 'ca-app-pub-3940256099942544/6300978111'; // Google's test banner ad unit

const AD_UNITS = {
  STANDARD_BANNER: {
    ios: __DEV__
      ? TestIds?.BANNER || TEST_AD_UNIT
      : 'ca-app-pub-1627354972629832~6967053316', // Replace with your iOS ad unit ID
    android: __DEV__
      ? TestIds?.BANNER || TEST_AD_UNIT
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/STANDARD-ANDROID-320x50', // Replace with your Android ad unit ID
  },
};

// Select the appropriate ad unit based on platform
const AD_UNIT_ID =
  Platform.select({
    ios: AD_UNITS.STANDARD_BANNER.ios,
    android: AD_UNITS.STANDARD_BANNER.android,
  }) || TEST_AD_UNIT;

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

  // Return placeholder in Expo Go
  if (isExpoGo) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        {__DEV__ && (
          <Text style={styles.placeholderText}>Ad Banner (Expo Go)</Text>
        )}
      </View>
    );
  }

  // Return null if AdMob module not available
  if (!BannerAd) {
    return null;
  }

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
  placeholder: {
    height: 50,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

// Memoize component to prevent unnecessary re-renders
// Only re-render if visibility prop changes
export default React.memo(AdBanner, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible;
});
