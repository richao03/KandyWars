// Centralized Joker Effect System
// 40 jokers with level support (1-3)

import { CandyTypeName, CandySize } from '../types/candy';
import { formatNumber } from './priceUtils';

export type EffectTarget =
  | 'inventory_limit'
  | 'candy_price'
  | 'sell_multiplier'        // multiplicative multiplier on profit
  | 'sell_flat_bonus'        // flat percentage bonus on base profit
  | 'period_count'
  | 'money'
  | 'hint_chance'
  | 'stash_protection'
  | 'event_immunity'
  | 'joker_duplicate'
  | 'candy_generation'
  | 'money_protection'
  | 'empty_inventory_bonus'
  | 'holding_inventory_bonus'
  | 'compound_interest_bonus'
  | 'market_manipulation'
  | 'morning_inventory_bonus'
  | 'stash_allowance_bonus'    // Deposit Bonus — earn % of stashed amount as daily allowance
  | 'deli_price_discount'
  | 'fill_inventory_choice'
  | 'allowance_multiplier'
  | 'allowance_add'
  | 'study_time'
  | 'next_sale_multiplier'
  | 'perfect_balance_bonus'
  | 'stash_interest'
  | 'farmers_carry_bonus'
  | 'type_multiplier'        // multiplier targeting a candy type
  | 'flip_artist_boost'      // Flip Artist — bonus when selling at 3x+ markup over purchase price
  | 'combo_platter_boost'    // Combo Platter — bonus when both candy types covered by owned jokers
  | 'bulk_empire_boost'      // Bulk Empire — permanent stacking multiplier for high daily volume
  | 'variety_pack_boost'     // Variety Pack — bonus when 3+ candy types in inventory
  | 'conditional_multiplier' // multiplier with special conditions (even/odd inv, perfect change)
  | 'inventory_double_with_penalty' // Vacuum Sealer special
  | 'empty_slot_daily_bonus'       // cash per empty slot at end of day (Treasure Chest)
  | 'first_sale_boost'             // Early Bird — first sale of day profit boost
  | 'bulk_sale_boost'              // Bulk Discount — sell N+ at once
  | 'cash_under_boost'             // Underdog & Broke and Hungry — cash below threshold
  | 'variety_pack_boost'           // Variety Pack — 3+ candy types in inventory
  | 'extra_joker_choice'           // Extra Credit — +1 joker choice after minigame
  | 'extra_aura_slot'              // Sixth Sense — +1 persistent joker slot

export type EffectOperation =
  | 'add'
  | 'multiply'
  | 'set'
  | 'enable'
  | 'activate'
  | 'convert'
  | 'generate'
  | 'match_highest'
  | 'match_lowest';

export interface JokerEffect {
  target: EffectTarget;
  operation: EffectOperation;
  amount: number;
  duration?: 'persistent' | 'one-time' | number;
  conditions?: {
    candyType?: CandyTypeName;
    candySize?: CandySize;
    location?: string;
    period?: number;
    inventoryParity?: 'even' | 'odd';
    cashEndsWith?: string; // e.g. '.00'
    bulkThreshold?: number;    // Bulk Discount: min quantity to trigger
    cashBelow?: number;        // Underdog/Broke and Hungry: cash threshold
    maxProfitPerUnit?: number;
  };
}

export interface StandardizedJoker {
  id: number;
  name: string;
  type: 'one-time' | 'persistent';
  flavorText: string;
  description: string;
  effects: JokerEffect[];
  level: number;     // current level (1-3)
  maxLevel: number;  // max upgrade level (1 = not upgradeable, 3 = fully upgradeable)
  requiresSnapshot?: boolean;
}

// Level scaling helpers
function levelScale(lv1: number, lv2: number, lv3: number, level: number): number {
  if (level <= 1) return lv1;
  if (level === 2) return lv2;
  return lv3;
}

// Create a joker definition with level-dependent effects
function makeJoker(
  base: Omit<StandardizedJoker, 'level' | 'effects'> & { maxLevel: number },
  effectsFn: (level: number) => JokerEffect[]
): StandardizedJoker {
  return {
    ...base,
    level: 1,
    effects: effectsFn(1),
  };
}

// Core effect resolution engine
export class JokerEffectEngine {
  private activeEffects: Map<
    string,
    { joker: StandardizedJoker; activatedAt: number }
  > = new Map();
  private nextInstanceId = 0;

