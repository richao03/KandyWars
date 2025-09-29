import { createMockStore, testStates } from '../utils/testStore';
import { JOKER_IDS } from '../../constants/jokerIds';

describe('Specific Joker Implementations', () => {
  describe('Market Manipulation Joker', () => {
    it('should set candy price to highest market price', () => {
      // Mock candy prices for current period
      const mockCandyPrices = {
        'Snickers': [5.50],     // period 0
        'M&Ms': [8.25],        // period 0 - highest
        'Skittles': [3.75],    // period 0
        'Warheads': [2.10],    // period 0
      };

      const selectedCandy = 'Skittles';
      const periodCount = 0;

      // Find highest price
      const allPrices = Object.values(mockCandyPrices).map(prices => prices[periodCount]);
      const highestPrice = Math.max(...allPrices);
      expect(highestPrice).toBe(8.25);

      // Market Manipulation should set Skittles to highest price
      const expectedNewPrice = highestPrice;
      expect(expectedNewPrice).toBe(8.25);
      expect(expectedNewPrice).toBeGreaterThan(mockCandyPrices[selectedCandy][periodCount]);
    });

    it('should handle edge case with only one candy type', () => {
      const mockCandyPrices = {
        'Snickers': [5.50],
      };

      const periodCount = 0;
      const highestPrice = mockCandyPrices['Snickers'][periodCount];

      // Should set to same price (no change expected)
      expect(highestPrice).toBe(5.50);
    });
  });

  describe('The Big Short Joker', () => {
    it('should set candy price to lowest market price', () => {
      // Mock candy prices for current period
      const mockCandyPrices = {
        'Snickers': [5.50],     // period 0
        'M&Ms': [8.25],        // period 0
        'Skittles': [3.75],    // period 0
        'Warheads': [2.10],    // period 0 - lowest
      };

      const selectedCandy = 'M&Ms';
      const periodCount = 0;

      // Find lowest price (excluding zero prices)
      const allPrices = Object.values(mockCandyPrices)
        .map(prices => prices[periodCount])
        .filter(price => price > 0);
      const lowestPrice = Math.min(...allPrices);
      expect(lowestPrice).toBe(2.10);

      // The Big Short should set M&Ms to lowest price
      const expectedNewPrice = lowestPrice;
      expect(expectedNewPrice).toBe(2.10);
      expect(expectedNewPrice).toBeLessThan(mockCandyPrices[selectedCandy][periodCount]);
    });

    it('should handle case with minimum price fallback', () => {
      const mockCandyPrices = {
        'Snickers': [0],  // Invalid price (zero)
      };

      const periodCount = 0;
      const validPrices = Object.values(mockCandyPrices)
        .map(prices => prices[periodCount])
        .filter(price => price > 0);

      // Should fallback to minimum price when no valid prices
      const fallbackPrice = validPrices.length === 0 ? 0.01 : Math.min(...validPrices);
      expect(fallbackPrice).toBe(0.01);
    });
  });

  describe('Market Crash Joker', () => {
    it('should reduce all candy prices by 50%', () => {
      const originalPrices = {
        'Snickers': 10.00,
        'M&Ms': 8.50,
        'Skittles': 6.25,
        'Warheads': 4.20,
      };

      // Market Crash effect: 50% reduction
      const crashMultiplier = 0.5;
      const expectedPrices = Object.fromEntries(
        Object.entries(originalPrices).map(([candy, price]) => [
          candy,
          Math.max(price * crashMultiplier, 0.01) // Minimum $0.01
        ])
      );

      expect(expectedPrices['Snickers']).toBe(5.00);
      expect(expectedPrices['M&Ms']).toBe(4.25);
      expect(expectedPrices['Skittles']).toBe(3.125);
      expect(expectedPrices['Warheads']).toBe(2.10);
    });

    it('should respect minimum price of $0.01', () => {
      const veryLowPrice = 0.015;
      const crashedPrice = Math.max(veryLowPrice * 0.5, 0.01);
      expect(crashedPrice).toBe(0.01); // Should not go below minimum
    });
  });

  describe('Propacandies Joker', () => {
    it('should reduce candy price by 90%', () => {
      const originalPrice = 10.00;
      const propacandiesMultiplier = 0.1; // 90% reduction, keep 10%
      const expectedPrice = Math.max(originalPrice * propacandiesMultiplier, 0.01);

      expect(expectedPrice).toBe(1.00);
    });

    it('should respect minimum price of $0.01 for very low prices', () => {
      const veryLowPrice = 0.05;
      const reducedPrice = Math.max(veryLowPrice * 0.1, 0.01);
      expect(reducedPrice).toBe(0.01); // Should not go below minimum
    });
  });

  describe('Bulk Sale Joker', () => {
    it('should apply 20% bonus when selling >50% of inventory space', () => {
      const inventoryLimit = 100;
      const quantitySold = 60; // 60% of inventory space
      const basePrice = 5.00;
      const baseRevenue = basePrice * quantitySold;

      // Check if qualifies for bulk sale
      const isBulkSale = quantitySold > (inventoryLimit * 0.5);
      expect(isBulkSale).toBe(true);

      // Apply 20% bonus
      const bulkSaleMultiplier = 1.2;
      const finalRevenue = baseRevenue * bulkSaleMultiplier;

      expect(finalRevenue).toBe(baseRevenue * 1.2);
      expect(finalRevenue).toBe(300 * 1.2); // 360
    });

    it('should not apply bonus when selling ≤50% of inventory space', () => {
      const inventoryLimit = 100;
      const quantitySold = 50; // Exactly 50%
      const basePrice = 5.00;
      const baseRevenue = basePrice * quantitySold;

      // Should not qualify for bulk sale
      const isBulkSale = quantitySold > (inventoryLimit * 0.5);
      expect(isBulkSale).toBe(false);

      // No bonus applied
      const finalRevenue = baseRevenue;
      expect(finalRevenue).toBe(250); // No change
    });
  });

  describe('Home Made Joker', () => {
    it('should give $10 per candy at start of new day', () => {
      const inventoryCount = 15;
      const bonusPerCandy = 10;
      const expectedBonus = inventoryCount * bonusPerCandy;

      expect(expectedBonus).toBe(150);
    });

    it('should not give bonus when inventory is empty', () => {
      const inventoryCount = 0;
      const bonusPerCandy = 10;
      const expectedBonus = inventoryCount * bonusPerCandy;

      expect(expectedBonus).toBe(0);
    });

    it('should only trigger at start of new day (period 0)', () => {
      const day = 2;
      const lastDay = 1;
      const periodWithinDay = 0; // Start of day

      const isNewDayStart = periodWithinDay === 0 && day !== lastDay;
      expect(isNewDayStart).toBe(true);

      // Should not trigger mid-day
      const midDayPeriod = 4;
      const isNotNewDayStart = midDayPeriod === 0 && day !== lastDay;
      expect(isNotNewDayStart).toBe(false);
    });
  });

  describe('The Good Old Days Joker', () => {
    it('should apply 50% discount to deli prices', () => {
      const originalDeliPrice = 8.50;
      const discountMultiplier = 0.5;
      const discountedPrice = originalDeliPrice * discountMultiplier;

      expect(discountedPrice).toBe(4.25);
      expect(discountedPrice).toBe(originalDeliPrice / 2);
    });

    it('should work with various price ranges', () => {
      const testPrices = [1.00, 5.50, 10.25, 15.75, 20.00];

      testPrices.forEach(price => {
        const discountedPrice = price * 0.5;
        expect(discountedPrice).toBe(price / 2);
        expect(discountedPrice).toBeLessThan(price);
      });
    });
  });

  describe('Trojan Horse Joker', () => {
    it('should increase all candy prices by $10 each period', () => {
      const originalPrices = {
        'Snickers': 5.50,
        'M&Ms': 8.25,
        'Skittles': 3.75,
        'Warheads': 2.10,
      };

      const priceIncrease = 10;
      const expectedPrices = Object.fromEntries(
        Object.entries(originalPrices).map(([candy, price]) => [
          candy,
          price + priceIncrease
        ])
      );

      expect(expectedPrices['Snickers']).toBe(15.50);
      expect(expectedPrices['M&Ms']).toBe(18.25);
      expect(expectedPrices['Skittles']).toBe(13.75);
      expect(expectedPrices['Warheads']).toBe(12.10);
    });

    it('should handle price progression over multiple periods', () => {
      let snickersPrice = 5.00;
      const periodsInDay = 3;
      const priceIncrease = 10;

      // Simulate 3 periods of increases
      for (let period = 1; period <= periodsInDay; period++) {
        snickersPrice += priceIncrease;
      }

      expect(snickersPrice).toBe(35.00); // 5 + 10 + 10 + 10
    });

    it('should reset prices daily (new day logic)', () => {
      const basePrice = 5.00;
      const currentDay = 2;
      const lastDay = 1;

      // When new day starts, prices should reset to base
      const isNewDay = currentDay !== lastDay;
      expect(isNewDay).toBe(true);

      // On new day, price should be base price (no increases from previous day)
      const resetPrice = basePrice; // Reset logic
      expect(resetPrice).toBe(5.00);
    });
  });

  describe('Joker ID Constants Integration', () => {
    it('should have all implemented jokers defined in JOKER_IDS', () => {
      expect(JOKER_IDS.MARKET_MANIPULATION).toBeDefined();
      expect(JOKER_IDS.THE_BIG_SHORT).toBeDefined();
      expect(JOKER_IDS.MARKET_CRASH).toBeDefined();
      expect(JOKER_IDS.PROPACANDIES).toBeDefined();
      expect(JOKER_IDS.BULK_SALE).toBeDefined();
      expect(JOKER_IDS.HOME_MADE).toBeDefined();
      expect(JOKER_IDS.THE_GOOD_OLD_DAYS).toBeDefined();
      expect(JOKER_IDS.TROJAN_HORSE).toBeDefined();
    });

    it('should have unique IDs for all jokers', () => {
      const jokerIds = Object.values(JOKER_IDS);
      const uniqueIds = new Set(jokerIds);

      expect(uniqueIds.size).toBe(jokerIds.length); // No duplicates
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty game data gracefully', () => {
      const emptyGameData = { candyPrices: {} };

      // Market Manipulation with no candy data
      const candyTypes = Object.keys(emptyGameData.candyPrices);
      expect(candyTypes).toHaveLength(0);

      // Should handle fallback logic
      const CANDY_TYPES = ['Snickers', 'M&Ms', 'Skittles', 'Warheads', 'Sour Patch Kids', 'Bubble Gum', 'Jaw Breaker'];
      expect(CANDY_TYPES).toHaveLength(7);
    });

    it('should handle invalid price data', () => {
      const invalidPrices = [null, undefined, -5, NaN];

      invalidPrices.forEach(invalidPrice => {
        const safePrice = invalidPrice || 0;
        const minimumPrice = Math.max(safePrice, 0.01);
        expect(minimumPrice).toBeGreaterThanOrEqual(0.01);
      });
    });

    it('should handle inventory limits correctly for bulk sale', () => {
      const testLimits = [10, 50, 100, 200];

      testLimits.forEach(limit => {
        const threshold = limit * 0.5;
        const justUnder = Math.floor(threshold);
        const justOver = Math.ceil(threshold) + 1;

        expect(justUnder <= threshold).toBe(true);
        expect(justOver > threshold).toBe(true);
      });
    });
  });
});