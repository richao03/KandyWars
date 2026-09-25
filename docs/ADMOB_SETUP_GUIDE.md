# AdMob Setup Guide for Production

This guide walks you through setting up AdMob for your Sugar Wars game and configuring production ad units.

This app uses **`react-native-google-mobile-ads`** (v16) integrated via its Expo config plugin in `app.json`.

## Prerequisites

- AdMob account (create one at https://admob.google.com if you don't have one)
- Your app published or registered in Google Play Store and/or Apple App Store
- Basic understanding of your app's package name (Android) and bundle ID (iOS)

## Step 1: Create AdMob Account & App

1. Go to https://admob.google.com and sign in with your Google account
2. Click **"Apps"** in the sidebar
3. Click **"Add App"** button
4. Select your platform (iOS or Android) - you'll need to do this twice, once for each platform
5. If your app is already published:
   - Select "Yes" and search for your app
6. If your app is not published yet:
   - Select "No"
   - Enter app name: **Sugar Wars**
   - Select platform: **iOS** or **Android**
   - Click **"Add"**

## Step 2: Get Your App IDs

After creating your apps, you'll get App IDs for each platform:

### iOS App ID
Format: `ca-app-pub-1234567890123456~1234567890`

### Android App ID
Format: `ca-app-pub-1234567890123456~0987654321`

**Update `app.json`:** the `react-native-google-mobile-ads` config plugin is already added to the `plugins` array. Replace the App IDs with your own:
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXX~XXXXX", // Replace with your Android App ID
          "iosAppId": "ca-app-pub-XXXXX~XXXXX"      // Replace with your iOS App ID
        }
      ]
    ]
  }
}
```

> **Note:** The `androidAppId` currently committed in `app.json` is still Google's sample/test App ID (`ca-app-pub-3940256099942544~3347511713`). The `iosAppId` is set to a real App ID. Be sure to replace the Android value before shipping production ads.
>
> The iOS native `GADApplicationIdentifier` in `ios/SugarWars/Info.plist` must match the `iosAppId`. It is currently set to Google's test App ID (`ca-app-pub-3940256099942544~1458002511`) and should be regenerated (re-run `npx expo prebuild`) so it matches your production iOS App ID.

## Step 3: Create Standard Banner Ad Units (320x50)

You need to create **dedicated ad units** for the standard 320x50 banner on each platform.

### For iOS:

1. In AdMob console, select your **iOS app**
2. Click **"Ad units"** tab
3. Click **"Add ad unit"** → Select **"Banner"**
4. Configure:
   - **Ad unit name**: `Standard Banner 320x50 iOS`
   - **Ad type**: Banner
   - **Banner size**: Standard (320x50)
5. Click **"Create ad unit"**
6. **Copy the Ad Unit ID** (format: `ca-app-pub-XXXXX/YYYYY`)

### For Android:

1. In AdMob console, select your **Android app**
2. Click **"Ad units"** tab
3. Click **"Add ad unit"** → Select **"Banner"**
4. Configure:
   - **Ad unit name**: `Standard Banner 320x50 Android`
   - **Ad type**: Banner
   - **Banner size**: Standard (320x50)
5. Click **"Create ad unit"**
6. **Copy the Ad Unit ID** (format: `ca-app-pub-XXXXX/YYYYY`)

## Step 4: Update Your Code with Production Ad Unit IDs

Open `app/components/AdBanner.tsx` and update the ad unit configuration. In development (`__DEV__`) it falls back to the test banner unit (`TestIds.BANNER`, or `TEST_AD_UNIT` if the module isn't available); in production it uses the IDs you paste in:

```typescript
const TEST_AD_UNIT = 'ca-app-pub-3940256099942544/6300978111'; // Google's test banner ad unit

const AD_UNITS = {
  STANDARD_BANNER: {
    ios: __DEV__
      ? TestIds?.BANNER || TEST_AD_UNIT
      : 'ca-app-pub-1627354972629832/2334523799', // ← Your iOS banner ad unit ID
    android: __DEV__
      ? TestIds?.BANNER || TEST_AD_UNIT
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/STANDARD-ANDROID-320x50', // ← Paste your Android banner ad unit ID here
  },
};
```

> **Note:** The iOS production banner ad unit ID is already filled in. The Android production ID is still a placeholder (`ca-app-pub-XXXXXXXXXXXXXXXX/STANDARD-ANDROID-320x50`) and must be replaced before shipping.

## Step 5: Configure Privacy & Compliance

### GDPR Compliance (European Users)

The app currently uses **non-personalized ads** by default for GDPR compliance:

```typescript
requestOptions={{
  requestNonPersonalizedAdsOnly: true,
}}
```

If you want to show personalized ads (higher revenue) to users who consent, you'll need to implement a consent management platform (CMP):

1. Install Google's User Messaging Platform (UMP) SDK
2. Show consent form on first app launch
3. Update `requestNonPersonalizedAdsOnly` based on user consent

### iOS Privacy Manifest

The app includes `ios/SugarWars/PrivacyInfo.xcprivacy`. It currently declares only required-reason API usage (UserDefaults, system boot time, file timestamp, disk space), with `NSPrivacyTracking` set to `false` and an empty `NSPrivacyCollectedDataTypes` array.

If you serve ads that collect the advertising identifier (IDFA) or use tracking, update this manifest before submitting to the App Store:
- Add the relevant `NSPrivacyCollectedDataTypes` entries (e.g. Device ID / advertising data)
- Set `NSPrivacyTracking` appropriately and add `NSPrivacyTrackingDomains` if needed

> **Note:** No `SKAdNetwork` identifiers are currently declared in `Info.plist`. The Google Mobile Ads SDK pod ships its own privacy manifest, but if Apple flags missing SKAdNetwork entries for attribution, add a `SKAdNetworkItems` array to `Info.plist`.

### Android Privacy

No additional configuration needed beyond what's in the app.

## Step 6: Testing Before Production

### Test with Test Ads First

Your app is configured to use **test ads** in development mode (`__DEV__ = true`). Always test with test ads before using real ad units to avoid:
- Invalid traffic detection
- Account suspension
- Skewed analytics

### Enable Test Ads on Physical Device

To test on a physical device with test ads:

1. Get your device's advertising ID:
   - iOS: Settings → Privacy → Advertising → Copy IDFA
   - Android: Settings → Google → Ads → Copy advertising ID

2. Register the device once at app startup (before requesting ads), e.g. in `app/_layout.tsx`:
```typescript
import mobileAds, { MobileAds } from 'react-native-google-mobile-ads';

