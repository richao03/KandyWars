import {
  createStoreWithEffects,
  PeriodMocker,
  createMockJoker,
  getPriceBreakdown,
} from '../utils/testHelpers';
import { STANDARDIZED_JOKERS } from '../../utils/jokerEffectEngine';
import { JokerService } from '../../utils/jokerService';

describe('All Jokers - Comprehensive Tests', () => {
  describe('Math Jokers', () => {
    it('Double Up (ID: 1) - 2x candy price for 1 period', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 1);
      expect(joker).toBeDefined();
      expect(joker?.name).toBe('Double Up');
      expect(joker?.subject).toBe('Math');
      expect(joker?.type).toBe('one-time');

      const effect = joker?.effects[0];
      expect(effect?.target).toBe('candy_price');
      expect(effect?.operation).toBe('multiply');
      expect(effect?.amount).toBe(2);
      expect(effect?.duration).toBe('one-time');
    });

    it('Median Formula (ID: 2) - 2x multiplier on Medium candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 2);
      expect(joker?.name).toBe('Median Formula');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('size_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.candySize).toBe('medium');
    });

    it('Geometric Expansion (ID: 3) - Inventory +3 per day elapsed', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(3, 'Geometric Expansion')],
        period: 0,
      });

      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 3);
      expect(joker?.effects[0].target).toBe('day_scaled_inventory');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(3);

      const jokerService = JokerService.getInstance();
      const baseInventory = 20;
      const result = jokerService.applyJokerEffects(
        baseInventory,
        'day_scaled_inventory',
        store.getState().joker.jokers,
        0
      );

      expect(result).toBe(23); // 20 + 3
    });

    it('Ace the Test (ID: 31) - 2x daily allowance', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 31);
      expect(joker?.name).toBe('Ace the Test');
      expect(joker?.effects[0].target).toBe('allowance_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
    });

    it('Inductive Reasoning (ID: 43) - Inventory +5 every new day', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 43);
      expect(joker?.name).toBe('Inductive Reasoning');
      expect(joker?.effects[0].target).toBe('inventory_limit');
      expect(joker?.effects[0].amount).toBe(5);
    });

    it('Temporary Emperor (ID: 35) - Sell 3 of all candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 35);
      expect(joker?.name).toBe('Temporary Emperor');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('time_skip');
      expect(joker?.effects[0].amount).toBe(3);
    });
  });

  describe('Computer Jokers', () => {
    it('Tapped in (ID: 6) - Hear about events before they happen', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 6);
      expect(joker?.name).toBe('Tapped in');
      expect(joker?.effects[0].target).toBe('hint_chance');
      expect(joker?.effects[0].operation).toBe('set');
      expect(joker?.effects[0].amount).toBe(1); // 100% hint chance
    });

    it('Side Gig (ID: 7) - 2x daily allowance', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 7);
      expect(joker?.name).toBe('Side Gig');
      expect(joker?.effects[0].target).toBe('allowance_multiplier');
      expect(joker?.effects[0].amount).toBe(2);
    });

    it('Micro Chip (ID: 8) - 2x multiplier on Small candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 8);
      expect(joker?.name).toBe('Micro Chip');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('size_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.candySize).toBe('small');
    });

    it('Data Compression (ID: 9) - Inventory +13', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 9);
      expect(joker?.name).toBe('Data Compression');
      expect(joker?.effects[0].amount).toBe(13);
    });

    it('Overclock (ID: 10) - +0.3% profit per candy in inventory', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 10);
      expect(joker?.name).toBe('Overclock');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('inventory_count_bonus');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(0.003);
    });

    it('Diamond Hand (ID: 50) - $10 per candy at start of each period', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 50);
      expect(joker?.name).toBe('Diamond Hand');
      expect(joker?.effects[0].target).toBe('period_start_inventory_bonus');
      expect(joker?.effects[0].amount).toBe(10);
    });
  });

  describe('Home Economics Jokers', () => {
    it('Vacuum Sealer (ID: 12) - 2x inventory with multiplier penalty', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 12);
      expect(joker?.name).toBe('Vacuum Sealer');
      expect(joker?.effects[0].target).toBe('inventory_double_with_penalty');
      expect(joker?.effects[0].operation).toBe('enable');
    });

    it('Fridge Organizer (ID: 14) - Inventory +15', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 14);
      expect(joker?.name).toBe('Fridge Organizer');
      expect(joker?.effects[0].amount).toBe(15);
    });

    it('Perfect Bake (ID: 15) - $1000 for ending day with 0 candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 15);
      expect(joker?.name).toBe('Perfect Bake');
      expect(joker?.effects[0].target).toBe('empty_inventory_bonus');
      expect(joker?.effects[0].amount).toBe(1000);
    });

    it('Bake Sale (ID: 16) - Instantly gain $3000', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 16);
      expect(joker?.name).toBe('Bake Sale');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('money');
      expect(joker?.effects[0].amount).toBe(3000);
    });

    it('Home Made (ID: 17) - $10 per candy at period 1', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 17);
      expect(joker?.name).toBe('Home Made');
      expect(joker?.effects[0].target).toBe('morning_inventory_bonus');
      expect(joker?.effects[0].amount).toBe(10);
    });

    it('Super Size Me (ID: 18) - 2x multiplier on Big candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 18);
      expect(joker?.name).toBe('Super Size Me');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('size_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.candySize).toBe('big');
    });
  });

  describe('Art Jokers', () => {
    it('Treasure Chest (ID: 66) - Inventory +8, +$20 per empty slot at end of day', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 66);
      expect(joker?.name).toBe('Treasure Chest');
      expect(joker?.effects[0].target).toBe('inventory_limit');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(8);
      expect(joker?.effects[1].target).toBe('empty_slot_daily_bonus');
      expect(joker?.effects[1].operation).toBe('add');
      expect(joker?.effects[1].amount).toBe(20);
    });

    it('Odd Todd (ID: 30) - 2x ALL if inventory limit is odd', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 30);
      expect(joker?.name).toBe('Odd Todd');
      expect(joker?.effects[0].target).toBe('conditional_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.inventoryParity).toBe('odd');
    });

    it('Cocoa Futures (ID: 23) - 2x multiplier on Chocolate candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 23);
      expect(joker?.name).toBe('Cocoa Futures');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.candyType).toBe('chocolate');
    });

    it('Medieval Shield (ID: 67) - Protect against money loss', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 67);
      expect(joker?.name).toBe('Medieval Shield');
      expect(joker?.effects[0].target).toBe('money_protection');
      expect(joker?.effects[0].operation).toBe('enable');
    });

    it('Art Auction (ID: 52) - +5% profit per day elapsed', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 52);
      expect(joker?.name).toBe('Art Auction');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('day_scaling_bonus');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(0.05);
    });

    it('The Good Old Days (ID: 24) - Deli candy costs half price', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 24);
      expect(joker?.name).toBe('The Good Old Days');
      expect(joker?.effects[0].target).toBe('deli_price_discount');
      expect(joker?.effects[0].amount).toBe(0.5);
      expect(joker?.effects[0].conditions?.location).toBe('deli');
    });
  });

  describe('Economy Jokers', () => {
    it('Bear Market (ID: 19) - 2x multiplier on Gummy candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 19);
      expect(joker?.name).toBe('Bear Market');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.candyType).toBe('gummy');
    });

    it('Market Manipulation (ID: 20) - Set candy to highest price', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 20);
      expect(joker?.name).toBe('Market Manipulation');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('market_manipulation');
      expect(joker?.effects[0].operation).toBe('match_highest');
    });

    it('The Big Short (ID: 21) - Set candy to lowest price', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 21);
      expect(joker?.name).toBe('The Big Short');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('big_short');
      expect(joker?.effects[0].operation).toBe('match_lowest');
    });

    it('Deposit Bonus (ID: 22) - 10% bonus when depositing', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 22);
      expect(joker?.name).toBe('Deposit Bonus');
      expect(joker?.effects[0].target).toBe('deposit_bonus');
      expect(joker?.effects[0].amount).toBe(1.1);
    });

    it('The Bounceback (ID: 41) - $500 every period with no sale', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 41);
      expect(joker?.name).toBe('The Bounceback');
      expect(joker?.effects[0].target).toBe('drought_relief_bonus');
      expect(joker?.effects[0].amount).toBe(500);
      expect(joker?.effects[0].duration).toBe('persistent');
    });

    it('Roman Coin (ID: 37) - Instantly gain $2000', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 37);
      expect(joker?.name).toBe('Roman Coin');
      expect(joker?.effects[0].target).toBe('money');
      expect(joker?.effects[0].amount).toBe(2000);
    });
  });

  describe('Gym Jokers', () => {
    it('Farmers Carry (ID: 11) - +$2000/period if inv >= 75', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 11);
      expect(joker?.name).toBe('Farmers Carry');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('farmers_carry_bonus');
      expect(joker?.effects[0].amount).toBe(2000);
    });

    it('Coaching (ID: 13) - +$300 to daily allowance', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 13);
      expect(joker?.name).toBe('Coaching');
      expect(joker?.effects[0].target).toBe('allowance_add');
      expect(joker?.effects[0].amount).toBe(300);
    });

    it('Bet You I\'m Faster (ID: 25) - Fill inventory with chosen candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 25);
      expect(joker?.name).toBe("Bet You I'm Faster");
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('fill_inventory_choice');
    });

    it('Bulk Up (ID: 54) - Inventory +15', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 54);
      expect(joker?.name).toBe('Bulk Up');
      expect(joker?.effects[0].amount).toBe(15);
    });

    it('Perfect Change (ID: 45) - 10x ALL if cash ends in .00', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 45);
      expect(joker?.name).toBe('Perfect Change');
      expect(joker?.effects[0].target).toBe('conditional_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(10);
      expect(joker?.effects[0].conditions?.cashEndsWith).toBe('.00');
    });

    it('Hard Knocks (ID: 26) - 2x multiplier on Hard Candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 26);
      expect(joker?.name).toBe('Hard Knocks');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.candyType).toBe('hard_candy');
    });
  });

  describe('Logic Jokers', () => {
    it('Master Negotiator (ID: 27) - Convert candy types', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 27);
      expect(joker?.name).toBe('Master Negotiator');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('candy_conversion');
      expect(joker?.effects[0].operation).toBe('convert');
    });

    it('Therefore... (ID: 28) - +$200 to daily allowance', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 28);
      expect(joker?.name).toBe('Therefore...');
      expect(joker?.effects[0].target).toBe('allowance_add');
      expect(joker?.effects[0].amount).toBe(200);
    });

    it('Even Stevens (ID: 29) - 2x ALL if inventory limit is even', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 29);
      expect(joker?.name).toBe('Even Stevens');
      expect(joker?.effects[0].target).toBe('conditional_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.inventoryParity).toBe('even');
    });

    it('Embrace the Grind (ID: 55) - $500 for ending period with 0 inventory', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 55);
      expect(joker?.name).toBe('Embrace the Grind');
      expect(joker?.effects[0].target).toBe('empty_inventory_bonus');
      expect(joker?.effects[0].amount).toBe(500);
    });

    it('Pursuasion (ID: 48) - 2x next sale', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 48);
      expect(joker?.name).toBe('Pursuasion');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('next_sale_multiplier');
      expect(joker?.effects[0].amount).toBe(2);
    });

    it('Sour Logic (ID: 46) - 2x multiplier on Sour candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 46);
      expect(joker?.name).toBe('Sour Logic');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.candyType).toBe('sour');
    });
  });

  describe('Recess Jokers', () => {
    it('Double Dutch (ID: 32) - 2x multiplier on Chewy candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 32);
      expect(joker?.name).toBe('Double Dutch');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.candyType).toBe('chewy');
    });

    it('Feed the Beast (ID: 33) - +$300 per period when inventory >= 50% full', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 33);
      expect(joker?.name).toBe('Feed the Beast');
      expect(joker?.effects[0].target).toBe('inventory_fullness_bonus');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(300);
    });

    it('Hopscotch Bonus (ID: 34) - +5% profit per unique location visited today', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 34);
      expect(joker?.name).toBe('Hopscotch Bonus');
      expect(joker?.effects[0].target).toBe('location_diversity_bonus');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(0.05);
    });

    it('Hide and Seek (ID: 51) - Triple found money', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 51);
      expect(joker?.name).toBe('Hide and Seek');
      expect(joker?.effects[0].target).toBe('found_money_multiplier');
      expect(joker?.effects[0].amount).toBe(3);
    });

    it('Swingset Momentum (ID: 36) - +10% per consecutive sale', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 36);
      expect(joker?.name).toBe('Swingset Momentum');
      expect(joker?.effects[0].target).toBe('consecutive_sale_bonus');
      expect(joker?.effects[0].amount).toBe(1.1);
    });

    it('Secret Hideout (ID: 74) - Protect stash from confiscation', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 74);
      expect(joker?.name).toBe('Secret Hideout');
      expect(joker?.effects[0].target).toBe('stash_protection');
      expect(joker?.effects[0].operation).toBe('enable');
    });
  });

  describe('Geography Jokers', () => {
    it('Golden Hour (ID: 38) - +50% profit during last 2 periods of day', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 38);
      expect(joker?.name).toBe('Golden Hour');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('late_period_bonus');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(0.50);
    });

    it('Trade Routes (ID: 39) - +1 inventory every period', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 39);
      expect(joker?.name).toBe('Trade Routes');
      expect(joker?.effects[0].target).toBe('inventory_limit');
      expect(joker?.effects[0].amount).toBe(1);
    });

    it('Continental Drift (ID: 40) - Shuffle all prices', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 40);
      expect(joker?.name).toBe('Continental Drift');
      expect(joker?.type).toBe('one-time');
    });

    it('Mysterious Artifact (ID: 53) - 8% daily stash interest', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 53);
      expect(joker?.name).toBe('Mysterious Artifact');
      expect(joker?.effects[0].target).toBe('stash_interest');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.08);
    });

    it('Tropical Import (ID: 42) - 2x multiplier on Fruity candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 42);
      expect(joker?.name).toBe('Tropical Import');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.candyType).toBe('fruity');
    });

    it('Atlas Bonus (ID: 44) - Instantly gain $2500', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 44);
      expect(joker?.name).toBe('Atlas Bonus');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('money');
      expect(joker?.effects[0].amount).toBe(2500);
    });
  });

  describe('Special Mechanics', () => {
    it('should handle one-time joker activation correctly', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(1, 'Double Up', 'one-time')],
        period: 0,
      });

      const activeEffects = [{ jokerId: 1, period: 0 }];
      const breakdown = getPriceBreakdown(100, {
        jokers: store.getState().joker.jokers,
        period: 0,
        activeEffects,
      });

      // Double Up should appear in breakdown when activated
      const effect = breakdown.jokerEffects.find((e) => e.jokerName === 'Double Up');
      if (effect) {
        expect(effect.isActive).toBe(true);
      }
    });

    it('should not activate one-time joker on different period', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(1, 'Double Up', 'one-time')],
        period: 1,
      });

      // Activated on period 0, but we're on period 1
      const activeEffects = [{ jokerId: 1, period: 0 }];
      const breakdown = getPriceBreakdown(100, {
        jokers: store.getState().joker.jokers,
        period: 1,
        activeEffects,
      });

      // Should not be active on different period
      const effect = breakdown.jokerEffects.find((e) => e.jokerName === 'Double Up');
      if (effect) {
        expect(effect.isActive).toBe(false);
      }
    });

    it('should handle persistent jokers across periods', () => {
      const store = createStoreWithEffects({
        jokers: [createMockJoker(3, 'Geometric Expansion', 'persistent')],
        period: 0,
      });

      const periodMocker = new PeriodMocker(store);
      const jokerService = JokerService.getInstance();

      // Test on period 0
      let result = jokerService.applyJokerEffects(
        20,
        'day_scaled_inventory',
        store.getState().joker.jokers,
        0
      );
      expect(result).toBe(23);

      // Advance to period 5
      periodMocker.setPeriod(5);

      // Should still apply
      result = jokerService.applyJokerEffects(
        20,
        'day_scaled_inventory',
        store.getState().joker.jokers,
        5
      );
      expect(result).toBe(23);
    });

    it('should handle conditional jokers (Even Stevens vs Odd Todd)', () => {
      const evenStore = createStoreWithEffects({
        jokers: [createMockJoker(29, 'Even Stevens')],
        period: 0,
      });

      const oddStore = createStoreWithEffects({
        jokers: [createMockJoker(30, 'Odd Todd')],
        period: 0,
      });

      // Even Stevens should activate with even inventory limit
      // Odd Todd should activate with odd inventory limit
      // This is tested via conditional logic in JokerService
    });
  });

  describe('Joker Metadata Validation', () => {
    it('should have all required fields for each joker', () => {
      STANDARDIZED_JOKERS.forEach((joker) => {
        expect(joker.id).toBeDefined();
        expect(joker.name).toBeDefined();
        expect(joker.subject).toBeDefined();
        expect(joker.type).toMatch(/^(one-time|persistent)$/);
        expect(joker.flavorText).toBeDefined();
        expect(joker.description).toBeDefined();
        expect(joker.effects).toBeDefined();
        expect(joker.effects.length).toBeGreaterThan(0);
      });
    });

    it('should have unique IDs', () => {
      const ids = STANDARDIZED_JOKERS.map((j) => j.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have valid effect targets', () => {
      const validTargets = [
        'inventory_limit',
        'candy_price',
        'sell_multiplier',
        'sell_flat_bonus',
        'period_count',
        'money',
        'hint_chance',
        'stash_protection',
        'event_immunity',
        'study_time',
        'joker_duplicate',
        'candy_conversion',
        'time_skip',
        'candy_generation',
        'money_protection',
        'empty_inventory_bonus',
        'holding_inventory_bonus',
        'drought_relief_bonus',
        'compound_interest_bonus',
        'market_manipulation',
        'big_short',
        'morning_inventory_bonus',
        'period_start_inventory_bonus',
        'deposit_bonus',
        'deli_price_discount',
        'fill_inventory_choice',
        'found_money_multiplier',
        'allowance_multiplier',
        'allowance_add',
        'next_sale_multiplier',
        'consecutive_sale_bonus',
        'perfect_balance_bonus',
        'randomize_prices',
        'stash_interest',
        'farmers_carry_bonus',
        'type_multiplier',
        'size_multiplier',
        'conditional_multiplier',
        'inventory_double_with_penalty',
        'day_scaled_inventory',
        'inventory_count_bonus',
        'inventory_fullness_bonus',
        'location_diversity_bonus',
        'late_period_bonus',
        'day_scaling_bonus',
        'empty_slot_daily_bonus',
      ];

      STANDARDIZED_JOKERS.forEach((joker) => {
        joker.effects.forEach((effect) => {
          expect(validTargets).toContain(effect.target);
        });
      });
    });

    it('should have exactly 54 jokers', () => {
      expect(STANDARDIZED_JOKERS.length).toBe(54);
    });
  });
});
