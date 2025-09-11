/**
 * BASIC FUNCTIONALITY TEST
 * 
 * Simple tests to verify core functionality without complex dependencies.
 * This serves as a baseline to ensure the test environment is working.
 */

describe('Basic Functionality Tests', () => {
  describe('Mathematical Operations', () => {
    test('should calculate day from periodCount correctly', () => {
      const calculateDay = (periodCount: number) => Math.max(1, Math.floor(periodCount / 8) + 1);
      
      expect(calculateDay(0)).toBe(1);   // Period 0 = Day 1
      expect(calculateDay(7)).toBe(1);   // Period 7 = Day 1
      expect(calculateDay(8)).toBe(2);   // Period 8 = Day 2
      expect(calculateDay(16)).toBe(3);  // Period 16 = Day 3
      expect(calculateDay(39)).toBe(5);  // Period 39 = Day 5
    });

    test('should calculate period from periodCount correctly', () => {
      const calculatePeriod = (periodCount: number) => Math.max(1, (periodCount % 8) + 1);
      
      expect(calculatePeriod(0)).toBe(1);  // Period 0 = Period 1
      expect(calculatePeriod(1)).toBe(2);  // Period 1 = Period 2
      expect(calculatePeriod(7)).toBe(8);  // Period 7 = Period 8
      expect(calculatePeriod(8)).toBe(1);  // Period 8 = Period 1 (new day)
      expect(calculatePeriod(15)).toBe(8); // Period 15 = Period 8
    });

    test('should handle wallet balance calculations', () => {
      let balance = 20; // Starting balance
      
      // Test spending
      const spend = (amount: number) => {
        if (balance >= amount) {
          balance -= amount;
          return true;
        }
        return false;
      };
      
      expect(spend(10)).toBe(true);
      expect(balance).toBe(10);
      
      expect(spend(15)).toBe(false); // Can't spend more than balance
      expect(balance).toBe(10); // Balance unchanged
      
      // Test adding money
      const add = (amount: number) => {
        balance += amount;
      };
      
      add(25);
      expect(balance).toBe(35);
    });

    test('should calculate difficulty-based piggy bank amounts', () => {
      const getDifficultyDebt = (difficulty: 'easy' | 'medium' | 'hard') => {
        switch (difficulty) {
          case 'easy': return -5000;
          case 'medium': return -10000;
          case 'hard': return -30000;
        }
      };
      
      expect(getDifficultyDebt('easy')).toBe(-5000);
      expect(getDifficultyDebt('medium')).toBe(-10000);
      expect(getDifficultyDebt('hard')).toBe(-30000);
    });

    test('should calculate average cost correctly', () => {
      const calculateAverage = (purchases: Array<{qty: number, cost: number}>) => {
        let totalCost = 0;
        let totalQty = 0;
        
        purchases.forEach(purchase => {
          totalCost += purchase.qty * purchase.cost;
          totalQty += purchase.qty;
        });
        
        return totalQty > 0 ? totalCost / totalQty : 0;
      };
      
      // Single purchase
      expect(calculateAverage([{qty: 5, cost: 2.5}])).toBe(2.5);
      
      // Multiple purchases
      const multiPurchase = [
        {qty: 5, cost: 2.5}, // 5 * 2.5 = 12.5
        {qty: 3, cost: 3.0}  // 3 * 3.0 = 9.0
        // Total: 21.5 / 8 = 2.6875
      ];
      expect(calculateAverage(multiPurchase)).toBeCloseTo(2.6875);
      
      // Empty purchases
      expect(calculateAverage([])).toBe(0);
    });
  });

  describe('Game State Validation', () => {
    test('should validate period boundaries', () => {
      const isValidPeriod = (period: number) => period >= 1 && period <= 8;
      const isValidDay = (day: number) => day >= 1;
      
      // Valid periods
      expect(isValidPeriod(1)).toBe(true);
      expect(isValidPeriod(8)).toBe(true);
      expect(isValidPeriod(4)).toBe(true);
      
      // Invalid periods
      expect(isValidPeriod(0)).toBe(false);
      expect(isValidPeriod(9)).toBe(false);
      expect(isValidPeriod(-1)).toBe(false);
      
      // Valid days
      expect(isValidDay(1)).toBe(true);
      expect(isValidDay(100)).toBe(true);
      
      // Invalid days
      expect(isValidDay(0)).toBe(false);
      expect(isValidDay(-1)).toBe(false);
    });

    test('should validate money amounts', () => {
      const isValidAmount = (amount: number) => {
        return typeof amount === 'number' && 
               !isNaN(amount) && 
               isFinite(amount);
      };
      
      expect(isValidAmount(0)).toBe(true);
      expect(isValidAmount(10.50)).toBe(true);
      expect(isValidAmount(-5000)).toBe(true); // Negative for debt
      
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount('10' as any)).toBe(false);
    });

    test('should handle floating point precision', () => {
      const roundToCents = (amount: number) => Math.round(amount * 100) / 100;
      
      expect(roundToCents(10.456)).toBe(10.46);
      expect(roundToCents(10.454)).toBe(10.45);
      expect(roundToCents(0.1 + 0.2)).toBe(0.30); // Fixes JS floating point
    });
  });

  describe('Array and Object Operations', () => {
    test('should manage candy inventory correctly', () => {
      interface Candy {
        name: string;
        quantity: number;
        avgCost: number;
      }
      
      const inventory: Candy[] = [];
      
      const addCandy = (name: string, quantity: number, cost: number) => {
        const existing = inventory.find(c => c.name === name);
        if (existing) {
          const totalCost = (existing.avgCost * existing.quantity) + (cost * quantity);
          const totalQuantity = existing.quantity + quantity;
          existing.avgCost = totalCost / totalQuantity;
          existing.quantity = totalQuantity;
        } else {
          inventory.push({ name, quantity, avgCost: cost });
        }
      };
      
      const removeCandy = (name: string, quantity: number) => {
        const candy = inventory.find(c => c.name === name);
        if (candy && candy.quantity >= quantity) {
          candy.quantity -= quantity;
          if (candy.quantity === 0) {
            const index = inventory.indexOf(candy);
            inventory.splice(index, 1);
          }
          return true;
        }
        return false;
      };
      
      // Test adding
      addCandy('Skittles', 5, 2.5);
      expect(inventory).toHaveLength(1);
      expect(inventory[0]).toEqual({
        name: 'Skittles',
        quantity: 5,
        avgCost: 2.5
      });
      
      // Test adding more of same candy
      addCandy('Skittles', 3, 3.0);
      expect(inventory).toHaveLength(1);
      expect(inventory[0].quantity).toBe(8);
      expect(inventory[0].avgCost).toBeCloseTo(2.6875);
      
      // Test removing candy
      expect(removeCandy('Skittles', 3)).toBe(true);
      expect(inventory[0].quantity).toBe(5);
      
      // Test removing all candy
      expect(removeCandy('Skittles', 5)).toBe(true);
      expect(inventory).toHaveLength(0);
      
      // Test removing non-existent candy
      expect(removeCandy('M&Ms', 1)).toBe(false);
    });

    test('should manage joker collections correctly', () => {
      interface Joker {
        id: number;
        name: string;
        rarity: string;
      }
      
      const jokers: Joker[] = [];
      
      const addJoker = (joker: Joker) => {
        if (!jokers.find(j => j.id === joker.id)) {
          jokers.push(joker);
          return true;
        }
        return false; // Already have this joker
      };
      
      const removeJoker = (id: number) => {
        const index = jokers.findIndex(j => j.id === id);
        if (index !== -1) {
          jokers.splice(index, 1);
          return true;
        }
        return false;
      };
      
      const joker1 = { id: 1, name: 'Double Up', rarity: 'common' };
      const joker2 = { id: 2, name: 'Triple Up', rarity: 'uncommon' };
      
      expect(addJoker(joker1)).toBe(true);
      expect(jokers).toHaveLength(1);
      
      expect(addJoker(joker1)).toBe(false); // Duplicate
      expect(jokers).toHaveLength(1);
      
      expect(addJoker(joker2)).toBe(true);
      expect(jokers).toHaveLength(2);
      
      expect(removeJoker(1)).toBe(true);
      expect(jokers).toHaveLength(1);
      expect(jokers[0].id).toBe(2);
      
      expect(removeJoker(99)).toBe(false); // Non-existent
    });
  });

  describe('Random Number Generation', () => {
    test('should generate numbers within ranges', () => {
      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };
      
      // Mock Math.random for predictable testing
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);
      
      expect(randomInRange(10, 20)).toBe(15); // 0.5 * (20-10) + 10 = 15
      expect(randomInRange(0, 100)).toBe(50);
      
      Math.random = originalRandom;
    });

    test('should calculate probabilities correctly', () => {
      const willEventOccur = (probability: number) => {
        return Math.random() < probability;
      };
      
      // Mock for deterministic testing
      const originalRandom = Math.random;
      
      Math.random = jest.fn().mockReturnValue(0.3);
      expect(willEventOccur(0.5)).toBe(true); // 0.3 < 0.5
      expect(willEventOccur(0.2)).toBe(false); // 0.3 > 0.2
      
      Math.random = originalRandom;
    });
  });

  describe('Type Safety', () => {
    test('should handle type validation', () => {
      const isString = (value: any): value is string => typeof value === 'string';
      const isNumber = (value: any): value is number => typeof value === 'number' && !isNaN(value);
      const isPositive = (value: number): boolean => value > 0;
      
      expect(isString('hello')).toBe(true);
      expect(isString(123)).toBe(false);
      
      expect(isNumber(42)).toBe(true);
      expect(isNumber('42')).toBe(false);
      expect(isNumber(NaN)).toBe(false);
      
      expect(isPositive(10)).toBe(true);
      expect(isPositive(-5)).toBe(false);
      expect(isPositive(0)).toBe(false);
    });
  });
});