  addJoker(joker: StandardizedJoker, currentPeriod: number) {
    const uniqueKey = `${joker.id}_${this.nextInstanceId++}`;
    this.activeEffects.set(uniqueKey, { joker, activatedAt: currentPeriod });
  }

  removeJoker(jokerId: number) {
    this.activeEffects.delete(jokerId.toString());
  }

  getEffectsForTarget(
    target: EffectTarget,
    context: {
      currentPeriod: number;
      candyType?: string;
      location?: string;
    }
  ): JokerEffect[] {
    const effects: JokerEffect[] = [];

    for (const [id, { joker, activatedAt }] of this.activeEffects.entries()) {
      for (const effect of joker.effects) {
        if (effect.target !== target) continue;

        if (
          effect.duration === 'one-time' &&
          context.currentPeriod > activatedAt
        ) {
          continue;
        }
        if (
          typeof effect.duration === 'number' &&
          context.currentPeriod > activatedAt + effect.duration
        ) {
          continue;
        }

        if (effect.conditions) {
          if (
            effect.conditions.candyType &&
            effect.conditions.candyType !== context.candyType
          )
            continue;
          if (
            effect.conditions.location &&
            effect.conditions.location !== context.location
          )
            continue;
          if (
            effect.conditions.period &&
            effect.conditions.period !== context.currentPeriod
          )
            continue;
        }

        effects.push(effect);
      }
    }

    return effects;
  }

  applyEffects(
    baseValue: number,
    target: EffectTarget,
    context: {
      currentPeriod: number;
      candyType?: string;
      location?: string;
    }
  ): number {
    const effects = this.getEffectsForTarget(target, context);
    let result = baseValue;

    const setEffects = effects.filter((e) => e.operation === 'set');
    const multiplyEffects = effects.filter((e) => e.operation === 'multiply');
    const addEffects = effects.filter((e) => e.operation === 'add');

    if (setEffects.length > 0) {
      result = setEffects[setEffects.length - 1].amount;
    }

    for (const effect of addEffects) {
      result += effect.amount;
    }

    for (const effect of multiplyEffects) {
      result *= effect.amount;
    }

    return result;
  }

  hasEffect(
    target: EffectTarget,
    context: {
      currentPeriod: number;
      candyType?: string;
      location?: string;
    }
  ): boolean {
    const effects = this.getEffectsForTarget(target, context);
    return effects.some((effect) => effect.operation === 'enable');
  }

  cleanupExpiredEffects(currentPeriod: number) {
    for (const [id, { joker, activatedAt }] of this.activeEffects.entries()) {
      const hasOnlyOneTimeEffects = joker.effects.every(
        (effect) => effect.duration === 'one-time'
      );
      if (hasOnlyOneTimeEffects && currentPeriod > activatedAt) {
        this.activeEffects.delete(id);
      }
    }
  }

  getActiveJokers(): StandardizedJoker[] {
    return Array.from(this.activeEffects.values()).map(({ joker }) => joker);
  }

  clearAllEffects() {
    this.activeEffects.clear();
    this.nextInstanceId = 0;
  }

  getDebugInfo(currentPeriod: number): string {
    const info: string[] = [];
    for (const [id, { joker, activatedAt }] of this.activeEffects.entries()) {
      info.push(
        `${joker.name} Lv${joker.level} (ID: ${id}, Active for: ${currentPeriod - activatedAt} periods)`
      );
      for (const effect of joker.effects) {
        info.push(`  - ${effect.target} ${effect.operation} ${effect.amount}`);
      }
    }
    return info.join('\n');
  }
}

// Helper to get effects for a joker at a given level
export function getJokerEffectsAtLevel(jokerId: number, level: number): JokerEffect[] {
  const factory = JOKER_EFFECT_FACTORIES[jokerId];
  if (!factory) return [];
  return factory(level);
}

