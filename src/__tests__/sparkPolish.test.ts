/**
 * sparkPolish.test.ts
 *
 * Tests for Wave 3 SparkEffect polish:
 *   SX-c — getTierSymbols (tier-aware symbols)
 *   SX-g — getTierParticleCount with device-memory clamp
 *
 * The helpers under test are pure (no Reanimated runtime needed).
 * We stub out the heavy RN/Reanimated deps so the module can be imported
 * in a jsdom test environment.
 */

// --- Module stubs (must come before any import that triggers them) ---

jest.mock('react-native', () => ({
  StyleSheet: { create: (s: unknown) => s },
  View: 'View',
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (v: unknown) => ({ value: v }),
  useAnimatedStyle: (fn: () => unknown) => fn,
  withRepeat: (v: unknown) => v,
  withTiming: (v: unknown) => v,
  withSequence: (...args: unknown[]) => args[args.length - 1],
  Easing: { out: () => undefined, in: () => undefined, ease: undefined },
  interpolate: (v: number) => v,
  default: { Text: 'Animated.Text' },
}));

jest.mock('expo-device', () => ({
  totalMemory: 8 * 1024 * 1024 * 1024, // 8 GB — not low memory
}));

// -------------------------------------------------------------------------

import {
  getTierSymbols,
  getTierParticleCount,
} from '../../app/components/SparkEffect';
import type { TierLevel } from '../utils/computeEffectTier';

/* --------------------------------------------------------------------------
 * SX-c: getTierSymbols
 * ------------------------------------------------------------------------ */

describe('getTierSymbols', () => {
  it("returns [] for tier 'none'", () => {
    expect(getTierSymbols('none')).toEqual([]);
  });

  it("returns ['$'] for tier 'bronze'", () => {
    expect(getTierSymbols('bronze')).toEqual(['$']);
  });

  it("returns ['$'] for tier 'silver'", () => {
    expect(getTierSymbols('silver')).toEqual(['$']);
  });

  it("returns ['$', '$$'] for tier 'gold'", () => {
    expect(getTierSymbols('gold')).toEqual(['$', '$$']);
  });

  it("returns ['$', '$$'] for tier 'emerald'", () => {
    expect(getTierSymbols('emerald')).toEqual(['$', '$$']);
  });

  it("returns ['$$', '$$$'] for tier 'sapphire'", () => {
    expect(getTierSymbols('sapphire')).toEqual(['$$', '$$$']);
  });

  it("returns ['💎', '$$$'] for tier 'jackpot'", () => {
    expect(getTierSymbols('jackpot')).toEqual(['💎', '$$$']);
  });

  it("includes '💎' for jackpot tier", () => {
    expect(getTierSymbols('jackpot')).toContain('💎');
  });

  it('returns non-empty array for all non-none tiers', () => {
    const nonNoneTiers: TierLevel[] = [
      'bronze',
      'silver',
      'gold',
      'emerald',
      'sapphire',
      'jackpot',
    ];
    for (const tier of nonNoneTiers) {
      const symbols = getTierSymbols(tier);
      expect(symbols.length).toBeGreaterThan(0);
    }
  });
});

/* --------------------------------------------------------------------------
 * Symbol selection via modulo (SX-c behavior documentation)
 *
 * Per-particle symbol: symbols[particleIndex % symbols.length]
 * Ensures symbols cycle evenly across all sparks regardless of count.
 * ------------------------------------------------------------------------ */

describe('getTierSymbols modulo selection behavior', () => {
  it('gold symbols cycle correctly: index 0 → $, index 1 → $$, index 2 → $', () => {
    const symbols = getTierSymbols('gold');
    expect(symbols[0 % symbols.length]).toBe('$');
    expect(symbols[1 % symbols.length]).toBe('$$');
    expect(symbols[2 % symbols.length]).toBe('$'); // cycles back
  });

  it('sapphire symbols cycle: index 0 → $$, index 1 → $$$, index 2 → $$', () => {
    const symbols = getTierSymbols('sapphire');
    expect(symbols[0 % symbols.length]).toBe('$$');
    expect(symbols[1 % symbols.length]).toBe('$$$');
    expect(symbols[2 % symbols.length]).toBe('$$'); // wraps
  });

  it('jackpot symbols cycle: index 0 → 💎, index 1 → $$$, index 2 → 💎', () => {
    const symbols = getTierSymbols('jackpot');
    expect(symbols[0 % symbols.length]).toBe('💎');
    expect(symbols[1 % symbols.length]).toBe('$$$');
    expect(symbols[2 % symbols.length]).toBe('💎');
  });

  it('single-symbol tiers always return same symbol regardless of index', () => {
    const bronzeSymbols = getTierSymbols('bronze');
    for (let i = 0; i < 10; i++) {
      expect(bronzeSymbols[i % bronzeSymbols.length]).toBe('$');
    }
  });
});

/* --------------------------------------------------------------------------
 * SX-g: getTierParticleCount with device-memory clamp
 * ------------------------------------------------------------------------ */

describe('getTierParticleCount', () => {
  it("returns 24 for 'jackpot' without low-memory override", () => {
    // Explicit false override bypasses module-level flag (device has 8 GB in mock)
    expect(getTierParticleCount('jackpot', false)).toBe(24);
  });

  it("returns 12 for 'jackpot' with lowMemoryOverride=true", () => {
    expect(getTierParticleCount('jackpot', true)).toBe(12);
  });

  it("returns 24 for 'jackpot' with lowMemoryOverride=false", () => {
    expect(getTierParticleCount('jackpot', false)).toBe(24);
  });

  it("low-memory does NOT affect 'sapphire' count (returns 20)", () => {
    expect(getTierParticleCount('sapphire', true)).toBe(20);
  });

  it("low-memory does NOT affect 'emerald' count (returns 12)", () => {
    expect(getTierParticleCount('emerald', true)).toBe(12);
  });

  it("low-memory does NOT affect 'gold' count (returns 7)", () => {
    expect(getTierParticleCount('gold', true)).toBe(7);
  });

  it("low-memory does NOT affect 'silver' count (returns 5)", () => {
    expect(getTierParticleCount('silver', true)).toBe(5);
  });

  it("low-memory does NOT affect 'bronze' count (returns 3)", () => {
    expect(getTierParticleCount('bronze', true)).toBe(3);
  });

  it("returns 0 for 'none' regardless of low-memory flag", () => {
    expect(getTierParticleCount('none', false)).toBe(0);
    expect(getTierParticleCount('none', true)).toBe(0);
  });

  it('jackpot halves exactly: 24 / 2 = 12', () => {
    const normalCount = getTierParticleCount('jackpot', false);
    const lowMemCount = getTierParticleCount('jackpot', true);
    expect(lowMemCount).toBe(Math.floor(normalCount / 2));
  });

  it('non-jackpot tiers return same count regardless of memory override', () => {
    const tiers: TierLevel[] = ['bronze', 'silver', 'gold', 'emerald', 'sapphire', 'none'];
    for (const tier of tiers) {
      expect(getTierParticleCount(tier, false)).toBe(getTierParticleCount(tier, true));
    }
  });
});
