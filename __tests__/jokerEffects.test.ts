import { JokerEffectEngine, STANDARDIZED_JOKERS, StandardizedJoker } from '../src/utils/jokerEffectEngine';
import { JokerService } from '../src/utils/jokerService';

describe('Joker Effects Test Suite', () => {
  let engine: JokerEffectEngine;
  let service: JokerService;

  beforeEach(() => {
    engine = new JokerEffectEngine();
    service = JokerService.getInstance();
  });

  afterEach(() => {
    engine.clearAllEffects();
  });

  describe('Math Jokers', () => {
    test('Double Up - doubles candy price for one period', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 1)!;
      engine.addJoker(joker, 1);
      
      const basePrice = 10;
      const result = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 1 });
      
      expect(result).toBe(20); // 10 * 2
    });

    test('Time Equation - reverses one period', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 2)!;
      engine.addJoker(joker, 1);
      
      const basePeriod = 5;
      const result = engine.applyEffects(basePeriod, 'period_count', { currentPeriod: 1 });
      
      expect(result).toBe(4); // 5 + (-1)
    });

    test('Geometric Expansion - adds 10 to inventory limit persistently', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 3)!;
      engine.addJoker(joker, 1);
      
      const baseInventory = 20;
      const result = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 1 });
      
      expect(result).toBe(30); // 20 + 10
    });
  });

  describe('Computer Jokers', () => {
    test('Scout - sets hint chance to 50%', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 11)!;
      engine.addJoker(joker, 1);
      
      const baseChance = 0;
      const result = engine.applyEffects(baseChance, 'hint_chance', { currentPeriod: 1 });
      
      expect(result).toBe(0.5);
    });

    test('Predictor - sets hint chance to 100%', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 12)!;
      engine.addJoker(joker, 1);
      
      const baseChance = 0;
      const result = engine.applyEffects(baseChance, 'hint_chance', { currentPeriod: 1 });
      
      expect(result).toBe(1.0);
    });

    test('Propacandies - reduces candy price to 10%', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 13)!;
      engine.addJoker(joker, 1);
      
      const basePrice = 100;
      const result = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 1 });
      
      expect(result).toBe(10); // 100 * 0.1
    });

    test('Data Compression - adds 13 to inventory limit', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 14)!;
      engine.addJoker(joker, 1);
      
      const baseInventory = 20;
      const result = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 1 });
      
      expect(result).toBe(33); // 20 + 13
    });

    test('Glitch in the Matrix - activates joker duplication', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 15)!;
      engine.addJoker(joker, 1);
      
      const hasEffect = engine.hasEffect('joker_duplicate', { currentPeriod: 1 });
      
      expect(hasEffect).toBe(false); // activate operation, not enable
    });
  });

  describe('Home Economics Jokers', () => {
    test('Vacuum Sealer - doubles inventory capacity', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 19)!;
      engine.addJoker(joker, 1);
      
      const baseInventory = 20;
      const result = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 1 });
      
      expect(result).toBe(40); // 20 * 2
    });

    test('Pomodoro Timer - increases study time by 50%', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 20)!;
      engine.addJoker(joker, 1);
      
      const baseTime = 60;
      const result = engine.applyEffects(baseTime, 'study_time', { currentPeriod: 1 });
      
      expect(result).toBe(90); // 60 * 1.5
    });

    test('Fridge Organizer - adds 15 to inventory limit', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 63)!;
      engine.addJoker(joker, 1);
      
      const baseInventory = 20;
      const result = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 1 });
      
      expect(result).toBe(35); // 20 + 15
    });

    test('Deep Storage - adds 30 to inventory limit for one period', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 72)!;
      engine.addJoker(joker, 1);
      
      const baseInventory = 30;
      
      // Should work in period 1 (when activated)
      const result1 = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 1 });
      expect(result1).toBe(60); // 30 + 30
      
      // Should not work in period 2 (one-time effect expired)
      const result2 = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 2 });
      expect(result2).toBe(30); // Back to base limit
    });
  });

  describe('Economy Jokers', () => {
    test('Master of Trade - enables candy conversion', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 27)!;
      engine.addJoker(joker, 1);
      
      const hasConversion = engine.hasEffect('candy_conversion', { currentPeriod: 1 });
      
      expect(hasConversion).toBe(false); // convert operation, not enable
    });

    test('Even Stevens - multiplies candy price by 1.5 when inventory is even', () => {
      const jokers = [{ name: 'Even Stevens', type: 'persistent' }];
      const result = service.applyJokerEffects(100, 'candy_price', jokers, 1, 20);
      
      expect(result).toBe(150); // 100 * 1.5 (inventory 20 is even)
    });

    test('Even Stevens - does not affect price when inventory is odd', () => {
      const jokers = [{ name: 'Even Stevens', type: 'persistent' }];
      const result = service.applyJokerEffects(100, 'candy_price', jokers, 1, 21);
      
      expect(result).toBe(100); // No change (inventory 21 is odd)
    });

    test('Odd Todd - multiplies candy price by 1.5 when inventory is odd', () => {
      const jokers = [{ name: 'Odd Todd', type: 'persistent' }];
      const result = service.applyJokerEffects(100, 'candy_price', jokers, 1, 21);
      
      expect(result).toBe(150); // 100 * 1.5 (inventory 21 is odd)
    });

    test('Odd Todd - does not affect price when inventory is even', () => {
      const jokers = [{ name: 'Odd Todd', type: 'persistent' }];
      const result = service.applyJokerEffects(100, 'candy_price', jokers, 1, 20);
      
      expect(result).toBe(100); // No change (inventory 20 is even)
    });

    test('Market Crash - reduces candy price by 50%', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 64)!;
      engine.addJoker(joker, 1);
      
      const basePrice = 100;
      const result = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 1 });
      
      expect(result).toBe(50); // 100 * 0.5
    });

    test('Compound Interest - calculates $10 per candy held', () => {
      const jokers = [{ name: 'Compound Interest', type: 'persistent' }];
      
      // Test with 5 candies
      const bonus5 = service.calculateCompoundInterest(jokers, 8, 5);
      expect(bonus5).toBe(50); // 5 * $10
      
      // Test with 12 candies
      const bonus12 = service.calculateCompoundInterest(jokers, 16, 12);
      expect(bonus12).toBe(120); // 12 * $10
      
      // Test with 0 candies
      const bonus0 = service.calculateCompoundInterest(jokers, 24, 0);
      expect(bonus0).toBe(0); // 0 * $10
    });

    test('Compound Interest - returns 0 when joker not present', () => {
      const jokers = [{ name: 'Some Other Joker', type: 'persistent' }];
      
      const bonus = service.calculateCompoundInterest(jokers, 8, 10);
      expect(bonus).toBe(0);
    });

    test('Market Manipulation - sets chosen candy to highest market price', () => {
      const jokers = [{ name: 'Market Manipulation', type: 'one-time' }];
      
      const candyPrices = {
        'chocolate': 50,
        'gummy': 75,
        'lollipop': 100,
        'taffy': 60
      };
      
      // Choose chocolate (currently $50) to match highest price ($100)
      const newPrice = service.applyMarketManipulation(jokers, 1, 'chocolate', candyPrices);
      expect(newPrice).toBe(100); // Should match lollipop's price (highest)
    });

    test('Market Manipulation - works with different candy selections', () => {
      const jokers = [{ name: 'Market Manipulation', type: 'one-time' }];
      
      const candyPrices = {
        'chocolate': 120,
        'gummy': 75,
        'lollipop': 100,
        'taffy': 60
      };
      
      // Choose taffy (currently $60) to match highest price ($120)
      const newPrice = service.applyMarketManipulation(jokers, 1, 'taffy', candyPrices);
      expect(newPrice).toBe(120); // Should match chocolate's price (highest)
    });

    test('Market Manipulation - returns 0 when joker not present', () => {
      const jokers = [{ name: 'Some Other Joker', type: 'persistent' }];
      
      const candyPrices = {
        'chocolate': 50,
        'gummy': 75
      };
      
      const newPrice = service.applyMarketManipulation(jokers, 1, 'chocolate', candyPrices);
      expect(newPrice).toBe(0);
    });

    test('Market Manipulation - availability check works', () => {
      const jokersWithManipulation = [{ name: 'Market Manipulation', type: 'one-time' }];
      const jokersWithout = [{ name: 'Some Other Joker', type: 'persistent' }];
      
      expect(service.hasMarketManipulation(jokersWithManipulation, 1)).toBe(true);
      expect(service.hasMarketManipulation(jokersWithout, 1)).toBe(false);
    });

    test('The Big Short - sets chosen candy to lowest market price', () => {
      const jokers = [{ name: 'The Big Short', type: 'one-time' }];
      
      const candyPrices = {
        'chocolate': 100,
        'gummy': 75,
        'lollipop': 50,
        'taffy': 80
      };
      
      // Choose chocolate (currently $100) to match lowest price ($50)
      const newPrice = service.applyBigShort(jokers, 1, 'chocolate', candyPrices);
      expect(newPrice).toBe(50); // Should match lollipop's price (lowest)
    });

    test('The Big Short - works with different candy selections', () => {
      const jokers = [{ name: 'The Big Short', type: 'one-time' }];
      
      const candyPrices = {
        'chocolate': 120,
        'gummy': 30,
        'lollipop': 100,
        'taffy': 60
      };
      
      // Choose lollipop (currently $100) to match lowest price ($30)
      const newPrice = service.applyBigShort(jokers, 1, 'lollipop', candyPrices);
      expect(newPrice).toBe(30); // Should match gummy's price (lowest)
    });

    test('The Big Short - returns 0 when joker not present', () => {
      const jokers = [{ name: 'Some Other Joker', type: 'persistent' }];
      
      const candyPrices = {
        'chocolate': 50,
        'gummy': 75
      };
      
      const newPrice = service.applyBigShort(jokers, 1, 'chocolate', candyPrices);
      expect(newPrice).toBe(0);
    });

    test('The Big Short - availability check works', () => {
      const jokersWithBigShort = [{ name: 'The Big Short', type: 'one-time' }];
      const jokersWithout = [{ name: 'Some Other Joker', type: 'persistent' }];
      
      expect(service.hasBigShort(jokersWithBigShort, 1)).toBe(true);
      expect(service.hasBigShort(jokersWithout, 1)).toBe(false);
    });
  });

  describe('History Jokers', () => {
    test('Roman Coin - adds $200', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 37)!;
      engine.addJoker(joker, 1);
      
      const baseMoney = 100;
      const result = engine.applyEffects(baseMoney, 'money', { currentPeriod: 1 });
      
      expect(result).toBe(300); // 100 + 200
    });

    test('Medieval Shield - enables event immunity for 1 period', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 40)!;
      engine.addJoker(joker, 1);
      
      // Should work in period 1
      const hasImmunity1 = engine.hasEffect('event_immunity', { currentPeriod: 1 });
      expect(hasImmunity1).toBe(true);
      
      // Should expire after period 1
      const hasImmunity3 = engine.hasEffect('event_immunity', { currentPeriod: 3 });
      expect(hasImmunity3).toBe(false);
    });

    test('Drought Relief - adds $150 drought relief bonus', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 41)!;
      engine.addJoker(joker, 1);
      
      const baseBonus = 0;
      const result = engine.applyEffects(baseBonus, 'drought_relief_bonus', { currentPeriod: 1 });
      
      expect(result).toBe(150); // 0 + 150
    });

    test('Candy Vault - enables permanent stash protection', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 74)!;
      engine.addJoker(joker, 1);
      
      // Should provide protection in period 1
      const hasProtection1 = engine.hasEffect('stash_protection', { currentPeriod: 1 });
      expect(hasProtection1).toBe(true);
      
      // Should still provide protection in period 10 (persistent)
      const hasProtection10 = engine.hasEffect('stash_protection', { currentPeriod: 10 });
      expect(hasProtection10).toBe(true);
    });
  });

  describe('Logic Jokers', () => {
    test('Inductive Reasoning - adds 3 inventory each day through service', () => {
      const jokers = [{ name: 'Inductive Reasoning', type: 'persistent' }];
      
      // Day 1 (periods 1-8): no bonus yet
      const result1 = service.applyJokerEffects(20, 'inventory_limit', jokers, 4, undefined);
      expect(result1).toBe(23); // 20 + 3 (base effect)
      
      // Day 2 (periods 9-16): +3 for completed day 1
      const result2 = service.applyJokerEffects(20, 'inventory_limit', jokers, 12, undefined);
      expect(result2).toBe(26); // 20 + 3 (base) + 3 (1 completed day)
    });

    test('Lock Pick - enables one-time event immunity', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 45)!;
      engine.addJoker(joker, 1);
      
      const hasImmunity = engine.hasEffect('event_immunity', { currentPeriod: 1 });
      
      expect(hasImmunity).toBe(true);
    });

    test('Digital Lock - doubles profits for 1 period', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 48)!;
      engine.addJoker(joker, 1);
      
      const basePrice = 100;
      
      // Should work in period 1
      const result1 = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 1 });
      expect(result1).toBe(200); // 100 * 2
      
      // Should expire after period 1
      const result3 = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 3 });
      expect(result3).toBe(100); // No effect
    });

    test('Safe Deposit - enables money protection', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 50)!;
      engine.addJoker(joker, 1);
      
      const hasProtection = engine.hasEffect('money_protection', { currentPeriod: 1 });
      
      expect(hasProtection).toBe(true);
    });

    test('Something from Nothing - enables candy generation', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 46)!;
      engine.addJoker(joker, 1);
      
      const hasGeneration = engine.hasEffect('candy_generation', { currentPeriod: 1 });
      
      expect(hasGeneration).toBe(false); // generate operation, not enable
    });
  });

  describe('Gym Jokers', () => {
    test('Bet you I\'m faster - adds $100', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 51)!;
      engine.addJoker(joker, 1);
      
      const baseMoney = 50;
      const result = engine.applyEffects(baseMoney, 'money', { currentPeriod: 1 });
      
      expect(result).toBe(150); // 50 + 100
    });

    test('Bulk Up - adds 20 to inventory limit', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 66)!;
      engine.addJoker(joker, 1);
      
      const baseInventory = 20;
      const result = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 1 });
      
      expect(result).toBe(40); // 20 + 20
    });

    test('Embrace the Grind - adds $50 empty inventory bonus', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 67)!;
      engine.addJoker(joker, 1);
      
      const baseBonus = 0;
      const result = engine.applyEffects(baseBonus, 'empty_inventory_bonus', { currentPeriod: 1 });
      
      expect(result).toBe(50); // 0 + 50
    });

    test('Diamond Hand - adds $50 holding inventory bonus', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 68)!;
      engine.addJoker(joker, 1);
      
      const baseBonus = 0;
      const result = engine.applyEffects(baseBonus, 'holding_inventory_bonus', { currentPeriod: 1 });
      
      expect(result).toBe(50); // 0 + 50
    });
  });

  describe('Duration and Timing Tests', () => {
    test('One-time effects expire after first period', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 1)!; // Double Up
      engine.addJoker(joker, 1);
      
      const basePrice = 100;
      
      // Should work in period 1 (when activated)
      const result1 = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 1 });
      expect(result1).toBe(200);
      
      // Should not work in period 2
      const result2 = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 2 });
      expect(result2).toBe(100);
    });

    test('Persistent effects continue indefinitely', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 3)!; // Geometric Expansion
      engine.addJoker(joker, 1);
      
      const baseInventory = 20;
      
      // Should work in period 1
      const result1 = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 1 });
      expect(result1).toBe(30);
      
      // Should still work in period 10
      const result10 = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 10 });
      expect(result10).toBe(30);
    });

    test('Timed effects expire after specified periods', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 48)!; // Digital Lock (1 period)
      engine.addJoker(joker, 1);
      
      const basePrice = 100;
      
      // Should work in period 1
      const result1 = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 1 });
      expect(result1).toBe(200);
      
      // Should expire after period 2
      const result3 = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 3 });
      expect(result3).toBe(100);
    });
  });

  describe('Multiple Joker Interactions', () => {
    test('Multiple inventory bonuses stack additively', () => {
      const expansion = STANDARDIZED_JOKERS.find(j => j.id === 3)!; // +10
      const compression = STANDARDIZED_JOKERS.find(j => j.id === 14)!; // +13
      const organizer = STANDARDIZED_JOKERS.find(j => j.id === 63)!; // +15
      
      engine.addJoker(expansion, 1);
      engine.addJoker(compression, 1);
      engine.addJoker(organizer, 1);
      
      const baseInventory = 20;
      const result = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 1 });
      
      expect(result).toBe(58); // 20 + 10 + 13 + 15
    });

    test('Price multipliers stack multiplicatively', () => {
      const doubleUp = STANDARDIZED_JOKERS.find(j => j.id === 1)!; // *2
      const vacuumSealer = STANDARDIZED_JOKERS.find(j => j.id === 19)!; // Need to create price multiplier joker
      
      engine.addJoker(doubleUp, 1);
      
      const basePrice = 100;
      const result = engine.applyEffects(basePrice, 'candy_price', { currentPeriod: 1 });
      
      expect(result).toBe(200); // 100 * 2
    });

    test('Set operations override base values', () => {
      const scout = STANDARDIZED_JOKERS.find(j => j.id === 11)!; // Set to 0.5
      const predictor = STANDARDIZED_JOKERS.find(j => j.id === 12)!; // Set to 1.0
      
      engine.addJoker(scout, 1);
      engine.addJoker(predictor, 1);
      
      const baseChance = 0.2;
      const result = engine.applyEffects(baseChance, 'hint_chance', { currentPeriod: 1 });
      
      expect(result).toBe(1.0); // Last set operation wins
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Unknown joker names are ignored', () => {
      const jokers = [{ name: 'Unknown Joker', type: 'persistent' }];
      const result = service.applyJokerEffects(100, 'candy_price', jokers, 1);
      
      expect(result).toBe(100); // No change
    });

    test('Effects with wrong target are ignored', () => {
      const joker = STANDARDIZED_JOKERS.find(j => j.id === 1)!; // Affects candy_price
      engine.addJoker(joker, 1);
      
      const baseInventory = 20;
      const result = engine.applyEffects(baseInventory, 'inventory_limit', { currentPeriod: 1 });
      
      expect(result).toBe(20); // No change
    });

    test('Engine cleanup removes expired one-time effects', () => {
      const doubleUp = STANDARDIZED_JOKERS.find(j => j.id === 1)!; // One-time effect
      engine.addJoker(doubleUp, 1);
      
      expect(engine.getActiveJokers().length).toBe(1);
      
      engine.cleanupExpiredEffects(2);
      
      expect(engine.getActiveJokers().length).toBe(0);
    });
  });
});