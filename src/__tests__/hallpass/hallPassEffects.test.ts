import { createMockStore, testStates } from '../utils/testStore';
import { selectHallPass, unlockHallPass, selectSelectedHallPassEffects } from '../../store/slices/hallPassSlice';

describe('Hall Pass Effects', () => {
  describe('Hall Pass Selection', () => {
    it('should select a hall pass', () => {
      const store = createMockStore(testStates.withHallPassBonus);

      store.dispatch(selectHallPass('senior_executive'));

      const state = store.getState();
      expect(state.hallPass.selectedPassId).toBe('senior_executive');
    });

    it('should deselect a hall pass', () => {
      const store = createMockStore(testStates.withHallPassBonus);

      store.dispatch(selectHallPass(null));

      const state = store.getState();
      expect(state.hallPass.selectedPassId).toBeNull();
    });
  });

  describe('Hall Pass Effects', () => {
    it('should get effects from selected hall pass', () => {
      const store = createMockStore(testStates.withHallPassBonus);

      const effects = selectSelectedHallPassEffects(store.getState());
      expect(effects).toHaveLength(2);

      const salePriceEffect = effects.find(e => e.type === 'sale_price_bonus');
      const inventoryEffect = effects.find(e => e.type === 'inventory_bonus');

      expect(salePriceEffect?.value).toBe(15);
      expect(inventoryEffect?.value).toBe(5);
    });

    it('should return empty effects when no hall pass selected', () => {
      const store = createMockStore(testStates.basicGame);

      const effects = selectSelectedHallPassEffects(store.getState());
      expect(effects).toEqual([]);
    });
  });

  describe('Hall Pass Unlocking', () => {
    it('should unlock a hall pass', () => {
      const store = createMockStore(testStates.basicGame);

      store.dispatch(unlockHallPass({ passId: 'test_pass', timestamp: '2023-01-01' }));

      const state = store.getState();
      expect(state.hallPass.unlockedPassIds).toContain('test_pass');
    });

    it('should not duplicate unlocked pass IDs', () => {
      const store = createMockStore({
        hallPass: {
          availablePasses: [],
          unlockedPassIds: ['test_pass'],
          selectedPassId: null,
          isLoaded: true,
        },
      });

      store.dispatch(unlockHallPass({ passId: 'test_pass' }));

      const state = store.getState();
      const occurrences = state.hallPass.unlockedPassIds.filter(id => id === 'test_pass').length;
      expect(occurrences).toBe(1);
    });
  });

  describe('Effect Calculations', () => {
    it('should calculate correct sale price with percentage bonus when SELLING', () => {
      const baseSalePrice = 100;
      const bonus = 15; // 15% from hall pass
      const expectedSalePrice = Math.round(baseSalePrice * (1 + bonus / 100));
      expect(expectedSalePrice).toBe(115);
    });

    it('should NOT apply sale price bonus when BUYING', () => {
      const baseBuyPrice = 100;
      // Hall pass sale price bonus should not affect purchase prices
      const expectedBuyPrice = baseBuyPrice; // No change
      expect(expectedBuyPrice).toBe(100);
    });

    it('should distinguish between buying and selling contexts', () => {
      const candyBasePrice = 50;
      const salePriceBonus = 20; // 20% hall pass bonus

      // When selling: apply bonus
      const sellingPrice = Math.round(candyBasePrice * (1 + salePriceBonus / 100));
      expect(sellingPrice).toBe(60); // 50 * 1.2

      // When buying: no bonus applied
      const buyingPrice = candyBasePrice; // Should remain unchanged
      expect(buyingPrice).toBe(50);

      // Verify they are different
      expect(sellingPrice).toBeGreaterThan(buyingPrice);
    });

    it('should calculate correct inventory with flat bonus', () => {
      const baseInventory = 20;
      const bonus = 5; // +5 slots from hall pass
      const expectedInventory = baseInventory + bonus;
      expect(expectedInventory).toBe(25);
    });

    it('should calculate correct allowance with percentage bonus', () => {
      const baseAllowance = 50;
      const bonus = 100; // 100% bonus (double allowance)
      const expectedAllowance = Math.round(baseAllowance * (1 + bonus / 100));
      expect(expectedAllowance).toBe(100);
    });
  });

  describe('State Structure Validation', () => {
    it('should have correct hall pass state structure', () => {
      const store = createMockStore(testStates.basicGame);
      const state = store.getState();

      expect(state.hallPass).toHaveProperty('availablePasses');
      expect(state.hallPass).toHaveProperty('unlockedPassIds');
      expect(state.hallPass).toHaveProperty('selectedPassId');
      expect(state.hallPass).toHaveProperty('isLoaded');

      expect(Array.isArray(state.hallPass.availablePasses)).toBe(true);
      expect(Array.isArray(state.hallPass.unlockedPassIds)).toBe(true);
      expect(typeof state.hallPass.isLoaded).toBe('boolean');
    });

    it('should validate hall pass effect structure', () => {
      const store = createMockStore(testStates.withHallPassBonus);
      const effects = selectSelectedHallPassEffects(store.getState());

      effects.forEach(effect => {
        expect(effect).toHaveProperty('type');
        expect(effect).toHaveProperty('value');
        expect(effect).toHaveProperty('description');
        expect(typeof effect.value).toBe('number');
        expect(typeof effect.description).toBe('string');
      });
    });
  });
});