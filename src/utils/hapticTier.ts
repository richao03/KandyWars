import * as Haptics from 'expo-haptics';

/**
 * Haptic Tier Utility
 *
 * Routes all haptic feedback through a single tiered system that respects
 * the user's reduce-motion and haptics settings from Redux (juiceSettingsSlice).
 *
 * Callers register a settings getter via registerHapticSettingsGetter() to avoid
 * a circular import with the settings slice. The default getter allows haptics
 * so that a missing registration never silently breaks feedback.
 */

export type HapticContext = 'selection' | 'success' | 'warning' | 'error';

export type SettingsGetter = () => { reduceMotion: boolean; haptics: boolean };

let getSettings: SettingsGetter = () => ({ reduceMotion: false, haptics: true });

/**
 * Register the Redux settings getter. Call this once at app startup (e.g. in
 * store setup or a root component) so hapticTier can read live settings without
 * importing the slice directly.
 */
export function registerHapticSettingsGetter(getter: SettingsGetter): void {
  getSettings = getter;
}

/**
 * Fire a haptic whose strength scales with magnitude 0..1.
 *
 * Magnitude thresholds (exclusive lower bound):
 *   < 0.3        → selectionAsync
 *   [0.3, 0.7)   → impactAsync(Medium)
 *   >= 0.7       → notificationAsync(Success)
 *
 * Context overrides (applied before magnitude check):
 *   'selection' → selectionAsync (regardless of magnitude)
 *   'success'   → notificationAsync(Success) (regardless of magnitude)
 *   'warning'   → notificationAsync(Warning) (regardless of magnitude)
 *   'error'     → notificationAsync(Error) (regardless of magnitude)
 *
 * Returns early (no haptic) when either reduceMotion OR haptics setting is false.
 */
export function triggerTieredHaptic(magnitude: number, context?: HapticContext): void {
  const { reduceMotion, haptics } = getSettings();
  if (reduceMotion || !haptics) return;

  // Context overrides take priority over magnitude
  if (context === 'selection') {
    Haptics.selectionAsync();
    return;
  }
  if (context === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  if (context === 'warning') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }
  if (context === 'error') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return;
  }

  // Magnitude-based dispatch
  if (magnitude < 0.3) {
    Haptics.selectionAsync();
  } else if (magnitude < 0.7) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
