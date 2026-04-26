/**
 * Tests for the 33 new joker effects (IDs 57-93).
 * Covers size multipliers, conditional multipliers, profit/sell multipliers,
 * effect factory validation, and level scaling.
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

// Base params: M&Ms is small, chocolate + hard_candy
// profit = (100 - 50) * 10 = 500, purchaseValue = 500, totalGain = 1000
const baseSaleParams = {
  candyName: 'M&Ms', // small, chocolate + hard_candy
  basePrice: 100,
  purchasePrice: 50,
  quantity: 10,
  jokers: [] as any[],
  periodCount: 0,
  inventoryLimit: 30,
  activeEffects: [] as any[],
  hallPassModifiers: { salePriceBonusPercent: 0 },
  merchantEffects: [] as any[],
  consecutivePeriodSales: 0,
  totalCandiesSold: 0,
  hasEarlySaleToday: false,
  currentCash: 1000,
  inventoryCount: 10,
  day: 1,
  period: 1,
  periodsPerDay: 8,
  bulkEmpireStacks: 0,
  inventory: [{ name: 'M&Ms', quantity: 10 }],
};

describe('New Joker Effects (IDs 57-93)', () => {
  // ========================================================================
  // SIZE MULTIPLIERS
  // ========================================================================
  describe('Size Multipliers', () => {
    describe('Mint Condition (70) — small candy', () => {
      it('should add +1x multiplier on small candy (Gummy Bears)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Gummy Bears', // small, gummy + chewy
          jokers: [makeTestJoker(JOKER_IDS.MINT_CONDITION, 1)],
        });
        // multiplier = 1 + 1 = 2
        // boostedProfit = 500 * 1 = 500 (no profit boost jokers)
        // finalProfit = 500 * 2 = 1000
        // totalGain = 500 + 1000 = 1500
        expect(result.jokerMultiplier).toBe(2);
      });

      it('should NOT trigger on medium candy (Snickers)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Snickers', // medium
          jokers: [makeTestJoker(JOKER_IDS.MINT_CONDITION, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });

      it('should also trigger on small M&Ms', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'M&Ms', // small
          jokers: [makeTestJoker(JOKER_IDS.MINT_CONDITION, 1)],
        });
        expect(result.jokerMultiplier).toBe(2);
      });
    });

    describe('King Size (71) — big candy', () => {
      it('should add +1x multiplier on big candy (Tootsie Roll)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Tootsie Roll', // big, gummy + chocolate
          jokers: [makeTestJoker(JOKER_IDS.KING_SIZE, 1)],
        });
        expect(result.jokerMultiplier).toBe(2);
      });

      it('should NOT trigger on small candy (Gummy Bears)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Gummy Bears', // small
          jokers: [makeTestJoker(JOKER_IDS.KING_SIZE, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });

      it('should trigger on big Taffy', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Taffy', // big
          jokers: [makeTestJoker(JOKER_IDS.KING_SIZE, 1)],
        });
        expect(result.jokerMultiplier).toBe(2);
      });
    });

    describe('Medium Rare (72) — medium candy', () => {
      it('should add +1x multiplier on medium candy (Snickers)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Snickers', // medium, chocolate + chewy
          jokers: [makeTestJoker(JOKER_IDS.MEDIUM_RARE, 1)],
        });
        expect(result.jokerMultiplier).toBe(2);
      });

      it('should NOT trigger on small candy (Gummy Bears)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Gummy Bears', // small
          jokers: [makeTestJoker(JOKER_IDS.MEDIUM_RARE, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });

      it('should trigger on medium Bubble Gum', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Bubble Gum', // medium
          jokers: [makeTestJoker(JOKER_IDS.MEDIUM_RARE, 1)],
        });
        expect(result.jokerMultiplier).toBe(2);
      });
    });
  });

  // ========================================================================
  // CONDITIONAL MULTIPLIERS
  // ========================================================================
  describe('Conditional Multipliers', () => {
    describe('All In (61) — full stack + cash threshold', () => {
      it('L1 should trigger 4x when selling full stack and currentCash < $500', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          currentCash: 200,
          quantity: 10,
          inventory: [{ name: 'M&Ms', quantity: 10 }],
          jokers: [makeTestJoker(JOKER_IDS.ALL_IN, 1)],
        });
        // multiplier = 1 + (4 - 1) = 4
        expect(result.jokerMultiplier).toBe(4);
      });

      it('should NOT trigger at L1 when currentCash >= $500', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          currentCash: 500,
          quantity: 10,
          inventory: [{ name: 'M&Ms', quantity: 10 }],
          jokers: [makeTestJoker(JOKER_IDS.ALL_IN, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });

      it('should NOT trigger when NOT selling full stack (qty < ownedQty)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          currentCash: 100,
          quantity: 5, // sell only half
          inventory: [{ name: 'M&Ms', quantity: 10 }], // own 10
          jokers: [makeTestJoker(JOKER_IDS.ALL_IN, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });

      it('L2 cash threshold is $5k', () => {
        const below = calculateSaleTotal({
          ...baseSaleParams,
          currentCash: 4999,
          quantity: 10,
          inventory: [{ name: 'M&Ms', quantity: 10 }],
          jokers: [makeTestJoker(JOKER_IDS.ALL_IN, 2)],
        });
        expect(below.jokerMultiplier).toBe(6); // 1 + (6-1)
        const above = calculateSaleTotal({
          ...baseSaleParams,
          currentCash: 5000,
          quantity: 10,
          inventory: [{ name: 'M&Ms', quantity: 10 }],
          jokers: [makeTestJoker(JOKER_IDS.ALL_IN, 2)],
        });
        expect(above.jokerMultiplier).toBe(1);
      });

      it('L3 cash threshold is $15k', () => {
        const below = calculateSaleTotal({
          ...baseSaleParams,
          currentCash: 14999,
          quantity: 10,
          inventory: [{ name: 'M&Ms', quantity: 10 }],
          jokers: [makeTestJoker(JOKER_IDS.ALL_IN, 3)],
        });
        expect(below.jokerMultiplier).toBe(8); // 1 + (8-1)
        const above = calculateSaleTotal({
          ...baseSaleParams,
          currentCash: 15000,
          quantity: 10,
          inventory: [{ name: 'M&Ms', quantity: 10 }],
          jokers: [makeTestJoker(JOKER_IDS.ALL_IN, 3)],
        });
        expect(above.jokerMultiplier).toBe(1);
      });
    });

    describe('Lucky 7 (84) — selling exactly 7', () => {
      it('should trigger 7x when quantity === 7', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          quantity: 7,
          jokers: [makeTestJoker(JOKER_IDS.LUCKY_7, 1)],
        });
        // multiplier = 1 + (7 - 1) = 7
        expect(result.jokerMultiplier).toBe(7);
      });

      it('should NOT trigger when quantity !== 7', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          quantity: 6,
          jokers: [makeTestJoker(JOKER_IDS.LUCKY_7, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });
    });

    describe('Night Owl (85) — last period of day', () => {
      it('should trigger 3x in last period (period >= periodsPerDay - 1)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          period: 7,       // last period (0-indexed: periodsPerDay - 1 = 7)
          periodsPerDay: 8,
          jokers: [makeTestJoker(JOKER_IDS.NIGHT_OWL, 1)],
        });
        // multiplier = 1 + (3 - 1) = 3
        expect(result.jokerMultiplier).toBe(3);
      });

      it('should NOT trigger in early period', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          period: 2,
          periodsPerDay: 8,
          jokers: [makeTestJoker(JOKER_IDS.NIGHT_OWL, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });
    });

    describe('Last Stand (88) — quantity < 5', () => {
      it('should trigger 10x when selling < 5 candy', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          quantity: 3,
          jokers: [makeTestJoker(JOKER_IDS.LAST_STAND, 1)],
        });
        // multiplier = 1 + (10 - 1) = 10
        expect(result.jokerMultiplier).toBe(10);
      });

      it('should NOT trigger when quantity >= 5', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          quantity: 5,
          jokers: [makeTestJoker(JOKER_IDS.LAST_STAND, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });
    });

    describe('Peak Hours (91) — periods 3-5 (profit boost)', () => {
      it('should add to profit boost during period 3', () => {
        // Peak Hours is now a profit boost, not a multiplier
        // profitBoost += (2-1) = 1, so profitBoost = 2
        // multiplier stays at 1
        // totalProfit = 500, boostedProfit = 500 * 2 = 1000
        // totalGain = 500 + (1000 * 1) = 1500
        const result = calculateSaleTotal({
          ...baseSaleParams,
          period: 3,
          jokers: [makeTestJoker(JOKER_IDS.PEAK_HOURS, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
        expect(result.totalGain).toBe(1500);
      });

      it('should add to profit boost during period 5', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          period: 5,
          jokers: [makeTestJoker(JOKER_IDS.PEAK_HOURS, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
        expect(result.totalGain).toBe(1500);
      });

      it('should NOT trigger outside periods 3-5', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          period: 2,
          jokers: [makeTestJoker(JOKER_IDS.PEAK_HOURS, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
        expect(result.totalGain).toBe(1000); // No boost
      });
    });

    describe('Collector (82) — scales with joker count', () => {
      it('should scale multiplier with ownedJokerCount', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          ownedJokerCount: 5,
          jokers: [makeTestJoker(JOKER_IDS.COLLECTOR, 1)],
        });
        // L1: +0.3 per joker, 5 jokers = +1.5
        // multiplier = 1 + 1.5 = 2.5
        expect(result.jokerMultiplier).toBe(2.5);
      });

      it('should give no bonus when ownedJokerCount is 0', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          ownedJokerCount: 0,
          jokers: [makeTestJoker(JOKER_IDS.COLLECTOR, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });
    });

    describe('Minimalist (83) — exactly 3 jokers', () => {
      it('should trigger 3x when ownedJokerCount === 3', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          ownedJokerCount: 3,
          jokers: [makeTestJoker(JOKER_IDS.MINIMALIST, 1)],
        });
        // multiplier = 1 + (3 - 1) = 3
        expect(result.jokerMultiplier).toBe(3);
      });

      it('should NOT trigger when ownedJokerCount !== 3', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          ownedJokerCount: 4,
          jokers: [makeTestJoker(JOKER_IDS.MINIMALIST, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
      });
    });
  });

  // ========================================================================
  // PROFIT / SELL MULTIPLIERS
  // ========================================================================
  describe('Profit/Sell Multipliers', () => {
    describe('Sugar Rush (57) — sell multiplier', () => {
      it('should increase totalGain with 2x sell multiplier', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          jokers: [makeTestJoker(JOKER_IDS.SUGAR_RUSH, 1)],
        });
        // sell_multiplier 2x: multiplier = 1 + (2 - 1) = 2
        // finalProfit = 500 * 2 = 1000
        // totalGain = 500 + 1000 = 1500
        expect(result.jokerMultiplier).toBe(2);
        expect(result.totalGain).toBe(1500);
      });
    });

    describe('Contraband (60) — sell multiplier with risk', () => {
      it('should increase totalGain with 2x contraband boost', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          jokers: [makeTestJoker(JOKER_IDS.CONTRABAND, 1)],
        });
        // contraband_boost 2x: multiplier = 1 + (2 - 1) = 2
        // totalGain = 500 + (500 * 2) = 1500
        expect(result.jokerMultiplier).toBe(2);
        expect(result.totalGain).toBe(1500);
      });
    });

    describe('Hot Potato (62) — +3/+5/+7 mult on every sale (melt window handled in usePeriodAdvance)', () => {
      it('L1 should add +3 to multiplier (amount 4)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          jokers: [makeTestJoker(JOKER_IDS.HOT_POTATO, 1)],
        });
        // sell_multiplier amount 4: multiplier = 1 + (4 - 1) = 4
        // totalGain = 500 + (500 * 4) = 2500
        expect(result.jokerMultiplier).toBe(4);
        expect(result.totalGain).toBe(2500);
      });

      it('L3 should add +7 to multiplier (amount 8)', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          jokers: [makeTestJoker(JOKER_IDS.HOT_POTATO, 3)],
        });
        expect(result.jokerMultiplier).toBe(8);
      });
    });

    describe('Tax Collector (87) — % of sale as bonus', () => {
      it('should add 5% tax bonus to profit boost', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          jokers: [makeTestJoker(JOKER_IDS.TAX_COLLECTOR, 1)],
        });
        // tax_collector_boost adds 0.05 to profitBoost
        // profitBoost = 1 + 0.05 = 1.05
        // boostedProfit = 500 * 1.05 = 525
        // totalGain = 500 + 525 = 1025
        expect(result.totalGain).toBe(1025);
      });
    });

    describe('Momentum (89) — scales with consecutive sales (profit boost)', () => {
      it('should scale profit boost with consecutivePeriodSales', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          consecutivePeriodSales: 3,
          jokers: [makeTestJoker(JOKER_IDS.MOMENTUM, 1)],
        });
        // L1: +0.3 per consecutive sale, 3 sales = profitBoost += 0.9
        // profitBoost = 1.9, multiplier = 1
        // totalGain = 500 + (500 * 1.9 * 1) = 500 + 950 = 1450
        expect(result.jokerMultiplier).toBe(1);
        expect(result.totalGain).toBe(1450);
      });

      it('should give no bonus when consecutivePeriodSales is 0', () => {
        const result = calculateSaleTotal({
          ...baseSaleParams,
          consecutivePeriodSales: 0,
          jokers: [makeTestJoker(JOKER_IDS.MOMENTUM, 1)],
        });
        expect(result.jokerMultiplier).toBe(1);
        expect(result.totalGain).toBe(1000);
      });
    });
  });

  // ========================================================================
  // EFFECT FACTORY VALIDATION
  // ========================================================================
  describe('Effect Factory Validation', () => {
    describe('Loan Shark (58)', () => {
      it('should return income and debt effects', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, 1);
        expect(effects).toHaveLength(2);
        expect(effects[0].target).toBe('loan_shark_income');
        expect(effects[0].operation).toBe('add');
        expect(effects[0].amount).toBe(5000);
        // Debt target renamed from 'loan_shark_income' (w/ multiply) to
        // 'loan_shark_debt' (w/ add) for clarity. Amount stays negative.
        expect(effects[1].target).toBe('loan_shark_debt');
        expect(effects[1].operation).toBe('add');
        expect(effects[1].amount).toBe(-6000);
      });
    });

    describe('Compound Interest (63) — level scaling', () => {
      it('should return compound_interest_boost at L1 with 1.2x', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.COMPOUND_INTEREST, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('compound_interest_profit_boost');
        expect(effects[0].amount).toBe(1.2);
      });

      it('should scale to 1.6x at L3', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.COMPOUND_INTEREST, 3);
        expect(effects[0].amount).toBe(1.6);
      });
    });

    describe('Reputation (64)', () => {
      it('should return reputation_boost with add operation', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.REPUTATION, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('reputation_profit_boost');
        expect(effects[0].operation).toBe('add');
        expect(effects[0].amount).toBe(0.2);
      });
    });

    describe('Street Smarts (65)', () => {
      it('should return street_smarts_boost with add operation', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.STREET_SMARTS, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('street_smarts_boost');
        expect(effects[0].operation).toBe('add');
        expect(effects[0].amount).toBe(0.5);
      });
    });

    describe('Clearance Sale (73)', () => {
      it('should return clearance_sale_boost with add operation', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.CLEARANCE_SALE, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('clearance_sale_boost');
        expect(effects[0].operation).toBe('add');
        expect(effects[0].amount).toBe(0.10);
      });
    });

    describe('Piggy Bank Pro (74)', () => {
      it('should return stash_interest with 1.15x at L1', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.PIGGY_BANK_PRO, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('stash_interest');
        expect(effects[0].operation).toBe('multiply');
        expect(effects[0].amount).toBe(1.15);
      });
    });

    describe('Market Crash (75)', () => {
      it('should return price_manipulation with 0.5x at L1', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.MARKET_CRASH, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('price_manipulation');
        expect(effects[0].operation).toBe('multiply');
        expect(effects[0].amount).toBe(0.5);
        expect(effects[0].duration).toBe('one-time');
      });
    });

    describe('Inflation (76)', () => {
      it('should return price_manipulation with 2x at L1', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.INFLATION, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('price_manipulation');
        expect(effects[0].operation).toBe('multiply');
        expect(effects[0].amount).toBe(2);
        expect(effects[0].duration).toBe('one-time');
      });
    });

    describe('Lucky Charm (77)', () => {
      it('should return found_money_multiplier with 3x at L1', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.LUCKY_CHARM, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('found_money_multiplier');
        expect(effects[0].operation).toBe('multiply');
        expect(effects[0].amount).toBe(3);
      });
    });

    describe('Bully Bait (78)', () => {
      it('should return event_conversion with convert operation', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.BULLY_BAIT, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('event_conversion');
        expect(effects[0].operation).toBe('convert');
        expect(effects[0].amount).toBe(500);
      });
    });

    describe("Teacher's Pet (79)", () => {
      it('should return price_peek_hint with 1 candy at L1', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.TEACHERS_PET, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('price_peek_hint');
        expect(effects[0].operation).toBe('set');
        expect(effects[0].amount).toBe(1);
      });

      it('should scale to 2/3 candies at L2/L3', () => {
        expect(getJokerEffectsAtLevel(JOKER_IDS.TEACHERS_PET, 2)[0].amount).toBe(2);
        expect(getJokerEffectsAtLevel(JOKER_IDS.TEACHERS_PET, 3)[0].amount).toBe(3);
      });
    });

    describe('Class Clown (80)', () => {
      it('should return location_change_boost with +10% at L1', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.CLASS_CLOWN, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('location_change_boost');
        expect(effects[0].operation).toBe('add');
        expect(effects[0].amount).toBeCloseTo(0.1);
      });

      it('should scale to +25%/+50% at L2/L3', () => {
        expect(getJokerEffectsAtLevel(JOKER_IDS.CLASS_CLOWN, 2)[0].amount).toBeCloseTo(0.25);
        expect(getJokerEffectsAtLevel(JOKER_IDS.CLASS_CLOWN, 3)[0].amount).toBeCloseTo(0.5);
      });

      it('profit boost fires in calc only when previousLocation differs', () => {
        const fires = calculateSaleTotal({
          ...baseSaleParams,
          currentLocation: 'home room',
          previousLocation: 'gym',
          jokers: [makeTestJoker(JOKER_IDS.CLASS_CLOWN, 1)],
        });
        // profitBoost = 1 + 0.1 = 1.1, totalProfit=500, boosted=550, totalGain=1050
        expect(fires.totalGain).toBe(1050);

        const skips = calculateSaleTotal({
          ...baseSaleParams,
          currentLocation: 'home room',
          previousLocation: 'home room',
          jokers: [makeTestJoker(JOKER_IDS.CLASS_CLOWN, 1)],
        });
        // No boost — location unchanged
        expect(skips.totalGain).toBe(1000);
      });
    });

    describe('Detention Dodge (81)', () => {
      it('should return event_immunity for 1 day at L1', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.DETENTION_DODGE, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('event_immunity');
        expect(effects[0].operation).toBe('enable');
        expect(effects[0].amount).toBe(1);
        expect(effects[0].duration).toBe('one-time');
      });
    });

    describe('Spare Change (93)', () => {
      it('should return spare_change_income with $5 at L1', () => {
        const effects = getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, 1);
        expect(effects).toHaveLength(1);
        expect(effects[0].target).toBe('spare_change_income');
        expect(effects[0].operation).toBe('add');
        expect(effects[0].amount).toBe(5);
      });
    });
  });

  // ========================================================================
  // LEVEL SCALING
  // ========================================================================
  describe('Level Scaling', () => {
    describe('Mint Condition L1 vs L3', () => {
      it('L1 should add +1x, L3 should add +2x', () => {
        const effectsL1 = getJokerEffectsAtLevel(JOKER_IDS.MINT_CONDITION, 1);
        const effectsL3 = getJokerEffectsAtLevel(JOKER_IDS.MINT_CONDITION, 3);
        expect(effectsL1[0].amount).toBe(1);
        expect(effectsL3[0].amount).toBe(2);

        // Verify in calculateSaleTotal
        const resultL1 = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Gummy Bears', // small
          jokers: [makeTestJoker(JOKER_IDS.MINT_CONDITION, 1)],
        });
        const resultL3 = calculateSaleTotal({
          ...baseSaleParams,
          candyName: 'Gummy Bears', // small
          jokers: [makeTestJoker(JOKER_IDS.MINT_CONDITION, 3)],
        });
        // L1: multiplier = 1 + 1 = 2, L3: multiplier = 1 + 2 = 3
        expect(resultL1.jokerMultiplier).toBe(2);
        expect(resultL3.jokerMultiplier).toBe(3);
        expect(resultL3.totalGain).toBeGreaterThan(resultL1.totalGain);
      });
    });

    describe('All In L1 vs L3', () => {
      it('L1 should give 4x, L3 should give 8x', () => {
        const effectsL1 = getJokerEffectsAtLevel(JOKER_IDS.ALL_IN, 1);
        const effectsL3 = getJokerEffectsAtLevel(JOKER_IDS.ALL_IN, 3);
        expect(effectsL1[0].amount).toBe(4);
        expect(effectsL3[0].amount).toBe(8);

        const resultL1 = calculateSaleTotal({
          ...baseSaleParams,
          currentCash: 100,
          jokers: [makeTestJoker(JOKER_IDS.ALL_IN, 1)],
        });
        const resultL3 = calculateSaleTotal({
          ...baseSaleParams,
          currentCash: 100,
          jokers: [makeTestJoker(JOKER_IDS.ALL_IN, 3)],
        });
        // L1: multiplier = 4, L3: multiplier = 8
        expect(resultL1.jokerMultiplier).toBe(4);
        expect(resultL3.jokerMultiplier).toBe(8);
        expect(resultL3.totalGain).toBeGreaterThan(resultL1.totalGain);
      });
    });

    describe('Lucky 7 L1 vs L3', () => {
      it('L1 should give 7x, L3 should give 15x', () => {
        const effectsL1 = getJokerEffectsAtLevel(JOKER_IDS.LUCKY_7, 1);
        const effectsL3 = getJokerEffectsAtLevel(JOKER_IDS.LUCKY_7, 3);
        expect(effectsL1[0].amount).toBe(7);
        expect(effectsL3[0].amount).toBe(15);

        const resultL1 = calculateSaleTotal({
          ...baseSaleParams,
          quantity: 7,
          jokers: [makeTestJoker(JOKER_IDS.LUCKY_7, 1)],
        });
        const resultL3 = calculateSaleTotal({
          ...baseSaleParams,
          quantity: 7,
          jokers: [makeTestJoker(JOKER_IDS.LUCKY_7, 3)],
        });
        // L1: multiplier = 7, L3: multiplier = 15
        expect(resultL1.jokerMultiplier).toBe(7);
        expect(resultL3.jokerMultiplier).toBe(15);
        expect(resultL3.totalGain).toBeGreaterThan(resultL1.totalGain);
      });
    });
  });
});
