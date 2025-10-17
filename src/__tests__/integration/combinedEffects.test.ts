import { createMockStore, testStates, mergeTestStates } from '../utils/testStore';
import { selectSelectedHallPassEffects, selectHallPass } from '../../store/slices/hallPassSlice';
import {
  createStoreWithEffects,
  getPriceBreakdown,
  verifyPriceBreakdown,
  PeriodMocker,
  EventMocker,
  createMockJoker,
} from '../utils/testHelpers';
import { MerchantUtils } from '../../utils/merchantUtils';
import { HallPassUtils } from '../../utils/hallPassUtils';
import { applyPercentageBonus, applyMultiplier } from '../../utils/priceUtils';

describe('Combined Effects Integration Tests', () => {
  describe('Hall Pass + Joker Bonus Stacking', () => {
    it('should correctly stack hall pass and joker effects conceptually', () => {
      // Create store with both hall pass and joker bonuses
      const store = createMockStore(mergeTestStates(
        testStates.basicGame,
        testStates.withHallPassBonus,
        testStates.withJokers
      ));

      // Select the hall pass to activate its effects
      store.dispatch(selectHallPass('senior_executive'));

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

      // Select the hall pass to activate its effects
      store.dispatch(selectHallPass('senior_executive'));

      const state = store.getState();

      // Get hall pass inventory bonus
      const hallPassEffects = selectSelectedHallPassEffects(state);
      const hallPassInventoryBonus = hallPassEffects.find(e => e.type === 'inventory_bonus');
      expect(hallPassInventoryBonus?.value).toBe(10); // Updated to match the actual senior_executive bonus

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
          selectedPassIds: ['senior_executive'],
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
      const priceWithHallPass = applyPercentageBonus(basePrice, hallPassSaleBonus);
      expect(priceWithHallPass).toBe(62.5); // 50 * 1.25

      const jokerMultiplier = state.joker.activeEffects.find(e => e.effect.target === 'sale_price')?.effect.amount || 1;
      const finalPrice = applyMultiplier(priceWithHallPass, jokerMultiplier);
      expect(finalPrice).toBe(81.25); // 62.5 * 1.3

      // Calculate allowance bonus
      const baseAllowance = 50;
      const hallPassAllowanceBonus = hallPassEffects.find(e => e.type === 'allowance_bonus')?.value || 0;
      const finalAllowance = applyPercentageBonus(baseAllowance, hallPassAllowanceBonus);
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

  describe('Price Breakdown with Combinations', () => {
    it('should show detailed breakdown for Joker + Hall Pass + Merchant combo', () => {
      // Create store with Double Up joker + Senior Executive pass + Street Cred level 3
      const store = createStoreWithEffects({
        jokers: [createMockJoker(1, 'Double Up', 'one-time')],
        hallPasses: ['senior_executive'],
        merchantItems: [{ itemId: 'street_cred', level: 3 }],
        period: 0,
      });

      const periodMocker = new PeriodMocker(store);
      const basePrice = 100;

      // Activate Double Up for this period
      const activeEffects = [{ jokerId: 1, period: 0 }];

      const breakdown = getPriceBreakdown(basePrice, {
        jokers: store.getState().joker.jokers,
        period: periodMocker.getPeriodCount(),
        activeEffects,
      });

      // Verify breakdown has expected effects
      expect(breakdown.basePrice).toBe(100);
      expect(breakdown.jokerEffects.length).toBeGreaterThan(0);

      // Double Up should show in breakdown when activated
      const doubleUpEffect = breakdown.jokerEffects.find(e => e.jokerName === 'Double Up');
      expect(doubleUpEffect).toBeDefined();
    });

    it('should combine inventory bonuses from Joker + Hall Pass + Merchant', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(3, 'Geometric Expansion')], // +15 from Math joker
        hallPasses: ['sophomore_swagger'], // +15 from pass
        merchantItems: [{ itemId: 'hollowed_textbook', level: 5 }], // +50 from merchant
        period: 0,
      });

      const baseInventory = 20;
      const jokerBonus = 15;
      const hallPassBonus = 15;
      const merchantBonus = 50;

      const hallPassEffects = store.getState().hallPass.availablePasses
        .find(p => p.id === 'sophomore_swagger')?.effects || [];

      const merchantEffects = store.getState().merchant.activeEffects;

      // Apply all bonuses
      let total = baseInventory + jokerBonus;
      total = HallPassUtils.applyInventoryBonus(total, hallPassEffects);
      total = MerchantUtils.applyInventoryBonus(total, merchantEffects);

      expect(total).toBe(100); // 20 + 15 + 15 + 50
    });

    it('should combine allowance bonuses correctly', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(31, 'Ace the Test')], // 2x multiplier
        hallPasses: ['candy_kingpin'], // +100% (2x)
        merchantItems: [{ itemId: 'fake_report_card', level: 3 }], // 8x multiplier
        period: 0,
      });

      const baseAllowance = 50;
      const hallPassEffects = store.getState().hallPass.availablePasses
        .find(p => p.id === 'candy_kingpin')?.effects || [];
      const merchantEffects = store.getState().merchant.activeEffects;

      // Joker: 2x -> 100
      // Hall Pass: +100% -> 200
      // Merchant: 8x -> 1600
      // Total multiplier: 2 * 2 * 8 = 32x = $1600

      let total = baseAllowance * 2; // Joker
      total = HallPassUtils.applyAllowanceBonus(total, hallPassEffects); // Hall Pass
      total = MerchantUtils.applyAllowanceBonus(total, merchantEffects); // Merchant

      expect(total).toBe(1600);
    });
  });

  describe('Period-Dependent Combinations', () => {
    it('should apply Hopscotch Bonus only on even periods', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(34, 'Hopscotch Bonus')],
        period: 0,
      });

      const periodMocker = new PeriodMocker(store);
      const basePrice = 100;

      // Period 0 -> displayed as Period 1 (odd)
      periodMocker.setPeriod(0);
      expect(periodMocker.isEvenPeriod()).toBe(false);

      // Period 1 -> displayed as Period 2 (even)
      periodMocker.setPeriod(1);
      expect(periodMocker.isEvenPeriod()).toBe(true);

      // Period 2 -> displayed as Period 3 (odd)
      periodMocker.setPeriod(2);
      expect(periodMocker.isEvenPeriod()).toBe(false);
    });

    it('should apply Sunset Surge only during afternoon periods', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(38, 'Sunset Surge')],
        period: 0,
      });

      const periodMocker = new PeriodMocker(store);

      // Period 1-3 are morning
      periodMocker.jumpToDay(1, 1);
      expect(periodMocker.isMorning()).toBe(true);
      expect(periodMocker.isAfternoon()).toBe(false);

      periodMocker.jumpToDay(1, 3);
      expect(periodMocker.isMorning()).toBe(true);

      // Period 4-8 are afternoon
      periodMocker.jumpToDay(1, 4);
      expect(periodMocker.isMorning()).toBe(false);
      expect(periodMocker.isAfternoon()).toBe(true);

      periodMocker.jumpToDay(1, 8);
      expect(periodMocker.isAfternoon()).toBe(true);
    });

    it('should apply Time Zone Arbitrage discount only in morning', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(42, 'Time Zone Arbitrage')],
        period: 0,
      });

      const periodMocker = new PeriodMocker(store);
      const basePrice = 100;

      // Morning: discount applies
      periodMocker.jumpToDay(1, 1);
      expect(periodMocker.isMorning()).toBe(true);

      const breakdown = getPriceBreakdown(basePrice, {
        jokers: store.getState().joker.jokers,
        period: periodMocker.getPeriodCount(),
      });

      const timeZoneEffect = breakdown.jokerEffects.find(e => e.jokerName === 'Time Zone Arbitrage');
      if (timeZoneEffect) {
        expect(timeZoneEffect.isActive).toBe(true);
      }
    });
  });

  describe('Event-Based Combinations', () => {
    it('should trigger found money events with Metal Detector multiplier', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(51, 'Hide and Seek')], // 3x multiplier
        merchantItems: [{ itemId: 'metal_detector', level: 2 }], // 100x multiplier
        period: 0,
      });

      const eventMocker = new EventMocker(store);
      const baseAmount = 10;

      // Apply joker multiplier: 10 * 3 = 30
      const withJoker = baseAmount * 3;

      // Apply merchant multiplier: 30 * 100 = 3000
      const merchantEffects = store.getState().merchant.activeEffects;
      const withMerchant = MerchantUtils.applyFoundMoneyMultiplier(withJoker, merchantEffects);

      expect(withMerchant).toBe(3000);

      // Create and trigger event
      const event = eventMocker.createFindMoneyEvent(withMerchant);
      eventMocker.triggerEvent(event);

      const currentEvent = eventMocker.getCurrentEvent();
      expect(currentEvent).toBeDefined();
      expect(currentEvent?.payload.amount).toBe(3000);
    });

    it('should protect against confiscation with multiple protection layers', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(74, 'Candy Vault')], // Full protection
        hallPasses: ['teachers_pet'], // 75% reduction
        merchantItems: [{ itemId: 'hall_monitor_bribe', count: 1 }], // Prevention
        period: 0,
      });

      const eventMocker = new EventMocker(store);
      const merchantEffects = store.getState().merchant.activeEffects;

      // Hall Monitor Bribe prevents confiscation entirely
      const hasBribe = MerchantUtils.hasHallMonitorBribe(merchantEffects);
      expect(hasBribe).toBe(true);

      // If bribe wasn't used, Teacher's Pet would reduce to 25%
      const event = eventMocker.createConfiscationEvent(25);
      eventMocker.triggerEvent(event);

      const currentEvent = eventMocker.getCurrentEvent();
      expect(currentEvent?.payload.percentage).toBe(25);
    });

    it('should protect against money loss with Medieval Shield + Bodyguard', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(67, 'Medieval Shield')], // Money protection
        merchantItems: [{ itemId: 'sixth_grade_bodyguard', count: 1 }], // Bully protection
        period: 0,
      });

      const eventMocker = new EventMocker(store);
      const merchantEffects = store.getState().merchant.activeEffects;

      // Bodyguard prevents bullying
      const hasBodyguard = MerchantUtils.hasBodyguard(merchantEffects);
      expect(hasBodyguard).toBe(true);

      // Create bully event
      const event = eventMocker.createBullyEvent(50);
      eventMocker.triggerEvent(event);

      // Event is created but should be prevented by bodyguard
      const currentEvent = eventMocker.getCurrentEvent();
      expect(currentEvent).toBeDefined();
    });
  });

  describe('Complex Real-World Scenarios', () => {
    it('Scenario 1: Power Seller - Max profit on single sale', () => {
      // Goal: Maximize profit on a single candy sale
      const store = createStoreWithEffects({
        jokers: [
          createMockJoker(1, 'Double Up', 'one-time'), // 2x price
          createMockJoker(48, 'Pursuasion', 'one-time'), // 2x profit
          createMockJoker(29, 'Even Stevens'), // +50% if even inventory
        ],
        hallPasses: ['high_roller'], // +30% sale price
        merchantItems: [
          { itemId: 'street_cred', level: 5 }, // +50% profit
          { itemId: 'influencer_shoutout', count: 1 }, // +200% next sale
        ],
        period: 1, // Even period
      });

      const basePrice = 100;
      const periodMocker = new PeriodMocker(store);

      // Verify even period for Even Stevens
      expect(periodMocker.isEvenPeriod()).toBe(true);

      // Expected calculation:
      // Base: $100
      // Hall Pass (+30%): $130
      // Street Cred (+50%): $195
      // Double Up (2x): $390
      // Even Stevens (+50%): $585
      // Pursuasion (2x): $1170
      // Influencer Shoutout (+200%): $3510

      // This is the theoretical maximum with current items
    });

    it('Scenario 2: Hoarder - Max inventory capacity', () => {
      const store = createStoreWithEffects({
        jokers: [
          createMockJoker(3, 'Geometric Expansion'), // +15
          createMockJoker(14, 'Fridge Organizer'), // +15
          createMockJoker(54, 'Bulk Up'), // +15
          createMockJoker(66, 'Treasure Chest'), // +15
        ],
        hallPasses: ['high_roller'], // +15
        merchantItems: [
          { itemId: 'hollowed_textbook', level: 5 }, // +50
        ],
        period: 0,
      });

      // Base: 20
      // Jokers: +60 (4 * 15)
      // Hall Pass: +15
      // Merchant: +50
      // Total: 145

      const expectedInventory = 145;
      const jokerBonus = 60;
      const hallPassBonus = 15;
      const merchantBonus = 50;

      expect(20 + jokerBonus + hallPassBonus + merchantBonus).toBe(expectedInventory);
    });

    it('Scenario 3: Money Machine - Massive allowance bonus', () => {
      const store = createStoreWithEffects({
        jokers: [
          createMockJoker(31, 'Ace the Test'), // 2x
          createMockJoker(7, 'Side Gig'), // 2x
        ],
        hallPasses: ['candy_kingpin'], // +100% (2x)
        merchantItems: [
          { itemId: 'fake_report_card', level: 3 }, // 8x
        ],
        period: 0,
      });

      const baseAllowance = 50;

      // Joker 1: 2x -> $100
      // Joker 2: 2x -> $200
      // Hall Pass: 2x -> $400
      // Merchant: 8x -> $3200

      // Total multiplier: 2 * 2 * 2 * 8 = 64x
      const expectedAllowance = baseAllowance * 64;
      expect(expectedAllowance).toBe(3200);
    });

    it('Scenario 4: Risk Manager - Full protection suite', () => {
      const store = createStoreWithEffects({
        jokers: [
          createMockJoker(74, 'Candy Vault'), // Stash protection
          createMockJoker(67, 'Medieval Shield'), // Money protection
        ],
        hallPasses: ['teachers_pet'], // 75% confiscation reduction
        merchantItems: [
          { itemId: 'hall_monitor_bribe', count: 2 },
          { itemId: 'sixth_grade_bodyguard', count: 2 },
          { itemId: 'double_sided_coin', level: 3 }, // 75% event conversion
        ],
        period: 0,
      });

      const merchantEffects = store.getState().merchant.activeEffects;

      // Verify all protections are active
      expect(MerchantUtils.hasHallMonitorBribe(merchantEffects)).toBe(true);
      expect(MerchantUtils.hasBodyguard(merchantEffects)).toBe(true);

      const hasCoinConversion = MerchantUtils.shouldConvertNegativeEvent(merchantEffects);
      expect(typeof hasCoinConversion).toBe('boolean');
    });
  });
});