/**
 * Tests for joker combo interactions.
 * Verifies that multiple jokers stack correctly when their conditions overlap.
 * Some tests target INTENDED behavior that other agents are wiring up.
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

// Base params: M&Ms (small, chocolate + hard_candy), profit $50/unit, 10 qty
const baseSaleParams = {
  candyName: 'M&Ms', // small, chocolate + hard_candy
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
  hasEarlySaleToday: true, // default: not first sale
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
};

// Baseline: totalProfit = (100-50)*10 = 500, purchaseValue = 500
// With no jokers: profitBoost=1, multiplier=1 -> totalGain = 500 + 500*1*1 = 1000

describe('Joker Combo Interactions', () => {

  // ===== 1. Size + Type stacking =====
  describe('Size + Type stacking', () => {
    it('Mint Condition + Cocoa Futures on M&Ms (small + chocolate): both fire', () => {
      // M&Ms: small, chocolate + hard_candy
      // Mint Condition (70): size_multiplier +1 on small -> multiplier += 1 => multiplier = 2
      // Cocoa Futures (23): type_multiplier multiply 1.5 on chocolate -> profitBoost += 0.5 => profitBoost = 1.5
      // boostedProfit = 500 * 1.5 = 750
      // finalProfit = 750 * 2 = 1500
      // totalGain = 500 + 1500 = 2000
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [
          makeTestJoker(JOKER_IDS.MINT_CONDITION),
          makeTestJoker(JOKER_IDS.COCOA_FUTURES),
        ],
      });
      expect(result.totalGain).toBe(2000);
      expect(result.jokerMultiplier).toBe(2);
    });

    it('King Size + Bear Market on Jaw Breaker (big + gummy): both fire', () => {
      // Jaw Breaker: big, hard_candy + gummy
      // King Size (71): size_multiplier +1 on big -> multiplier += 1 => multiplier = 2
      // Bear Market (19): type_multiplier ADD 1.5 on gummy -> multiplier += 1.5 => multiplier = 3.5
      // profitBoost = 1 (no profit boost jokers)
      // basePrice=200, purchasePrice=100, qty=10 -> totalProfit = 1000, purchaseValue = 1000
      // boostedProfit = 1000 * 1 = 1000
      // finalProfit = 1000 * 3.5 = 3500
      // totalGain = 1000 + 3500 = 4500
      const result = calculateSaleTotal({
        ...baseSaleParams,
        candyName: 'Jaw Breaker', // big, hard_candy + gummy
        basePrice: 200,
        purchasePrice: 100,
        quantity: 10,
        jokers: [
          makeTestJoker(JOKER_IDS.KING_SIZE),
          makeTestJoker(JOKER_IDS.BEAR_MARKET),
        ],
      });
      expect(result.totalGain).toBe(4500);
      expect(result.jokerMultiplier).toBe(3.5);
    });
  });

  // ===== 2. Mixed profit boost + multiplier conditionals =====
  describe('Mixed profit boost + multiplier conditionals', () => {
    it('Even Stevens (profit) + Night Owl (mult) + Peak Hours (profit): all conditions met', () => {
      // Even Stevens (29): conditional_profit_boost even, 1.5 -> profitBoost += 0.5
      // Night Owl (85): night_owl_boost, 3 -> multiplier += 2
      // Peak Hours (91): peak_hours_profit_boost, 2 -> profitBoost += 1
      // profitBoost = 1 + 0.5 + 1 = 2.5, multiplier = 1 + 2 = 3
      // boostedProfit = 500 * 2.5 = 1250
      // finalProfit = 1250 * 3 = 3750
      // totalGain = 500 + 3750 = 4250
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 30, // even -> Even Stevens fires
        period: 5,
        periodsPerDay: 6, // period >= 5 -> Night Owl fires; 3<=5<=5 -> Peak Hours fires
        jokers: [
          makeTestJoker(JOKER_IDS.EVEN_STEVENS),
          makeTestJoker(JOKER_IDS.NIGHT_OWL),
          makeTestJoker(JOKER_IDS.PEAK_HOURS),
        ],
      });
      expect(result.jokerMultiplier).toBe(3);
      expect(result.totalGain).toBe(4250);
    });

    it('Even Stevens (profit) + Odd Todd (mult): only one fires (even inventory)', () => {
      // inventoryLimit = 30 (even)
      // Even Stevens fires: profitBoost += 0.5
      // Odd Todd does NOT fire (even, not odd)
      // profitBoost = 1.5, multiplier = 1
      // totalGain = 500 + (500 * 1.5 * 1) = 500 + 750 = 1250
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 30,
        jokers: [
          makeTestJoker(JOKER_IDS.EVEN_STEVENS),
          makeTestJoker(JOKER_IDS.ODD_TODD),
        ],
      });
      expect(result.jokerMultiplier).toBe(1);
      expect(result.totalGain).toBe(1250);
    });
  });

  // ===== 3. Cash threshold combos =====
  describe('Cash threshold combos', () => {
    it('All In + Broke and Hungry: currentCash < $500 triggers both', () => {
      // All In (61): all_in_boost 4x, cashBelow 500 -> multiplier += 3
      // Broke and Hungry (52): cash_under_boost 2x, cashBelow 2000 -> multiplier += 1
      // currentCash = 100 (< 500 and < 2000)
      // multiplier = 1 + 3 + 1 = 5
      // totalGain = 500 + (500 * 1 * 5) = 500 + 2500 = 3000
      const result = calculateSaleTotal({
        ...baseSaleParams,
        currentCash: 100,
        jokers: [
          makeTestJoker(JOKER_IDS.ALL_IN),
          makeTestJoker(JOKER_IDS.BROKE_AND_HUNGRY),
        ],
      });
      expect(result.jokerMultiplier).toBe(5);
      expect(result.totalGain).toBe(3000);
    });

    it('Underdog (profit) + Broke and Hungry (mult): currentCash < $2000 triggers both', () => {
      // Underdog (49): cash_under_profit_boost 1.5x, cashBelow 5000 -> profitBoost += 0.5
      // Broke and Hungry (52): cash_under_boost 2x, cashBelow 2000 -> multiplier += 1
      // currentCash = 1000 (< 2000 and < 5000)
      // profitBoost = 1 + 0.5 = 1.5, multiplier = 1 + 1 = 2
      // boostedProfit = 500 * 1.5 = 750
      // finalProfit = 750 * 2 = 1500
      // totalGain = 500 + 1500 = 2000
      const result = calculateSaleTotal({
        ...baseSaleParams,
        currentCash: 1000,
        jokers: [
          makeTestJoker(JOKER_IDS.UNDERDOG),
          makeTestJoker(JOKER_IDS.BROKE_AND_HUNGRY),
        ],
      });
      expect(result.jokerMultiplier).toBe(2);
      expect(result.totalGain).toBe(2000);
    });
  });

  // ===== 4. Type coverage combos =====
  describe('Type coverage combos', () => {
    it('Cocoa Futures + Hard Knocks + Combo Platter on M&Ms: Combo fires', () => {
      // M&Ms: chocolate + hard_candy
      // Cocoa Futures covers chocolate, Hard Knocks covers hard_candy -> 2 types covered
      // Combo Platter fires (coveredTypes.size >= 2)
      // profitBoost = 1 + 0.5 (cocoa) + 0.5 (hard_knocks) + 1.0 (combo_platter) = 3.0
      // totalGain = 500 + (500 * 3.0 * 1) = 500 + 1500 = 2000
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES),
          makeTestJoker(JOKER_IDS.HARD_KNOCKS),
          makeTestJoker(JOKER_IDS.COMBO_PLATTER),
        ],
      });
      expect(result.totalGain).toBe(2000);
    });

    it('Cocoa Futures + Hard Knocks + Combo Platter + Triple Threat on M&Ms: Combo fires, Triple Threat does NOT', () => {
      // M&Ms: chocolate + hard_candy (only 2 types)
      // Triple Threat needs coveredTypes.size >= 3, but M&Ms only has 2 types
      // Even though we have type jokers for 2 types, the candy only HAS 2 types,
      // so coveredTypes can only be at most 2 -> Triple Threat does NOT fire
      // Adding Bear Market (gummy) doesn't help because M&Ms is not gummy
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES),
          makeTestJoker(JOKER_IDS.HARD_KNOCKS),
          makeTestJoker(JOKER_IDS.BEAR_MARKET), // gummy — but M&Ms is not gummy
          makeTestJoker(JOKER_IDS.COMBO_PLATTER),
          makeTestJoker(JOKER_IDS.TRIPLE_THREAT),
        ],
      });
      // Cocoa: profitBoost += 0.5, Hard Knocks: profitBoost += 0.5
      // Bear Market: gummy doesn't match M&Ms -> no effect
      // Combo Platter: 2 types covered -> profitBoost += 1.0
      // Triple Threat: only 2 types on candy match -> does NOT fire
      // profitBoost = 1 + 0.5 + 0.5 + 1.0 = 3.0
      // multiplier = 1
      // totalGain = 500 + (500 * 3.0) = 2000
      expect(result.totalGain).toBe(2000);
      expect(result.jokerMultiplier).toBe(1); // Triple Threat did NOT add to multiplier
    });

    it('Triple Threat cannot fire on any candy (all candies have exactly 2 types)', () => {
      // Triple Threat checks coveredTypes among the candy's own types.
      // Since all candies have exactly 2 types, coveredTypes.size max is 2 < 3.
      // Triple Threat can NEVER fire based on current candy registry + logic.
      // Test with M&Ms and all 6 type jokers:
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES),   // chocolate
          makeTestJoker(JOKER_IDS.HARD_KNOCKS),       // hard_candy
          makeTestJoker(JOKER_IDS.BEAR_MARKET),        // gummy
          makeTestJoker(JOKER_IDS.SOUR_LOGIC),         // sour
          makeTestJoker(JOKER_IDS.DOUBLE_DUTCH),       // chewy
          makeTestJoker(JOKER_IDS.TROPICAL_IMPORT),    // fruity
          makeTestJoker(JOKER_IDS.TRIPLE_THREAT),
        ],
      });
      // M&Ms has chocolate + hard_candy. Only those 2 types match.
      // coveredTypes.size = 2 < 3 -> Triple Threat does NOT fire
      expect(result.jokerMultiplier).toBe(1);
    });
  });

  // ===== 5. Sell multiplier stacking =====
  describe('Sell multiplier stacking', () => {
    it('Sugar Rush + Contraband: both add to multiplier', () => {
      // Sugar Rush (57): sell_multiplier 2 -> multiplier += (2-1) = 1
      // Contraband (60): contraband_boost 2 -> multiplier += (2-1) = 1
      // multiplier = 1 + 1 + 1 = 3
      // totalGain = 500 + (500 * 1 * 3) = 500 + 1500 = 2000
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [
          makeTestJoker(JOKER_IDS.SUGAR_RUSH),
          makeTestJoker(JOKER_IDS.CONTRABAND),
        ],
      });
      expect(result.jokerMultiplier).toBe(3);
      expect(result.totalGain).toBe(2000);
    });

    it('Sugar Rush + Contraband + Even Stevens: all stack in multiplier', () => {
      // Sugar Rush: multiplier += 1
      // Contraband: multiplier += 1
      // Even Stevens (inventoryLimit=30, even): profitBoost += 0.5 (now profit boost)
      // profitBoost = 1.5, multiplier = 1 + 1 + 1 = 3
      // boostedProfit = 500 * 1.5 = 750, finalProfit = 750 * 3 = 2250
      // totalGain = 500 + 2250 = 2750
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 30,
        jokers: [
          makeTestJoker(JOKER_IDS.SUGAR_RUSH),
          makeTestJoker(JOKER_IDS.CONTRABAND),
          makeTestJoker(JOKER_IDS.EVEN_STEVENS),
        ],
      });
      expect(result.jokerMultiplier).toBe(3);
      expect(result.totalGain).toBe(2750);
    });
  });

  // ===== 6. Quantity-based combos =====
  describe('Quantity-based combos', () => {
    it('Lucky 7 + Last Stand: sell 4 candy — Last Stand fires, Lucky 7 does not', () => {
      // qty = 4
      // Lucky 7 (84): fires only when qty === 7 -> does NOT fire
      // Last Stand (88): fires when qty < 5 -> fires, multiplier += (10-1) = 9
      // multiplier = 1 + 9 = 10
      // totalProfit = (100-50)*4 = 200, purchaseValue = 200
      // totalGain = 200 + (200 * 1 * 10) = 200 + 2000 = 2200
      const result = calculateSaleTotal({
        ...baseSaleParams,
        quantity: 4,
        jokers: [
          makeTestJoker(JOKER_IDS.LUCKY_7),
          makeTestJoker(JOKER_IDS.LAST_STAND),
        ],
      });
      expect(result.jokerMultiplier).toBe(10);
      expect(result.totalGain).toBe(2200);
    });

    it('Lucky 7 + Bulk Discount: sell 7 candy — Lucky 7 fires, Bulk Discount does NOT (threshold 20)', () => {
      // qty = 7
      // Lucky 7 (84): qty === 7 -> fires, multiplier += (7-1) = 6
      // Bulk Discount (47): qty < 20 -> does NOT fire
      // multiplier = 1 + 6 = 7
      // profitBoost = 1 (unchanged)
      // totalProfit = (100-50)*7 = 350, purchaseValue = 350
      // boostedProfit = 350 * 1 = 350
      // finalProfit = 350 * 7 = 2450
      // totalGain = 350 + 2450 = 2800
      const result = calculateSaleTotal({
        ...baseSaleParams,
        quantity: 7,
        jokers: [
          makeTestJoker(JOKER_IDS.LUCKY_7),
          makeTestJoker(JOKER_IDS.BULK_DISCOUNT),
        ],
      });
      expect(result.jokerMultiplier).toBe(7);
      expect(result.totalGain).toBe(2800);
    });

    it('Bulk Discount: sell 20 candy — fires at fixed threshold', () => {
      // qty = 20, meets threshold
      // profitBoost = 1 + 0.5 = 1.5
      // totalProfit = (100-50)*20 = 1000, purchaseValue = 1000
      // boostedProfit = 1000 * 1.5 = 1500
      // totalGain = 1000 + 1500 = 2500
      const result = calculateSaleTotal({
        ...baseSaleParams,
        quantity: 20,
        jokers: [makeTestJoker(JOKER_IDS.BULK_DISCOUNT)],
      });
      expect(result.jokerMultiplier).toBe(1);
      expect(result.totalGain).toBe(2500);
    });

    it('Bulk Discount: sell 19 candy — does NOT fire (under threshold)', () => {
      // qty = 19, below fixed threshold of 20
      // profitBoost = 1 (unchanged)
      // totalProfit = (100-50)*19 = 950, purchaseValue = 950
      // totalGain = 950 + 950 = 1900
      const result = calculateSaleTotal({
        ...baseSaleParams,
        quantity: 19,
        jokers: [makeTestJoker(JOKER_IDS.BULK_DISCOUNT)],
      });
      expect(result.totalGain).toBe(1900);
    });
  });

  // ===== 7. Mixed bucket stacking =====
  describe('Mixed bucket stacking', () => {
    it('Cocoa Futures (profit boost) + Even Stevens (profit boost) + Mint Condition (size mult) on small chocolate candy', () => {
      // M&Ms: small, chocolate + hard_candy
      // Cocoa Futures (23): profitBoost += 0.5 => profitBoost = 1.5
      // Even Stevens (29): profitBoost += 0.5 (inventoryLimit=30, even) => profitBoost = 2.0
      // Mint Condition (70): multiplier += 1 (small candy) => multiplier = 2
      // boostedProfit = 500 * 2.0 = 1000
      // finalProfit = 1000 * 2 = 2000
      // totalGain = 500 + 2000 = 2500
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 30,
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES),
          makeTestJoker(JOKER_IDS.EVEN_STEVENS),
          makeTestJoker(JOKER_IDS.MINT_CONDITION),
        ],
      });
      expect(result.jokerMultiplier).toBe(2);
      expect(result.totalGain).toBe(2500);
    });
  });

  // ===== 8. Extreme combo =====
  describe('Extreme combo', () => {
    it('5 compatible jokers stack across profit boost and multiplier', () => {
      // M&Ms: small, chocolate + hard_candy
      // Use: Mint Condition + Even Stevens + Sugar Rush + Contraband + Night Owl
      // Profit boost:
      //   Even Stevens (29): +0.5 (even inventoryLimit=30)
      // profitBoost = 1 + 0.5 = 1.5
      //
      // Multiplier:
      //   Mint Condition (70): +1 (small)
      //   Sugar Rush (57): +(2-1) = +1
      //   Contraband (60): +(2-1) = +1
      //   Night Owl (85): +(3-1) = +2 (period=7, periodsPerDay=8)
      // multiplier = 1 + 1 + 1 + 1 + 2 = 6
      //
      // boostedProfit = 500 * 1.5 = 750
      // finalProfit = 750 * 6 = 4500
      // totalGain = 500 + 4500 = 5000
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 30,
        period: 7,
        periodsPerDay: 8,
        jokers: [
          makeTestJoker(JOKER_IDS.MINT_CONDITION),
          makeTestJoker(JOKER_IDS.EVEN_STEVENS),
          makeTestJoker(JOKER_IDS.SUGAR_RUSH),
          makeTestJoker(JOKER_IDS.CONTRABAND),
          makeTestJoker(JOKER_IDS.NIGHT_OWL),
        ],
      });
      expect(result.jokerMultiplier).toBe(6);
      expect(result.totalGain).toBe(5000);
      expect(result.bonusBreakdown.length).toBe(5);
    });
  });
});
