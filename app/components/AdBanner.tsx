import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

/**
 * AdBanner Component
 *
 * Displays a banner ad at the bottom of the screen using Google AdMob.
 *
 * IMPORTANT: Before publishing to production:
 * 1. Create an AdMob account at https://admob.google.com
 * 2. Create an app and get your real Ad Unit IDs
 * 3. Replace the TEST IDs below with your production IDs
 */

// Test Ad Unit IDs (use these during development)
const AD_UNIT_ID = __DEV__
  ? TestIds.BANNER // Test ads during development
  : Platform.select({
      // Replace these with your real AdMob Ad Unit IDs for production
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    }) || TestIds.BANNER;

interface AdBannerProps {
  /**
   * Whether to show the ad banner
   * Set to false to hide ads (e.g., for premium users)
   */
  visible?: boolean;
}

export default function AdBanner({ visible = true }: AdBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // For GDPR compliance
        }}
        onAdLoaded={() => {
          console.log('📱 Ad loaded successfully');
        }}
        onAdFailedToLoad={(error) => {
          console.log('📱 Ad failed to load:', error);
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
});
