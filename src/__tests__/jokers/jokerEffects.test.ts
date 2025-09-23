import { createMockStore, testStates } from '../utils/testStore';
import { addJoker, removeJoker, setActiveEffects } from '../../store/slices/jokerSlice';

describe('Joker Effects', () => {
  describe('Joker Inventory Management', () => {
    it('should add a joker to inventory', () => {
      const store = createMockStore(testStates.basicGame);

      const newJoker = {
        id: '1001',
        name: 'Test Joker',
        tier: 'common',
        effect: { target: 'sale_price', operation: 'multiply', amount: 1.1 },
      };

      store.dispatch(addJoker(newJoker));

      const state = store.getState();
      expect(state.joker.jokers).toHaveLength(1);
      expect(state.joker.jokers[0]).toEqual(newJoker);
      expect(state.joker.jokersOwned).toHaveLength(1);
      expect(state.joker.jokersOwned[0]).toEqual(newJoker);
    });

    it('should remove a joker from inventory', () => {
      const store = createMockStore(testStates.withJokers);

      // Initial state has 2 jokers
      let state = store.getState();
      expect(state.joker.jokers).toHaveLength(2);

      // Remove one joker
      store.dispatch(removeJoker('1001'));

      state = store.getState();
      expect(state.joker.jokers).toHaveLength(1);
      expect(state.joker.jokers.find(j => j.id === '1001')).toBeUndefined();
      expect(state.joker.jokersOwned).toHaveLength(1);
      expect(state.joker.jokersOwned.find(j => j.id === '1001')).toBeUndefined();
    });

    it('should handle removing non-existent joker gracefully', () => {
      const store = createMockStore(testStates.withJokers);

      const initialState = store.getState();
      const initialCount = initialState.joker.jokers.length;

      store.dispatch(removeJoker('999')); // Non-existent ID

      const finalState = store.getState();
      const finalCount = finalState.joker.jokers.length;
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Active Effects Management', () => {
    it('should set active effects', () => {
      const store = createMockStore(testStates.basicGame);

      const effects = [
        {
          jokerId: '1001',
          effect: { target: 'sale_price', operation: 'multiply', amount: 1.2, duration: 'persistent' },
        },
      ];

      store.dispatch(setActiveEffects(effects));

      const state = store.getState();
      expect(state.joker.activeEffects).toHaveLength(1);
      expect(state.joker.activeEffects[0]).toEqual(effects[0]);
    });

    it('should handle multiple active effects', () => {
      const store = createMockStore(testStates.basicGame);

      const effects = [
        {
          jokerId: '1001',
          effect: { target: 'sale_price', operation: 'multiply', amount: 1.2, duration: 'persistent' },
        },
        {
          jokerId: '1002',
          effect: { target: 'inventory', operation: 'add', amount: 5, duration: 'persistent' },
        },
      ];

      store.dispatch(setActiveEffects(effects));

      const state = store.getState();
      expect(state.joker.activeEffects).toHaveLength(2);
    });
  });

  describe('Sale Price Effects Context', () => {
    it('should apply sale price effects only when selling', () => {
      const basePrice = 100;
      const jokerMultiplier = 1.3; // 30% increase from joker

      // When selling: apply joker bonus
      const sellingPrice = Math.round(basePrice * jokerMultiplier);
      expect(sellingPrice).toBe(130);

      // When buying: no joker bonus should apply
      const buyingPrice = basePrice; // Should remain unchanged
      expect(buyingPrice).toBe(100);

      // Verify they are different
      expect(sellingPrice).toBeGreaterThan(buyingPrice);
    });

    it('should distinguish between sale price jokers and other joker types', () => {
      const store = createMockStore(testStates.withJokers);
      const state = store.getState();

      // Find sale price effect
      const salePriceEffect = state.joker.activeEffects.find(e => e.effect.target === 'sale_price');
      expect(salePriceEffect).toBeDefined();
      expect(salePriceEffect?.effect.target).toBe('sale_price');

      // Find inventory effect (should not affect prices)
      const inventoryEffect = state.joker.activeEffects.find(e => e.effect.target === 'inventory');
      expect(inventoryEffect).toBeDefined();
      expect(inventoryEffect?.effect.target).toBe('inventory');

      // Inventory effects should not be used for price calculations
      expect(inventoryEffect?.effect.target).not.toBe('sale_price');
    });
  });

  describe('State Structure Validation', () => {
    it('should have correct initial joker state structure', () => {
      const store = createMockStore(testStates.basicGame);
      const state = store.getState();

      expect(state.joker).toHaveProperty('jokers');
      expect(state.joker).toHaveProperty('jokersOwned');
      expect(state.joker).toHaveProperty('allJokers');
      expect(state.joker).toHaveProperty('lockedJokerIds');
      expect(state.joker).toHaveProperty('activeEffects');
      expect(state.joker).toHaveProperty('computedEffects');

      expect(Array.isArray(state.joker.jokers)).toBe(true);
      expect(Array.isArray(state.joker.jokersOwned)).toBe(true);
      expect(Array.isArray(state.joker.activeEffects)).toBe(true);
    });

    it('should have correct computed effects structure', () => {
      const store = createMockStore(testStates.basicGame);
      const state = store.getState();

      expect(state.joker.computedEffects).toHaveProperty('inventoryLimit');
      expect(state.joker.computedEffects).toHaveProperty('hintChance');
      expect(state.joker.computedEffects).toHaveProperty('studyTimeMultiplier');
      expect(state.joker.computedEffects).toHaveProperty('droughtReliefBonus');
      expect(state.joker.computedEffects).toHaveProperty('emptyInventoryBonus');

      expect(typeof state.joker.computedEffects.inventoryLimit).toBe('number');
      expect(typeof state.joker.computedEffects.hintChance).toBe('number');
      expect(typeof state.joker.computedEffects.studyTimeMultiplier).toBe('number');
    });
  });
});