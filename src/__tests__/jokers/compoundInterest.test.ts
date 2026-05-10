/**
 * Compound Interest (ID 63) — end-to-end test through calculateSaleTotal.
 *
 * Behavior (matches the joker description):
 *   - Starts at 1.2x / 1.4x / 1.6x profit boost (level 1 / 2 / 3) on day 1
 *   - Gains +0.2 / +0.3 / +0.4 mult per day (compoundInterestDays - 1)
 *   - Caps at 3x / 4x / 5x total profit boost
 *   - Doesn't fire when compoundInterestDays === 0
 *
 * Formula: scaledMult = min(base + perDay × (days - 1), cap)
 * Profit boost added: scaledMult - 1
 */

import { calculateSaleTotal } from '../../utils/saleCalculations';
import { JOKER_IDS } from '../../constants/jokerIds';
import { getJokerEffectsAtLevel } from '../../utils/jokerEffectEngine';

function makeJoker(id: number, level: number = 1) {
  return {
    id: id.toString(),
    name: `Joker ${id}`,
    level,
    effects: getJokerEffectsAtLevel(id, level),
  };
}

// Base: M&Ms, $50 profit/unit, 10 qty → totalProfit 500, purchaseValue 500.
// boostedProfit = totalProfit × profitBoost; finalProfit = boostedProfit × multiplier.
// totalGain = purchaseValue + finalProfit.
const baseSaleParams = {
  candyName: 'M&Ms',
  basePrice: 100,
  purchasePrice: 50,
  quantity: 10,
  jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 1)] as any[],
  periodCount: 0,
  inventoryLimit: 30,
  activeEffects: [],
  hallPassModifiers: { salePriceBonusPercent: 0 },
  merchantEffects: [],
  consecutivePeriodSales: 0,
  totalCandiesSold: 0,
  hasEarlySaleToday: true,
  currentCash: 1000,
  inventoryCount: 10,
  day: 1,
  period: 1,
  periodsPerDay: 8,
  bulkEmpireStacks: 0,
  inventory: [{ name: 'M&Ms', quantity: 10 }],
  didSellPreviousPeriod: true,
  ownedJokerCount: 0,
  uniqueTypesSoldThisPeriod: 0,
  clearanceSaleStacks: 0,
  compoundInterestDays: 0,
  reputationTypesSold: 0,
  streetSmartsEventsSurvived: 0,
  hoarderMaxHits: 0,
  pennyWiseStashes: 0,
  survivorCandiesMelted: 0,
  selectedPassIds: [] as string[],
};

describe('Compound Interest (ID 63) — sale-time math', () => {
  describe('Gating', () => {
    it('Does NOT fire when compoundInterestDays === 0', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        compoundInterestDays: 0,
      });
      // Baseline: totalGain = 500 + (500 × 1 × 1) = 1000
      expect(result.totalGain).toBe(1000);
    });

    it('Does NOT fire without the joker, even if days > 0', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [],
        compoundInterestDays: 7,
      });
      expect(result.totalGain).toBe(1000);
    });
  });

  describe('Level 1 — base 1.2x, +0.2/day, cap 3x', () => {
    it('day 1: +20% → totalGain 1100', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 1)],
        compoundInterestDays: 1,
      });
      // boostedProfit = 500 × 1.2 = 600 → totalGain = 500 + 600 = 1100
      expect(result.totalGain).toBe(1100);
    });

    it('day 2: 1.2 + 0.2 = 1.4 → totalGain 1200', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 1)],
        compoundInterestDays: 2,
      });
      expect(result.totalGain).toBe(1200);
    });

    it('day 5: 1.2 + 0.2×4 = 2.0 → totalGain 1500', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 1)],
        compoundInterestDays: 5,
      });
      expect(result.totalGain).toBeCloseTo(1500);
    });

    it('day 10: capped at 3.0x → totalGain 2000', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 1)],
        compoundInterestDays: 10,
      });
      // Without cap: 1.2 + 0.2×9 = 3.0 (right at cap). 1000 baseline + 1500 boosted profit increase
      // boostedProfit = 500 × 3 = 1500, totalGain = 500 + 1500 = 2000
      expect(result.totalGain).toBe(2000);
    });

    it('day 100: still capped at 3.0x', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 1)],
        compoundInterestDays: 100,
      });
      expect(result.totalGain).toBe(2000);
    });
  });

  describe('Level 2 — base 1.4x, +0.3/day, cap 4x', () => {
    it('day 1: +40% → totalGain 1200', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 2)],
        compoundInterestDays: 1,
      });
      expect(result.totalGain).toBe(1200);
    });

    it('day 5: 1.4 + 0.3×4 = 2.6 → totalGain 1800', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 2)],
        compoundInterestDays: 5,
      });
      // boostedProfit = 500 × 2.6 = 1300, totalGain = 500 + 1300 = 1800
      expect(result.totalGain).toBeCloseTo(1800);
    });

    it('caps at 4.0x → totalGain 2500 from day ~10 onward', () => {
      // 1.4 + 0.3×n = 4 → n = 8.67 → first capping day is 10 (days=10 → 1.4 + 0.3×9 = 4.1, capped to 4)
      const day10 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 2)],
        compoundInterestDays: 10,
      });
      const day50 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 2)],
        compoundInterestDays: 50,
      });
      expect(day10.totalGain).toBe(2500); // 500 + 500×4
      expect(day50.totalGain).toBe(2500); // identical (capped)
    });
  });

  describe('Level 3 — base 1.6x, +0.4/day, cap 5x', () => {
    it('day 1: +60% → totalGain 1300', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 3)],
        compoundInterestDays: 1,
      });
      expect(result.totalGain).toBe(1300);
    });

    it('day 3: 1.6 + 0.4×2 = 2.4 → totalGain 1700', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 3)],
        compoundInterestDays: 3,
      });
      expect(result.totalGain).toBeCloseTo(1700);
    });

    it('caps at 5.0x → totalGain 3000 once cap reached', () => {
      // 1.6 + 0.4×n = 5 → n = 8.5 → days=10 gives 1.6+0.4×9=5.2 → capped at 5
      const day10 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 3)],
        compoundInterestDays: 10,
      });
      expect(day10.totalGain).toBe(3000); // 500 + 500×5
    });
  });

  describe('Bonus breakdown', () => {
    it('records a Compound Interest entry with the scaled multiplier', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 1)],
        compoundInterestDays: 3,
      });
      const entry = result.bonusBreakdown.find(
        (b: any) => b.name === 'Compound Interest'
      );
      expect(entry).toBeDefined();
      expect(entry?.multiplier).toBeCloseTo(1.6); // 1.2 + 0.2×2 = 1.6
    });

    it('does NOT push a breakdown entry when not firing', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeJoker(JOKER_IDS.COMPOUND_INTEREST, 1)],
        compoundInterestDays: 0,
      });
      const entry = result.bonusBreakdown.find(
        (b: any) => b.name === 'Compound Interest'
      );
      expect(entry).toBeUndefined();
    });
  });
});