// Generate a human-readable description for a joker at a given level
export function getJokerDescription(jokerId: number, level: number): string | null {
  const factory = JOKER_EFFECT_FACTORIES[jokerId];
  if (!factory) return null;
  const effects = factory(level);
  if (effects.length === 0) return null;

  const parts: string[] = [];
  for (const e of effects) {
    const size = e.conditions?.candySize ? ` ${e.conditions.candySize}` : '';
    const type = e.conditions?.candyType ? ` ${e.conditions.candyType.replace('_', ' ')}` : '';

    switch (e.target) {
      case 'flip_artist_boost':
        parts.push(`${e.amount}x profit when selling at 3x+ markup`);
        break;
      case 'combo_platter_boost':
        parts.push(`+${e.amount}x bonus when both candy types covered by your jokers`);
        break;
      case 'bulk_empire_boost':
        parts.push(`Sell ${e.amount}+ candies/day for permanent +0.5x multiplier`);
        break;
      case 'type_multiplier':
        parts.push(`${e.amount}x multiplier on${type} candy profits`);
        break;
      case 'conditional_multiplier':
        if (e.conditions?.inventoryParity)
          parts.push(`${e.amount}x profit when inventory is ${e.conditions.inventoryParity}`);
        else if (e.conditions?.period === -1)
          parts.push(`${e.amount}x multiplier in last 2 periods`);
        else
          parts.push(`${e.amount}x conditional multiplier`);
        break;
      case 'allowance_multiplier':
        parts.push(`${e.amount}x your daily allowance`);
        break;
      case 'allowance_add':
        parts.push(`+$${e.amount} allowance`);
        break;
      case 'inventory_limit':
        parts.push(`Inventory limit +${e.amount}`);
        break;
      case 'money':
        parts.push(`Instantly gain $${formatNumber(e.amount)}`);
        break;
      case 'empty_inventory_bonus':
        parts.push(`End day with 0 candy and get $${formatNumber(e.amount)}`);
        break;
      case 'morning_inventory_bonus':
        parts.push(`Gain $${e.amount} per candy at start of day`);
        break;
      case 'stash_allowance_bonus': {
        const pct = Math.round(e.amount * 100);
        parts.push(`Earn ${pct}% of stashed money as daily allowance`);
        break;
      }
      case 'farmers_carry_bonus':
        parts.push(`Inventory count × $${e.amount} per period`);
        break;
      case 'next_sale_multiplier':
        parts.push(`${e.amount}x profits on next sale`);
        break;
      case 'first_sale_boost':
        parts.push(`${e.amount}x first sale of day profit`);
        break;
      case 'bulk_sale_boost':
        parts.push(`${e.amount}x profit selling ${e.conditions?.bulkThreshold}+ at once`);
        break;
      case 'cash_under_boost':
        parts.push(`${e.amount}x profit when cash under $${formatNumber(e.conditions?.cashBelow ?? 0)}`);
        break;
      case 'variety_pack_boost':
        parts.push(`${e.amount}x profit when 3+ candy types in inventory`);
        break;
      case 'stash_interest': {
        const pct = Math.round((e.amount - 1) * 100);
        parts.push(`${pct}% daily stash interest`);
        break;
      }
      case 'deli_price_discount': {
        const pct = Math.round((1 - e.amount) * 100);
        parts.push(`Deli prices ${pct}% off`);
        break;
      }
      case 'empty_slot_daily_bonus':
        parts.push(`$${e.amount} per empty slot at end of day`);
        break;
      default:
        return null; // Unknown target — fall back to static description
    }
  }

  return parts.length > 0 ? parts.join('. ') : null;
}

