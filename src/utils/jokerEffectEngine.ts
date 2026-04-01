// Centralized Joker Effect System
// 47 jokers with level support (1-3)

import { CandyTypeName, CandySize } from '../types/candy';

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
  | 'big_short'
  | 'morning_inventory_bonus'
  | 'deposit_bonus'
  | 'deli_price_discount'
  | 'fill_inventory_choice'
  | 'found_money_multiplier'
  | 'allowance_multiplier'
  | 'allowance_add'
  | 'study_time'
  | 'next_sale_multiplier'
  | 'perfect_balance_bonus'
  | 'randomize_prices'
  | 'stash_interest'
  | 'farmers_carry_bonus'
  | 'type_multiplier'        // multiplier targeting a candy type
  | 'size_multiplier'        // multiplier targeting a candy size
  | 'conditional_multiplier' // multiplier with special conditions (even/odd inv, perfect change)
  | 'inventory_double_with_penalty' // Vacuum Sealer special
  | 'empty_slot_daily_bonus'       // cash per empty slot at end of day (Treasure Chest)
  | 'first_sale_boost'             // Early Bird — first sale of day profit boost
  | 'bulk_sale_boost'              // Bulk Discount — sell N+ at once
  | 'cash_under_boost'             // Underdog & Broke and Hungry — cash below threshold
  | 'low_profit_boost'             // Penny Pincher — low profit per unit
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
    maxProfitPerUnit?: number; // Penny Pincher: max profit per candy to trigger
  };
}

