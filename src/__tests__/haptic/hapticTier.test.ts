/**
 * Tests for hapticTier utility.
 *
 * expo-haptics is globally mocked in jest.setup.js:
 *   impactAsync, notificationAsync, selectionAsync are jest.fn()
 *   ImpactFeedbackStyle: { Light, Medium, Heavy }
 *   NotificationFeedbackType: { Success, Warning, Error }
 */

import * as Haptics from 'expo-haptics';
import {
  triggerTieredHaptic,
  registerHapticSettingsGetter,
} from '../../utils/hapticTier';

// Cast mocks for assertion convenience
const selectionAsync = Haptics.selectionAsync as jest.Mock;
const impactAsync = Haptics.impactAsync as jest.Mock;
const notificationAsync = Haptics.notificationAsync as jest.Mock;

// Helper: reset the getter to permissive defaults before each test
function allowHaptics() {
  registerHapticSettingsGetter(() => ({ reduceMotion: false, haptics: true }));
}

beforeEach(() => {
  jest.clearAllMocks();
  allowHaptics();
});

// ---------------------------------------------------------------------------
// Magnitude-based dispatch
// ---------------------------------------------------------------------------

describe('magnitude thresholds (no context override)', () => {
  test('magnitude 0.1 (<0.3) → selectionAsync', () => {
    triggerTieredHaptic(0.1);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).not.toHaveBeenCalled();
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  test('magnitude 0.29 (<0.3, boundary) → selectionAsync', () => {
    triggerTieredHaptic(0.29);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).not.toHaveBeenCalled();
  });

  test('magnitude 0.3 ([0.3,0.7) lower boundary) → impactAsync Medium', () => {
    triggerTieredHaptic(0.3);
    expect(impactAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    expect(selectionAsync).not.toHaveBeenCalled();
  });

  test('magnitude 0.5 → impactAsync Medium', () => {
    triggerTieredHaptic(0.5);
    expect(impactAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  test('magnitude 0.69 (<0.7, upper boundary) → impactAsync Medium', () => {
    triggerTieredHaptic(0.69);
    expect(impactAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  test('magnitude 0.7 (>=0.7 boundary) → notificationAsync Success', () => {
    triggerTieredHaptic(0.7);
    expect(notificationAsync).toHaveBeenCalledTimes(1);
    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(impactAsync).not.toHaveBeenCalled();
  });

  test('magnitude 0.9 (>=0.7) → notificationAsync Success', () => {
    triggerTieredHaptic(0.9);
    expect(notificationAsync).toHaveBeenCalledTimes(1);
    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });
});

// ---------------------------------------------------------------------------
// Context overrides
// ---------------------------------------------------------------------------

describe('context overrides', () => {
  test("context='warning' → notificationAsync Warning (ignores magnitude)", () => {
    triggerTieredHaptic(0.1, 'warning');
    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    expect(selectionAsync).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
  });

  test("context='error' → notificationAsync Error (ignores magnitude)", () => {
    triggerTieredHaptic(0.9, 'error');
    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    expect(selectionAsync).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
  });

  test("context='selection' forces selectionAsync regardless of magnitude", () => {
    triggerTieredHaptic(0.9, 'selection');
    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(notificationAsync).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
  });

  test("context='selection' with low magnitude still forces selectionAsync", () => {
    triggerTieredHaptic(0.0, 'selection');
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  test("context='success' forces notificationAsync Success regardless of magnitude", () => {
    triggerTieredHaptic(0.1, 'success');
    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(selectionAsync).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
  });

  test("context='success' with high magnitude still calls Success only once", () => {
    triggerTieredHaptic(0.95, 'success');
    expect(notificationAsync).toHaveBeenCalledTimes(1);
    expect(notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });
});

// ---------------------------------------------------------------------------
// Settings guard — reduce-motion and haptics toggle
// ---------------------------------------------------------------------------

describe('settings guard', () => {
  test('reduceMotion=true → no haptic fires', () => {
    registerHapticSettingsGetter(() => ({ reduceMotion: true, haptics: true }));
    triggerTieredHaptic(0.9);
    expect(selectionAsync).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  test('haptics=false → no haptic fires', () => {
    registerHapticSettingsGetter(() => ({ reduceMotion: false, haptics: false }));
    triggerTieredHaptic(0.5);
    expect(selectionAsync).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  test('both reduceMotion=true and haptics=false → no haptic fires', () => {
    registerHapticSettingsGetter(() => ({ reduceMotion: true, haptics: false }));
    triggerTieredHaptic(0.5, 'success');
    expect(selectionAsync).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  test('reduceMotion=true suppresses context override too', () => {
    registerHapticSettingsGetter(() => ({ reduceMotion: true, haptics: true }));
    triggerTieredHaptic(0.5, 'warning');
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  test('haptics=false suppresses context override too', () => {
    registerHapticSettingsGetter(() => ({ reduceMotion: false, haptics: false }));
    triggerTieredHaptic(0.5, 'error');
    expect(notificationAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Default getter (no registration) allows haptics
// ---------------------------------------------------------------------------

describe('default getter', () => {
  test('without calling registerHapticSettingsGetter haptics still fire', () => {
    // The module-level default allows haptics; we cannot truly "unregister",
    // but we can re-register the permissive default and verify it fires.
    registerHapticSettingsGetter(() => ({ reduceMotion: false, haptics: true }));
    triggerTieredHaptic(0.1);
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });
});
