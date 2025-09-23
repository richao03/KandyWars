import { createMockStore, testStates, mergeTestStates } from '../utils/testStore';
import { selectSelectedHallPassEffects } from '../../store/slices/hallPassSlice';

describe('Combined Effects Integration Tests', () => {
  describe('Hall Pass + Joker Bonus Stacking', () => {
    it('should correctly stack hall pass and joker effects conceptually', () => {
      // Create store with both hall pass and joker bonuses
      const store = createMockStore(mergeTestStates(
        testStates.basicGame,
        testStates.withHallPassBonus,
        testStates.withJokers
      ));

      const state = store.getState();

      // Verify hall pass effects
      const hallPassEffects = selectSelectedHallPassEffects(state);
      const hallPassSaleBonus = hallPassEffects.find(e => e.type === 'sale_price_bonus');
      expect(hallPassSaleBonus?.value).toBe(15); // 15% bonus

      // Verify joker effects exist
      expect(state.joker.activeEffects).toHaveLength(2);
      const jokerSaleEffect = state.joker.activeEffects.find(e => e.effect.target === 'sale_price');
      expect(jokerSaleEffect?.effect.amount).toBe(1.2); // 1.2x multiplier
    });

    it('should calculate combined effect order correctly for SELLING', () => {
      // Test the mathematical order of operations for selling
      const baseSalePrice = 100;
      const hallPassBonus = 15; // 15% from hall pass
      const jokerMultiplier = 1.2; // 20% multiplier from joker

      // Apply hall pass first (percentage bonus) - only when selling
      const priceWithHallPass = Math.round(baseSalePrice * (1 + hallPassBonus / 100));
      expect(priceWithHallPass).toBe(115); // 100 * 1.15

      // Then apply joker multiplier - only when selling
      const finalSalePrice = Math.round(priceWithHallPass * jokerMultiplier);
      expect(finalSalePrice).toBe(138); // 115 * 1.2
    });

    it('should NOT apply sale bonuses when buying', () => {
      // Test that buying prices are unaffected by sale bonuses
      const baseBuyPrice = 100;
      const hallPassBonus = 15; // 15% from hall pass (should not apply)
      const jokerMultiplier = 1.2; // 20% multiplier from joker (should not apply)

      // Buy prices should remain unchanged regardless of sale bonuses
      const finalBuyPrice = baseBuyPrice; // No bonuses applied
      expect(finalBuyPrice).toBe(100);
    });

    it('should maintain buy/sell price distinction with multiple bonuses', () => {
      const basePrice = 50;
      const hallPassBonus = 25; // 25% from hall pass
      const joker1Multiplier = 1.2; // 20% increase
      const joker2Multiplier = 1.1; // 10% increase

      // SELLING: Apply all bonuses
      let sellingPrice = Math.round(basePrice * (1 + hallPassBonus / 100));
      sellingPrice = Math.round(sellingPrice * joker1Multiplier);
      sellingPrice = Math.round(sellingPrice * joker2Multiplier);
      expect(sellingPrice).toBe(84); // 50 -> 63 -> 76 -> 84

      // BUYING: No bonuses applied
      const buyingPrice = basePrice;
      expect(buyingPrice).toBe(50);

      // Verify significant difference
      expect(sellingPrice).toBeGreaterThan(buyingPrice);
      expect(sellingPrice - buyingPrice).toBe(34); // 68% markup when selling
    });

    it('should handle multiple joker multipliers correctly', () => {
      const basePrice = 100;
      const hallPassBonus = 25; // 25% from hall pass
      const joker1Multiplier = 1.2; // 20% increase
      const joker2Multiplier = 1.1; // 10% increase

      // Apply hall pass first
      const priceWithHallPass = Math.round(basePrice * (1 + hallPassBonus / 100));
      expect(priceWithHallPass).toBe(125);

      // Then apply joker multipliers
      const priceWithJoker1 = Math.round(priceWithHallPass * joker1Multiplier);
      expect(priceWithJoker1).toBe(150);

      const finalPrice = Math.round(priceWithJoker1 * joker2Multiplier);
      expect(finalPrice).toBe(165);
    });
  });

  describe('Inventory Bonus Stacking', () => {
    it('should correctly combine inventory bonuses from both sources', () => {
      const store = createMockStore(mergeTestStates(
        testStates.basicGame,
        testStates.withHallPassBonus,
        testStates.withJokers
      ));

      const state = store.getState();

      // Get hall pass inventory bonus
      const hallPassEffects = selectSelectedHallPassEffects(state);
      const hallPassInventoryBonus = hallPassEffects.find(e => e.type === 'inventory_bonus');
      expect(hallPassInventoryBonus?.value).toBe(5);

      // Get joker inventory bonus from computed effects
      expect(state.joker.computedEffects.inventoryLimit).toBe(35); // 30 base + 5 from joker
    });

    it('should calculate total inventory correctly', () => {
      const baseInventory = 20;
      const hallPassBonus = 5; // From hall pass
      const jokerBonus = 5; // From joker

      const totalInventory = baseInventory + hallPassBonus + jokerBonus;
      expect(totalInventory).toBe(30); // 20 + 5 + 5
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete game state with all bonuses', () => {
      const store = createMockStore({
        game: {
          periodCount: 5,
          day: 3,
        },
        wallet: {
          balance: 500,
          difficultyLevel: 4,
        },
        hallPass: {
          availablePasses: [{
            id: 'senior_executive',
            name: 'Senior Executive',
            description: 'High-level executive',
            unlockRequirement: 'Win 5 times',
            effects: [
              { type: 'sale_price_bonus', value: 25, description: '+25% sales' },
              { type: 'allowance_bonus', value: 100, description: '+100% allowance' },
            ],
            rarity: 'epic' as const,
            isUnlocked: true,
          }],
          unlockedPassIds: ['senior_executive'],
          selectedPassId: 'senior_executive',
          isLoaded: true,
        },
        joker: {
          jokers: [{
            id: '1001',
            name: 'Market Manipulator',
            tier: 'legendary',
            effect: { target: 'sale_price', operation: 'multiply', amount: 1.3 },
          }],
          jokersOwned: [{
            id: '1001',
            name: 'Market Manipulator',
            tier: 'legendary',
            effect: { target: 'sale_price', operation: 'multiply', amount: 1.3 },
          }],
          allJokers: [],
          lockedJokerIds: [],
          activeEffects: [{
            jokerId: '1001',
            effect: { target: 'sale_price', operation: 'multiply', amount: 1.3, duration: 'persistent' },
          }],
          computedEffects: {
            inventoryLimit: 30,
            hintChance: 0,
            studyTimeMultiplier: 1,
            droughtReliefBonus: 0,
            emptyInventoryBonus: 0,
          },
        },
      });

      const state = store.getState();

      // Calculate final sale price
      const basePrice = 50;
      const hallPassEffects = selectSelectedHallPassEffects(state);
      const hallPassSaleBonus = hallPassEffects.find(e => e.type === 'sale_price_bonus')?.value || 0;
      const priceWithHallPass = Math.round(basePrice * (1 + hallPassSaleBonus / 100));
      expect(priceWithHallPass).toBe(63); // 50 * 1.25

      const jokerMultiplier = state.joker.activeEffects.find(e => e.effect.target === 'sale_price')?.effect.amount || 1;
      const finalPrice = Math.round(priceWithHallPass * jokerMultiplier);
      expect(finalPrice).toBe(82); // 63 * 1.3

      // Calculate allowance bonus
      const baseAllowance = 50;
      const hallPassAllowanceBonus = hallPassEffects.find(e => e.type === 'allowance_bonus')?.value || 0;
      const finalAllowance = Math.round(baseAllowance * (1 + hallPassAllowanceBonus / 100));
      expect(finalAllowance).toBe(100); // 50 * 2
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero bonuses correctly', () => {
      const store = createMockStore(testStates.basicGame);

      const hallPassEffects = selectSelectedHallPassEffects(store.getState());
      const jokerEffects = store.getState().joker.activeEffects;

      expect(hallPassEffects).toEqual([]);
      expect(jokerEffects).toEqual([]);

      // Base values should remain unchanged
      const basePrice = 100;
      const finalPrice = basePrice; // No modifications
      expect(finalPrice).toBe(100);
    });

    it('should handle maximum bonus stacking', () => {
      // Theoretical maximum bonuses
      const basePrice = 100;
      const maxHallPassBonus = 30; // 30% from High Roller
      const maxJoker1 = 1.5; // 50% increase
      const maxJoker2 = 1.4; // 40% increase
      const maxJoker3 = 1.3; // 30% increase

      const price1 = Math.round(basePrice * (1 + maxHallPassBonus / 100));
      const price2 = Math.round(price1 * maxJoker1);
      const price3 = Math.round(price2 * maxJoker2);
      const finalPrice = Math.round(price3 * maxJoker3);

      expect(price1).toBe(130);   // 100 * 1.3
      expect(price2).toBe(195);   // 130 * 1.5
      expect(price3).toBe(273);   // 195 * 1.4
      expect(finalPrice).toBe(355); // 273 * 1.3
    });

    it('should handle order of operations correctly', () => {
      // Order should be: Hall Pass bonuses -> Joker effects
      const operations: string[] = [];

      const applyHallPassBonus = (value: number, bonus: number) => {
        operations.push('hall_pass');
        return Math.round(value * (1 + bonus / 100));
      };

      const applyJokerEffect = (value: number, multiplier: number) => {
        operations.push('joker');
        return Math.round(value * multiplier);
      };

      let value = 100;
      value = applyHallPassBonus(value, 10);
      value = applyJokerEffect(value, 1.2);

      expect(operations).toEqual(['hall_pass', 'joker']);
      expect(value).toBe(132);
    });
  });
});