export interface StandardizedJoker {
  id: number;
  name: string;
  subject: string;
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
      case 'size_multiplier':
        parts.push(`${e.amount}x multiplier on${size} candy profits`);
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
        parts.push(`Instantly gain $${e.amount.toLocaleString()}`);
        break;
      case 'empty_inventory_bonus':
        parts.push(`End day with 0 candy and get $${e.amount.toLocaleString()}`);
        break;
      case 'morning_inventory_bonus':
        parts.push(`Gain $${e.amount} per candy at start of day`);
        break;
      case 'deposit_bonus': {
        const pct = Math.round((e.amount - 1) * 100);
        parts.push(`+${pct}% piggy bank deposit`);
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
        parts.push(`${e.amount}x profit when cash under $${e.conditions?.cashBelow?.toLocaleString()}`);
        break;
      case 'low_profit_boost':
        parts.push(`${e.amount}x profit on low-margin candy`);
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
  // === MATH (Size multiplier: Medium) ===

  // 1: Double Up — one-time, not upgradeable
  1: (_lv) => [{
    target: 'candy_price',
    operation: 'multiply',
    amount: 2,
    duration: 'one-time',
  }],

  // 2: Median Formula — 1.5x/2x/3x mult Medium
  2: (lv) => [{
    target: 'size_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candySize: 'medium' },
  }],

  // 31: Ace the Test — 2x/3x/4x allowance
  31: (lv) => [{
    target: 'allowance_multiplier',
    operation: 'multiply',
    amount: levelScale(2, 3, 4, lv),
    duration: 'persistent',
  }],

  // 43: Inductive Reasoning — Inv +5/+10/+15 per new day
  43: (lv) => [{
    target: 'inventory_limit',
    operation: 'add',
    amount: levelScale(5, 7, 10, lv),
    duration: 'persistent',
  }],

  // === COMPUTER (Size multiplier: Small) ===

  // 6: Tapped In — 100% event hints, not upgradeable
  6: (_lv) => [{
    target: 'hint_chance',
    operation: 'set',
    amount: 1,
    duration: 'persistent',
  }],

  // 7: Side Gig — 2x/3x/4x allowance
  7: (lv) => [{
    target: 'allowance_multiplier',
    operation: 'multiply',
    amount: levelScale(2, 3, 4, lv),
    duration: 'persistent',
  }],

  // 8: Micro Chip — 1.5x/2x/3x mult Small
  8: (lv) => [{
    target: 'size_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candySize: 'small' },
  }],

  // 9: Data Compression — Inventory +13/+26/+39
  9: (lv) => [{
    target: 'inventory_limit',
    operation: 'add',
    amount: levelScale(13, 26, 39, lv),
    duration: 'persistent',
  }],

  // === HOME ECONOMICS (Size multiplier: Big) ===

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

  // 17: Home Made — $10/$20/$30 per candy at start of day
  17: (lv) => [{
    target: 'morning_inventory_bonus',
    operation: 'add',
    amount: levelScale(10, 20, 30, lv),
    duration: 'persistent',
  }],

  // 18: Super Size Me — 1.5x/2x/3x mult Big
  18: (lv) => [{
    target: 'size_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candySize: 'big' },
  }],

  // === ART (Type multiplier: Chocolate) ===

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

  // 67: Medieval Shield — Protect money from loss events, not upgradeable
  67: (_lv) => [{
    target: 'money_protection',
    operation: 'enable',
    amount: 1,
    duration: 'persistent',
  }],

  // 24: The Good Old Days — Deli 50%/75%/90% off
  24: (lv) => [{
    target: 'deli_price_discount',
    operation: 'multiply',
    amount: levelScale(0.50, 0.25, 0.10, lv),
    duration: 'persistent',
    conditions: { location: 'deli' },
  }],

  // === ECONOMY (Type multiplier: Gummy) ===

  // 19: Bear Market — 1.5x/2x/3x mult Gummy
  19: (lv) => [{
    target: 'type_multiplier',
    operation: 'multiply',
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

  // 21: The Big Short — Set 1 candy to lowest price, not upgradeable
  21: (_lv) => [{
    target: 'big_short',
    operation: 'match_lowest',
    amount: 1,
    duration: 'one-time',
  }],

  // 22: Deposit Bonus — +10%/+25%/+50% piggy bank deposit
  22: (lv) => [{
    target: 'deposit_bonus',
    operation: 'multiply',
    amount: levelScale(1.10, 1.25, 1.50, lv),
    duration: 'persistent',
  }],

  // 37: Roman Coin — Gain $2k/$5k/$10k
  37: (lv) => [{
    target: 'money',
    operation: 'add',
    amount: levelScale(2000, 5000, 10000, lv),
    duration: 'one-time',
  }],

  // === GYM (Type multiplier: Hard Candy) ===

  // 11: Farmers Carry — inventory count × $5/$25/$100 per period
  11: (lv) => [{
    target: 'farmers_carry_bonus',
    operation: 'add',
    amount: levelScale(5, 25, 100, lv),
    duration: 'persistent',
  }],

  // 13: Coaching — +$300/+$600/+$900 allowance
  13: (lv) => [{
    target: 'allowance_add',
    operation: 'add',
    amount: levelScale(300, 600, 900, lv),
    duration: 'persistent',
  }],

  // 25: Bet You I'm Faster — Fill inv with 1 candy, not upgradeable
  25: (_lv) => [{
    target: 'fill_inventory_choice',
    operation: 'activate',
    amount: 1,
    duration: 'one-time',
  }],

  // 54: Bulk Up — Inventory +15/+30/+45
  54: (lv) => [{
    target: 'inventory_limit',
    operation: 'add',
    amount: levelScale(15, 30, 45, lv),
    duration: 'persistent',
  }],

  // 26: Hard Knocks — 1.5x/2x/3x mult Hard Candy
  26: (lv) => [{
    target: 'type_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candyType: 'hard_candy' },
  }],

  // === LOGIC (Type multiplier: Sour) ===

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

  // === RECESS (Type multiplier: Chewy) ===

  // 32: Double Dutch — 1.5x/2x/3x mult Chewy
  32: (lv) => [{
    target: 'type_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { candyType: 'chewy' },
  }],

  // 51: Hide and Seek — 2x found money, not upgradeable
  51: (_lv) => [{
    target: 'found_money_multiplier',
    operation: 'multiply',
    amount: 2,
    duration: 'persistent',
  }],

  // 74: Secret Hideout — Protect stash from confiscation, not upgradeable
  74: (_lv) => [{
    target: 'stash_protection',
    operation: 'enable',
    amount: 1,
    duration: 'persistent',
  }],

  // === GEOGRAPHY (Type multiplier: Fruity) ===

  // 38: Golden Hour — Last 2 periods: 1.5x/2x/3x multiplier
  38: (lv) => [{
    target: 'conditional_multiplier',
    operation: 'multiply',
    amount: levelScale(1.5, 2, 3, lv),
    duration: 'persistent',
    conditions: { period: -1 }, // -1 = special flag for "last 2 periods"
  }],

  // 39: Trade Routes — +1/+2/+3 inv per period
  39: (lv) => [{
    target: 'inventory_limit',
    operation: 'add',
    amount: levelScale(1, 2, 3, lv),
    duration: 'persistent',
  }],

  // 40: Continental Drift — Shuffle all candy prices, not upgradeable
  40: (_lv) => [{
    target: 'randomize_prices',
    operation: 'activate',
    amount: 1,
    duration: 'one-time',
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

  // 44: Atlas Bonus — Gain $2.5k/$5k/$7.5k
  44: (lv) => [{
    target: 'money',
    operation: 'add',
    amount: levelScale(2500, 5000, 7500, lv),
    duration: 'one-time',
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

  // 50: Penny Pincher — profit per candy ≤ $5
  50: (lv) => [{
    target: 'low_profit_boost',
    operation: 'multiply',
    amount: levelScale(2, 3, 4, lv),
    duration: 'persistent',
    conditions: { maxProfitPerUnit: 5 },
  }],

  // 52: Broke and Hungry — cash under $500
  52: (lv) => [{
    target: 'cash_under_boost',
    operation: 'multiply',
    amount: levelScale(2, 3, 4, lv),
    duration: 'persistent',
    conditions: { cashBelow: 500 },
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
  // === MATH JOKERS (Size multiplier: Medium) ===
  makeJoker({
    id: 1, name: 'Double Up', subject: 'Math', type: 'one-time', maxLevel: 1,
    flavorText: 'The theorem of the period is f(x) = 2x',
    description: '2x the price of 1 candy for 1 period',
  }, JOKER_EFFECT_FACTORIES[1]),

  makeJoker({
    id: 2, name: 'Median Formula', subject: 'Math', type: 'persistent', maxLevel: 3,
    flavorText: 'The middle value always wins',
    description: '1.5x multiplier on Medium candy profits',
  }, JOKER_EFFECT_FACTORIES[2]),

  makeJoker({
    id: 31, name: 'Ace the Test', subject: 'Math', type: 'persistent', maxLevel: 3,
    flavorText: 'Perfect scores mean better rewards from mom',
    description: '2x your daily allowance (max 4x)',
  }, JOKER_EFFECT_FACTORIES[31]),

  makeJoker({
    id: 43, name: 'Inductive Reasoning', subject: 'Math', type: 'persistent', maxLevel: 3,
    flavorText: "Every day's a reason to add five more.",
    description: 'Every new day, inventory limit +5',
  }, JOKER_EFFECT_FACTORIES[43]),

  // === COMPUTER JOKERS (Size multiplier: Small) ===
  makeJoker({
    id: 6, name: 'Tapped in', subject: 'Computer', type: 'persistent', maxLevel: 1,
    flavorText: 'Signal Through the Noise',
    description: 'Hear about events before they happen',
  }, JOKER_EFFECT_FACTORIES[6]),

  makeJoker({
    id: 7, name: 'Side Gig', subject: 'Computer', type: 'persistent', maxLevel: 3,
    flavorText: 'Turn your coding skills into extra cash',
    description: '2x your daily allowance (max 4x)',
  }, JOKER_EFFECT_FACTORIES[7]),

  makeJoker({
    id: 8, name: 'Micro Chip', subject: 'Computer', type: 'persistent', maxLevel: 3,
    flavorText: 'Small but mighty processing power',
    description: '1.5x multiplier on Small candy profits',
  }, JOKER_EFFECT_FACTORIES[8]),

  makeJoker({
    id: 9, name: 'Data Compression', subject: 'Computer', type: 'persistent', maxLevel: 3,
    flavorText: 'No loss compression for sugar to save space',
    description: 'Inventory limit +13',
  }, JOKER_EFFECT_FACTORIES[9]),

  // === HOME ECONOMICS JOKERS (Size multiplier: Big) ===
  makeJoker({
    id: 12, name: 'Vacuum Sealer', subject: 'Home Economics', type: 'persistent', maxLevel: 1,
    flavorText: 'All candy, no air!',
    description: '2x inventory limit, -3 to final sale multiplier (min 1x)',
    requiresSnapshot: true,
  }, JOKER_EFFECT_FACTORIES[12]),

  makeJoker({
    id: 15, name: 'Perfect Bake', subject: 'Home Economics', type: 'persistent', maxLevel: 3,
    flavorText: 'Timing... ... ...is everything',
    description: 'End the day with 0 candy in inventory and get $1000',
  }, JOKER_EFFECT_FACTORIES[15]),

  makeJoker({
    id: 16, name: 'Bake Sale', subject: 'Home Economics', type: 'one-time', maxLevel: 3,
    flavorText: 'Cash rules everything around me CREAM! and cookies',
    description: 'Instantly Gain $3000',
  }, JOKER_EFFECT_FACTORIES[16]),

  makeJoker({
    id: 17, name: 'Home Made', subject: 'Home Economics', type: 'persistent', maxLevel: 3,
    flavorText: 'Home made is better than store bought',
    description: 'Gain $10 for every candy you bring to period 1 on a new day',
  }, JOKER_EFFECT_FACTORIES[17]),

  makeJoker({
    id: 18, name: 'Super Size Me', subject: 'Home Economics', type: 'persistent', maxLevel: 3,
    flavorText: 'Go big or go home',
    description: '1.5x multiplier on Big candy profits',
  }, JOKER_EFFECT_FACTORIES[18]),

  // === ART JOKERS (Type multiplier: Chocolate) ===
  makeJoker({
    id: 66, name: 'Treasure Chest', subject: 'Art', type: 'persistent', maxLevel: 3,
    flavorText: 'Empty slots are room for treasure',
    description: 'Inventory +8, earn $20 per empty slot at end of day',
  }, JOKER_EFFECT_FACTORIES[66]),

  makeJoker({
    id: 30, name: 'Odd Todd', subject: 'Art', type: 'persistent', maxLevel: 3,
    flavorText: 'Never tell me the odds!',
    description: 'If total inventory limit is odd, 1.5x all candy profits',
  }, JOKER_EFFECT_FACTORIES[30]),

  makeJoker({
    id: 23, name: 'Cocoa Futures', subject: 'Art', type: 'persistent', maxLevel: 3,
    flavorText: 'Invest in the bean, reap the chocolate',
    description: '1.5x multiplier on Chocolate candy profits',
  }, JOKER_EFFECT_FACTORIES[23]),

  makeJoker({
    id: 67, name: 'Medieval Shield', subject: 'Art', type: 'persistent', maxLevel: 1,
    flavorText: 'This shield belonged to one Captain Rogers, of Brooklyn',
    description: 'Protect against money loss from negative events',
  }, JOKER_EFFECT_FACTORIES[67]),

  makeJoker({
    id: 24, name: 'The Good Old Days', subject: 'Art', type: 'persistent', maxLevel: 3,
    flavorText: 'OG stories for OG prices -- half off from the bodega plug',
    description: 'All candy at the afterschool deli costs half price',
  }, JOKER_EFFECT_FACTORIES[24]),

  // === ECONOMY JOKERS (Type multiplier: Gummy) ===
  makeJoker({
    id: 19, name: 'Bear Market', subject: 'Economy', type: 'persistent', maxLevel: 3,
    flavorText: 'When the bears come out, gummy profits soar',
    description: '1.5x multiplier on Gummy candy profits',
  }, JOKER_EFFECT_FACTORIES[19]),

  makeJoker({
    id: 20, name: 'Market Manipulation', subject: 'Economy', type: 'one-time', maxLevel: 1,
    flavorText: 'Pump and dump!',
    description: 'Set any candy to the highest price of all candies this period',
  }, JOKER_EFFECT_FACTORIES[20]),

  makeJoker({
    id: 21, name: 'The Big Short', subject: 'Economy', type: 'one-time', maxLevel: 1,
    flavorText: 'Crash the price then buy it back for cheap',
    description: 'Set any candy to the lowest price of all candies this period',
  }, JOKER_EFFECT_FACTORIES[21]),

  makeJoker({
    id: 22, name: 'Deposit Bonus', subject: 'Economy', type: 'persistent', maxLevel: 3,
    flavorText: 'A dollar saved is a dollar earned',
    description: 'Get 10% bonus when depositing money to the piggy bank',
  }, JOKER_EFFECT_FACTORIES[22]),

  makeJoker({
    id: 37, name: 'Roman Coin', subject: 'Economy', type: 'one-time', maxLevel: 3,
    flavorText: "Mo' money mo' problems, but I'll take the coin",
    description: 'Instantly gain $2000',
  }, JOKER_EFFECT_FACTORIES[37]),

  // === GYM JOKERS (Type multiplier: Hard Candy) ===
  makeJoker({
    id: 11, name: 'Farmers Carry', subject: 'Gym', type: 'persistent', maxLevel: 3,
    flavorText: 'Massive operations requires massive forearms',
    description: 'Earn $5 per candy in inventory each period',
  }, JOKER_EFFECT_FACTORIES[11]),

  makeJoker({
    id: 13, name: 'Coaching', subject: 'Gym', type: 'persistent', maxLevel: 3,
    flavorText: 'Our deepest fear is that we are powerful beyond measure.',
    description: '+$300 to daily allowance',
  }, JOKER_EFFECT_FACTORIES[13]),

  makeJoker({
    id: 25, name: "Bet You I'm Faster", subject: 'Gym', type: 'one-time', maxLevel: 1,
    flavorText: 'Bet you all the candies in the world',
    description: 'Fill your inventory with any 1 candy',
  }, JOKER_EFFECT_FACTORIES[25]),

  makeJoker({
    id: 54, name: 'Bulk Up', subject: 'Gym', type: 'persistent', maxLevel: 3,
    flavorText: 'Get brolic to carry more goods',
    description: 'Inventory limit +15',
  }, JOKER_EFFECT_FACTORIES[54]),

  makeJoker({
    id: 26, name: 'Hard Knocks', subject: 'Gym', type: 'persistent', maxLevel: 3,
    flavorText: 'The school of hard knocks teaches hard candy lessons',
    description: '1.5x multiplier on Hard Candy profits',
  }, JOKER_EFFECT_FACTORIES[26]),

  // === LOGIC JOKERS (Type multiplier: Sour) ===
  makeJoker({
    id: 29, name: 'Even Stevens', subject: 'Logic', type: 'persistent', maxLevel: 3,
    flavorText: 'All good things come in pairs',
    description: 'If total inventory limit is even, 1.5x all candy profits',
  }, JOKER_EFFECT_FACTORIES[29]),

  makeJoker({
    id: 48, name: 'Pursuasion', subject: 'Logic', type: 'one-time', maxLevel: 3,
    flavorText: 'Oh these? These are limited edition man',
    description: 'Doubles your next sale (2x total value)',
  }, JOKER_EFFECT_FACTORIES[48]),

  makeJoker({
    id: 46, name: 'Sour Logic', subject: 'Logic', type: 'persistent', maxLevel: 3,
    flavorText: 'When life gives you lemons, sell sour candy',
    description: '1.5x multiplier on Sour candy profits',
  }, JOKER_EFFECT_FACTORIES[46]),

  // === RECESS JOKERS (Type multiplier: Chewy) ===
  makeJoker({
    id: 32, name: 'Double Dutch', subject: 'Recess', type: 'persistent', maxLevel: 3,
    flavorText: 'Two ropes, double the fun, double the profits',
    description: '1.5x multiplier on Chewy candy profits',
  }, JOKER_EFFECT_FACTORIES[32]),

  makeJoker({
    id: 51, name: 'Hide and Seek', subject: 'Recess', type: 'persistent', maxLevel: 1,
    flavorText: 'Finding treasure is a skill',
    description: 'Double the money you find in found money events',
  }, JOKER_EFFECT_FACTORIES[51]),

  makeJoker({
    id: 74, name: 'Secret Hideout', subject: 'Recess', type: 'persistent', maxLevel: 1,
    flavorText: 'Never let no one know, how much dough you hold',
    description: 'Protect stash from confiscation permanently',
  }, JOKER_EFFECT_FACTORIES[74]),

  // === GEOGRAPHY JOKERS (Type multiplier: Fruity) ===
  makeJoker({
    id: 38, name: 'Golden Hour', subject: 'Geography', type: 'persistent', maxLevel: 3,
    flavorText: 'The last light of day is the most valuable',
    description: 'Last 2 periods of the day: 1.5x multiplier',
  }, JOKER_EFFECT_FACTORIES[38]),

  makeJoker({
    id: 39, name: 'Trade Routes', subject: 'Geography', type: 'persistent', maxLevel: 3,
    flavorText: 'Ancient paths lead to modern profits',
    description: '+1 inventory limit every period',
  }, JOKER_EFFECT_FACTORIES[39]),

  makeJoker({
    id: 40, name: 'Continental Drift', subject: 'Geography', type: 'one-time', maxLevel: 1,
    flavorText: 'Shift the market landscape',
    description: 'Shuffle all candy prices for this period',
  }, JOKER_EFFECT_FACTORIES[40]),

  makeJoker({
    id: 53, name: 'Mysterious Artifact', subject: 'Geography', type: 'persistent', maxLevel: 3,
    flavorText: 'Be blessed with endless fortune',
    description: 'Stashed money generates 8% compound interest daily',
  }, JOKER_EFFECT_FACTORIES[53]),

  makeJoker({
    id: 42, name: 'Tropical Import', subject: 'Geography', type: 'persistent', maxLevel: 3,
    flavorText: 'Exotic fruits from faraway lands',
    description: '1.5x multiplier on Fruity candy profits',
  }, JOKER_EFFECT_FACTORIES[42]),

  makeJoker({
    id: 44, name: 'Atlas Bonus', subject: 'Geography', type: 'one-time', maxLevel: 3,
    flavorText: 'The weight of the world brings heavy profits',
    description: 'Instantly gain $2500',
  }, JOKER_EFFECT_FACTORIES[44]),

  // === CONDITIONAL PROFIT BOOST JOKERS ===
  makeJoker({
    id: 45, name: 'Early Bird', subject: 'Recess', type: 'persistent', maxLevel: 3,
    flavorText: 'The early worm catches the... candy?',
    description: 'First sale of each day gets a profit boost',
  }, JOKER_EFFECT_FACTORIES[45]),

  makeJoker({
    id: 47, name: 'Bulk Discount', subject: 'Economy', type: 'persistent', maxLevel: 3,
    flavorText: 'Buy in bulk, sell in bulk',
    description: 'Selling large quantities boosts profit',
  }, JOKER_EFFECT_FACTORIES[47]),

  makeJoker({
    id: 49, name: 'Underdog', subject: 'Gym', type: 'persistent', maxLevel: 3,
    flavorText: 'Nothing to lose, everything to gain',
    description: 'Profit boost when your cash is low',
  }, JOKER_EFFECT_FACTORIES[49]),

  makeJoker({
    id: 50, name: 'Penny Pincher', subject: 'Math', type: 'persistent', maxLevel: 3,
    flavorText: 'Every penny counts',
    description: 'Boost profits on low-margin candy',
  }, JOKER_EFFECT_FACTORIES[50]),

  makeJoker({
    id: 52, name: 'Broke and Hungry', subject: 'Economy', type: 'persistent', maxLevel: 3,
    flavorText: 'Desperation is the mother of profit',
    description: 'Big profit boost when nearly broke',
  }, JOKER_EFFECT_FACTORIES[52]),

  // === UTILITY JOKERS ===
  makeJoker({
    id: 55, name: 'Extra Credit', subject: 'Logic', type: 'persistent', maxLevel: 1,
    flavorText: 'Always doing more than required',
    description: 'See 1 extra joker to choose from after beating a minigame',
  }, JOKER_EFFECT_FACTORIES[55]),

  makeJoker({
    id: 56, name: 'Sixth Sense', subject: 'Computer', type: 'persistent', maxLevel: 1,
    flavorText: 'I see dead... jokers?',
    description: 'Hold 6 aura jokers instead of 5',
  }, JOKER_EFFECT_FACTORIES[56]),
];

// Helper functions for compatibility with old system
export const getJokersBySubject = (subject: string): StandardizedJoker[] => {
  return STANDARDIZED_JOKERS.filter((joker) => joker.subject === subject);
};

export const MATH_JOKERS = getJokersBySubject('Math');
export const COMPUTER_JOKERS = getJokersBySubject('Computer');
export const HOME_EC_JOKERS = getJokersBySubject('Home Economics');
export const ECONOMY_JOKERS = getJokersBySubject('Economy');
export const ART_JOKERS = getJokersBySubject('Art');
export const LOGIC_JOKERS = getJokersBySubject('Logic');
export const GYM_JOKERS = getJokersBySubject('Gym');
export const RECESS_JOKERS = getJokersBySubject('Recess');
export const GEOGRAPHY_JOKERS = getJokersBySubject('Geography');

export const ALL_JOKERS = {
  Math: MATH_JOKERS,
  Computer: COMPUTER_JOKERS,
  'Home Economics': HOME_EC_JOKERS,
  Economy: ECONOMY_JOKERS,
  Art: ART_JOKERS,
  Logic: LOGIC_JOKERS,
  Gym: GYM_JOKERS,
  Recess: RECESS_JOKERS,
  Geography: GEOGRAPHY_JOKERS,
};

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
