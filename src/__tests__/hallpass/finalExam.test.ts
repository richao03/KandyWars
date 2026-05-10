/**
 * Functional tests for the Final Exam hall pass.
 * The pass is period-specific (15× profit on the last period of a day, 0.25×
 * on every other period) and is wired directly into calculateSaleTotal — not
 * via computeHallPassModifiers — so it needs an end-to-end test through the
 * sale pipeline rather than a structural assertion on the slice.
 */

import { calculateSaleTotal } from '../../utils/saleCalculations';

// Base params chosen so the unboosted profit is exactly 500 ($50/unit × 10).
// Multipliers and boosts default to no-op so finalProfit = totalProfit × multipliers.
const baseSaleParams = {
  candyName: 'M&Ms',
  basePrice: 100, // sell price
  purchasePrice: 50,
  quantity: 10,
  jokers: [] as any[],
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

describe('Final Exam hall pass — period-specific multiplier', () => {
  describe('without Final Exam selected (control)', () => {
    it('applies no period-specific multiplier on period 1', () => {
      const result = calculateSaleTotal({ ...baseSaleParams, period: 1 });
      // base profit 500, no multiplier from anything else → totalGain = 500 + 500 = 1000
      expect(result.totalGain).toBe(1000);
    });

    it('applies no period-specific multiplier on period 8', () => {
      const result = calculateSaleTotal({ ...baseSaleParams, period: 8 });
      expect(result.totalGain).toBe(1000);
    });
  });

  describe('with Final Exam selected', () => {
    it('penalizes period 1 by 75% (0.25× multiplier on profit)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 1,
        selectedPassIds: ['final_exam'],
      });
      // boostedProfit = 500, multiplier = 1, finalExamMultiplier = 0.25
      // finalProfit = 500 × 1 × 0.25 = 125
      // totalGain = purchaseValue (500) + finalProfit (125) = 625
      expect(result.totalGain).toBe(625);
    });

    it('penalizes period 4 by 75% (mid-day still penalized)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 4,
        selectedPassIds: ['final_exam'],
      });
      expect(result.totalGain).toBe(625);
    });

    it('penalizes period 7 by 75% (last non-boost period)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 7,
        selectedPassIds: ['final_exam'],
      });
      expect(result.totalGain).toBe(625);
    });

    it('boosts period 8 (last period) by 15× on profit', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 8,
        selectedPassIds: ['final_exam'],
      });
      // boostedProfit = 500, finalExamMultiplier = 15
      // finalProfit = 500 × 15 = 7500
      // totalGain = 500 + 7500 = 8000
      expect(result.totalGain).toBe(8000);
    });

    it('boost on period 8 records a Final Exam entry in bonusBreakdown', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 8,
        selectedPassIds: ['final_exam'],
      });
      const finalExamEntry = result.bonusBreakdown.find(
        (b: any) => typeof b.name === 'string' && b.name.startsWith('Final Exam')
      );
      expect(finalExamEntry).toBeDefined();
      expect(finalExamEntry?.multiplier).toBe(15);
    });

    it('penalty on non-last period records a Final Exam entry in bonusBreakdown', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 3,
        selectedPassIds: ['final_exam'],
      });
      const finalExamEntry = result.bonusBreakdown.find(
        (b: any) => typeof b.name === 'string' && b.name.startsWith('Final Exam')
      );
      expect(finalExamEntry).toBeDefined();
      expect(finalExamEntry?.multiplier).toBe(0.25);
    });
  });

  describe('with Time Crunch active (6 periods/day instead of 8)', () => {
    // Time Crunch reduces periodsPerDay to 6. The implementation uses
    // `period === effectivePeriodsPerDay` so the "last period" tracks the
    // shortened day, even though the description says "Period 8 sales are 15x".
    // This is the behavior; this test pins it down so any future change is
    // intentional rather than a regression.
    it('treats period 6 as the boost period when periodsPerDay is 6', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 6,
        periodsPerDay: 6,
        selectedPassIds: ['final_exam'],
      });
      expect(result.totalGain).toBe(8000); // 15× boost applied
    });

    it('penalizes period 1-5 when periodsPerDay is 6', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 5,
        periodsPerDay: 6,
        selectedPassIds: ['final_exam'],
      });
      expect(result.totalGain).toBe(625); // 0.25× penalty applied
    });
  });
});
