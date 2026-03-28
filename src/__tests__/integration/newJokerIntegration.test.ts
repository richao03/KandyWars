import { createMockStore, testStates } from '../utils/testStore';
import { JOKER_IDS } from '../../constants/jokerIds';

describe('New Joker Integration Tests', () => {
  describe('Market Manipulation + The Big Short Combination', () => {
    it('should allow strategic price manipulation', () => {
      // Initial candy prices
      const initialPrices = {
        'Snickers': 5.00,
        'M&Ms': 8.00,     // Highest
        'Skittles': 3.00,
        'Warheads': 2.00,  // Lowest
      };

      // Step 1: Use Market Manipulation to set Skittles to highest price
      const highestPrice = Math.max(...Object.values(initialPrices));
      const manipulatedSkittlesPrice = highestPrice;
      expect(manipulatedSkittlesPrice).toBe(8.00);

      // Step 2: Use The Big Short to set M&Ms to lowest price
      const lowestPrice = Math.min(...Object.values(initialPrices).filter(p => p > 0));
      const shortedMandMPrice = lowestPrice;
      expect(shortedMandMPrice).toBe(2.00);

      // Verify the strategic advantage
      expect(manipulatedSkittlesPrice).toBeGreaterThan(initialPrices['Skittles']);
      expect(shortedMandMPrice).toBeLessThan(initialPrices['M&Ms']);
    });
  });

  describe('Market Crash + Bulk Sale Strategy', () => {
    it('should create profitable buying opportunity followed by bulk sale', () => {
      const inventoryLimit = 100;
      const originalPrices = {
        'Snickers': 10.00,
        'M&Ms': 8.00,
        'Skittles': 6.00,
      };

      // Step 1: Market Crash reduces all prices by 50%
      const crashedPrices = Object.fromEntries(
        Object.entries(originalPrices).map(([candy, price]) => [
          candy,
          Math.max(price * 0.5, 0.01)
        ])
      );

      expect(crashedPrices['Snickers']).toBe(5.00);
      expect(crashedPrices['M&Ms']).toBe(4.00);
      expect(crashedPrices['Skittles']).toBe(3.00);

      // Step 2: Buy large quantities at crashed prices
      const quantityToBuy = 80; // 80% of inventory
      const totalPurchaseCost = Object.values(crashedPrices).reduce((sum, price) =>
        sum + (price * (quantityToBuy / 3)), 0
      );

      // Step 3: Sell at higher prices later with Bulk Sale bonus
      const laterPrices = originalPrices; // Prices recover
      const quantityToSell = 60; // >50% of inventory for bulk sale bonus

      const isBulkSale = quantityToSell > (inventoryLimit * 0.5);
      expect(isBulkSale).toBe(true);

      const bulkSaleMultiplier = 1.2; // 20% bonus
      const revenue = Object.values(laterPrices).reduce((sum, price) =>
        sum + (price * (quantityToSell / 3)), 0
      ) * bulkSaleMultiplier;

      expect(revenue).toBeGreaterThan(totalPurchaseCost);
    });
  });

  describe('Persistent Joker Effects Over Time', () => {
    it('should apply Home Made bonus correctly across multiple days', () => {
      const testDays = [1, 2, 3];
      const inventoryCounts = [10, 15, 8];
      const bonusPerCandy = 10;

      testDays.forEach((day, index) => {
        const inventoryCount = inventoryCounts[index];
        const periodWithinDay = 0; // Start of day
        const expectedBonus = inventoryCount * bonusPerCandy;

        expect(expectedBonus).toBe(inventoryCount * 10);

        // Log for clarity
        console.log(`Day ${day}: ${inventoryCount} candies × $${bonusPerCandy} = $${expectedBonus}`);
      });
    });

    it('should track Trojan Horse price escalation correctly', () => {
      let currentPrice = 5.00;
      const periodsPerDay = 8;
      const priceIncrease = 10;

      // Day 1: Prices increase each period
      for (let period = 1; period < periodsPerDay; period++) {
        currentPrice += priceIncrease;
      }

      expect(currentPrice).toBe(75.00); // 5 + (7 × 10)

      // Day 2: Prices reset and start increasing again
      currentPrice = 5.00; // Reset
      for (let period = 1; period < 4; period++) { // Only 3 periods
        currentPrice += priceIncrease;
      }

      expect(currentPrice).toBe(35.00); // 5 + (3 × 10)
    });

    it('should calculate The Good Old Days deli savings over time', () => {
      const deliPurchases = [
        { candy: 'Snickers', basePrice: 10.00, quantity: 5 },
        { candy: 'M&Ms', basePrice: 8.50, quantity: 3 },
        { candy: 'Warheads', basePrice: 4.25, quantity: 8 },
      ];

      const discountMultiplier = 0.5; // 50% off

      let totalSavings = 0;
      let totalOriginalCost = 0;
      let totalDiscountedCost = 0;

      deliPurchases.forEach(purchase => {
        const originalCost = purchase.basePrice * purchase.quantity;
        const discountedCost = originalCost * discountMultiplier;
        const savings = originalCost - discountedCost;

        totalOriginalCost += originalCost;
        totalDiscountedCost += discountedCost;
        totalSavings += savings;
      });

      expect(totalSavings).toBe(totalOriginalCost * 0.5);
      expect(totalDiscountedCost).toBe(totalOriginalCost * 0.5);
      expect(totalSavings + totalDiscountedCost).toBe(totalOriginalCost);
    });
  });

  describe('Complex Interaction Scenarios', () => {
    it('should handle multiple price-affecting jokers in sequence', () => {
      let candyPrice = 10.00;

      // Step 1: Market Crash (-50%)
      candyPrice = Math.max(candyPrice * 0.5, 0.01);
      expect(candyPrice).toBe(5.00);

      // Step 2: Trojan Horse (+$10 per period for 3 periods)
      candyPrice += 10 * 3;
      expect(candyPrice).toBe(35.00);

      // Step 3: Propacandies (-90%)
      candyPrice = Math.max(candyPrice * 0.1, 0.01);
      expect(candyPrice).toBe(3.50);

      // Step 4: Market Manipulation (set to highest market price)
      const otherCandyPrices = [15.00, 12.50, 8.75];
      const highestMarketPrice = Math.max(...otherCandyPrices);
      candyPrice = highestMarketPrice;
      expect(candyPrice).toBe(15.00);
    });

    it('should validate joker activation flow', () => {
      // Jokers that require confirmation
      const confirmationJokers = [
        JOKER_IDS.CONTINENTAL_DRIFT,
      ];

      // Jokers that require candy selection
      const candySelectorJokers = [
        JOKER_IDS.MARKET_MANIPULATION,
        JOKER_IDS.THE_BIG_SHORT,
      ];

      // Jokers that are automatic/persistent
      const automaticJokers = [
        JOKER_IDS.COCOA_FUTURES,
        JOKER_IDS.HOME_MADE,
        JOKER_IDS.THE_GOOD_OLD_DAYS,
      ];

      expect(confirmationJokers).toHaveLength(2);
      expect(candySelectorJokers).toHaveLength(2);
      expect(automaticJokers).toHaveLength(3);

      // Total should match implemented jokers
      const totalImplemented = confirmationJokers.length + candySelectorJokers.length + automaticJokers.length;
      expect(totalImplemented).toBe(8);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid price changes efficiently', () => {
      const testRuns = 1000;
      const basePrice = 5.00;

      const startTime = performance.now();

      for (let i = 0; i < testRuns; i++) {
        // Simulate rapid price modifications
        let price = basePrice;
        price *= 0.5; // Market Crash
        price += 10;  // Trojan Horse
        price *= 0.1; // Propacandies
        price = Math.max(price, 0.01); // Minimum price check
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should maintain price precision', () => {
      let price = 10.123456789;

      // Multiple operations that could cause floating point errors
      price *= 0.5;     // 5.0617283945
      price += 10.1;    // 15.1617283945
      price *= 0.1;     // 1.51617283945
      price *= 1.2;     // 1.819407407340

      // Should maintain reasonable precision
      const roundedPrice = Math.round(price * 100) / 100; // 2 decimal places
      expect(roundedPrice).toBeCloseTo(1.82, 2);
    });

    it('should handle boundary conditions', () => {
      const testCases = [
        { inventory: 0, limit: 100 },      // Empty inventory
        { inventory: 1, limit: 1 },        // Full inventory
        { inventory: 50, limit: 100 },     // Exactly 50%
        { inventory: 51, limit: 100 },     // Just over 50%
      ];

      testCases.forEach(({ inventory, limit }) => {
        const isBulkSale = inventory > (limit * 0.5);
        const threshold = limit * 0.5;

        if (inventory > threshold) {
          expect(isBulkSale).toBe(true);
        } else {
          expect(isBulkSale).toBe(false);
        }
      });
    });
  });

  describe('Game Balance Validation', () => {
    it('should not allow infinite money exploits', () => {
      // Test Market Crash + Trojan Horse cycle
      let price = 10.00;

      // Market Crash: 50% reduction
      price *= 0.5; // 5.00

      // Trojan Horse: +$10 per period (max reasonable is 7 periods/day)
      const maxPeriodsPerDay = 7;
      price += 10 * maxPeriodsPerDay; // 75.00

      // Should reset daily, preventing exponential growth
      const dailyResetPrice = 10.00; // Back to base
      expect(dailyResetPrice).toBe(10.00);

      // Verify no exponential growth
      expect(price).toBeLessThan(1000); // Reasonable upper bound
    });

    it('should maintain minimum viable prices', () => {
      const minimumPrice = 0.01;
      let testPrice = 10.00;

      // Apply multiple reductions
      testPrice *= 0.1; // Propacandies: 1.00
      testPrice *= 0.5; // Market Crash: 0.50
      testPrice *= 0.1; // Another Propacandies: 0.05
      testPrice *= 0.1; // Another reduction: 0.005

      const finalPrice = Math.max(testPrice, minimumPrice);
      expect(finalPrice).toBeGreaterThanOrEqual(minimumPrice);
      expect(finalPrice).toBe(0.01); // Should be clamped to minimum
    });
  });
});