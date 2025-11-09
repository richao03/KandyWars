# AdMob Setup Guide for Production

This guide walks you through setting up AdMob for your Candy Warz game and configuring production ad units.

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
   - Enter app name: **Candy Warz**
   - Select platform: **iOS** or **Android**
   - Click **"Add"**

## Step 2: Get Your App IDs

After creating your apps, you'll get App IDs for each platform:

### iOS App ID
Format: `ca-app-pub-1234567890123456~1234567890`

### Android App ID
Format: `ca-app-pub-1234567890123456~0987654321`

**Update `app.json`:**
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

Open `app/components/AdBanner.tsx` and update the ad unit configuration:

```typescript
const AD_UNITS = {
  STANDARD_BANNER: {
    ios: __DEV__
      ? TestIds.BANNER
      : 'ca-app-pub-XXXXX/YOUR-IOS-BANNER-UNIT-ID', // ← Paste your iOS banner ad unit ID here
    android: __DEV__
      ? TestIds.BANNER
      : 'ca-app-pub-XXXXX/YOUR-ANDROID-BANNER-UNIT-ID', // ← Paste your Android banner ad unit ID here
  },
};
```

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

### iOS Privacy Manifest (Already Configured)

The app includes `PrivacyInfo.xcprivacy` with required declarations for:
- Device ID collection (advertising)
- SKAdNetwork identifiers

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

2. Add to `AdBanner.tsx`:
```typescript
requestOptions={{
  requestNonPersonalizedAdsOnly: true,
  testDevices: [
    'YOUR_DEVICE_ADVERTISING_ID', // Your test device
  ],
}}
```

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

### Ads VISIBLE on these screens:
- ✅ Home tab
- ✅ Jokers tab
- ✅ Price History tab
- ✅ Settings tab
- ✅ Market screen
- ✅ After School screen

### Ads HIDDEN on these screens (for better UX):
- ❌ All minigame screens (computer, math, art, etc.)
- ❌ Title screen
- ❌ Story screen

**Why hide ads on some screens?**
- Better performance during gameplay
- Less distraction for users
- Cleaner UX on intro screens
- **Note**: Ads are hidden but not destroyed, so they reload instantly when returning to main screens

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
5. **Enable logging**: Set `__DEV__ = true` temporarily to see error messages

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
