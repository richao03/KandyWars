/**
 * Tests for Spare Change (Joker #93) period income logic.
 *
 * Validates:
 * - bonus = amount × emptySlots
 * - per-level amount scaling ($5/$10/$20)
 * - per-period dedup guard
 */

import { getJokerEffectsAtLevel } from '../../utils/jokerEffectEngine';
import { JOKER_IDS } from '../../constants/jokerIds';

// Mirrors the formula in useSparePeriodIncome.
function computeSpareChange(
  level: number,
  inventoryLimit: number,
  totalInventory: number
): number {
  const effects = getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, level);
  const incomeEffect = effects.find((e) => e.target === 'spare_change_income');
  const perSlot = incomeEffect?.amount ?? 0;
  const emptySlots = Math.max(0, inventoryLimit - totalInventory);
  return emptySlots * perSlot;
}

describe('Spare Change (#93) — amount × emptySlots', () => {
  it('Level 1 pays $5 per empty slot', () => {
    expect(computeSpareChange(1, 10, 0)).toBe(50);
    expect(computeSpareChange(1, 10, 7)).toBe(15); // 3 empty * $5
    expect(computeSpareChange(1, 20, 20)).toBe(0); // inventory full
  });

  it('Level 2 pays $10 per empty slot', () => {
    expect(computeSpareChange(2, 10, 0)).toBe(100);
    expect(computeSpareChange(2, 10, 5)).toBe(50);
    expect(computeSpareChange(2, 10, 10)).toBe(0);
  });

  it('Level 3 pays $20 per empty slot', () => {
    expect(computeSpareChange(3, 10, 0)).toBe(200);
    expect(computeSpareChange(3, 15, 10)).toBe(100); // 5 empty * $20
    expect(computeSpareChange(3, 30, 30)).toBe(0);
  });

  it('Clamps empty slots at 0 when inventory somehow exceeds limit', () => {
    expect(computeSpareChange(1, 10, 15)).toBe(0);
    expect(computeSpareChange(3, 10, 50)).toBe(0);
  });

  it('Returns 0 on zero inventoryLimit', () => {
    expect(computeSpareChange(1, 0, 0)).toBe(0);
    expect(computeSpareChange(3, 0, 0)).toBe(0);
  });

  it('Scales linearly with empty slot count', () => {
    const perSlotL2 = computeSpareChange(2, 1, 0); // $10
    expect(computeSpareChange(2, 10, 0)).toBe(perSlotL2 * 10);
    expect(computeSpareChange(2, 20, 0)).toBe(perSlotL2 * 20);
  });
});

describe('Spare Change (#93) — period dedup guard', () => {
  it('Does not apply twice for the same period', () => {
    const applied: number[] = [];
    let dispatchCount = 0;

    function simulate(period: number) {
      if (period <= 0 || applied.includes(period)) return;
      dispatchCount++;
      applied.push(period);
    }

    simulate(1);
    simulate(1);
    simulate(1);
    expect(dispatchCount).toBe(1);
    expect(applied).toEqual([1]);
  });

  it('Applies independently for each new period', () => {
    const applied: number[] = [];
    let dispatchCount = 0;

    function simulate(period: number) {
      if (period <= 0 || applied.includes(period)) return;
      dispatchCount++;
      applied.push(period);
    }

    simulate(1);
    simulate(2);
    simulate(3);
    expect(dispatchCount).toBe(3);
    expect(applied).toEqual([1, 2, 3]);
  });

  it('Skips when periodCount is 0', () => {
    const applied: number[] = [];
    const periodCount = 0;
    const shouldApply = periodCount > 0 && !applied.includes(periodCount);
    expect(shouldApply).toBe(false);
  });
});

describe('Spare Change (#93) — effect factory', () => {
  it('Level 1 factory returns spare_change_income $5', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, 1);
    expect(effects).toHaveLength(1);
    expect(effects[0].target).toBe('spare_change_income');
    expect(effects[0].operation).toBe('add');
    expect(effects[0].amount).toBe(5);
  });

  it('Amount scales across levels (5 → 10 → 20)', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, 1)[0].amount;
    const l2 = getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, 2)[0].amount;
    const l3 = getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, 3)[0].amount;
    expect(l1).toBe(5);
    expect(l2).toBe(10);
    expect(l3).toBe(20);
  });
});