// Effect factories keyed by joker ID — used to generate level-specific effects
const JOKER_EFFECT_FACTORIES: Record<number, (level: number) => JokerEffect[]> = {

  // 1: Double Up — 2x/3x/4x price on 1 candy for 1 period
  1: (lv) => [{
    target: 'candy_price',
    operation: 'multiply',
    amount: levelScale(2, 3, 4, lv),
    duration: 'one-time',
  }],

  // 2: Flip Artist — 1.5x/2x/3x when selling at 3x+ markup over purchase price
  2: (lv) => [{
    target: 'flip_artist_boost',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
  }],

  // 31: Ace the Test — 2x/3x/4x allowance + $300/$600/$900 flat (merged with Coaching)
  31: (lv) => [
    {
      target: 'allowance_multiplier',
      operation: 'multiply',
      amount: levelScale(2, 3, 4, lv),
      duration: 'persistent',
    },
    {
      target: 'allowance_add',
      operation: 'add',
      amount: levelScale(300, 600, 900, lv),
      duration: 'persistent',
    },
  ],

  // 43: Inductive Reasoning — Inv +5/+10/+15 per new day
  43: (lv) => [{
    target: 'inventory_limit',
    operation: 'add',
    amount: levelScale(5, 7, 10, lv),
    duration: 'persistent',
  }],


  // 6: Tapped In — 100% event hints, not upgradeable
  6: (_lv) => [{
    target: 'hint_chance',
    operation: 'set',
    amount: 1,
    duration: 'persistent',
  }],

  // 8: Combo Platter — +1x/+1.5x/+2x bonus when both candy types covered by owned jokers
  8: (lv) => [{
    target: 'combo_platter_boost',
    operation: 'add',
    amount: levelScale(1, 1.5, 2, lv),
    duration: 'persistent',
  }],

  // 9: Data Compression — Inventory +13/+26/+39
  9: (lv) => [{
    target: 'inventory_limit',
    operation: 'add',
    amount: levelScale(13, 26, 39, lv),
    duration: 'persistent',
  }],


  // 12: Vacuum Sealer — 2x inventory, -2 final mult (min 0), not upgradeable
  12: (_lv) => [
    {
      target: 'inventory_double_with_penalty',
      operation: 'enable',
      amount: 1,
      duration: 'persistent',
    },
  ],

  // 15: Perfect Bake — $1k/$3k/$5k for 0 inv at end of day
  15: (lv) => [{
    target: 'empty_inventory_bonus',
    operation: 'add',
    amount: levelScale(1000, 3000, 5000, lv),
    duration: 'persistent',
  }],

  // 16: Bake Sale — Gain $3k/$6k/$9k
  16: (lv) => [{
    target: 'money',
    operation: 'add',
    amount: levelScale(3000, 6000, 9000, lv),
    duration: 'one-time',
  }],

  // 17: Home Made — $25/$50/$100 per candy at start of day
  17: (lv) => [{
    target: 'morning_inventory_bonus',
    operation: 'add',
    amount: levelScale(25, 50, 100, lv),
    duration: 'persistent',
  }],

  // 18: Bulk Empire — permanent +0.5x for every 50/35/20 candies sold per day (stacks across days)
  18: (lv) => [{
    target: 'bulk_empire_boost',
    operation: 'add',
    amount: levelScale(50, 35, 20, lv), // threshold: sell this many per day to earn +0.5x permanent
    duration: 'persistent',
  }],


  // 66: Treasure Chest — Inventory +8/+15/+25, plus $20/$50/$100 per empty slot at end of day
  66: (lv) => [
    {
      target: 'inventory_limit',
      operation: 'add',
      amount: levelScale(8, 15, 25, lv),
      duration: 'persistent',
    },
    {
      target: 'empty_slot_daily_bonus',
      operation: 'add',
      amount: levelScale(20, 50, 100, lv),
      duration: 'persistent',
    },
  ],

  // 30: Odd Todd — 1.5x/2x/3x ALL (odd inv limit)
  30: (lv) => [{
    target: 'conditional_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { inventoryParity: 'odd' },
  }],

  // 23: Cocoa Futures — 1.5x/2x/3x mult Chocolate
  23: (lv) => [{
    target: 'type_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candyType: 'chocolate' },
  }],

  // 67: Safe House — Protect wallet from loss events + stash from confiscation (merged)
  67: (_lv) => [
    {
      target: 'money_protection',
      operation: 'enable',
      amount: 1,
      duration: 'persistent',
    },
    {
      target: 'stash_protection',
      operation: 'enable',
      amount: 1,
      duration: 'persistent',
    },
  ],

  // 24: The Good Old Days — Deli 50%/75%/90% off
  24: (lv) => [{
    target: 'deli_price_discount',
    operation: 'multiply',
    amount: levelScale(0.50, 0.25, 0.10, lv),
    duration: 'persistent',
    conditions: { location: 'deli' },
  }],


  // 19: Bear Market — +1.5/+2/+3 mult Gummy
  19: (lv) => [{
    target: 'type_multiplier',
    operation: 'add',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candyType: 'gummy' },
  }],

  // 20: Market Manipulation — Set 1 candy to highest price, not upgradeable
  20: (_lv) => [{
    target: 'market_manipulation',
    operation: 'match_highest',
    amount: 1,
    duration: 'one-time',
  }],

  // 22: Deposit Bonus — earn 5%/10%/15% of stashed amount as daily allowance
  22: (lv) => [{
    target: 'stash_allowance_bonus',
    operation: 'multiply',
    amount: levelScale(0.05, 0.10, 0.15, lv),
    duration: 'persistent',
  }],

  // 37: Roman Coin — Gain $2k/$5k/$10k
  37: (lv) => [{
    target: 'money',
    operation: 'add',
    amount: levelScale(2000, 5000, 10000, lv),
    duration: 'one-time',
  }],


  // 11: Farmers Carry — inventory count × $5/$25/$100 per period
  11: (lv) => [{
    target: 'farmers_carry_bonus',
    operation: 'add',
    amount: levelScale(5, 25, 100, lv),
    duration: 'persistent',
  }],

  // 25: Bet You I'm Faster — Fill inv with 1 candy, not upgradeable
  25: (_lv) => [{
    target: 'fill_inventory_choice',
    operation: 'activate',
    amount: 1,
    duration: 'one-time',
  }],

  // 26: Hard Knocks — 1.5x/2x/3x mult Hard Candy
  26: (lv) => [{
    target: 'type_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candyType: 'hard_candy' },
  }],


  // 29: Even Stevens — 1.5x/2x/3x ALL (even inv limit)
  29: (lv) => [{
    target: 'conditional_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { inventoryParity: 'even' },
  }],

  // 48: Pursuasion — 2x/4x/6x next sale
  48: (lv) => [{
    target: 'next_sale_multiplier',
    operation: 'multiply',
    amount: levelScale(2, 4, 6, lv),
    duration: 'one-time',
  }],

  // 46: Sour Logic — 1.5x/2x/3x mult Sour
  46: (lv) => [{
    target: 'type_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candyType: 'sour' },
  }],


  // 32: Double Dutch — 1.5x/2x/3x mult Chewy
  32: (lv) => [{
    target: 'type_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candyType: 'chewy' },
  }],


  // 38: Golden Hour — Last 2 periods: 1.5x/2x/3x multiplier
  38: (lv) => [{
    target: 'conditional_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { period: -1 }, // -1 = special flag for "last 2 periods"
  }],

  // 39: Trade Routes — +2/+3/+4 inv per period
  39: (lv) => [{
    target: 'inventory_limit',
    operation: 'add',
    amount: levelScale(2, 3, 4, lv),
    duration: 'persistent',
  }],

  // 53: Mysterious Artifact — 8%/15%/25% daily stash interest
  53: (lv) => [{
    target: 'stash_interest',
    operation: 'multiply',
    amount: levelScale(1.08, 1.15, 1.25, lv),
    duration: 'persistent',
  }],

  // 42: Tropical Import — 1.5x/2x/3x mult Fruity
  42: (lv) => [{
    target: 'type_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candyType: 'fruity' },
  }],

  // === CONDITIONAL PROFIT BOOSTS ===

  // 45: Early Bird — first sale of day profit boost
  45: (lv) => [{
    target: 'first_sale_boost',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
  }],

  // 47: Bulk Discount — sell 5+/35+/55+ at once
  47: (lv) => [{
    target: 'bulk_sale_boost',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { bulkThreshold: levelScale(5, 35, 55, lv) },
  }],

  // 49: Underdog — cash under threshold
  49: (lv) => [{
    target: 'cash_under_boost',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { cashBelow: levelScale(5000, 10000, 15000, lv) },
  }],

  // 50: Variety Pack — 1.5x/2x/3x when 3+ candy types in inventory at time of sale
  50: (lv) => [{
    target: 'variety_pack_boost',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
  }],

  // 52: Broke and Hungry — cash under $2k/$3k/$5k
  52: (lv) => [{
    target: 'cash_under_boost',
    operation: 'multiply',
    amount: levelScale(2, 3, 4, lv),
    duration: 'persistent',
    conditions: { cashBelow: levelScale(2000, 3000, 5000, lv) },
  }],

  // 55: Extra Credit — +1 joker choice after minigame, not upgradeable
  55: (_lv) => [{
    target: 'extra_joker_choice',
    operation: 'add',
    amount: 1,
    duration: 'persistent',
  }],

  // 56: Sixth Sense — +1 aura slot, not upgradeable
  56: (_lv) => [{
    target: 'extra_aura_slot',
    operation: 'add',
    amount: 1,
    duration: 'persistent',
  }],
};