MobileAds().setRequestConfiguration({
  testDeviceIdentifiers: ['YOUR_DEVICE_ID'], // Your test device(s)
});
```

> **Note:** In `react-native-google-mobile-ads` v16, test devices are configured globally via `setRequestConfiguration({ testDeviceIdentifiers })` — there is no `testDevices` field on the `<BannerAd>` `requestOptions` prop.

## Step 7: Build & Deploy

### iOS Build:

```bash
npx expo run:ios --configuration Release
```

### Android Build:

```bash
npx expo run:android --variant release
```

### Verify Production Ads:

1. Build in **release mode** (not debug)
2. Launch app on real device
3. Navigate to main tab screens
4. Verify banner ad appears at top
5. Check AdMob console after 24 hours for impressions

## Expected Ad Behavior

Visibility is controlled by `HIDDEN_AD_ROUTES` in `src/context/AdVisibilityContext.tsx`. Any route whose name *contains* one of those entries hides the banner; every other route shows it.

### Ads HIDDEN on these screens (for cleaner UX):
- ❌ Title screen (`title-screen`)
- ❌ Index / landing route (`index`)
- ❌ Title-screen settings (`title-settings`)

### Ads VISIBLE everywhere else, including:
- ✅ Home / market tab
- ✅ Jokers tab
- ✅ Price History tab
- ✅ Settings tab
- ✅ After School screen
- ✅ Story screen
- ✅ Minigame screens

> **Note:** To hide ads on additional screens (e.g. minigames or the story screen), add their route names to `HIDDEN_AD_ROUTES`. Ads are hidden via `display: none`, not destroyed, so they reload instantly when returning to a visible screen.

## Revenue Optimization Tips

### 1. Ad Refresh Rate

Currently, ads are **static** (no refresh). To increase revenue, consider adding auto-refresh every 30-60 seconds on tab screens:

```typescript
// In AdBanner.tsx
const [refreshKey, setRefreshKey] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setRefreshKey(k => k + 1); // Force ad refresh
  }, 60000); // 60 seconds

  return () => clearInterval(interval);
}, []);

<BannerAd key={refreshKey} ... />
```

**WARNING**: Don't refresh faster than 30 seconds or you risk AdMob policy violations.

### 2. Ad Placement

Current placement: **Top of screen**

Alternative placements to test:
- Bottom of screen (less noticeable but doesn't push content down)
- Between content sections (higher viewability)

### 3. Ad Mediation

Once you have baseline revenue, consider adding **mediation** to increase competition for your ad inventory:

1. In AdMob console → **Mediation**
2. Add networks: Facebook Audience Network, Unity Ads, AppLovin, etc.
3. AdMob will automatically show highest paying ads

### 4. Multiple Ad Formats

Beyond banners, consider:
- **Interstitial ads**: Full-screen ads between game days or minigames
- **Rewarded video ads**: Give users in-game currency for watching ads
- **Native ads**: Blend ads into your UI

## Troubleshooting

### Ads not showing in production:

1. **Check App IDs**: Verify `app.json` has correct App IDs
2. **Check Ad Unit IDs**: Verify `AdBanner.tsx` has correct Ad Unit IDs
3. **Wait 24 hours**: New ad units take time to activate
4. **Check AdMob status**: Ensure your account isn't suspended
5. **Enable logging**: `AdBanner.tsx` already logs ad load / failure events when `__DEV__` is true (development builds). Run a debug build to see these messages in the console.

### "Ad failed to load" errors:

- **No fill**: Normal, especially for new apps with low traffic
- **Invalid ad unit**: Double-check Ad Unit IDs
- **Account issue**: Check AdMob console for warnings

### Revenue is lower than expected:

- **Geographic location**: US/Canada/Europe = higher CPM
- **User demographics**: Different users = different ad value
- **Ad viewability**: Ads must be 50% visible for 1+ second
- **Fill rate**: Not every ad request gets filled

## Performance Optimization

Your app uses these performance optimizations for ads:

1. **✅ Native background thread initialization**: Ads initialize without blocking UI
2. **✅ Dedicated ad units**: Separate units for iOS/Android optimize better
3. **✅ Hide instead of destroy**: Ads stay mounted for instant show/hide
4. **✅ Production console.log disabled**: Zero logging overhead in production

## Support & Resources

- **AdMob Help Center**: https://support.google.com/admob
- **AdMob Policies**: https://support.google.com/admob/answer/6128543
- **React Native Google Mobile Ads Docs**: https://docs.page/invertase/react-native-google-mobile-ads

## Next Steps

After setup:

1. ✅ Monitor revenue in AdMob console
2. ✅ Test different ad placements
3. ✅ Consider adding rewarded video ads
4. ✅ Implement proper consent management for EU users
5. ✅ Set up mediation for higher revenue

Good luck with your ad monetization! 🎉
