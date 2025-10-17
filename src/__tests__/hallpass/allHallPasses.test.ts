import { createStoreWithEffects } from '../utils/testHelpers';
import {
  selectAllHallPasses,
  selectUnlockedHallPasses,
  selectSelectedHallPassEffects,
  unlockHallPass,
  selectHallPass,
} from '../../store/slices/hallPassSlice';
import { HallPassUtils } from '../../utils/hallPassUtils';

describe('All Hall Passes - Comprehensive Tests', () => {
  describe('Common Rarity Hall Passes', () => {
    it('No Longer Freshman - +10% sale price (Win 1 time)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['no_longer_freshman'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'no_longer_freshman');

      expect(pass).toBeDefined();
      expect(pass?.name).toBe('Not a Freshman');
      expect(pass?.rarity).toBe('common');
      expect(pass?.unlockRequirement).toBe('Win the game once');
      expect(pass?.effects).toHaveLength(1);
      expect(pass?.effects[0].type).toBe('sale_price_bonus');
      expect(pass?.effects[0].value).toBe(10);

      // Test effect application
      const basePrice = 100;
      const hallPassEffects = selectSelectedHallPassEffects(store.getState());
      const finalPrice = HallPassUtils.applySalePriceBonus(basePrice, hallPassEffects);

      expect(finalPrice).toBe(110); // 100 * 1.10
    });

    it('Sophomore Swagger - +15 inventory (Win 3 times)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['sophomore_swagger'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'sophomore_swagger');

      expect(pass?.name).toBe('Sophomore Swagger');
      expect(pass?.rarity).toBe('common');
      expect(pass?.effects[0].type).toBe('inventory_bonus');
      expect(pass?.effects[0].value).toBe(15);

      // Test effect application
      const baseInventory = 20;
      const hallPassEffects = selectSelectedHallPassEffects(store.getState());
      const finalInventory = HallPassUtils.applyInventoryBonus(baseInventory, hallPassEffects);

      expect(finalInventory).toBe(35); // 20 + 15
    });
  });

  describe('Rare Rarity Hall Passes', () => {
    it('Junior Genius - +1000% allowance (Win with $100k+ profit)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['junior_genius'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'junior_genius');

      expect(pass?.name).toBe('Junior Genius');
      expect(pass?.rarity).toBe('rare');
      expect(pass?.unlockRequirement).toBe('Win the game with $100,000+ profit');
      expect(pass?.effects[0].type).toBe('allowance_bonus');
      expect(pass?.effects[0].value).toBe(1000);

      // Test effect application
      const baseAllowance = 50;
      const hallPassEffects = selectSelectedHallPassEffects(store.getState());
      const finalAllowance = HallPassUtils.applyAllowanceBonus(baseAllowance, hallPassEffects);

      expect(finalAllowance).toBe(550); // 50 * (1 + 1000/100) = 50 * 11
    });
  });

  describe('Epic Rarity Hall Passes', () => {
    it('Senior Executive - +15% sale + +10 inventory (Win 5 times)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['senior_executive'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'senior_executive');

      expect(pass?.name).toBe('Senior Executive');
      expect(pass?.rarity).toBe('epic');
      expect(pass?.effects).toHaveLength(2);

      const saleEffect = pass?.effects.find((e) => e.type === 'sale_price_bonus');
      const inventoryEffect = pass?.effects.find((e) => e.type === 'inventory_bonus');

      expect(saleEffect?.value).toBe(15);
      expect(inventoryEffect?.value).toBe(10);

      // Test both effects
      const hallPassEffects = selectSelectedHallPassEffects(store.getState());

      const basePrice = 100;
      const finalPrice = HallPassUtils.applySalePriceBonus(basePrice, hallPassEffects);
      expect(finalPrice).toBe(115);

      const baseInventory = 20;
      const finalInventory = HallPassUtils.applyInventoryBonus(baseInventory, hallPassEffects);
      expect(finalInventory).toBe(30);
    });

    it('Valedictorian Vendor - +1 joker selection (Play all minigames)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['valedictorian_vendor'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'valedictorian_vendor');

      expect(pass?.name).toBe('Valedictorian Vendor');
      expect(pass?.rarity).toBe('epic');
      expect(pass?.unlockRequirement).toBe('Play every single minigame at least once');
      expect(pass?.effects[0].type).toBe('joker_bonus');
      expect(pass?.effects[0].value).toBe(1);
    });

    it('Forged Pass - +1 reroll in joker selection (Win with 8+ jokers)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['forged_pass'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'forged_pass');

      expect(pass?.name).toBe('Forged Pass');
      expect(pass?.rarity).toBe('epic');
      expect(pass?.effects[0].type).toBe('special');
      expect(pass?.effects[0].value).toBe(1);
      expect(pass?.effects[0].description).toContain('reroll');
    });

    it('Minimalist Master - +30% sale price (Win without jokers)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['minimalist_master'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'minimalist_master');

      expect(pass?.name).toBe('Minimalist Master');
      expect(pass?.rarity).toBe('epic');
      expect(pass?.unlockRequirement).toBe('Win without using any jokers');
      expect(pass?.effects[0].type).toBe('sale_price_bonus');
      expect(pass?.effects[0].value).toBe(30);

      const basePrice = 100;
      const hallPassEffects = selectSelectedHallPassEffects(store.getState());
      const finalPrice = HallPassUtils.applySalePriceBonus(basePrice, hallPassEffects);

      expect(finalPrice).toBe(130); // 100 * 1.30
    });

    it("Teacher's Pet - Confiscation takes 25% instead of 100%", () => {
      const store = createStoreWithEffects({
        hallPasses: ['teachers_pet'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'teachers_pet');

      expect(pass?.name).toBe("Teacher's Pet");
      expect(pass?.rarity).toBe('epic');
      expect(pass?.effects[0].type).toBe('special');
      expect(pass?.effects[0].value).toBe(75); // 75% reduction
      expect(pass?.effects[0].description).toContain('25%');
    });

    it('Finance Club - 10% of previous day profit to allowance', () => {
      const store = createStoreWithEffects({
        hallPasses: ['finance_club'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'finance_club');

      expect(pass?.name).toBe('Finance Club');
      expect(pass?.rarity).toBe('epic');
      expect(pass?.unlockRequirement).toBe('Win the game with $35,000+ in the piggy bank');
      expect(pass?.effects[0].type).toBe('special');
      expect(pass?.effects[0].value).toBe(10);
    });
  });

  describe('Legendary Rarity Hall Passes', () => {
    it('Candy Kingpin - +25% sale + +100% allowance (Win 10 times)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['candy_kingpin'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'candy_kingpin');

      expect(pass?.name).toBe('Candy Kingpin');
      expect(pass?.rarity).toBe('legendary');
      expect(pass?.unlockRequirement).toBe('Win the game 10 times');
      expect(pass?.effects).toHaveLength(2);

      const saleEffect = pass?.effects.find((e) => e.type === 'sale_price_bonus');
      const allowanceEffect = pass?.effects.find((e) => e.type === 'allowance_bonus');

      expect(saleEffect?.value).toBe(25);
      expect(allowanceEffect?.value).toBe(100);

      // Test both effects
      const hallPassEffects = selectSelectedHallPassEffects(store.getState());

      const basePrice = 100;
      const finalPrice = HallPassUtils.applySalePriceBonus(basePrice, hallPassEffects);
      expect(finalPrice).toBe(125);

      const baseAllowance = 50;
      const finalAllowance = HallPassUtils.applyAllowanceBonus(baseAllowance, hallPassEffects);
      expect(finalAllowance).toBe(100); // 50 * 2
    });

    it('High Roller - +30% sale + +15 inventory (Win + 1000 units sold)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['high_roller'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'high_roller');

      expect(pass?.name).toBe('High Roller');
      expect(pass?.rarity).toBe('legendary');
      expect(pass?.effects).toHaveLength(2);

      const saleEffect = pass?.effects.find((e) => e.type === 'sale_price_bonus');
      const inventoryEffect = pass?.effects.find((e) => e.type === 'inventory_bonus');

      expect(saleEffect?.value).toBe(30);
      expect(inventoryEffect?.value).toBe(15);
    });

    it('Perfect Scholar - +100% allowance (Win on difficulty 6)', () => {
      const store = createStoreWithEffects({
        hallPasses: ['perfect_scholar'],
        period: 0,
      });

      const passes = selectAllHallPasses(store.getState());
      const pass = passes.find((p) => p.id === 'perfect_scholar');

      expect(pass?.name).toBe('Perfect Scholar');
      expect(pass?.rarity).toBe('legendary');
      expect(pass?.unlockRequirement).toBe('Win the game on difficulty level 6');
      expect(pass?.effects[0].type).toBe('allowance_bonus');
      expect(pass?.effects[0].value).toBe(100);
    });
  });

  describe('Hall Pass State Management', () => {
    it('should unlock a hall pass', () => {
      const store = createStoreWithEffects({});

      store.dispatch(unlockHallPass({ passId: 'no_longer_freshman' }));

      const unlockedPasses = selectUnlockedHallPasses(store.getState());
      expect(unlockedPasses).toHaveLength(1);
      expect(unlockedPasses[0].id).toBe('no_longer_freshman');
    });

    it('should select a hall pass', () => {
      const store = createStoreWithEffects({
        hallPasses: ['no_longer_freshman'],
      });

      const selectedEffects = selectSelectedHallPassEffects(store.getState());
      expect(selectedEffects.length).toBeGreaterThan(0);
    });

    it('should not duplicate unlock', () => {
      const store = createStoreWithEffects({});

      store.dispatch(unlockHallPass({ passId: 'no_longer_freshman' }));
      store.dispatch(unlockHallPass({ passId: 'no_longer_freshman' }));

      const unlockedPasses = selectUnlockedHallPasses(store.getState());
      expect(unlockedPasses).toHaveLength(1);
    });

    it('should support multiple selected passes', () => {
      const store = createStoreWithEffects({
        hallPasses: ['no_longer_freshman', 'sophomore_swagger'],
      });

      const selectedEffects = selectSelectedHallPassEffects(store.getState());

      // Should have effects from both passes
      const saleEffect = selectedEffects.find((e) => e.type === 'sale_price_bonus');
      const inventoryEffect = selectedEffects.find((e) => e.type === 'inventory_bonus');

      expect(saleEffect).toBeDefined();
      expect(inventoryEffect).toBeDefined();
    });
  });

  describe('Effect Stacking', () => {
    it('should stack sale price bonuses from multiple passes', () => {
      const store = createStoreWithEffects({
        hallPasses: ['no_longer_freshman', 'minimalist_master'], // +10% and +30%
      });

      const basePrice = 100;
      const hallPassEffects = selectSelectedHallPassEffects(store.getState());

      // Both bonuses should apply
      const saleBonuses = hallPassEffects.filter((e) => e.type === 'sale_price_bonus');
      expect(saleBonuses.length).toBeGreaterThanOrEqual(1);

      const totalBonus = saleBonuses.reduce((sum, effect) => sum + effect.value, 0);
      expect(totalBonus).toBeGreaterThanOrEqual(40); // 10 + 30
    });

    it('should stack inventory bonuses from multiple passes', () => {
      const store = createStoreWithEffects({
        hallPasses: ['sophomore_swagger', 'high_roller'], // +15 and +15
      });

      const baseInventory = 20;
      const hallPassEffects = selectSelectedHallPassEffects(store.getState());

      const inventoryBonuses = hallPassEffects.filter((e) => e.type === 'inventory_bonus');
      const totalBonus = inventoryBonuses.reduce((sum, effect) => sum + effect.value, 0);

      expect(totalBonus).toBe(30); // 15 + 15
    });

    it('should combine different effect types', () => {
      const store = createStoreWithEffects({
        hallPasses: ['senior_executive'], // +15% sale + +10 inventory
      });

      const hallPassEffects = selectSelectedHallPassEffects(store.getState());
      expect(hallPassEffects.length).toBe(2);

      const saleEffect = hallPassEffects.find((e) => e.type === 'sale_price_bonus');
      const inventoryEffect = hallPassEffects.find((e) => e.type === 'inventory_bonus');

      expect(saleEffect).toBeDefined();
      expect(inventoryEffect).toBeDefined();
    });
  });

  describe('Hall Pass Utils Methods', () => {
    it('should apply sale price bonus correctly', () => {
      const basePrice = 100;
      const effects = [
        { type: 'sale_price_bonus' as const, value: 15, description: '+15%' },
      ];

      const result = HallPassUtils.applySalePriceBonus(basePrice, effects);
      expect(result).toBe(115);
    });

    it('should apply allowance bonus correctly', () => {
      const baseAllowance = 50;
      const effects = [
        { type: 'allowance_bonus' as const, value: 100, description: '+100%' },
      ];

      const result = HallPassUtils.applyAllowanceBonus(baseAllowance, effects);
      expect(result).toBe(100); // 50 * 2
    });

    it('should apply inventory bonus correctly', () => {
      const baseInventory = 20;
      const effects = [
        { type: 'inventory_bonus' as const, value: 15, description: '+15' },
      ];

      const result = HallPassUtils.applyInventoryBonus(baseInventory, effects);
      expect(result).toBe(35);
    });

    it('should apply joker bonus correctly', () => {
      const baseChance = 0.1; // 10%
      const effects = [
        { type: 'joker_bonus' as const, value: 50, description: '+50%' },
      ];

      const result = HallPassUtils.applyJokerBonus(baseChance, effects);
      expect(result).toBeCloseTo(0.15, 2); // 0.1 * 1.5, within 2 decimal places
    });

    it('should detect special effects', () => {
      const effects = [
        { type: 'special' as const, value: 1, description: '+1 reroll' },
      ];

      const hasReroll = HallPassUtils.hasSpecialEffect('reroll', effects);
      expect(hasReroll).toBe(true);

      const hasOther = HallPassUtils.hasSpecialEffect('other', effects);
      expect(hasOther).toBe(false);
    });

    it('should get active bonus summary', () => {
      const effects = [
        { type: 'sale_price_bonus' as const, value: 15, description: '+15%' },
        { type: 'inventory_bonus' as const, value: 10, description: '+10' },
        { type: 'allowance_bonus' as const, value: 100, description: '+100%' },
      ];

      const summary = HallPassUtils.getActiveBonusSummary(effects);
      expect(summary).toContain('+15% candy sale prices');
      expect(summary).toContain('+10 inventory slots');
      expect(summary).toContain('+100% daily allowance');
    });

    it('should handle multiple bonuses of same type', () => {
      const basePrice = 100;
      const effects = [
        { type: 'sale_price_bonus' as const, value: 10, description: '+10%' },
        { type: 'sale_price_bonus' as const, value: 20, description: '+20%' },
      ];

      const result = HallPassUtils.applySalePriceBonus(basePrice, effects);
      expect(result).toBe(130); // 100 * (1 + 0.30)
    });

    it('should cap joker bonus at 100%', () => {
      const baseChance = 0.5;
      const effects = [
        { type: 'joker_bonus' as const, value: 200, description: '+200%' },
      ];

      const result = HallPassUtils.applyJokerBonus(baseChance, effects);
      expect(result).toBeLessThanOrEqual(1); // Capped at 100%
    });
  });

  describe('Hall Pass Metadata Validation', () => {
    it('should have all required fields for each pass', () => {
      const store = createStoreWithEffects({});
      const allPasses = selectAllHallPasses(store.getState());

      allPasses.forEach((pass) => {
        expect(pass.id).toBeDefined();
        expect(pass.name).toBeDefined();
        expect(pass.description).toBeDefined();
        expect(pass.unlockRequirement).toBeDefined();
        expect(pass.effects).toBeDefined();
        expect(pass.rarity).toMatch(/^(common|rare|epic|legendary)$/);
        expect(pass.effects.length).toBeGreaterThan(0);
      });
    });

    it('should have unique IDs', () => {
      const store = createStoreWithEffects({});
      const allPasses = selectAllHallPasses(store.getState());

      const ids = allPasses.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have valid effect types', () => {
      const store = createStoreWithEffects({});
      const allPasses = selectAllHallPasses(store.getState());

      const validTypes = [
        'sale_price_bonus',
        'inventory_bonus',
        'allowance_bonus',
        'joker_bonus',
        'special',
      ];

      allPasses.forEach((pass) => {
        pass.effects.forEach((effect) => {
          expect(validTypes).toContain(effect.type);
        });
      });
    });

    it('should count total hall passes', () => {
      const store = createStoreWithEffects({});
      const allPasses = selectAllHallPasses(store.getState());

      console.log(`Total hall passes: ${allPasses.length}`);
      expect(allPasses.length).toBe(12); // Exactly 12 hall passes
    });

    it('should have proper rarity distribution', () => {
      const store = createStoreWithEffects({});
      const allPasses = selectAllHallPasses(store.getState());

      const rarities = allPasses.reduce(
        (acc, pass) => {
          acc[pass.rarity]++;
          return acc;
        },
        { common: 0, rare: 0, epic: 0, legendary: 0 }
      );

      console.log('Rarity distribution:', rarities);

      // Verify there's at least one of each rarity
      expect(rarities.common).toBeGreaterThan(0);
      expect(rarities.rare).toBeGreaterThan(0);
      expect(rarities.epic).toBeGreaterThan(0);
      expect(rarities.legendary).toBeGreaterThan(0);
    });
  });
});