// Predefined standardized jokers with the new system
export const STANDARDIZED_JOKERS: StandardizedJoker[] = [
  // === [+Profit] TYPE BOOSTS — add to base profit ===
  makeJoker({
    id: 23, name: 'Cocoa Futures', type: 'persistent', maxLevel: 3,
    flavorText: 'Invest in the bean, reap the chocolate',
    description: '[+Profit] +0.5/+1/+2 on Chocolate candy',
  }, JOKER_EFFECT_FACTORIES[23]),

  makeJoker({
    id: 26, name: 'Hard Knocks', type: 'persistent', maxLevel: 3,
    flavorText: 'Hard candy, hard cash',
    description: '[+Profit] +0.5/+1/+2 on Hard Candy',
  }, JOKER_EFFECT_FACTORIES[26]),

  makeJoker({
    id: 46, name: 'Sour Logic', type: 'persistent', maxLevel: 3,
    flavorText: 'When life gives you lemons, sell sour candy',
    description: '[+Profit] +0.5/+1/+2 on Sour candy',
  }, JOKER_EFFECT_FACTORIES[46]),

  makeJoker({
    id: 32, name: 'Double Dutch', type: 'persistent', maxLevel: 3,
    flavorText: 'Two ropes, double the profits',
    description: '[+Profit] +0.5/+1/+2 on Chewy candy',
  }, JOKER_EFFECT_FACTORIES[32]),

  makeJoker({
    id: 42, name: 'Tropical Import', type: 'persistent', maxLevel: 3,
    flavorText: 'Exotic fruits from faraway lands',
    description: '[+Profit] +0.5/+1/+2 on Fruity candy',
  }, JOKER_EFFECT_FACTORIES[42]),

  makeJoker({
    id: 8, name: 'Combo Platter', type: 'persistent', maxLevel: 3,
    flavorText: 'Two flavors, one big payday',
    description: '[+Profit] +1/+1.5/+2 when both candy types covered by your jokers',
  }, JOKER_EFFECT_FACTORIES[8]),

  makeJoker({
    id: 47, name: 'Bulk Discount', type: 'persistent', maxLevel: 3,
    flavorText: 'Buy in bulk, sell in bulk',
    description: '[+Profit] +0.5/+1/+2 when selling 5+/35+/55+ at once',
  }, JOKER_EFFECT_FACTORIES[47]),

  // === [xMult] MULTIPLIERS — multiply total profit ===
  makeJoker({
    id: 19, name: 'Bear Market', type: 'persistent', maxLevel: 3,
    flavorText: 'When the bears come out, gummy profits soar',
    description: '[xMult] +1.5/+2/+3 on Gummy candy',
  }, JOKER_EFFECT_FACTORIES[19]),

  makeJoker({
    id: 29, name: 'Even Stevens', type: 'persistent', maxLevel: 3,
    flavorText: 'All good things come in pairs',
    description: '[xMult] +0.5/+1/+2 when inventory limit is even',
  }, JOKER_EFFECT_FACTORIES[29]),

  makeJoker({
    id: 30, name: 'Odd Todd', type: 'persistent', maxLevel: 3,
    flavorText: 'Never tell me the odds!',
    description: '[xMult] +0.5/+1/+2 when inventory limit is odd',
  }, JOKER_EFFECT_FACTORIES[30]),

  makeJoker({
    id: 38, name: 'Golden Hour', type: 'persistent', maxLevel: 3,
    flavorText: 'The last light of day is the most valuable',
    description: '[xMult] +0.5/+1/+2 in last 2 periods of day',
  }, JOKER_EFFECT_FACTORIES[38]),

  makeJoker({
    id: 45, name: 'Early Bird', type: 'persistent', maxLevel: 3,
    flavorText: 'First come, first served',
    description: '[xMult] +0.5/+1/+2 on first sale each day',
  }, JOKER_EFFECT_FACTORIES[45]),

  makeJoker({
    id: 49, name: 'Underdog', type: 'persistent', maxLevel: 3,
    flavorText: 'Nothing to lose, everything to gain',
    description: '[xMult] +0.5/+1/+2 when cash < $5k/$10k/$15k',
  }, JOKER_EFFECT_FACTORIES[49]),

  makeJoker({
    id: 52, name: 'Broke and Hungry', type: 'persistent', maxLevel: 3,
    flavorText: 'Desperation is the mother of profit',
    description: '[xMult] +1/+2/+3 when cash < $2k/$3k/$5k',
  }, JOKER_EFFECT_FACTORIES[52]),

  makeJoker({
    id: 2, name: 'Flip Artist', type: 'persistent', maxLevel: 3,
    flavorText: 'Buy the dip, sell the rip',
    description: '[xMult] +0.5/+1/+2 when selling at 3x+ markup',
  }, JOKER_EFFECT_FACTORIES[2]),

  makeJoker({
    id: 50, name: 'Variety Pack', type: 'persistent', maxLevel: 3,
    flavorText: "Don't put all your candy in one bag",
    description: '[xMult] +0.5/+1/+2 when 3+ candy types in inventory',
  }, JOKER_EFFECT_FACTORIES[50]),

  makeJoker({
    id: 18, name: 'Bulk Empire', type: 'persistent', maxLevel: 3,
    flavorText: 'Move product, build an empire',
    description: '[xMult] +0.5 permanent per 50/35/20 candies sold daily',
  }, JOKER_EFFECT_FACTORIES[18]),

  makeJoker({
    id: 48, name: 'Pursuasion', type: 'one-time', maxLevel: 3,
    flavorText: 'These are limited edition, trust me',
    description: '[xMult] +1/+3/+5 on your next sale (one-time)',
  }, JOKER_EFFECT_FACTORIES[48]),

  // === INVENTORY ===
  makeJoker({
    id: 9, name: 'Data Compression', type: 'persistent', maxLevel: 3,
    flavorText: 'Lossless compression for sugar',
    description: '+13/+26/+39 inventory slots',
  }, JOKER_EFFECT_FACTORIES[9]),

  makeJoker({
    id: 43, name: 'Inductive Reasoning', type: 'persistent', maxLevel: 3,
    flavorText: "Every day's a reason to carry more",
    description: '+5/+7/+10 inventory slots each new day',
  }, JOKER_EFFECT_FACTORIES[43]),

  makeJoker({
    id: 39, name: 'Trade Routes', type: 'persistent', maxLevel: 3,
    flavorText: 'Ancient paths, modern profits',
    description: '+2/+3/+4 inventory slots every period',
  }, JOKER_EFFECT_FACTORIES[39]),

  makeJoker({
    id: 66, name: 'Treasure Chest', type: 'persistent', maxLevel: 3,
    flavorText: 'Empty slots are room for treasure',
    description: '+8/+15/+25 inv, $20/$50/$100 per empty slot at end of day',
  }, JOKER_EFFECT_FACTORIES[66]),

  makeJoker({
    id: 12, name: 'Vacuum Sealer', type: 'persistent', maxLevel: 1,
    flavorText: 'All candy, no air!',
    description: '2x inventory limit, -2 to [xMult] (min 1x)',
    requiresSnapshot: true,
  }, JOKER_EFFECT_FACTORIES[12]),

  // === INCOME ===
  makeJoker({
    id: 31, name: 'Ace the Test', type: 'persistent', maxLevel: 3,
    flavorText: 'Perfect scores, better rewards',
    description: '2x/3x/4x allowance + $300/$600/$900 flat',
  }, JOKER_EFFECT_FACTORIES[31]),

  makeJoker({
    id: 22, name: 'Deposit Bonus', type: 'persistent', maxLevel: 3,
    flavorText: 'A dollar saved is a dollar earned',
    description: '5%/10%/15% of stash added to daily allowance',
  }, JOKER_EFFECT_FACTORIES[22]),

  makeJoker({
    id: 11, name: 'Farmers Carry', type: 'persistent', maxLevel: 3,
    flavorText: 'Big arms, big bags',
    description: '$5/$25/$100 per candy in inventory each period',
  }, JOKER_EFFECT_FACTORIES[11]),

  makeJoker({
    id: 17, name: 'Home Made', type: 'persistent', maxLevel: 3,
    flavorText: 'Home made hits different',
    description: '$25/$50/$100 per candy in inventory at start of day',
  }, JOKER_EFFECT_FACTORIES[17]),

  makeJoker({
    id: 15, name: 'Perfect Bake', type: 'persistent', maxLevel: 3,
    flavorText: 'Timing is everything',
    description: '$1k/$3k/$5k bonus for ending day with 0 inventory',
  }, JOKER_EFFECT_FACTORIES[15]),

  makeJoker({
    id: 53, name: 'Mysterious Artifact', type: 'persistent', maxLevel: 3,
    flavorText: 'Blessed with endless fortune',
    description: '8%/15%/25% daily compound interest on stash',
  }, JOKER_EFFECT_FACTORIES[53]),

  // === ONE-TIME ===
  makeJoker({
    id: 1, name: 'Double Up', type: 'one-time', maxLevel: 3,
    flavorText: 'f(x) = 2x',
    description: '2x/3x/4x price of any 1 candy for 1 period',
  }, JOKER_EFFECT_FACTORIES[1]),

  makeJoker({
    id: 16, name: 'Bake Sale', type: 'one-time', maxLevel: 3,
    flavorText: 'Cash rules everything around me',
    description: '$3k/$6k/$9k instant cash',
  }, JOKER_EFFECT_FACTORIES[16]),

  makeJoker({
    id: 37, name: 'Roman Coin', type: 'one-time', maxLevel: 3,
    flavorText: "Mo' money, mo' problems",
    description: '$2k/$5k/$10k instant cash',
  }, JOKER_EFFECT_FACTORIES[37]),

  makeJoker({
    id: 20, name: 'Market Manipulation', type: 'one-time', maxLevel: 1,
    flavorText: 'Pump and dump!',
    description: 'Set any candy to the highest price this period',
  }, JOKER_EFFECT_FACTORIES[20]),

  makeJoker({
    id: 25, name: "Bet You I'm Faster", type: 'one-time', maxLevel: 1,
    flavorText: 'Bet you all the candies in the world',
    description: 'Fill entire inventory with any 1 candy',
  }, JOKER_EFFECT_FACTORIES[25]),

  // === UTILITY ===
  makeJoker({
    id: 6, name: 'Tapped In', type: 'persistent', maxLevel: 1,
    flavorText: 'Signal through the noise',
    description: '100% chance to preview upcoming events',
  }, JOKER_EFFECT_FACTORIES[6]),

  makeJoker({
    id: 67, name: 'Safe House', type: 'persistent', maxLevel: 1,
    flavorText: "Never let em know how much dough you hold",
    description: 'Protects wallet from bullies and stash from confiscation',
  }, JOKER_EFFECT_FACTORIES[67]),

  makeJoker({
    id: 24, name: 'The Good Old Days', type: 'persistent', maxLevel: 3,
    flavorText: 'OG stories for OG prices',
    description: '50%/75%/90% off deli candy after school',
  }, JOKER_EFFECT_FACTORIES[24]),

  makeJoker({
    id: 55, name: 'Extra Credit', type: 'persistent', maxLevel: 1,
    flavorText: 'Always doing extra',
    description: '+1 joker choice after minigames',
  }, JOKER_EFFECT_FACTORIES[55]),

  makeJoker({
    id: 56, name: 'Sixth Sense', type: 'persistent', maxLevel: 1,
    flavorText: 'I see dead... jokers?',
    description: '+1 aura slot (hold 6 instead of 5)',
  }, JOKER_EFFECT_FACTORIES[56]),
];

// Utility function to process effects by target from a list of jokers
export function processEffectsByTarget(
  jokers: any[],
  targetType: EffectTarget
): Array<{
  jokerName: string;
  amount: number;
  operation: EffectOperation;
}> {
  const results: Array<{
    jokerName: string;
    amount: number;
    operation: EffectOperation;
  }> = [];

  if (!jokers || jokers.length === 0) {
    return results;
  }

  for (const joker of jokers) {
    const standardizedJoker = STANDARDIZED_JOKERS.find(
      (sj) => sj.id === joker.id
    );

    if (standardizedJoker) {
      // Get effects for this joker at its current level
      const level = joker.level ?? standardizedJoker.level ?? 1;
      const factory = JOKER_EFFECT_FACTORIES[joker.id];
      const effects = factory ? factory(level) : standardizedJoker.effects;

      for (const effect of effects) {
        if (effect.target === targetType) {
          results.push({
            jokerName: standardizedJoker.name,
            amount: effect.amount,
            operation: effect.operation,
          });
        }
      }
    }
  }

  return results;
}
