/**
 * Tests for sale calculation correctness.
 * These verify the profit boost vs multiplier split works correctly
 * before and after optimization changes.
 */

import { calculateSaleTotal } from '../../utils/saleCalculations';
import { JOKER_IDS } from '../../constants/jokerIds';
import { getJokerEffectsAtLevel } from '../../utils/jokerEffectEngine';

// Helper to create a minimal joker object for testing
function makeTestJoker(id: number, level: number = 1) {
  return {
    id: id.toString(),
    name: `Joker ${id}`,
    level,
    effects: getJokerEffectsAtLevel(id, level),
  };
}

const baseSaleParams = {
  candyName: 'M&Ms', // chocolate + hard_candy
  basePrice: 100,
  purchasePrice: 50,
  quantity: 10,
  jokers: [],
  periodCount: 0,
  inventoryLimit: 30,
  activeEffects: [],
  hallPassModifiers: { salePriceBonusPercent: 0 },
  merchantEffects: [],
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

describe('Sale Calculations', () => {
  describe('Base profit calculation', () => {
    it('should calculate correct base profit with no jokers', () => {
      const result = calculateSaleTotal(baseSaleParams);
      // profit = (100 - 50) * 10 = 500
      // totalGain = purchaseValue + profit = 500 + 500 = 1000
      expect(result.profitPerUnit).toBe(50);
      expect(result.totalProfit).toBe(500);
      expect(result.purchaseValue).toBe(500);
      expect(result.totalGain).toBe(1000);
      expect(result.jokerMultiplier).toBe(1);
    });

    it('should return market value when selling at a loss', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        basePrice: 30, // below purchase price of 50
      });
      // selling at loss: totalGain = basePrice * quantity = 30 * 10 = 300
      expect(result.profitPerUnit).toBe(0);
      expect(result.totalGain).toBe(300);
    });
  });

  describe('[+Profit] Type multipliers (boost bucket)', () => {
    it('Cocoa Futures should boost chocolate candy profit', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.COCOA_FUTURES, 1)], // 1.5x chocolate
      });
      // M&Ms is chocolate+hard_candy, Cocoa Futures adds +0.5 to profitBoost
      // boostedProfit = 500 * 1.5 = 750
      // totalGain = 500 + 750 = 1250
      expect(result.totalGain).toBe(1250);
    });

    it('Combo Platter should activate when both types covered', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES, 1), // chocolate
          makeTestJoker(JOKER_IDS.HARD_KNOCKS, 1),   // hard_candy
          makeTestJoker(JOKER_IDS.COMBO_PLATTER, 1),  // +1x when both covered
        ],
      });
      // profitBoost = 1 + 0.5 (cocoa) + 0.5 (hard knocks) + 1.0 (combo platter) = 3.0
      // boostedProfit = 500 * 3.0 = 1500
      // totalGain = 500 + 1500 = 2000
      expect(result.totalGain).toBe(2000);
    });

    it('Combo Platter should NOT activate when only one type covered', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES, 1), // only chocolate covered
          makeTestJoker(JOKER_IDS.COMBO_PLATTER, 1),
        ],
      });
      // profitBoost = 1 + 0.5 (cocoa) = 1.5, combo platter inactive
      // boostedProfit = 500 * 1.5 = 750
      expect(result.totalGain).toBe(1250);
    });
  });

  describe('[xMult] Multipliers (multiplier bucket)', () => {
    it('Even Stevens should multiply when inventory limit is even', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 30, // even
        jokers: [makeTestJoker(JOKER_IDS.EVEN_STEVENS, 1)], // 1.5x
      });
      // multiplier = 1 + 0.5 = 1.5
      // totalGain = 500 + (500 * 1.5) = 500 + 750 = 1250
      expect(result.jokerMultiplier).toBe(1.5);
      expect(result.totalGain).toBe(1250);
    });

    it('Even Stevens should NOT multiply when inventory limit is odd', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 31,
        jokers: [makeTestJoker(JOKER_IDS.EVEN_STEVENS, 1)],
      });
      expect(result.jokerMultiplier).toBe(1);
      expect(result.totalGain).toBe(1000);
    });

    it('Early Bird should multiply on first sale of day', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hasEarlySaleToday: false,
        jokers: [makeTestJoker(JOKER_IDS.EARLY_BIRD, 1)],
      });
      expect(result.jokerMultiplier).toBe(1.5);
    });

    it('Early Bird should NOT multiply if already sold today', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hasEarlySaleToday: true,
        jokers: [makeTestJoker(JOKER_IDS.EARLY_BIRD, 1)],
      });
      expect(result.jokerMultiplier).toBe(1);
    });

    it('Flip Artist should multiply when markup is 3x+', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        basePrice: 150,
        purchasePrice: 50, // 3x markup
        jokers: [makeTestJoker(JOKER_IDS.FLIP_ARTIST, 1)],
      });
      expect(result.jokerMultiplier).toBe(1.5);
    });

    it('Flip Artist should NOT multiply when markup is below 3x', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        basePrice: 100,
        purchasePrice: 50, // only 2x markup
        jokers: [makeTestJoker(JOKER_IDS.FLIP_ARTIST, 1)],
      });
      expect(result.jokerMultiplier).toBe(1);
    });

    it('Variety Pack should multiply with 3+ candy types in inventory', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.VARIETY_PACK, 1)],
        inventory: [
          { name: 'M&Ms', quantity: 5 },          // chocolate + hard_candy
          { name: 'Gummy Bears', quantity: 5 },    // gummy + chewy
        ], // 4 types: chocolate, hard_candy, gummy, chewy
      });
      expect(result.jokerMultiplier).toBe(1.5);
    });

    it('Variety Pack should NOT multiply with < 3 candy types', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.VARIETY_PACK, 1)],
        inventory: [
          { name: 'M&Ms', quantity: 10 }, // only chocolate + hard_candy = 2 types
        ],
      });
      expect(result.jokerMultiplier).toBe(1);
    });

    it('Triple Threat should add to multiplier when 3+ types covered', () => {
      // Triple Threat needs 3+ candy types covered by type-multiplier jokers
      // Without other type-multiplier jokers, it should not trigger
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.TRIPLE_THREAT, 1)],
      });
      expect(result.jokerMultiplier).toBe(1);
    });
  });

  describe('Vacuum Sealer penalty', () => {
    it('should reduce multiplier by 2 (min 1x)', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.VACUUM_SEALER, 1)],
      });
      // multiplier = max(1, 1 - 2) = 1
      expect(result.jokerMultiplier).toBe(1);
    });

    it('should not reduce below 1x even with high penalty', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [
          makeTestJoker(JOKER_IDS.VACUUM_SEALER, 1),
          makeTestJoker(JOKER_IDS.EVEN_STEVENS, 1), // +0.5
        ],
        inventoryLimit: 30,
      });
      // multiplier = max(1, 1 + 0.5 - 2) = max(1, -0.5) = 1
      expect(result.jokerMultiplier).toBe(1);
    });
  });

  describe('Boost + Multiplier stacking', () => {
    it('should apply boost first, then multiplier', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 30,
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES, 1), // [+Profit] +0.5
          makeTestJoker(JOKER_IDS.EVEN_STEVENS, 1),   // [xMult] +0.5
        ],
      });
      // profitBoost = 1 + 0.5 = 1.5
      // boostedProfit = 500 * 1.5 = 750
      // multiplier = 1 + 0.5 = 1.5
      // finalProfit = 750 * 1.5 = 1125
      // totalGain = 500 + 1125 = 1625
      expect(result.totalGain).toBe(1625);
    });
  });

  describe('Level scaling', () => {
    it('type multiplier should scale with level', () => {
      const lv1 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.COCOA_FUTURES, 1)],
      });
      const lv3 = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [makeTestJoker(JOKER_IDS.COCOA_FUTURES, 3)],
      });
      // lv1: boost 1.5, lv3: boost 3.0
      expect(lv3.totalGain).toBeGreaterThan(lv1.totalGain);
    });
  });

  describe('Golden Hour', () => {
    it('should multiply in last 2 periods of day', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 7,
        periodsPerDay: 8, // period >= periodsPerDay - 1 → 7 >= 7
        jokers: [makeTestJoker(JOKER_IDS.GOLDEN_HOUR, 1)], // 1.5x
      });
      // multiplier = 1 + 0.5 = 1.5
      // totalGain = 500 + (500 * 1.5) = 1250
      expect(result.jokerMultiplier).toBe(1.5);
      expect(result.totalGain).toBe(1250);
    });

    it('should NOT multiply in early periods', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        period: 3,
        periodsPerDay: 8, // 3 < 7, condition not met
        jokers: [makeTestJoker(JOKER_IDS.GOLDEN_HOUR, 1)],
      });
      expect(result.jokerMultiplier).toBe(1);
      expect(result.totalGain).toBe(1000);
    });
  });

  describe('Odd Todd', () => {
    it('should multiply when inventory limit is odd', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 31, // odd
        jokers: [makeTestJoker(JOKER_IDS.ODD_TODD, 1)], // 1.5x
      });
      // multiplier = 1 + 0.5 = 1.5
      expect(result.jokerMultiplier).toBe(1.5);
      expect(result.totalGain).toBe(1250);
    });

    it('should NOT multiply when inventory limit is even', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        inventoryLimit: 30, // even
        jokers: [makeTestJoker(JOKER_IDS.ODD_TODD, 1)],
      });
      expect(result.jokerMultiplier).toBe(1);
      expect(result.totalGain).toBe(1000);
    });
  });

  describe('Bulk Discount', () => {
    it('should boost profit when quantity >= bulk threshold', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        quantity: 10, // >= 5 (lv1 threshold)
        jokers: [makeTestJoker(JOKER_IDS.BULK_DISCOUNT, 1)], // 1.5x profit boost
      });
      // profitBoost = 1 + 0.5 = 1.5
      // boostedProfit = 500 * 1.5 = 750
      // totalGain = 500 + 750 = 1250
      expect(result.totalGain).toBe(1250);
    });

    it('should NOT boost profit when quantity < bulk threshold', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        quantity: 3, // < 5 (lv1 threshold)
        jokers: [makeTestJoker(JOKER_IDS.BULK_DISCOUNT, 1)],
      });
      // profit = (100 - 50) * 3 = 150, no boost
      // totalGain = 150 + 150 = 300
      expect(result.totalGain).toBe(300);
    });
  });

  describe('Underdog', () => {
    it('should multiply when cash is below threshold', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        currentCash: 1000, // < 5000 (lv1 threshold)
        jokers: [makeTestJoker(JOKER_IDS.UNDERDOG, 1)], // 1.5x
      });
      // multiplier = 1 + 0.5 = 1.5
      expect(result.jokerMultiplier).toBe(1.5);
      expect(result.totalGain).toBe(1250);
    });

    it('should NOT multiply when cash >= threshold', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        currentCash: 5000, // >= 5000, condition not met
        jokers: [makeTestJoker(JOKER_IDS.UNDERDOG, 1)],
      });
      expect(result.jokerMultiplier).toBe(1);
      expect(result.totalGain).toBe(1000);
    });
  });

  describe('Broke and Hungry', () => {
    it('should multiply when cash is below threshold', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        currentCash: 1000, // < 2000 (lv1 threshold)
        jokers: [makeTestJoker(JOKER_IDS.BROKE_AND_HUNGRY, 1)], // 2x
      });
      // multiplier = 1 + (2 - 1) = 2
      expect(result.jokerMultiplier).toBe(2);
      expect(result.totalGain).toBe(1500);
    });

    it('should NOT multiply when cash >= threshold', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        currentCash: 2000, // >= 2000, condition not met
        jokers: [makeTestJoker(JOKER_IDS.BROKE_AND_HUNGRY, 1)],
      });
      expect(result.jokerMultiplier).toBe(1);
      expect(result.totalGain).toBe(1000);
    });
  });

  describe('Hall Pass integration', () => {
    it('should boost profit with salePriceBonusPercent', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        hallPassModifiers: { salePriceBonusPercent: 15 },
      });
      // profitBoost += (15 * 5) / 100 = 0.75
      // profitBoost = 1 + 0.75 = 1.75
      // boostedProfit = 500 * 1.75 = 875
      // totalGain = 500 + 875 = 1375
      expect(result.totalGain).toBe(1375);
      expect(result.hallPassBonus).toBe(375);
    });
  });

  describe('Multi-type stacking', () => {
    it('should stack Cocoa Futures + Hard Knocks + Combo Platter on dual-type candy', () => {
      const result = calculateSaleTotal({
        ...baseSaleParams,
        jokers: [
          makeTestJoker(JOKER_IDS.COCOA_FUTURES, 1),  // +0.5 profit boost (chocolate)
          makeTestJoker(JOKER_IDS.HARD_KNOCKS, 1),     // +0.5 profit boost (hard_candy)
          makeTestJoker(JOKER_IDS.COMBO_PLATTER, 1),   // +1.0 profit boost (both types covered)
        ],
      });
      // profitBoost = 1 + 0.5 (cocoa) + 0.5 (hard knocks) + 1.0 (combo platter) = 3.0
      // boostedProfit = 500 * 3.0 = 1500
      // totalGain = 500 + 1500 = 2000
      expect(result.totalGain).toBe(2000);
      expect(result.bonusBreakdown.length).toBe(3);
    });
  });
});
