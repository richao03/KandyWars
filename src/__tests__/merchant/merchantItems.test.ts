import { createStoreWithEffects } from '../utils/testHelpers';
import {
  selectOwnedLevel,
  selectActiveEffectValue,
  selectItemPrice,
  selectCanPurchaseItem,
  purchaseLeveledItem,
  purchaseConsumableItem,
  consumeEffect,
  MERCHANT_ITEMS,
} from '../../store/slices/merchantSlice';
import { MerchantUtils } from '../../utils/merchantUtils';

describe('Merchant Items', () => {
  describe('Leveled Items', () => {
    describe('Fake Report Card (Allowance Multiplier)', () => {
      it('should have correct prices for each level', () => {
        const item = MERCHANT_ITEMS.find((i) => i.id === 'fake_report_card');
        expect(item).toBeDefined();
        expect(item?.prices).toEqual([5000, 15000, 35000]);
      });

      it('should apply 2x allowance multiplier per level (exponential)', () => {
        const baseAllowance = 50;

        // Level 1: 2x multiplier
        let activeEffects = [{ itemId: 'fake_report_card' as const, level: 1 }];
        let result = MerchantUtils.applyAllowanceBonus(baseAllowance, activeEffects);
        expect(result).toBe(100); // 50 * 2

        // Level 2: 4x multiplier
        activeEffects = [{ itemId: 'fake_report_card' as const, level: 2 }];
        result = MerchantUtils.applyAllowanceBonus(baseAllowance, activeEffects);
        expect(result).toBe(200); // 50 * 4

        // Level 3: 8x multiplier
        activeEffects = [{ itemId: 'fake_report_card' as const, level: 3 }];
        result = MerchantUtils.applyAllowanceBonus(baseAllowance, activeEffects);
        expect(result).toBe(400); // 50 * 8
      });

      it('should enforce max level of 3', () => {
        const store = createStoreWithEffects({});

        // Purchase 3 levels
        store.dispatch(purchaseLeveledItem({ itemId: 'fake_report_card' }));
        store.dispatch(purchaseLeveledItem({ itemId: 'fake_report_card' }));
        store.dispatch(purchaseLeveledItem({ itemId: 'fake_report_card' }));

        const level = selectOwnedLevel('fake_report_card')(store.getState());
        expect(level).toBe(3);

        const canPurchase = selectCanPurchaseItem('fake_report_card')(store.getState());
        expect(canPurchase).toBe(false);
      });
    });

    describe('Metal Detector (Found Money Multiplier)', () => {
      it('should have correct prices for each level', () => {
        const item = MERCHANT_ITEMS.find((i) => i.id === 'metal_detector');
        expect(item).toBeDefined();
        expect(item?.prices).toEqual([10000, 25000, 50000]);
      });

      it('should apply correct found money multipliers', () => {
        const baseAmount = 10;

        // Level 1: 2x multiplier
        let activeEffects = [{ itemId: 'metal_detector' as const, level: 1 }];
        let result = MerchantUtils.applyFoundMoneyMultiplier(baseAmount, activeEffects);
        expect(result).toBe(20); // 10 * 2

        // Level 2: 4x multiplier
        activeEffects = [{ itemId: 'metal_detector' as const, level: 2 }];
        result = MerchantUtils.applyFoundMoneyMultiplier(baseAmount, activeEffects);
        expect(result).toBe(40); // 10 * 4

        // Level 3: 8x multiplier
        activeEffects = [{ itemId: 'metal_detector' as const, level: 3 }];
        result = MerchantUtils.applyFoundMoneyMultiplier(baseAmount, activeEffects);
        expect(result).toBe(80); // 10 * 8
      });

      it('should enforce max level of 3', () => {
        const store = createStoreWithEffects({});

        store.dispatch(purchaseLeveledItem({ itemId: 'metal_detector' }));
        store.dispatch(purchaseLeveledItem({ itemId: 'metal_detector' }));
        store.dispatch(purchaseLeveledItem({ itemId: 'metal_detector' }));

        const level = selectOwnedLevel('metal_detector')(store.getState());
        expect(level).toBe(3);

        const canPurchase = selectCanPurchaseItem('metal_detector')(store.getState());
        expect(canPurchase).toBe(false);
      });
    });

    describe('Hollowed Textbook (Inventory Capacity)', () => {
      it('should have correct prices for each level', () => {
        const item = MERCHANT_ITEMS.find((i) => i.id === 'hollowed_textbook');
        expect(item).toBeDefined();
        expect(item?.prices).toEqual([2000, 5000, 15000, 25000, 35000]);
      });

      it('should add +10 capacity per level', () => {
        const baseCapacity = 20;

        // Level 1: +10
        let activeEffects = [{ itemId: 'hollowed_textbook' as const, level: 1 }];
        let result = MerchantUtils.applyInventoryBonus(baseCapacity, activeEffects);
        expect(result).toBe(30);

        // Level 3: +30
        activeEffects = [{ itemId: 'hollowed_textbook' as const, level: 3 }];
        result = MerchantUtils.applyInventoryBonus(baseCapacity, activeEffects);
        expect(result).toBe(50);

        // Level 5: +50
        activeEffects = [{ itemId: 'hollowed_textbook' as const, level: 5 }];
        result = MerchantUtils.applyInventoryBonus(baseCapacity, activeEffects);
        expect(result).toBe(70);
      });

      it('should enforce max level of 5', () => {
        const store = createStoreWithEffects({});

        // Purchase all 5 levels
        for (let i = 0; i < 5; i++) {
          store.dispatch(purchaseLeveledItem({ itemId: 'hollowed_textbook' }));
        }

        const level = selectOwnedLevel('hollowed_textbook')(store.getState());
        expect(level).toBe(5);

        const canPurchase = selectCanPurchaseItem('hollowed_textbook')(store.getState());
        expect(canPurchase).toBe(false);
      });
    });

    describe('Street Cred (Profit Bonus)', () => {
      it('should have correct prices for each level', () => {
        const item = MERCHANT_ITEMS.find((i) => i.id === 'street_cred');
        expect(item).toBeDefined();
        expect(item?.prices).toEqual([5000, 15000, 30000, 45000, 55000]);
      });

      it('should add +10% profit per level', () => {
        const basePrice = 100;

        // Level 1: +10%
        let activeEffects = [{ itemId: 'street_cred' as const, level: 1 }];
        let result = MerchantUtils.applyProfitBonus(basePrice, activeEffects);
        expect(result).toBe(110);

        // Level 3: +30%
        activeEffects = [{ itemId: 'street_cred' as const, level: 3 }];
        result = MerchantUtils.applyProfitBonus(basePrice, activeEffects);
        expect(result).toBe(130);

        // Level 5: +50%
        activeEffects = [{ itemId: 'street_cred' as const, level: 5 }];
        result = MerchantUtils.applyProfitBonus(basePrice, activeEffects);
        expect(result).toBe(150);
      });

      it('should enforce max level of 5', () => {
        const store = createStoreWithEffects({});

        for (let i = 0; i < 5; i++) {
          store.dispatch(purchaseLeveledItem({ itemId: 'street_cred' }));
        }

        const level = selectOwnedLevel('street_cred')(store.getState());
        expect(level).toBe(5);

        const canPurchase = selectCanPurchaseItem('street_cred')(store.getState());
        expect(canPurchase).toBe(false);
      });
    });

    describe('Double Sided Coin (Event Conversion)', () => {
      it('should have correct prices for each level', () => {
        const item = MERCHANT_ITEMS.find((i) => i.id === 'double_sided_coin');
        expect(item).toBeDefined();
        expect(item?.prices).toEqual([10000, 30000, 45000]);
      });

      it('should have increasing conversion chances', () => {
        // Level 1: 25% chance
        let activeEffects = [{ itemId: 'double_sided_coin' as const, level: 1 }];
        let hasChance = MerchantUtils.shouldConvertNegativeEvent(activeEffects);
        expect(typeof hasChance).toBe('boolean');

        // Level 2: 50% chance
        activeEffects = [{ itemId: 'double_sided_coin' as const, level: 2 }];
        hasChance = MerchantUtils.shouldConvertNegativeEvent(activeEffects);
        expect(typeof hasChance).toBe('boolean');

        // Level 3: 75% chance
        activeEffects = [{ itemId: 'double_sided_coin' as const, level: 3 }];
        hasChance = MerchantUtils.shouldConvertNegativeEvent(activeEffects);
        expect(typeof hasChance).toBe('boolean');
      });

      it('should enforce max level of 3', () => {
        const store = createStoreWithEffects({});

        store.dispatch(purchaseLeveledItem({ itemId: 'double_sided_coin' }));
        store.dispatch(purchaseLeveledItem({ itemId: 'double_sided_coin' }));
        store.dispatch(purchaseLeveledItem({ itemId: 'double_sided_coin' }));

        const level = selectOwnedLevel('double_sided_coin')(store.getState());
        expect(level).toBe(3);

        const canPurchase = selectCanPurchaseItem('double_sided_coin')(store.getState());
        expect(canPurchase).toBe(false);
      });
    });
  });

  describe('Consumable Items', () => {
    describe('Influencer Shoutout (+200% profit on next sale)', () => {
      it('should have correct base price and multiplier', () => {
        const item = MERCHANT_ITEMS.find((i) => i.id === 'influencer_shoutout');
        expect(item).toBeDefined();
        expect(item?.basePrice).toBe(8000);
        expect(item?.priceMultiplier).toBe(1.75);
      });

      it('should scale price with 1.75x multiplier on repeat purchases', () => {
        const store = createStoreWithEffects({});

        // First purchase: base price
        let price = selectItemPrice('influencer_shoutout')(store.getState());
        expect(price).toBe(8000);

        store.dispatch(purchaseConsumableItem({ itemId: 'influencer_shoutout' }));

        // Second purchase: 8000 * 1.75
        price = selectItemPrice('influencer_shoutout')(store.getState());
        expect(price).toBe(14000);

        store.dispatch(purchaseConsumableItem({ itemId: 'influencer_shoutout' }));

        // Third purchase: 8000 * 1.75^2
        price = selectItemPrice('influencer_shoutout')(store.getState());
        expect(price).toBe(24500);
      });

      it('should track count correctly', () => {
        const store = createStoreWithEffects({
          merchantItems: [{ itemId: 'influencer_shoutout', count: 3 }],
        });

        const count = MerchantUtils.getInfluencerShoutoutCount(
          store.getState().merchant.activeEffects
        );
        expect(count).toBe(3);
      });

      it('should decrease count when consumed', () => {
        const store = createStoreWithEffects({
          merchantItems: [{ itemId: 'influencer_shoutout', count: 2 }],
        });

        let count = selectActiveEffectValue('influencer_shoutout')(store.getState());
        expect(count).toBe(2);

        store.dispatch(consumeEffect({ itemId: 'influencer_shoutout' }));

        count = selectActiveEffectValue('influencer_shoutout')(store.getState());
        expect(count).toBe(1);

        store.dispatch(consumeEffect({ itemId: 'influencer_shoutout' }));

        count = selectActiveEffectValue('influencer_shoutout')(store.getState());
        expect(count).toBe(0);
      });

      it('should be available when count > 0', () => {
        const activeEffects = [{ itemId: 'influencer_shoutout' as const, count: 1 }];
        const hasShoutout = MerchantUtils.hasInfluencerShoutout(activeEffects);
        expect(hasShoutout).toBe(true);
      });
    });

    describe('Hall Monitor Bribe (Avoid getting busted)', () => {
      it('should have correct base price and multiplier', () => {
        const item = MERCHANT_ITEMS.find((i) => i.id === 'hall_monitor_bribe');
        expect(item).toBeDefined();
        expect(item?.basePrice).toBe(4000);
        expect(item?.priceMultiplier).toBe(1.75);
      });

      it('should scale price correctly', () => {
        const store = createStoreWithEffects({});

        let price = selectItemPrice('hall_monitor_bribe')(store.getState());
        expect(price).toBe(4000);

        store.dispatch(purchaseConsumableItem({ itemId: 'hall_monitor_bribe' }));

        price = selectItemPrice('hall_monitor_bribe')(store.getState());
        expect(price).toBe(7000);
      });

      it('should be available when count > 0', () => {
        const activeEffects = [{ itemId: 'hall_monitor_bribe' as const, count: 1 }];
        const hasBribe = MerchantUtils.hasHallMonitorBribe(activeEffects);
        expect(hasBribe).toBe(true);
      });

      it('should not be available when count is 0', () => {
        const activeEffects = [{ itemId: 'hall_monitor_bribe' as const, count: 0 }];
        const hasBribe = MerchantUtils.hasHallMonitorBribe(activeEffects);
        expect(hasBribe).toBe(false);
      });
    });

    describe('6th Grade Bodyguard (Avoid getting bullied)', () => {
      it('should have correct base price and multiplier', () => {
        const item = MERCHANT_ITEMS.find((i) => i.id === 'sixth_grade_bodyguard');
        expect(item).toBeDefined();
        expect(item?.basePrice).toBe(2000);
        expect(item?.priceMultiplier).toBe(1.75);
      });

      it('should scale price correctly', () => {
        const store = createStoreWithEffects({});

        let price = selectItemPrice('sixth_grade_bodyguard')(store.getState());
        expect(price).toBe(2000);

        store.dispatch(purchaseConsumableItem({ itemId: 'sixth_grade_bodyguard' }));

        price = selectItemPrice('sixth_grade_bodyguard')(store.getState());
        expect(price).toBe(3500);
      });

      it('should be available when count > 0', () => {
        const activeEffects = [{ itemId: 'sixth_grade_bodyguard' as const, count: 1 }];
        const hasBodyguard = MerchantUtils.hasBodyguard(activeEffects);
        expect(hasBodyguard).toBe(true);
      });
    });

    describe('Air Delivery Drone (Deposit to stash)', () => {
      it('should have correct base price and multiplier', () => {
        const item = MERCHANT_ITEMS.find((i) => i.id === 'air_delivery_drone');
        expect(item).toBeDefined();
        expect(item?.basePrice).toBe(7000);
        expect(item?.priceMultiplier).toBe(1.75);
      });

      it('should scale price correctly', () => {
        const store = createStoreWithEffects({});

        let price = selectItemPrice('air_delivery_drone')(store.getState());
        expect(price).toBe(7000);

        store.dispatch(purchaseConsumableItem({ itemId: 'air_delivery_drone' }));

        price = selectItemPrice('air_delivery_drone')(store.getState());
        expect(price).toBe(12250);
      });

      it('should track count correctly', () => {
        const store = createStoreWithEffects({
          merchantItems: [{ itemId: 'air_delivery_drone', count: 2 }],
        });

        const count = MerchantUtils.getAirDeliveryDroneCount(
          store.getState().merchant.activeEffects
        );
        expect(count).toBe(2);
      });
    });
  });

  describe('Integration - Multiple Merchant Items', () => {
    it('should allow purchasing multiple different items', () => {
      const store = createStoreWithEffects({
        merchantItems: [
          { itemId: 'street_cred', level: 3 },
          { itemId: 'hollowed_textbook', level: 2 },
          { itemId: 'influencer_shoutout', count: 2 },
        ],
      });

      const streetCredLevel = selectOwnedLevel('street_cred')(store.getState());
      const textbookLevel = selectOwnedLevel('hollowed_textbook')(store.getState());
      const shoutoutCount = selectActiveEffectValue('influencer_shoutout')(store.getState());

      expect(streetCredLevel).toBe(3);
      expect(textbookLevel).toBe(2);
      expect(shoutoutCount).toBe(2);
    });

    it('should apply multiple merchant bonuses together', () => {
      const activeEffects = [
        { itemId: 'street_cred' as const, level: 2 },
        { itemId: 'influencer_shoutout' as const, count: 1 },
      ];

      // Street Cred Level 2: +20% profit
      const basePrice = 100;
      const withStreetCred = MerchantUtils.applyProfitBonus(basePrice, activeEffects);
      expect(withStreetCred).toBe(120);

      // Influencer Shoutout should be available
      const hasShoutout = MerchantUtils.hasInfluencerShoutout(activeEffects);
      expect(hasShoutout).toBe(true);
    });
  });
});
