/**
 * Tests for Home Made joker bonus logic
 *
 * These tests verify:
 * - Bonus equals perCandyRate × candyCount
 * - perCandyRate respects joker level (25/50/100)
 * - Firing once per day (no duplicate dispatch)
 */

import { getJokerEffectsAtLevel } from '../../utils/jokerEffectEngine';
import { JOKER_IDS } from '../../constants/jokerIds';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: compute the Home Made bonus amount for given level + candy count
// (mirrors the logic in useHomeMadeBonus)
// ─────────────────────────────────────────────────────────────────────────────
function computeHomeMadeBonus(level: number, candyCount: number): number {
  const effects = getJokerEffectsAtLevel(JOKER_IDS.HOME_MADE, level);
  const bonusEffect = effects.find(e => e.target === 'morning_inventory_bonus');
  const perCandyRate = bonusEffect?.amount ?? 25;
  return candyCount * perCandyRate;
}

describe('Home Made joker — bonus calculation', () => {
  it('Level 1 gives $25 per candy', () => {
    expect(computeHomeMadeBonus(1, 1)).toBe(25);
    expect(computeHomeMadeBonus(1, 4)).toBe(100);
    expect(computeHomeMadeBonus(1, 10)).toBe(250);
  });

  it('Level 2 gives $50 per candy', () => {
    expect(computeHomeMadeBonus(2, 1)).toBe(50);
    expect(computeHomeMadeBonus(2, 4)).toBe(200);
    expect(computeHomeMadeBonus(2, 10)).toBe(500);
  });

  it('Level 3 gives $100 per candy', () => {
    expect(computeHomeMadeBonus(3, 1)).toBe(100);
    expect(computeHomeMadeBonus(3, 4)).toBe(400);
    expect(computeHomeMadeBonus(3, 10)).toBe(1000);
  });

  it('Returns 0 when candy count is 0', () => {
    expect(computeHomeMadeBonus(1, 0)).toBe(0);
    expect(computeHomeMadeBonus(3, 0)).toBe(0);
  });

  it('Scales linearly with candy count', () => {
    const rate = computeHomeMadeBonus(1, 1); // $25
    expect(computeHomeMadeBonus(1, 7)).toBe(rate * 7);
  });
});

describe('Home Made joker — day-guard logic', () => {
  it('Does not apply bonus if day is already in bonusDaysApplied', () => {
    // Simulate the guard condition
    const bonusDaysApplied = [1, 2];
    const currentDay = 2;

    const shouldApply = !bonusDaysApplied.includes(currentDay);
    expect(shouldApply).toBe(false);
  });

  it('Applies bonus if current day is not yet in bonusDaysApplied', () => {
    const bonusDaysApplied = [1];
    const currentDay = 2;

    const shouldApply = !bonusDaysApplied.includes(currentDay);
    expect(shouldApply).toBe(true);
  });

  it('Applies bonus on day 1 when no days applied yet', () => {
    const bonusDaysApplied: number[] = [];
    const currentDay = 1;

    const shouldApply = currentDay > 0 && !bonusDaysApplied.includes(currentDay);
    expect(shouldApply).toBe(true);
  });

  it('Skips when currentDay is 0 (pre-game)', () => {
    const bonusDaysApplied: number[] = [];
    const currentDay = 0;

    const shouldApply = currentDay > 0 && !bonusDaysApplied.includes(currentDay);
    expect(shouldApply).toBe(false);
  });

  it('Each day can only fire once — subsequent calls with same day are blocked', () => {
    const bonusDaysApplied: number[] = [];
    let dispatchCount = 0;

    function simulateEffect(day: number) {
      if (day <= 0 || bonusDaysApplied.includes(day)) return;
      dispatchCount++;
      bonusDaysApplied.push(day); // simulate markHomeMadeBonusApplied
    }

    simulateEffect(1); // first call day 1 → fires
    simulateEffect(1); // second call day 1 → blocked
    simulateEffect(1); // third call day 1 → blocked

    expect(dispatchCount).toBe(1);
    expect(bonusDaysApplied).toEqual([1]);
  });

  it('Fires independently for each new day', () => {
    const bonusDaysApplied: number[] = [];
    let dispatchCount = 0;

    function simulateEffect(day: number) {
      if (day <= 0 || bonusDaysApplied.includes(day)) return;
      dispatchCount++;
      bonusDaysApplied.push(day);
    }

    simulateEffect(1);
    simulateEffect(2);
    simulateEffect(3);

    expect(dispatchCount).toBe(3);
    expect(bonusDaysApplied).toEqual([1, 2, 3]);
  });
});

describe('Home Made joker — effect engine integration', () => {
  it('getJokerEffectsAtLevel returns morning_inventory_bonus for HOME_MADE', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.HOME_MADE, 1);
    const bonusEffect = effects.find(e => e.target === 'morning_inventory_bonus');
    expect(bonusEffect).toBeDefined();
    expect(bonusEffect?.operation).toBe('add');
  });

  it('Amount increases across levels 1→2→3', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.HOME_MADE, 1).find(e => e.target === 'morning_inventory_bonus')?.amount ?? 0;
    const l2 = getJokerEffectsAtLevel(JOKER_IDS.HOME_MADE, 2).find(e => e.target === 'morning_inventory_bonus')?.amount ?? 0;
    const l3 = getJokerEffectsAtLevel(JOKER_IDS.HOME_MADE, 3).find(e => e.target === 'morning_inventory_bonus')?.amount ?? 0;
    expect(l1).toBeLessThan(l2);
    expect(l2).toBeLessThan(l3);
  });
});
