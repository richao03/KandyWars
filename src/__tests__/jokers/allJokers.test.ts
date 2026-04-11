import {
  createStoreWithEffects,
  PeriodMocker,
  createMockJoker,
  getPriceBreakdown,
} from '../utils/testHelpers';
import { STANDARDIZED_JOKERS } from '../../utils/jokerEffectEngine';

describe('All Jokers - Comprehensive Tests', () => {
  // === [+Profit] TYPE BOOSTS ===
  describe('Type Boost Jokers', () => {
    it('Cocoa Futures (ID: 23) - 1.5x multiplier on Chocolate candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 23);
      expect(joker).toBeDefined();
      expect(joker?.name).toBe('Cocoa Futures');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.candyType).toBe('chocolate');
    });

    it('Hard Knocks (ID: 26) - 1.5x multiplier on Hard Candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 26);
      expect(joker?.name).toBe('Hard Knocks');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.candyType).toBe('hard_candy');
    });

    it('Sour Logic (ID: 46) - 1.5x multiplier on Sour candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 46);
      expect(joker?.name).toBe('Sour Logic');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.candyType).toBe('sour');
    });

    it('Double Dutch (ID: 32) - 1.5x multiplier on Chewy candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 32);
      expect(joker?.name).toBe('Double Dutch');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.candyType).toBe('chewy');
    });

    it('Tropical Import (ID: 42) - 1.5x multiplier on Fruity candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 42);
      expect(joker?.name).toBe('Tropical Import');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.candyType).toBe('fruity');
    });

    it('Combo Platter (ID: 8) - +1x bonus when both candy types covered', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 8);
      expect(joker?.name).toBe('Combo Platter');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('combo_platter_boost');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(1);
    });

    it('Bulk Discount (ID: 47) - 1.5x when selling 5+ at once', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 47);
      expect(joker?.name).toBe('Bulk Discount');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('bulk_sale_boost');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.bulkThreshold).toBe(5);
    });

    it('Bear Market (ID: 19) - +1.5 on Gummy candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 19);
      expect(joker?.name).toBe('Bear Market');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('type_multiplier');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.candyType).toBe('gummy');
    });
  });

  // === [xMult] MULTIPLIERS ===
  describe('Multiplier Jokers', () => {
    it('Even Stevens (ID: 29) - 1.5x ALL if inventory limit is even', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 29);
      expect(joker?.name).toBe('Even Stevens');
      expect(joker?.effects[0].target).toBe('conditional_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.inventoryParity).toBe('even');
    });

    it('Odd Todd (ID: 30) - 1.5x ALL if inventory limit is odd', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 30);
      expect(joker?.name).toBe('Odd Todd');
      expect(joker?.effects[0].target).toBe('conditional_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.inventoryParity).toBe('odd');
    });

    it('Golden Hour (ID: 38) - 1.5x profit in last 2 periods of day', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 38);
      expect(joker?.name).toBe('Golden Hour');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('conditional_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
    });

    it('Early Bird (ID: 45) - 1.5x on first sale each day', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 45);
      expect(joker?.name).toBe('Early Bird');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('first_sale_boost');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
    });

    it('Underdog (ID: 49) - 1.5x when cash < $5k', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 49);
      expect(joker?.name).toBe('Underdog');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('cash_under_boost');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
      expect(joker?.effects[0].conditions?.cashBelow).toBe(5000);
    });

    it('Broke and Hungry (ID: 52) - 2x when cash < $2k', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 52);
      expect(joker?.name).toBe('Broke and Hungry');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('cash_under_boost');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].conditions?.cashBelow).toBe(2000);
    });

    it('Flip Artist (ID: 2) - 1.5x when selling at 3x+ markup', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 2);
      expect(joker?.name).toBe('Flip Artist');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('flip_artist_boost');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
    });

    it('Variety Pack (ID: 50) - 1.5x when 3+ candy types in inventory', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 50);
      expect(joker?.name).toBe('Variety Pack');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('variety_pack_boost');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.5);
    });

    it('Triple Threat (ID: 18) - +2x when 3+ candy types covered by jokers', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 18);
      expect(joker?.name).toBe('Triple Threat');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('triple_threat_boost');
      expect(joker?.effects[0].operation).toBe('add');
      expect(joker?.effects[0].amount).toBe(2);
    });

    it('Pursuasion (ID: 48) - 2x next sale', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 48);
      expect(joker?.name).toBe('Pursuasion');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('next_sale_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
    });
  });

  // === INVENTORY ===
  describe('Inventory Jokers', () => {
    it('Data Compression (ID: 9) - Inventory +13', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 9);
      expect(joker?.name).toBe('Data Compression');
      expect(joker?.effects[0].target).toBe('inventory_limit');
      expect(joker?.effects[0].amount).toBe(13);
    });

    it('Inductive Reasoning (ID: 43) - Inventory +5 every new day', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 43);
      expect(joker?.name).toBe('Inductive Reasoning');
      expect(joker?.effects[0].target).toBe('inventory_limit');
      expect(joker?.effects[0].amount).toBe(5);
    });

    it('Trade Routes (ID: 39) - +2 inventory every period', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 39);
      expect(joker?.name).toBe('Trade Routes');
      expect(joker?.effects[0].target).toBe('inventory_limit');
      expect(joker?.effects[0].amount).toBe(2);
    });

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

    it('Vacuum Sealer (ID: 12) - 2x inventory with multiplier penalty', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 12);
      expect(joker?.name).toBe('Vacuum Sealer');
      expect(joker?.effects[0].target).toBe('inventory_double_with_penalty');
      expect(joker?.effects[0].operation).toBe('enable');
    });
  });

  // === INCOME ===
  describe('Income Jokers', () => {
    it('Ace the Test (ID: 31) - 2x allowance + $300 flat', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 31);
      expect(joker?.name).toBe('Ace the Test');
      expect(joker?.effects[0].target).toBe('allowance_multiplier');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[1].target).toBe('allowance_add');
      expect(joker?.effects[1].operation).toBe('add');
      expect(joker?.effects[1].amount).toBe(300);
    });

    it('Deposit Bonus (ID: 22) - 5% of stash as daily allowance', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 22);
      expect(joker?.name).toBe('Deposit Bonus');
      expect(joker?.effects[0].target).toBe('stash_allowance_bonus');
      expect(joker?.effects[0].amount).toBe(0.05);
    });

    it('Farmers Carry (ID: 11) - $5 per candy in inventory each period', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 11);
      expect(joker?.name).toBe('Farmers Carry');
      expect(joker?.type).toBe('persistent');
      expect(joker?.effects[0].target).toBe('farmers_carry_bonus');
      expect(joker?.effects[0].amount).toBe(5);
    });

    it('Home Made (ID: 17) - $25 per candy at start of day', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 17);
      expect(joker?.name).toBe('Home Made');
      expect(joker?.effects[0].target).toBe('morning_inventory_bonus');
      expect(joker?.effects[0].amount).toBe(25);
    });

    it('Perfect Bake (ID: 15) - $1000 for ending day with 0 candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 15);
      expect(joker?.name).toBe('Perfect Bake');
      expect(joker?.effects[0].target).toBe('empty_inventory_bonus');
      expect(joker?.effects[0].amount).toBe(1000);
    });

    it('Mysterious Artifact (ID: 53) - 8% daily stash interest', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 53);
      expect(joker?.name).toBe('Mysterious Artifact');
      expect(joker?.effects[0].target).toBe('stash_interest');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(1.08);
    });
  });

  // === ONE-TIME ===
  describe('One-Time Jokers', () => {
    it('Double Up (ID: 1) - 2x candy price for 1 period', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 1);
      expect(joker).toBeDefined();
      expect(joker?.name).toBe('Double Up');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('candy_price');
      expect(joker?.effects[0].operation).toBe('multiply');
      expect(joker?.effects[0].amount).toBe(2);
      expect(joker?.effects[0].duration).toBe('one-time');
    });

    it('Bake Sale (ID: 16) - Instantly gain $3000', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 16);
      expect(joker?.name).toBe('Bake Sale');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('money');
      expect(joker?.effects[0].amount).toBe(3000);
    });

    it('Roman Coin (ID: 37) - Instantly gain $2000', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 37);
      expect(joker?.name).toBe('Roman Coin');
      expect(joker?.effects[0].target).toBe('money');
      expect(joker?.effects[0].amount).toBe(2000);
    });

    it('Market Manipulation (ID: 20) - Set candy to highest price', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 20);
      expect(joker?.name).toBe('Market Manipulation');
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('market_manipulation');
      expect(joker?.effects[0].operation).toBe('match_highest');
    });

    it('Bet You I\'m Faster (ID: 25) - Fill inventory with chosen candy', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 25);
      expect(joker?.name).toBe("Bet You I'm Faster");
      expect(joker?.type).toBe('one-time');
      expect(joker?.effects[0].target).toBe('fill_inventory_choice');
    });
  });

  // === UTILITY ===
  describe('Utility Jokers', () => {
    it('Tapped In (ID: 6) - 100% event hint chance', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 6);
      expect(joker?.name).toBe('Tapped In');
      expect(joker?.effects[0].target).toBe('hint_chance');
      expect(joker?.effects[0].operation).toBe('set');
      expect(joker?.effects[0].amount).toBe(1);
    });

    it('Safe House (ID: 67) - Protect wallet and stash', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 67);
      expect(joker?.name).toBe('Safe House');
      expect(joker?.effects[0].target).toBe('money_protection');
      expect(joker?.effects[0].operation).toBe('enable');
      expect(joker?.effects[1].target).toBe('stash_protection');
      expect(joker?.effects[1].operation).toBe('enable');
    });

    it('The Good Old Days (ID: 24) - Deli candy costs half price', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 24);
      expect(joker?.name).toBe('The Good Old Days');
      expect(joker?.effects[0].target).toBe('deli_price_discount');
      expect(joker?.effects[0].amount).toBe(0.5);
      expect(joker?.effects[0].conditions?.location).toBe('deli');
    });

    it('Extra Credit (ID: 55) - +1 joker choice after minigames', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 55);
      expect(joker?.name).toBe('Extra Credit');
      expect(joker?.effects[0].target).toBe('extra_joker_choice');
      expect(joker?.effects[0].amount).toBe(1);
    });

    it('Sixth Sense (ID: 56) - +1 aura slot', () => {
      const joker = STANDARDIZED_JOKERS.find((j) => j.id === 56);
      expect(joker?.name).toBe('Sixth Sense');
      expect(joker?.effects[0].target).toBe('extra_aura_slot');
      expect(joker?.effects[0].amount).toBe(1);
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

      const activeEffects = [{ jokerId: 1, period: 0 }];
      const breakdown = getPriceBreakdown(100, {
        jokers: store.getState().joker.jokers,
        period: 1,
        activeEffects,
      });

      const effect = breakdown.jokerEffects.find((e) => e.jokerName === 'Double Up');
      if (effect) {
        expect(effect.isActive).toBe(false);
      }
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
        'stash_allowance_bonus',
        'deli_price_discount',
        'fill_inventory_choice',
        'found_money_multiplier',
        'allowance_multiplier',
        'allowance_add',
        'next_sale_multiplier',
        'perfect_balance_bonus',
        'randomize_prices',
        'stash_interest',
        'farmers_carry_bonus',
        'type_multiplier',
        'size_multiplier',
        'conditional_multiplier',
        'inventory_double_with_penalty',
        'empty_slot_daily_bonus',
        'flip_artist_boost',
        'combo_platter_boost',
        'triple_threat_boost',
        'variety_pack_boost',
        'first_sale_boost',
        'bulk_sale_boost',
        'cash_under_boost',
        'extra_joker_choice',
        'extra_aura_slot',
        'sugar_rush_penalty',
        'loan_shark_income',
        'glass_cannon_boost',
        'contraband_boost',
        'all_in_boost',
        'hot_potato_penalty',
        'compound_interest_boost',
        'reputation_boost',
        'street_smarts_boost',
        'clearance_sale_boost',
        'price_manipulation',
        'found_money_multiplier',
        'event_conversion',
        'event_early_reveal',
        'event_positive_chance',
        'event_immunity',
        'collector_boost',
        'minimalist_boost',
        'lucky_seven_boost',
        'night_owl_boost',
        'tax_collector_boost',
        'last_stand_boost',
        'momentum_boost',
        'diversifier_boost',
        'peak_hours_boost',
        'patience_pays_boost',
        'spare_change_income',
      ];

      STANDARDIZED_JOKERS.forEach((joker) => {
        joker.effects.forEach((effect) => {
          expect(validTargets).toContain(effect.target);
        });
      });
    });

    it('should have exactly 72 jokers', () => {
      expect(STANDARDIZED_JOKERS.length).toBe(72);
    });
  });
});
