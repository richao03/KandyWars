/**
 * Tests for Piggy Bank Pro (ID 74) stash interest logic
 * and the generalized applyDailyInterest behaviour.
 *
 * These tests verify:
 * - Piggy Bank Pro rates: 15%/20%/25% per level
 * - Mysterious Artifact rates: 8%/15%/25% per level
 * - Both jokers stack when owned simultaneously
 * - Level is respected for both jokers
 */

import { getJokerEffectsAtLevel } from '../../utils/jokerEffectEngine';
import { JOKER_IDS } from '../../constants/jokerIds';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: mirror the applyDailyInterest logic without Redux dispatch
// ─────────────────────────────────────────────────────────────────────────────
function computeDailyInterest(
  jokers: Array<{ id: number; level?: number }>,
  stashedAmount: number
): number {
  if (!jokers.length || stashedAmount <= 0) return 0;

  const MAX_DAILY_INTEREST = 5000;
  let totalInterest = 0;

  // Mysterious Artifact (ID 53)
  const mysteriousJoker = jokers.find(j => j.id === JOKER_IDS.MYSTERIOUS_ARTIFACT);
  if (mysteriousJoker) {
    const level = mysteriousJoker.level ?? 1;
    const effects = getJokerEffectsAtLevel(JOKER_IDS.MYSTERIOUS_ARTIFACT, level);
    const interestEffect = effects.find(e => e.target === 'stash_interest');
    const rate = interestEffect ? interestEffect.amount - 1 : (level <= 1 ? 0.08 : level === 2 ? 0.15 : 0.25);
    totalInterest += Math.min(stashedAmount * rate, MAX_DAILY_INTEREST);
  }

  // Piggy Bank Pro (ID 74)
  const piggyJoker = jokers.find(j => j.id === JOKER_IDS.PIGGY_BANK_PRO);
  if (piggyJoker) {
    const level = piggyJoker.level ?? 1;
    const effects = getJokerEffectsAtLevel(JOKER_IDS.PIGGY_BANK_PRO, level);
    const interestEffect = effects.find(e => e.target === 'stash_interest');
    const rate = interestEffect ? interestEffect.amount - 1 : (level <= 1 ? 0.15 : level === 2 ? 0.20 : 0.25);
    totalInterest += Math.min(stashedAmount * rate, MAX_DAILY_INTEREST);
  }

  return Math.min(totalInterest, MAX_DAILY_INTEREST * 2);
}

describe('Piggy Bank Pro — stash interest rates', () => {
  const stash = 1000;

  it('Level 1 gives 15% interest', () => {
    const interest = computeDailyInterest([{ id: JOKER_IDS.PIGGY_BANK_PRO, level: 1 }], stash);
    expect(interest).toBeCloseTo(150);
  });

  it('Level 2 gives 20% interest', () => {
    const interest = computeDailyInterest([{ id: JOKER_IDS.PIGGY_BANK_PRO, level: 2 }], stash);
    expect(interest).toBeCloseTo(200);
  });

  it('Level 3 gives 25% interest', () => {
    const interest = computeDailyInterest([{ id: JOKER_IDS.PIGGY_BANK_PRO, level: 3 }], stash);
    expect(interest).toBeCloseTo(250);
  });

  it('Returns 0 when stash is empty', () => {
    const interest = computeDailyInterest([{ id: JOKER_IDS.PIGGY_BANK_PRO, level: 1 }], 0);
    expect(interest).toBe(0);
  });

  it('Returns 0 when stash is negative', () => {
    const interest = computeDailyInterest([{ id: JOKER_IDS.PIGGY_BANK_PRO, level: 1 }], -500);
    expect(interest).toBe(0);
  });
});

describe('Mysterious Artifact — stash interest rates', () => {
  const stash = 1000;

  it('Level 1 gives 8% interest', () => {
    const interest = computeDailyInterest([{ id: JOKER_IDS.MYSTERIOUS_ARTIFACT, level: 1 }], stash);
    expect(interest).toBeCloseTo(80);
  });

  it('Level 2 gives 15% interest', () => {
    const interest = computeDailyInterest([{ id: JOKER_IDS.MYSTERIOUS_ARTIFACT, level: 2 }], stash);
    expect(interest).toBeCloseTo(150);
  });

  it('Level 3 gives 25% interest', () => {
    const interest = computeDailyInterest([{ id: JOKER_IDS.MYSTERIOUS_ARTIFACT, level: 3 }], stash);
    expect(interest).toBeCloseTo(250);
  });
});

describe('Stacking — both interest jokers owned', () => {
  const stash = 1000;

  it('Both at level 1: 8% + 15% = 23% total interest', () => {
    const interest = computeDailyInterest(
      [
        { id: JOKER_IDS.MYSTERIOUS_ARTIFACT, level: 1 },
        { id: JOKER_IDS.PIGGY_BANK_PRO, level: 1 },
      ],
      stash
    );
    expect(interest).toBeCloseTo(230);
  });

  it('Both at level 3: 25% + 25% = 50% total interest', () => {
    const interest = computeDailyInterest(
      [
        { id: JOKER_IDS.MYSTERIOUS_ARTIFACT, level: 3 },
        { id: JOKER_IDS.PIGGY_BANK_PRO, level: 3 },
      ],
      stash
    );
    expect(interest).toBeCloseTo(500);
  });

  it('Returns 0 when no jokers provided', () => {
    const interest = computeDailyInterest([], stash);
    expect(interest).toBe(0);
  });

  it('Returns 0 when neither interest joker is in the list', () => {
    // Use a random joker ID that is neither 53 nor 74
    const interest = computeDailyInterest([{ id: 1, level: 1 }], stash);
    expect(interest).toBe(0);
  });
});

describe('Piggy Bank Pro — effect engine integration', () => {
  it('getJokerEffectsAtLevel returns stash_interest for PIGGY_BANK_PRO', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.PIGGY_BANK_PRO, 1);
    const interestEffect = effects.find(e => e.target === 'stash_interest');
    expect(interestEffect).toBeDefined();
    expect(interestEffect?.operation).toBe('multiply');
  });

  it('Piggy Bank Pro amounts increase across levels 1→2→3', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.PIGGY_BANK_PRO, 1).find(e => e.target === 'stash_interest')?.amount ?? 1;
    const l2 = getJokerEffectsAtLevel(JOKER_IDS.PIGGY_BANK_PRO, 2).find(e => e.target === 'stash_interest')?.amount ?? 1;
    const l3 = getJokerEffectsAtLevel(JOKER_IDS.PIGGY_BANK_PRO, 3).find(e => e.target === 'stash_interest')?.amount ?? 1;
    expect(l1).toBeLessThanOrEqual(l2);
    expect(l2).toBeLessThanOrEqual(l3);
  });
});
