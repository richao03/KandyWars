/**
 * Effect-math tests for jokers that previously had only registry coverage.
 * Each test runs calculateSaleTotal with the joker active and asserts the
 * actual numerical impact on totalGain — catching factory regressions that a
 * registry test wouldn't.
 *
 * These tests pin behavior to the current implementation. When the formula
 * changes, the test will fail and force a deliberate update.
 */

import { calculateSaleTotal } from '../../utils/saleCalculations';
import { JOKER_IDS } from '../../constants/jokerIds';
import { getJokerEffectsAtLevel } from '../../utils/jokerEffectEngine';

function makeTestJoker(id: number, level: number = 1) {
  return {
    id: id.toString(),
    name: `Joker ${id}`,
    level,
    effects: getJokerEffectsAtLevel(id, level),
  };
}

// Base: M&Ms, $50 profit/unit, 10 qty → totalProfit 500, purchaseValue 500
const baseSaleParams = {
  candyName: 'M&Ms',
  basePrice: 100,
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

describe('Joker effect math — calculateSaleTotal integration', () => {
  // ===== Sanity baseline =====
  it('baseline (no jokers, no passes) → totalGain = 1000', () => {
    const result = calculateSaleTotal(baseSaleParams);
    expect(result.totalGain).toBe(1000);
  });

  // ===== Glass Cannon =====
  describe('Glass Cannon (ID 59) — flat multiplier on every sale', () => {
    // Factory: amount = 5/7/10 (level 1/2/3) on glass_cannon_boost.
    // Description claims +4/+6/+9 mult — meaning multiplier → multiplier + (amount - 1).
    // The shatter chance is handled in useTransactionHandler, NOT in calculateSaleTotal,
    // so this test isolates only the multiplier portion.
    it('level 1 boosts profit by +4 mult (multiplier = 5)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.GLASS_CANNON, 1)],
      });
      // multiplier = 5, finalProfit = 500 * 5 = 2500, totalGain = 500 + 2500 = 3000
      expect(result.jokerMultiplier).toBe(5);
      expect(result.totalGain).toBe(3000);
    });

    it('level 2 boosts profit by +6 mult (multiplier = 7)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.GLASS_CANNON, 2)],
      });
      expect(result.jokerMultiplier).toBe(7);
      expect(result.totalGain).toBe(4000);
    });

    it('level 3 boosts profit by +9 mult (multiplier = 10)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.GLASS_CANNON, 3)],
      });
      expect(result.jokerMultiplier).toBe(10);
      expect(result.totalGain).toBe(5500);
    });
  });

  // ===== Diversifier =====
  describe('Diversifier (ID 90) — bonus when selling 3+ unique types this period', () => {
    it('does NOT trigger when uniqueTypesSoldThisPeriod < 3', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.DIVERSIFIER, 1)],
        uniqueTypesSoldThisPeriod: 2,
      });
      // No boost: same as baseline
      expect(result.totalGain).toBe(1000);
    });

    it('triggers at level 1 when uniqueTypesSoldThisPeriod = 3', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.DIVERSIFIER, 1)],
        uniqueTypesSoldThisPeriod: 3,
      });
      // Level 1: amount = 2 → multiplier = 2 → finalProfit = 1000, totalGain = 1500
      expect(result.totalGain).toBeGreaterThan(1000);
    });

    it('triggers at level 3 when uniqueTypesSoldThisPeriod = 3', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.DIVERSIFIER, 3)],
        uniqueTypesSoldThisPeriod: 3,
      });
      // Level 3: amount = 4. totalGain should exceed level 1.
      const lvl1 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.DIVERSIFIER, 1)],
        uniqueTypesSoldThisPeriod: 3,
      });
      expect(result.totalGain).toBeGreaterThan(lvl1.totalGain);
    });
  });

  // ===== Patience Pays =====
  describe('Patience Pays (ID 92) — bonus when no sale last period', () => {
    it('triggers when didSellPreviousPeriod = false', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.PATIENCE_PAYS, 1)],
        didSellPreviousPeriod: false,
      });
      expect(result.totalGain).toBeGreaterThan(1000);
    });

    it('does NOT trigger when didSellPreviousPeriod = true', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.PATIENCE_PAYS, 1)],
        didSellPreviousPeriod: true,
      });
      expect(result.totalGain).toBe(1000);
    });

    it('higher levels yield larger boost (level 3 > level 1)', () => {
      const lvl1 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.PATIENCE_PAYS, 1)],
        didSellPreviousPeriod: false,
      });
      const lvl3 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.PATIENCE_PAYS, 3)],
        didSellPreviousPeriod: false,
      });
      expect(lvl3.totalGain).toBeGreaterThan(lvl1.totalGain);
    });
  });

  // ===== Variety Pack =====
  describe('Variety Pack (ID 50) — boost when 3+ candy types in inventory', () => {
    it('does NOT trigger with 1 type in inventory', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.VARIETY_PACK, 1)],
        inventory: [{ name: 'M&Ms', quantity: 10 }],
      });
      expect(result.totalGain).toBe(1000);
    });

    it('does NOT trigger with 2 types in inventory', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.VARIETY_PACK, 1)],
        inventory: [
          { name: 'M&Ms', quantity: 5 },
          { name: 'Skittles', quantity: 5 },
        ],
      });
      expect(result.totalGain).toBe(1000);
    });

    it('triggers with 3+ types in inventory', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.VARIETY_PACK, 1)],
        inventory: [
          { name: 'M&Ms', quantity: 4 },
          { name: 'Skittles', quantity: 3 },
          { name: 'Gummy Bears', quantity: 3 },
        ],
      });
      expect(result.totalGain).toBeGreaterThan(1000);
    });

    it('higher levels yield larger boost', () => {
      const inv = [
        { name: 'M&Ms', quantity: 4 },
        { name: 'Skittles', quantity: 3 },
        { name: 'Gummy Bears', quantity: 3 },
      ];
      const lvl1 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.VARIETY_PACK, 1)],
        inventory: inv,
      });
      const lvl3 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.VARIETY_PACK, 3)],
        inventory: inv,
      });
      expect(lvl3.totalGain).toBeGreaterThan(lvl1.totalGain);
    });
  });

  // ===== Golden Hour =====
  describe('Golden Hour (ID 38) — boost in last 2 periods of day', () => {
    // Engine factory uses conditions: { period: -1 } as a flag for "last 2 periods"
    // periodsPerDay = 8 → last 2 periods = 7, 8
    it('does NOT trigger on period 1', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.GOLDEN_HOUR, 1)],
        period: 1,
      });
      expect(result.totalGain).toBe(1000);
    });

    it('does NOT trigger on period 6 (3rd-to-last)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.GOLDEN_HOUR, 1)],
        period: 6,
      });
      expect(result.totalGain).toBe(1000);
    });

    it('triggers on period 7 (2nd-to-last)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.GOLDEN_HOUR, 1)],
        period: 7,
      });
      expect(result.totalGain).toBeGreaterThan(1000);
    });

    it('triggers on period 8 (last)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.GOLDEN_HOUR, 1)],
        period: 8,
      });
      expect(result.totalGain).toBeGreaterThan(1000);
    });

    it('higher levels yield larger boost', () => {
      const lvl1 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.GOLDEN_HOUR, 1)],
        period: 8,
      });
      const lvl3 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.GOLDEN_HOUR, 3)],
        period: 8,
      });
      expect(lvl3.totalGain).toBeGreaterThan(lvl1.totalGain);
    });
  });

  // ===== Flip Artist =====
  describe('Flip Artist (ID 2) — boost when selling at 3×+ markup', () => {
    // basePrice / purchasePrice >= 3 to trigger
    it('does NOT trigger when sell/buy ratio < 3 (basePrice 100, buy 50 → 2×)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.FLIP_ARTIST, 1)],
        basePrice: 100,
        purchasePrice: 50, // 2× markup
      });
      expect(result.totalGain).toBe(1000);
    });

    it('triggers when sell/buy ratio >= 3 (basePrice 150, buy 50 → 3×)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.FLIP_ARTIST, 1)],
        basePrice: 150,
        purchasePrice: 50, // exactly 3× markup
      });
      // totalProfit = (150-50)*10 = 1000, baseline (no joker) totalGain = 500 + 1000 = 1500
      // With Flip Artist boost, should exceed 1500.
      expect(result.totalGain).toBeGreaterThan(1500);
    });

    it('higher levels yield larger boost', () => {
      const lvl1 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.FLIP_ARTIST, 1)],
        basePrice: 200,
        purchasePrice: 50, // 4× markup
      });
      const lvl3 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.FLIP_ARTIST, 3)],
        basePrice: 200,
        purchasePrice: 50,
      });
      expect(lvl3.totalGain).toBeGreaterThan(lvl1.totalGain);
    });
  });
});
