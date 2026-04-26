// Centralized Joker Effect System
// 73 jokers with level support (1-3)

import { CandySize, CandyTypeName } from '../types/candy';
import { formatNumber } from './priceUtils';

export type EffectTarget =
  | 'inventory_limit'
  | 'candy_price'
  | 'sell_multiplier' // multiplicative multiplier on profit
  | 'sell_flat_bonus' // flat percentage bonus on base profit
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
  | 'stash_allowance_bonus' // Deposit Bonus — earn % of stashed amount as daily allowance
  | 'deli_price_discount'
  | 'fill_inventory_choice'
  | 'allowance_multiplier'
  | 'allowance_add'
  | 'study_time'
  | 'next_sale_multiplier'
  | 'perfect_balance_bonus'
  | 'stash_interest'
  | 'farmers_carry_bonus'
  | 'type_multiplier' // multiplier targeting a candy type
  | 'flip_artist_boost' // Flip Artist — bonus when selling at 3x+ markup over purchase price
  | 'combo_platter_boost' // Combo Platter — bonus when both candy types covered by owned jokers
  | 'triple_threat_boost' // Triple Threat — bonus when 3+ candy types covered by type-multiplier jokers
  | 'variety_pack_boost' // Variety Pack — bonus when 3+ candy types in inventory
  | 'conditional_multiplier' // multiplier with special conditions (even/odd inv, perfect change)
  | 'inventory_double_with_penalty' // Vacuum Sealer special
  | 'empty_slot_daily_bonus' // cash per empty slot at end of day (Treasure Chest)
  | 'first_sale_boost' // Early Bird — first sale of day profit boost
  | 'bulk_sale_boost' // Bulk Discount — sell N+ at once
  | 'cash_under_boost' // Underdog & Broke and Hungry — cash below threshold
  | 'variety_pack_boost' // Variety Pack — 3+ candy types in inventory
  | 'extra_joker_choice' // Extra Credit — +1 joker choice after minigame
  | 'extra_aura_slot' // Sixth Sense — +1 persistent joker slot
  | 'loan_shark_income' // Loan Shark — daily income
  | 'loan_shark_debt' // Loan Shark — end-of-day debt repayment
  | 'glass_cannon_boost' // Glass Cannon — huge one-time multiplier, destroys a joker
  | 'contraband_boost' // Contraband — high multiplier with confiscation risk
  | 'all_in_boost' // All In — big multiplier when cash is low
  | 'compound_interest_boost' // Compound Interest — scaling multiplier over days
  | 'street_smarts_boost' // Street Smarts — bonus per event survived
  | 'size_multiplier' // Size-based multiplier (small/medium/big)
  | 'clearance_sale_boost' // Clearance Sale — permanent multiplier per loss sale
  | 'price_manipulation' // Market Crash / Inflation — temporary price changes
  | 'found_money_multiplier' // Lucky Charm — multiply found money
  | 'event_conversion' // Bully Bait — convert bad events to good
  | 'price_peek_hint' // Teacher's Pet — reveal next-period price direction for N candies
  | 'location_change_boost' // Class Clown — profit boost when current location != previous period's
  | 'collector_boost' // Collector — bonus per unique joker owned
  | 'minimalist_boost' // Minimalist — big bonus if exactly 3 jokers
  | 'lucky_seven_boost' // Lucky 7 — bonus when selling exactly 7 candy
  | 'night_owl_boost' // Night Owl — bonus in last period
  | 'tax_collector_boost' // Tax Collector — % of sale as bonus
  | 'last_stand_boost' // Last Stand — huge bonus when selling < 5 candy
  | 'momentum_boost' // Momentum — bonus per consecutive sale period
  | 'diversifier_boost' // Diversifier — bonus when selling 3+ types same period
  | 'peak_hours_boost' // Peak Hours — bonus during periods 3-5
  | 'patience_pays_boost' // Patience Pays — bonus when no sale previous period
  | 'spare_change_income' // Spare Change — income per empty slot per period
  | 'prevent_melt' // Deep Freeze — candy never melts
  | 'hoarder_boost' // Hoarder — mult per max inventory hit
  | 'penny_wise_boost' // Penny Wise — profit per stash deposit
  | 'survivor_boost' // Survivor — mult per candy batch melted
  | 'conditional_profit_boost' // Even Stevens / Golden Hour — profit boost with inventory or period condition
  | 'first_sale_profit_boost' // Early Bird — first sale of day profit boost
  | 'cash_under_profit_boost' // Underdog — profit boost when cash below threshold
  | 'variety_pack_profit_boost' // Variety Pack — profit boost when 3+ candy types in inventory
  | 'peak_hours_profit_boost' // Peak Hours — profit boost during middle periods
  | 'compound_interest_profit_boost' // Compound Interest — scaling profit boost over days
  | 'reputation_profit_boost' // Reputation — profit boost per unique candy sold
  | 'momentum_profit_boost'; // Momentum — profit boost per consecutive sale period

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
    bulkThreshold?: number; // Bulk Discount: min quantity to trigger
    cashBelow?: number; // Underdog/Broke and Hungry: cash threshold
    maxProfitPerUnit?: number;
    requiresFullStack?: boolean; // All In: sale must be the entire owned stack of this candy
  };
}

export interface StandardizedJoker {
  id: number;
  name: string;
  type: 'one-time' | 'persistent';
  flavorText: string;
  description: string;
  effects: JokerEffect[];
  level: number; // current level (1-3)
  maxLevel: number; // max upgrade level (1 = not upgradeable, 3 = fully upgradeable)
  requiresSnapshot?: boolean;
}

// Level scaling helpers
function levelScale(
  lv1: number,
  lv2: number,
  lv3: number,
  level: number
): number {
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
export function getJokerEffectsAtLevel(
  jokerId: number,
  level: number
): JokerEffect[] {
  const factory = JOKER_EFFECT_FACTORIES[jokerId];
  if (!factory) return [];
  return factory(level);
}

// Generate a human-readable description for a joker at a given level
export function getJokerDescription(
  jokerId: number,
  level: number
): string | null {
  const factory = JOKER_EFFECT_FACTORIES[jokerId];
  if (!factory) return null;
  const effects = factory(level);
  if (effects.length === 0) return null;

  const parts: string[] = [];
  for (const e of effects) {
    const size = e.conditions?.candySize ? ` ${e.conditions.candySize}` : '';
    const type = e.conditions?.candyType
      ? ` ${e.conditions.candyType.replace('_', ' ')}`
      : '';

    switch (e.target) {
      case 'flip_artist_boost':
        parts.push(
          `+${+(e.amount - 1).toFixed(1)} mult when selling at 3x+ markup`
        );
        break;
      case 'combo_platter_boost':
        parts.push(
          `+${Math.round(e.amount * 100)}% profit when 2 candy types are covered`
        );
        break;
      case 'triple_threat_boost':
        parts.push(`+${e.amount} mult when 3+ candy types covered`);
        break;
      case 'type_multiplier':
        if (e.operation === 'add')
          parts.push(`+${e.amount} mult on${type} candy`);
        else
          parts.push(
            `+${Math.round((e.amount - 1) * 100)}% profit on${type} candy`
          );
        break;
      case 'conditional_multiplier':
        if (e.conditions?.inventoryParity)
          parts.push(
            `+${+(e.amount - 1).toFixed(1)} mult when inventory is ${e.conditions.inventoryParity}`
          );
        else if (e.conditions?.period === -1)
          parts.push(`+${+(e.amount - 1).toFixed(1)} mult in last 2 periods`);
        else parts.push(`+${+(e.amount - 1).toFixed(1)} mult`);
        break;
      case 'allowance_multiplier':
        parts.push(`${e.amount}x allowance`);
        break;
      case 'allowance_add':
        parts.push(`+$${e.amount} cash to allowance`);
        break;
      case 'inventory_limit':
        parts.push(`+${e.amount} inventory`);
        break;
      case 'money':
        parts.push(`+$${formatNumber(e.amount)} instant cash`);
        break;
      case 'empty_inventory_bonus':
        parts.push(
          `+$${formatNumber(e.amount)} cash for ending day with 0 candy`
        );
        break;
      case 'morning_inventory_bonus':
        parts.push(`+$${e.amount} cash per candy at start of day`);
        break;
      case 'stash_allowance_bonus': {
        const pct = Math.round(e.amount * 100);
        parts.push(`${pct}% of stash added to daily allowance`);
        break;
      }
      case 'farmers_carry_bonus':
        parts.push(`+$${e.amount} cash per candy in inventory each period`);
        break;
      case 'next_sale_multiplier':
        parts.push(`+${e.amount - 1} mult on next sale`);
        break;
      case 'first_sale_boost':
        parts.push(`+${+(e.amount - 1).toFixed(1)} mult on first sale of day`);
        break;
      case 'bulk_sale_boost':
        parts.push(
          `+${Math.round((e.amount - 1) * 100)}% profit when selling ${e.conditions?.bulkThreshold}+ at once`
        );
        break;
      case 'cash_under_boost':
        parts.push(
          `+${+(e.amount - 1).toFixed(1)} mult when cash under $${formatNumber(e.conditions?.cashBelow ?? 0)}`
        );
        break;
      case 'variety_pack_boost':
        parts.push(
          `+${+(e.amount - 1).toFixed(1)} mult when 3+ candy types in inventory`
        );
        break;
      case 'stash_interest': {
        const pct = Math.round((e.amount - 1) * 100);
        parts.push(`${pct}% daily stash interest`);
        break;
      }
      case 'deli_price_discount': {
        const pct = Math.round((1 - e.amount) * 100);
        parts.push(`${pct}% off deli candy`);
        break;
      }
      case 'empty_slot_daily_bonus':
        parts.push(`+$${e.amount} cash per empty inventory at end of day`);
        break;
      case 'loan_shark_income':
        parts.push(`+$${formatNumber(e.amount)} daily cash`);
        break;
      case 'loan_shark_debt':
        parts.push(
          `owe $${formatNumber(Math.abs(e.amount))} cash at end of day`
        );
        break;
      case 'glass_cannon_boost':
        parts.push(
          `+${e.amount - 1} mult on every sale; chance to shatter itself`
        );
        break;
      case 'contraband_boost':
        parts.push(`+${e.amount - 1} mult, confiscation takes 100%`);
        break;
      case 'all_in_boost':
        parts.push(
          `+${e.amount - 1} mult when cash < $${formatNumber(e.conditions?.cashBelow ?? 500)}`
        );
        break;
      case 'compound_interest_boost':
        parts.push(`+${+(e.amount - 1).toFixed(2)} mult (grows each day)`);
        break;
      case 'reputation_profit_boost':
        parts.push(
          `+${Math.round(e.amount * 100)}% profit per unique candy sold`
        );
        break;
      case 'street_smarts_boost':
        parts.push(`+${e.amount} mult per event survived`);
        break;
      case 'size_multiplier':
        parts.push(
          `+${e.amount} mult on ${e.conditions?.candySize ?? ''} candy`
        );
        break;
      case 'clearance_sale_boost': {
        const pct = Math.round(e.amount * 100);
        parts.push(`+${pct}% permanent mult per loss sale`);
        break;
      }
      case 'price_manipulation':
        parts.push(`all prices x${e.amount} for 1 period`);
        break;
      case 'found_money_multiplier':
        parts.push(`${e.amount}x found money`);
        break;
      case 'event_conversion':
        parts.push(`convert bully events to +$${formatNumber(e.amount)} cash`);
        break;
      case 'price_peek_hint':
        parts.push(
          `see next-period price direction on ${e.amount} ${e.amount === 1 ? 'candy' : 'candies'}`
        );
        break;
      case 'location_change_boost': {
        const pct = Math.round(e.amount * 100);
        parts.push(`+${pct}% profit when changing location`);
        break;
      }
      case 'collector_boost':
        parts.push(`+${e.amount} mult per unique joker owned`);
        break;
      case 'minimalist_boost':
        parts.push(`+${e.amount - 1} mult if exactly 3 jokers owned`);
        break;
      case 'lucky_seven_boost':
        parts.push(`+${e.amount - 1} mult if selling exactly 7 candy`);
        break;
      case 'night_owl_boost':
        parts.push(`+${e.amount - 1} mult in last period of day`);
        break;
      case 'tax_collector_boost': {
        const pct = Math.round(e.amount * 100);
        parts.push(`+${pct}% of sale as bonus cash`);
        break;
      }
      case 'last_stand_boost':
        parts.push(`+${e.amount - 1} mult if selling < 5 candy`);
        break;
      case 'momentum_boost':
        parts.push(`+${e.amount} mult per consecutive sale period`);
        break;
      case 'diversifier_boost':
        parts.push(`+${e.amount - 1} mult when selling 3+ types same period`);
        break;
      case 'peak_hours_boost':
        parts.push(`+${e.amount - 1} mult during periods 3-5`);
        break;
      case 'patience_pays_boost':
        parts.push(
          `+${+(e.amount - 1).toFixed(2)} mult when no sale previous period`
        );
        break;
      case 'spare_change_income':
        parts.push(`+$${e.amount} cash per empty inventory per period`);
        break;
      case 'candy_price':
        parts.push(`${e.amount}x price on any 1 candy for 1 period`);
        break;
      case 'hint_chance':
        parts.push('always see future special events in the rumor mill');
        break;
      case 'inventory_double_with_penalty':
        parts.push('2x inventory limit, -2 mult (min 1x)');
        break;
      case 'money_protection':
        parts.push('protects wallet from bullies');
        break;
      case 'stash_protection':
        parts.push('protects stash from confiscation');
        break;
      case 'market_manipulation':
        parts.push('set any candy to the highest price this period');
        break;
      case 'fill_inventory_choice':
        parts.push('fill entire inventory with any 1 candy');
        break;
      case 'extra_joker_choice':
        parts.push(`+${e.amount} joker choice after minigames`);
        break;
      case 'extra_aura_slot':
        parts.push(`+${e.amount} aura slot`);
        break;
      case 'sell_multiplier':
        parts.push(`+${e.amount - 1} mult on sales`);
        break;
      case 'event_immunity':
        parts.push(`event immunity for ${e.amount} days`);
        break;
      case 'prevent_melt':
        parts.push('candy never melts');
        break;
      case 'hoarder_boost':
        parts.push(`+${e.amount} mult per time inventory hit max`);
        break;
      case 'penny_wise_boost':
        parts.push(
          `+${Math.round(e.amount * 100)}% profit per time money was stashed`
        );
        break;
      case 'survivor_boost':
        parts.push(`+${e.amount} mult per candy batch melted`);
        break;
      default:
        return null;
    }
  }

  return parts.length > 0 ? parts.join('. ') : null;
}

/* --------------------------------------------------------------------------
 * Live current-value text for variable / scaling jokers
 * ------------------------------------------------------------------------ */

import type { JokerStats } from '../store/slices/jokerStatsSlice';

/** Context bundle for live-value lookups. Some scaling counters live outside
 *  jokerStatsSlice (Momentum reads from candySalesSlice's
 *  `consecutivePeriodSales`), so we accept them via this object. */
export interface LiveJokerContext {
  jokerStats: JokerStats;
  consecutivePeriodSales?: number;
}

/**
 * Format a multiplier-style number for display: one decimal place max,
 * trailing zeroes stripped (e.g. 1 → "1", 1.5 → "1.5", 0.75 → "0.75").
 */
function _formatLiveMult(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

/**
 * Per-level value table for the variable jokers. Mirrors the `levelScale(...)`
 * calls in JOKER_EFFECT_FACTORIES (and the Trade Routes constants in
 * usePeriodAdvance) so changes need to be kept in sync if ever rebalanced.
 */
const _LIVE_PER_STACK: Record<number, [number, number, number]> = {
  // 39: TRADE_ROUTES — inventory slots per period elapsed
  39: [2, 3, 4],
  // 63: COMPOUND_INTEREST — base multiplier per level (1.2/1.4/1.6)
  63: [1.2, 1.4, 1.6],
  // 64: REPUTATION — profit boost per unique candy sold
  64: [0.2, 0.3, 0.4],
  // 65: STREET_SMARTS — mult per event survived
  65: [0.5, 0.75, 1.0],
  // 73: CLEARANCE_SALE — mult per loss sale
  73: [0.1, 0.15, 0.2],
  // 89: MOMENTUM — mult per consecutive sale period
  89: [0.3, 0.5, 0.8],
  // 95: HOARDER — mult per inventory-full hit
  95: [0.3, 0.5, 0.8],
  // 96: PENNY_WISE — profit boost per stash deposit
  96: [0.15, 0.25, 0.4],
  // 97: SURVIVOR — mult per candy batch melted
  97: [0.5, 0.75, 1.0],
};

/**
 * Returns a parenthetical-style live-value string for variable jokers, or
 * null for non-variable jokers / never-triggered counters. Formulas mirror
 * what `saleCalculations.ts` actually applies — Compound Interest's actual
 * effect is binary (have you held candy ≥ 1 day?) despite its description
 * suggesting per-day scaling.
 *
 * Examples:
 *   "currently +30% mult"   (Clearance Sale, 3 loss sales @ L1)
 *   "currently +1.5 mult"   (Street Smarts, 3 events @ L1)
 *   "currently +45%"        (Reputation, 3 types @ L2)
 */
export function getLiveJokerValueText(
  jokerId: number,
  level: number,
  ctx: LiveJokerContext
): string | null {
  const lvIdx = Math.min(2, Math.max(0, (level || 1) - 1));
  const { jokerStats, consecutivePeriodSales = 0 } = ctx;

  switch (jokerId) {
    case 39: {
      // TRADE_ROUTES — accumulated inventory bonus = perPeriod × periods elapsed
      const stacks = jokerStats.tradeRoutesPeriods;
      if (stacks <= 0) return null;
      const per = _LIVE_PER_STACK[39]![lvIdx]!;
      return `currently +${per * stacks} inventory`;
    }
    case 63: {
      // COMPOUND_INTEREST — fires once compoundInterestDays > 0 with the
      // level-base boost. Despite the description, the existing engine
      // does NOT scale per day, so we report the binary state.
      if (jokerStats.compoundInterestDays <= 0) return null;
      const base = _LIVE_PER_STACK[63]![lvIdx]!;
      const pct = Math.round((base - 1) * 100);
      return `currently +${pct}%`;
    }
    case 64: {
      const stacks = jokerStats.reputationTypesSold;
      if (stacks <= 0) return null;
      const per = _LIVE_PER_STACK[64]![lvIdx]!;
      const pct = Math.round(per * stacks * 100);
      return `currently +${pct}%`;
    }
    case 65: {
      const stacks = jokerStats.streetSmartsEventsSurvived;
      if (stacks <= 0) return null;
      const per = _LIVE_PER_STACK[65]![lvIdx]!;
      return `currently +${_formatLiveMult(per * stacks)} mult`;
    }
    case 73: {
      const stacks = jokerStats.clearanceSaleLosses;
      if (stacks <= 0) return null;
      const per = _LIVE_PER_STACK[73]![lvIdx]!;
      const pct = Math.round(per * stacks * 100);
      return `currently +${pct}% mult`;
    }
    case 89: {
      // MOMENTUM — counter lives in candySalesSlice (consecutivePeriodSales)
      if (consecutivePeriodSales <= 0) return null;
      const per = _LIVE_PER_STACK[89]![lvIdx]!;
      return `currently +${_formatLiveMult(per * consecutivePeriodSales)} mult`;
    }
    case 95: {
      const stacks = jokerStats.hoarderMaxHits;
      if (stacks <= 0) return null;
      const per = _LIVE_PER_STACK[95]![lvIdx]!;
      return `currently +${_formatLiveMult(per * stacks)} mult`;
    }
    case 96: {
      const stacks = jokerStats.pennyWiseStashes;
      if (stacks <= 0) return null;
      const per = _LIVE_PER_STACK[96]![lvIdx]!;
      const pct = Math.round(per * stacks * 100);
      return `currently +${pct}%`;
    }
    case 97: {
      const stacks = jokerStats.survivorCandiesMelted;
      if (stacks <= 0) return null;
      const per = _LIVE_PER_STACK[97]![lvIdx]!;
      return `currently +${_formatLiveMult(per * stacks)} mult`;
    }
    default:
      return null;
  }
}

// Effect factories keyed by joker ID — used to generate level-specific effects
const JOKER_EFFECT_FACTORIES: Record<number, (level: number) => JokerEffect[]> =
  {
    // 1: Double Up — 2x/3x/4x price on 1 candy for 1 period
    1: (lv) => [
      {
        target: 'candy_price',
        operation: 'multiply',
        amount: levelScale(2, 3, 4, lv),
        duration: 'one-time',
      },
    ],

    // 2: Flip Artist — 1.5x/2x/3x when selling at 3x+ markup over purchase price
    2: (lv) => [
      {
        target: 'flip_artist_boost',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
      },
    ],

    // 31: Ace the Test — 2x/3x/4x allowance
    31: (lv) => [
      {
        target: 'allowance_multiplier',
        operation: 'multiply',
        amount: levelScale(2, 3, 4, lv),
        duration: 'persistent',
      },
    ],

    // 43: Inductive Reasoning — Inv +5/+10/+15 per new day
    43: (lv) => [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: levelScale(5, 7, 10, lv),
        duration: 'persistent',
      },
    ],

    // 6: Tapped In — 100% event hints, not upgradeable
    6: (_lv) => [
      {
        target: 'hint_chance',
        operation: 'set',
        amount: 1,
        duration: 'persistent',
      },
    ],

    // 8: Combo Platter — +1x/+1.5x/+2x bonus when both candy types covered by owned jokers
    8: (lv) => [
      {
        target: 'combo_platter_boost',
        operation: 'add',
        amount: levelScale(1, 1.5, 2, lv),
        duration: 'persistent',
      },
    ],

    // 9: Data Compression — Inventory +13/+26/+39
    9: (lv) => [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: levelScale(13, 26, 39, lv),
        duration: 'persistent',
      },
    ],

    // 12: Vacuum Sealer — 2x inventory, -2 final mult (min 0), not upgradeable
    12: (_lv) => [
      {
        target: 'inventory_double_with_penalty',
        operation: 'enable',
        amount: 1,
        duration: 'persistent',
      },
    ],

    // 15: Perfect Bake — $1k/$3k/$5k for ending day with 0 inventory
    15: (lv) => [
      {
        target: 'empty_inventory_bonus',
        operation: 'add',
        amount: levelScale(1000, 3000, 5000, lv),
        duration: 'persistent',
      },
    ],

    // 16: Bake Sale — Gain $3k/$6k/$9k (handled imperatively in JokerCard handleBakeSale)
    16: (_lv) => [],

    // 17: Home Made — $25/$50/$100 per candy at start of day
    17: (lv) => [
      {
        target: 'morning_inventory_bonus',
        operation: 'add',
        amount: levelScale(25, 50, 100, lv),
        duration: 'persistent',
      },
    ],

    // 18: Triple Threat — +2x/+3x/+4x when 3+ candy types covered by type-multiplier jokers
    18: (lv) => [
      {
        target: 'triple_threat_boost',
        operation: 'add',
        amount: levelScale(2, 3, 4, lv),
        duration: 'persistent',
      },
    ],

    // 66: Treasure Chest — Inventory +8/+15/+25, plus $20/$50/$100 per empty inventory at end of day
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
    30: (lv) => [
      {
        target: 'conditional_multiplier',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { inventoryParity: 'odd' },
      },
    ],

    // 23: Cocoa Futures — 1.5x/2x/3x mult Chocolate
    23: (lv) => [
      {
        target: 'type_multiplier',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { candyType: 'chocolate' },
      },
    ],

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

    // 24: Shrinking Glass — Deli 50%/75%/90% off
    24: (lv) => [
      {
        target: 'deli_price_discount',
        operation: 'multiply',
        amount: levelScale(0.5, 0.25, 0.1, lv),
        duration: 'persistent',
        conditions: { location: 'deli' },
      },
    ],

    // 19: Bear Market — +1.5/+2/+3 mult Gummy
    19: (lv) => [
      {
        target: 'type_multiplier',
        operation: 'add',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { candyType: 'gummy' },
      },
    ],

    // 20: Market Manipulation — Set 1 candy to highest price, not upgradeable
    20: (_lv) => [
      {
        target: 'market_manipulation',
        operation: 'match_highest',
        amount: 1,
        duration: 'one-time',
      },
    ],

    // 22: Deposit Bonus — earn 5%/10%/15% of stashed amount as daily allowance
    22: (lv) => [
      {
        target: 'stash_allowance_bonus',
        operation: 'multiply',
        amount: levelScale(0.05, 0.1, 0.15, lv),
        duration: 'persistent',
      },
    ],

    // 37: Roman Coin — Gain $2k/$5k/$10k (handled imperatively in JokerCard handleRomanCoin)
    37: (_lv) => [],

    // 11: Farmers Carry — inventory count × $5/$25/$100 per period
    11: (lv) => [
      {
        target: 'farmers_carry_bonus',
        operation: 'add',
        amount: levelScale(5, 25, 100, lv),
        duration: 'persistent',
      },
    ],

    // 25: Bet You I'm Faster — Fill inv with 1 candy, not upgradeable
    25: (_lv) => [
      {
        target: 'fill_inventory_choice',
        operation: 'activate',
        amount: 1,
        duration: 'one-time',
      },
    ],

    // 26: Hard Knocks — 1.5x/2x/3x mult Hard Candy
    26: (lv) => [
      {
        target: 'type_multiplier',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { candyType: 'hard_candy' },
      },
    ],

    // 29: Even Stevens — 1.5x/2x/3x ALL (even inv limit)
    29: (lv) => [
      {
        target: 'conditional_profit_boost',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { inventoryParity: 'even' },
      },
    ],

    // 48: Pursuasion — 2x/4x/6x next sale
    48: (lv) => [
      {
        target: 'next_sale_multiplier',
        operation: 'multiply',
        amount: levelScale(2, 4, 6, lv),
        duration: 'one-time',
      },
    ],

    // 46: Sour Logic — 1.5x/2x/3x mult Sour
    46: (lv) => [
      {
        target: 'type_multiplier',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { candyType: 'sour' },
      },
    ],

    // 32: Double Dutch — 1.5x/2x/3x mult Chewy
    32: (lv) => [
      {
        target: 'type_multiplier',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { candyType: 'chewy' },
      },
    ],

    // 38: Golden Hour — Last 2 periods: 1.5x/2x/3x multiplier
    38: (lv) => [
      {
        target: 'conditional_profit_boost',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { period: -1 }, // -1 = special flag for "last 2 periods"
      },
    ],

    // 39: Trade Routes — +2/+3/+4 inv per period
    39: (lv) => [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: levelScale(2, 3, 4, lv),
        duration: 'persistent',
      },
    ],

    // 53: Mysterious Artifact — 8%/15%/25% daily stash interest
    53: (lv) => [
      {
        target: 'stash_interest',
        operation: 'multiply',
        amount: levelScale(1.08, 1.15, 1.25, lv),
        duration: 'persistent',
      },
    ],

    // 42: Tropical Import — 1.5x/2x/3x mult Fruity
    42: (lv) => [
      {
        target: 'type_multiplier',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { candyType: 'fruity' },
      },
    ],

    // === CONDITIONAL PROFIT BOOSTS ===

    // 45: Early Bird — first sale of day profit boost
    45: (lv) => [
      {
        target: 'first_sale_profit_boost',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
      },
    ],

    // 47: Bulk Discount — +50%/+100%/+200% profit when selling 20+ at once (threshold fixed across levels)
    47: (lv) => [
      {
        target: 'bulk_sale_boost',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { bulkThreshold: 20 },
      },
    ],

    // 49: Underdog — cash under threshold
    49: (lv) => [
      {
        target: 'cash_under_profit_boost',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
        conditions: { cashBelow: levelScale(5000, 10000, 15000, lv) },
      },
    ],

    // 50: Variety Pack — 1.5x/2x/3x when 3+ candy types in inventory at time of sale
    50: (lv) => [
      {
        target: 'variety_pack_profit_boost',
        operation: 'multiply',
        amount: levelScale(1.5, 2, 3, lv),
        duration: 'persistent',
      },
    ],

    // 52: Broke and Hungry — cash under $2k/$3k/$5k
    52: (lv) => [
      {
        target: 'cash_under_boost',
        operation: 'multiply',
        amount: levelScale(2, 3, 4, lv),
        duration: 'persistent',
        conditions: { cashBelow: levelScale(2000, 3000, 5000, lv) },
      },
    ],

    // 55: Extra Credit — +1 joker choice after minigame, not upgradeable
    55: (_lv) => [
      {
        target: 'extra_joker_choice',
        operation: 'add',
        amount: 1,
        duration: 'persistent',
      },
    ],

    // 56: Sixth Sense — +1 aura slot, not upgradeable
    56: (_lv) => [
      {
        target: 'extra_aura_slot',
        operation: 'add',
        amount: 1,
        duration: 'persistent',
      },
    ],

    // === TRADEOFF JOKERS ===

    // 57: Sugar Rush — 2x/3x/4x sell multiplier
    57: (lv) => [
      {
        target: 'sell_multiplier',
        operation: 'multiply',
        amount: levelScale(2, 3, 4, lv),
        duration: 'persistent',
      },
    ],

    // 58: Loan Shark — $5k/$8k/$12k daily income, owe $6k/$9.5k/$14k at end of day
    58: (lv) => [
      {
        target: 'loan_shark_income',
        operation: 'add',
        amount: levelScale(5000, 8000, 12000, lv),
        duration: 'persistent',
      },
      {
        target: 'loan_shark_debt',
        operation: 'add',
        amount: levelScale(-6000, -9500, -14000, lv),
        duration: 'persistent',
      },
    ],

    // 59: Glass Cannon — +4/+6/+9 mult on every sale; 10%/7%/5% chance to shatter itself per sale (handled in useTransactionHandler)
    59: (lv) => [
      {
        target: 'glass_cannon_boost',
        operation: 'multiply',
        amount: levelScale(5, 7, 10, lv),
        duration: 'persistent',
      },
    ],

    // 60: Contraband — 2x/3x/4x sell multiplier, confiscation risk
    60: (lv) => [
      {
        target: 'contraband_boost',
        operation: 'multiply',
        amount: levelScale(2, 3, 4, lv),
        duration: 'persistent',
      },
    ],

    // 61: All In — +3/+5/+7 mult when selling entire stack AND cash < $500/$5k/$15k
    61: (lv) => [
      {
        target: 'all_in_boost',
        operation: 'multiply',
        amount: levelScale(4, 6, 8, lv),
        duration: 'persistent',
        conditions: {
          cashBelow: levelScale(500, 5000, 15000, lv),
          requiresFullStack: true,
        },
      },
    ],

    // 62: Hot Potato — +3/+5/+7 mult on every sale; candy melts in 3 periods instead of 5 (handled in usePeriodAdvance)
    62: (lv) => [
      {
        target: 'sell_multiplier',
        operation: 'multiply',
        amount: levelScale(4, 6, 8, lv),
        duration: 'persistent',
      },
    ],

    // === SCALING JOKERS ===

    // 63: Compound Interest — starts 1.2x/1.4x/1.6x, gains +0.2/+0.3/+0.4 per day, cap 3/4/5
    63: (lv) => [
      {
        target: 'compound_interest_profit_boost',
        operation: 'multiply',
        amount: levelScale(1.2, 1.4, 1.6, lv),
        duration: 'persistent',
      },
    ],

    // 64: Reputation — +20%/+30%/+40% profit boost per unique candy ever sold (by name)
    64: (lv) => [
      {
        target: 'reputation_profit_boost',
        operation: 'add',
        amount: levelScale(0.2, 0.3, 0.4, lv),
        duration: 'persistent',
      },
    ],

    // 65: Street Smarts — +10%/+15%/+20% per event survived
    65: (lv) => [
      {
        target: 'street_smarts_boost',
        operation: 'add',
        amount: levelScale(0.5, 0.75, 1.0, lv),
        duration: 'persistent',
      },
    ],

    // === CANDY-SPECIFIC JOKERS ===

    // 70: Mint Condition — +1x/+1.5x/+2x size multiplier on small candy
    70: (lv) => [
      {
        target: 'size_multiplier',
        operation: 'add',
        amount: levelScale(1, 1.5, 2, lv),
        duration: 'persistent',
        conditions: { candySize: 'small' },
      },
    ],

    // 71: King Size — +1x/+1.5x/+2x size multiplier on big candy
    71: (lv) => [
      {
        target: 'size_multiplier',
        operation: 'add',
        amount: levelScale(1, 1.5, 2, lv),
        duration: 'persistent',
        conditions: { candySize: 'big' },
      },
    ],

    // 72: Medium Rare — +1x/+1.5x/+2x size multiplier on medium candy
    72: (lv) => [
      {
        target: 'size_multiplier',
        operation: 'add',
        amount: levelScale(1, 1.5, 2, lv),
        duration: 'persistent',
        conditions: { candySize: 'medium' },
      },
    ],

    // 73: Clearance Sale — +10%/+15%/+20% permanent multiplier per loss sale
    73: (lv) => [
      {
        target: 'clearance_sale_boost',
        operation: 'add',
        amount: levelScale(0.1, 0.15, 0.2, lv),
        duration: 'persistent',
      },
    ],

    // === ECONOMY JOKERS ===

    // 74: Piggy Bank Pro — 15%/20%/25% stash interest
    74: (lv) => [
      {
        target: 'stash_interest',
        operation: 'multiply',
        amount: levelScale(1.15, 1.2, 1.25, lv),
        duration: 'persistent',
      },
    ],

    // 75: Market Crash — all prices x0.5/x0.4/x0.3 for 1 period
    75: (lv) => [
      {
        target: 'price_manipulation',
        operation: 'multiply',
        amount: levelScale(0.5, 0.4, 0.3, lv),
        duration: 'one-time',
      },
    ],

    // 76: Inflation — all prices x2/x3/x4 for 1 period
    76: (lv) => [
      {
        target: 'price_manipulation',
        operation: 'multiply',
        amount: levelScale(2, 3, 4, lv),
        duration: 'one-time',
      },
    ],

    // === SOCIAL/EVENT JOKERS ===

    // 77: Lucky Charm — found money multiplier 3x/4x/5x
    77: (lv) => [
      {
        target: 'found_money_multiplier',
        operation: 'multiply',
        amount: levelScale(3, 4, 5, lv),
        duration: 'persistent',
      },
    ],

    // 78: Bully Bait — convert bully event to found money +$500/+$1000/+$2000
    78: (lv) => [
      {
        target: 'event_conversion',
        operation: 'convert',
        amount: levelScale(500, 1000, 2000, lv),
        duration: 'persistent',
      },
    ],

    // 79: Teacher's Pet — reveal next-period price direction arrow on 1/2/3 candies (biggest movers)
    79: (lv) => [
      {
        target: 'price_peek_hint',
        operation: 'set',
        amount: levelScale(1, 2, 3, lv),
        duration: 'persistent',
      },
    ],

    // 80: Class Clown — +10%/+25%/+50% profit boost when current location differs from previous period
    80: (lv) => [
      {
        target: 'location_change_boost',
        operation: 'add',
        amount: levelScale(0.1, 0.25, 0.5, lv),
        duration: 'persistent',
      },
    ],

    // 81: Detention Dodge — event immunity for 1 day (one-time, L1 only)
    81: (_lv) => [
      {
        target: 'event_immunity',
        operation: 'enable',
        amount: 1,
        duration: 'one-time',
      },
    ],

    // === COMBO/META JOKERS ===

    // 82: Collector — +0.3x/+0.5x/+0.7x per unique joker owned
    82: (lv) => [
      {
        target: 'collector_boost',
        operation: 'add',
        amount: levelScale(0.3, 0.5, 0.7, lv),
        duration: 'persistent',
      },
    ],

    // 83: Minimalist — 3x/5x/8x if exactly 3 jokers owned
    83: (lv) => [
      {
        target: 'minimalist_boost',
        operation: 'multiply',
        amount: levelScale(3, 5, 8, lv),
        duration: 'persistent',
      },
    ],

    // 84: Lucky 7 — 7x/10x/15x if selling exactly 7 candy
    84: (lv) => [
      {
        target: 'lucky_seven_boost',
        operation: 'multiply',
        amount: levelScale(7, 10, 15, lv),
        duration: 'persistent',
      },
    ],

    // 85: Night Owl — 3x/4x/5x in last period of day
    85: (lv) => [
      {
        target: 'night_owl_boost',
        operation: 'multiply',
        amount: levelScale(3, 4, 5, lv),
        duration: 'persistent',
      },
    ],

    // 86: Penny Pincher — 10%/15%/20% of stash to allowance, min $50/$100/$200
    86: (lv) => [
      {
        target: 'stash_allowance_bonus',
        operation: 'multiply',
        amount: levelScale(0.1, 0.15, 0.2, lv),
        duration: 'persistent',
      },
    ],

    // 87: Tax Collector — 5%/8%/12% of sale as bonus
    87: (lv) => [
      {
        target: 'tax_collector_boost',
        operation: 'multiply',
        amount: levelScale(0.05, 0.08, 0.12, lv),
        duration: 'persistent',
      },
    ],

    // 88: Last Stand — 10x/15x/20x if selling < 5 candy
    88: (lv) => [
      {
        target: 'last_stand_boost',
        operation: 'multiply',
        amount: levelScale(10, 15, 20, lv),
        duration: 'persistent',
      },
    ],

    // 89: Momentum — +0.3x/+0.5x/+0.8x per consecutive sale period
    89: (lv) => [
      {
        target: 'momentum_profit_boost',
        operation: 'add',
        amount: levelScale(0.3, 0.5, 0.8, lv),
        duration: 'persistent',
      },
    ],

    // 90: Diversifier — 2x/3x/4x when selling 3+ types same period
    90: (lv) => [
      {
        target: 'diversifier_boost',
        operation: 'multiply',
        amount: levelScale(2, 3, 4, lv),
        duration: 'persistent',
      },
    ],

    // 91: Peak Hours — 2x/3x/4x during periods 3-5
    91: (lv) => [
      {
        target: 'peak_hours_profit_boost',
        operation: 'multiply',
        amount: levelScale(2, 3, 4, lv),
        duration: 'persistent',
      },
    ],

    // 92: Patience Pays — +50%/+75%/+100% when no sale previous period
    92: (lv) => [
      {
        target: 'patience_pays_boost',
        operation: 'multiply',
        amount: levelScale(1.5, 1.75, 2.0, lv),
        duration: 'persistent',
      },
    ],

    // 93: Spare Change — $5/$10/$20 per empty inventory per period
    93: (lv) => [
      {
        target: 'spare_change_income',
        operation: 'add',
        amount: levelScale(5, 10, 20, lv),
        duration: 'persistent',
      },
    ],

    // 94: Deep Freeze — Candy never melts
    94: () => [
      {
        target: 'prevent_melt',
        operation: 'add',
        amount: 1,
        duration: 'persistent',
      },
    ],

    // 95: Hoarder — +0.3/+0.5/+0.8 mult per time inventory hit max
    95: (lv) => [
      {
        target: 'hoarder_boost',
        operation: 'add',
        amount: levelScale(0.3, 0.5, 0.8, lv),
        duration: 'persistent',
      },
    ],

    // 96: Penny Wise — +15%/+25%/+40% profit per time money was stashed
    96: (lv) => [
      {
        target: 'penny_wise_boost',
        operation: 'add',
        amount: levelScale(0.15, 0.25, 0.4, lv),
        duration: 'persistent',
      },
    ],

    // 97: Survivor — +0.5/+0.75/+1 mult per candy batch melted
    97: (lv) => [
      {
        target: 'survivor_boost',
        operation: 'add',
        amount: levelScale(0.5, 0.75, 1.0, lv),
        duration: 'persistent',
      },
    ],
  };

// Predefined standardized jokers with the new system
export const STANDARDIZED_JOKERS: StandardizedJoker[] = [
  // === TYPE BOOSTS — add to base profit ===
  makeJoker(
    {
      id: 23,
      name: 'Cocoa Futures',
      type: 'persistent',
      maxLevel: 3,
      flavorText: "Nothing some chocolate can't fix",
      description: '+50%/+100%/+200% profit on Chocolate candy',
    },
    JOKER_EFFECT_FACTORIES[23]
  ),

  makeJoker(
    {
      id: 26,
      name: 'Hard Knocks',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Hard candy, hard cash',
      description: '+50%/+100%/+200% profit on Hard Candy',
    },
    JOKER_EFFECT_FACTORIES[26]
  ),

  makeJoker(
    {
      id: 46,
      name: 'Sour Logic',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'When life gives you lemons, sell sour candy',
      description: '+50%/+100%/+200% profit on Sour candy',
    },
    JOKER_EFFECT_FACTORIES[46]
  ),

  makeJoker(
    {
      id: 32,
      name: 'Double Dutch',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Double your pleasure, double your profit',
      description: '+50%/+100%/+200% profit on Chewy candy',
    },
    JOKER_EFFECT_FACTORIES[32]
  ),

  makeJoker(
    {
      id: 42,
      name: 'Tropical Import',
      type: 'persistent',
      maxLevel: 3,
      flavorText: "It's a Profit Profit fruit!",
      description: '+50%/+100%/+200% profit on Fruity candy',
    },
    JOKER_EFFECT_FACTORIES[42]
  ),

  makeJoker(
    {
      id: 8,
      name: 'Combo Platter',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Two flavors, one big payday',
      description: '+100%/+150%/+200% profit when 2 candy types are covered',
    },
    JOKER_EFFECT_FACTORIES[8]
  ),

  makeJoker(
    {
      id: 47,
      name: 'Bulk Discount',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Buy in bulk, sell in bulk',
      description: '+50%/+100%/+200% profit when selling 20+ at once',
    },
    JOKER_EFFECT_FACTORIES[47]
  ),

  // === MULTIPLIERS — multiply total profit ===
  makeJoker(
    {
      id: 19,
      name: 'Bear Market',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'The Right to Gummy Bear Arms',
      description: '+1.5/+2/+3 mult on Gummy candy',
    },
    JOKER_EFFECT_FACTORIES[19]
  ),

  makeJoker(
    {
      id: 29,
      name: 'Even Stevens',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'All good things come in pairs',
      description: '+50%/+100%/+200% profit when inventory limit is even',
    },
    JOKER_EFFECT_FACTORIES[29]
  ),

  makeJoker(
    {
      id: 30,
      name: 'Odd Todd',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Never tell me the odds!',
      description: '+0.5/+1/+2 mult when inventory limit is odd',
    },
    JOKER_EFFECT_FACTORIES[30]
  ),

  makeJoker(
    {
      id: 38,
      name: 'Golden Hour',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'The last light of day is the most valuable',
      description: '+50%/+100%/+200% profit in last 2 periods of day',
    },
    JOKER_EFFECT_FACTORIES[38]
  ),

  makeJoker(
    {
      id: 45,
      name: 'Early Bird',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'First come, first served',
      description: '+50%/+100%/+200% profit on first sale each day',
    },
    JOKER_EFFECT_FACTORIES[45]
  ),

  makeJoker(
    {
      id: 49,
      name: 'Underdog',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Nothing to lose, everything to gain',
      description: '+50%/+100%/+200% profit when cash < $5k/$10k/$15k',
    },
    JOKER_EFFECT_FACTORIES[49]
  ),

  makeJoker(
    {
      id: 52,
      name: 'Broke and Hungry',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Get rich or die trying',
      description: '+1/+2/+3 mult when cash < $2k/$3k/$5k',
    },
    JOKER_EFFECT_FACTORIES[52]
  ),

  makeJoker(
    {
      id: 2,
      name: 'Flip Artist',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Buy the dip, sell the rip',
      description: '+0.5/+1/+2 mult when selling at 3x+ markup',
    },
    JOKER_EFFECT_FACTORIES[2]
  ),

  makeJoker(
    {
      id: 50,
      name: 'Variety Pack',
      type: 'persistent',
      maxLevel: 3,
      flavorText: "Don't put all your candy in one bag",
      description: '+50%/+100%/+200% profit when 3+ candy types in inventory',
    },
    JOKER_EFFECT_FACTORIES[50]
  ),

  makeJoker(
    {
      id: 18,
      name: 'Triple Threat',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Triple Double No Assists!',
      description: '+2/+3/+4 mult when 3+ candy types covered by your jokers',
    },
    JOKER_EFFECT_FACTORIES[18]
  ),

  makeJoker(
    {
      id: 48,
      name: 'Pursuasion',
      type: 'one-time',
      maxLevel: 3,
      flavorText: 'These are limited edition, trust me',
      description: '+1/+3/+5 mult on your next sale (one-time)',
    },
    JOKER_EFFECT_FACTORIES[48]
  ),

  // === INVENTORY ===
  makeJoker(
    {
      id: 9,
      name: 'Data Compression',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Lossless compression for sugar',
      description: '+13/+26/+39 inventory',
    },
    JOKER_EFFECT_FACTORIES[9]
  ),

  makeJoker(
    {
      id: 43,
      name: 'Inductive Reasoning',
      type: 'persistent',
      maxLevel: 3,
      flavorText: "Every day's a reason to carry more",
      description: '+5/+7/+10 inventory each new day',
    },
    JOKER_EFFECT_FACTORIES[43]
  ),

  makeJoker(
    {
      id: 39,
      name: 'Trade Routes',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Ancient paths, modern profits',
      description: '+2/+3/+4 inventory every period',
    },
    JOKER_EFFECT_FACTORIES[39]
  ),

  makeJoker(
    {
      id: 66,
      name: 'Treasure Chest',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Empty inventory, room for treasure',
      description:
        '+8/+15/+25 inventory, $20/$50/$100 cash per empty inventory at end of day',
    },
    JOKER_EFFECT_FACTORIES[66]
  ),

  makeJoker(
    {
      id: 12,
      name: 'Vacuum Sealer',
      type: 'persistent',
      maxLevel: 1,
      flavorText: 'All candy, no air!',
      description: '2x inventory limit, -2 mult (min 1x)',
      requiresSnapshot: true,
    },
    JOKER_EFFECT_FACTORIES[12]
  ),

  // === INCOME ===
  makeJoker(
    {
      id: 31,
      name: 'Ace the Test',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'You earned this new book bag!',
      description: '2x/3x/4x allowance',
    },
    JOKER_EFFECT_FACTORIES[31]
  ),

  makeJoker(
    {
      id: 22,
      name: 'Deposit Bonus',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'A dollar saved is a dollar earned',
      description: '5%/10%/15% of stash added to daily allowance',
    },
    JOKER_EFFECT_FACTORIES[22]
  ),

  makeJoker(
    {
      id: 11,
      name: 'Farmers Carry',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Forearms like Popeye!',
      description: '+$5/$25/$100 cash per candy in inventory each period',
    },
    JOKER_EFFECT_FACTORIES[11]
  ),

  makeJoker(
    {
      id: 17,
      name: 'Home Made',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Home made hits different',
      description: '$25/$50/$100 cash per candy in inventory at start of day',
    },
    JOKER_EFFECT_FACTORIES[17]
  ),

  makeJoker(
    {
      id: 15,
      name: 'Perfect Bake',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Lined them up perfectly',
      description: '$1k/$3k/$5k cash for ending day with 0 inventory',
    },
    JOKER_EFFECT_FACTORIES[15]
  ),

  makeJoker(
    {
      id: 53,
      name: 'Mysterious Artifact',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'It has a pulsating glow...',
      description: '8%/15%/25% daily compound interest on stash',
    },
    JOKER_EFFECT_FACTORIES[53]
  ),

  // === ONE-TIME ===
  makeJoker(
    {
      id: 1,
      name: 'Double Up',
      type: 'one-time',
      maxLevel: 3,
      flavorText: 'f(x) = 2x',
      description: '2x/3x/4x price of any 1 candy for 1 period',
    },
    JOKER_EFFECT_FACTORIES[1]
  ),

  makeJoker(
    {
      id: 16,
      name: 'Bake Sale',
      type: 'one-time',
      maxLevel: 3,
      flavorText: 'C.R.E.A.M. and cookies',
      description: '$3k/$6k/$9k instant cash',
    },
    JOKER_EFFECT_FACTORIES[16]
  ),

  makeJoker(
    {
      id: 37,
      name: 'Roman Coin',
      type: 'one-time',
      maxLevel: 3,
      flavorText: "Mo' money, mo' problems",
      description: '$2k/$5k/$10k instant cash',
    },
    JOKER_EFFECT_FACTORIES[37]
  ),

  makeJoker(
    {
      id: 20,
      name: 'Market Manipulation',
      type: 'one-time',
      maxLevel: 1,
      flavorText: 'Pump and dump!',
      description: 'Set any candy to the highest price this period',
    },
    JOKER_EFFECT_FACTORIES[20]
  ),

  makeJoker(
    {
      id: 25,
      name: "Bet You I'm Faster",
      type: 'one-time',
      maxLevel: 1,
      flavorText: 'Bet you all the candies in the world',
      description: 'Fill entire inventory with any 1 candy',
    },
    JOKER_EFFECT_FACTORIES[25]
  ),

  // === UTILITY ===
  makeJoker(
    {
      id: 6,
      name: 'Tapped In',
      type: 'persistent',
      maxLevel: 1,
      flavorText: 'Signal through the noise',
      description: 'Always see future special events in the rumor mill',
    },
    JOKER_EFFECT_FACTORIES[6]
  ),

  makeJoker(
    {
      id: 67,
      name: 'Safe House',
      type: 'persistent',
      maxLevel: 1,
      flavorText: 'Never let em know how much dough you hold',
      description: 'Protects wallet from bullies and stash from confiscation',
    },
    JOKER_EFFECT_FACTORIES[67]
  ),

  makeJoker(
    {
      id: 24,
      name: 'Shrinking Glass',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Honey I shrunk the candy',
      description: '50%/75%/90% off deli candy',
    },
    JOKER_EFFECT_FACTORIES[24]
  ),

  makeJoker(
    {
      id: 55,
      name: 'Extra Credit',
      type: 'persistent',
      maxLevel: 1,
      flavorText: 'Always doing extra',
      description: '+1 joker choice after minigames',
    },
    JOKER_EFFECT_FACTORIES[55]
  ),

  makeJoker(
    {
      id: 56,
      name: 'Sixth Sense',
      type: 'persistent',
      maxLevel: 1,
      flavorText: 'I see dead... jokers?',
      description: '+1 aura slot (hold 6 instead of 5)',
    },
    JOKER_EFFECT_FACTORIES[56]
  ),

  // === TRADEOFF ===
  makeJoker(
    {
      id: 57,
      name: 'Sugar Rush',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'This was almost the game name!',
      description: '+1/+2/+3 mult on every sale',
    },
    JOKER_EFFECT_FACTORIES[57]
  ),

  makeJoker(
    {
      id: 58,
      name: 'Loan Shark',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Borrow now, pay later... with interest',
      description:
        '+$5k/+$8k/+$12k daily cash, owe $6k/$9.5k/$14k at end of day',
    },
    JOKER_EFFECT_FACTORIES[58]
  ),

  makeJoker(
    {
      id: 59,
      name: 'Glass Cannon',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Fragile like your ego',
      description:
        '+4/+6/+9 mult on every sale; 10%/7%/5% chance to shatter itself',
    },
    JOKER_EFFECT_FACTORIES[59]
  ),

  makeJoker(
    {
      id: 60,
      name: 'Contraband',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'No risk it, no biscuit',
      description: '+1/+2/+3 mult, confiscation takes 100%',
    },
    JOKER_EFFECT_FACTORIES[60]
  ),

  makeJoker(
    {
      id: 61,
      name: 'All In',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Nothing left to lose',
      description:
        '+3/+5/+7 mult when selling entire stack and cash < $500/$5k/$15k',
    },
    JOKER_EFFECT_FACTORIES[61]
  ),

  makeJoker(
    {
      id: 62,
      name: 'Hot Potato',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Sell fast or watch it melt',
      description: '+3/+5/+7 mult on every sale; candy melts in 3 periods',
    },
    JOKER_EFFECT_FACTORIES[62]
  ),

  // === SCALING ===
  makeJoker(
    {
      id: 63,
      name: 'Compound Interest',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Money makes money makes money',
      description: '+20%/+40%/+60% profit (grows each day)',
    },
    JOKER_EFFECT_FACTORIES[63]
  ),

  makeJoker(
    {
      id: 64,
      name: 'Reputation',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Word gets around when you sell the good stuff',
      description: '+20%/+30%/+40% profit per unique candy sold',
    },
    JOKER_EFFECT_FACTORIES[64]
  ),

  makeJoker(
    {
      id: 65,
      name: 'Street Smarts',
      type: 'persistent',
      maxLevel: 3,
      flavorText: "What doesn't take your candy makes you stronger",
      description: '+0.5/+0.75/+1 mult per event survived',
    },
    JOKER_EFFECT_FACTORIES[65]
  ),

  // === CANDY-SPECIFIC ===
  makeJoker(
    {
      id: 70,
      name: 'Mint Condition',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Small but mighty',
      description: '+1/+1.5/+2 mult on small candy',
    },
    JOKER_EFFECT_FACTORIES[70]
  ),

  makeJoker(
    {
      id: 71,
      name: 'King Size',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Go big or go home',
      description: '+1/+1.5/+2 mult on big candy',
    },
    JOKER_EFFECT_FACTORIES[71]
  ),

  makeJoker(
    {
      id: 72,
      name: 'Medium Rare',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'A venti means 20 ounces',
      description: '+1/+1.5/+2 mult on medium candy',
    },
    JOKER_EFFECT_FACTORIES[72]
  ),

  makeJoker(
    {
      id: 73,
      name: 'Clearance Sale',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Every loss is an investment in future gains',
      description: '+10%/+15%/+20% permanent mult per loss sale',
    },
    JOKER_EFFECT_FACTORIES[73]
  ),

  // === ECONOMY ===
  makeJoker(
    {
      id: 74,
      name: 'Piggy Bank Pro',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Your piggy bank went to business school',
      description: '15%/20%/25% daily stash interest',
    },
    JOKER_EFFECT_FACTORIES[74]
  ),

  makeJoker(
    {
      id: 75,
      name: 'Market Crash',
      type: 'one-time',
      maxLevel: 3,
      flavorText: 'Buy the dip!',
      description: 'All prices x0.5/x0.4/x0.3 for 1 period',
    },
    JOKER_EFFECT_FACTORIES[75]
  ),

  makeJoker(
    {
      id: 76,
      name: 'Inflation',
      type: 'one-time',
      maxLevel: 3,
      flavorText: 'Everything costs more, but sells for more too',
      description: 'All prices x2/x3/x4 for 1 period',
    },
    JOKER_EFFECT_FACTORIES[76]
  ),

  // === SOCIAL/EVENT ===
  makeJoker(
    {
      id: 77,
      name: 'Lucky Charm',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Fortune favors the prepared',
      description: '3x/4x/5x found money multiplier',
    },
    JOKER_EFFECT_FACTORIES[77]
  ),

  makeJoker(
    {
      id: 78,
      name: 'Bully Bait',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Turn their threats into your treats',
      description: 'Convert bully events to +$500/+$1k/+$2k cash',
    },
    JOKER_EFFECT_FACTORIES[78]
  ),

  makeJoker(
    {
      id: 79,
      name: "Teacher's Pet",
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Bring an apple, hear the gossip',
      description: 'See next-period price arrow on 1/2/3 candies (biggest movers)',
    },
    JOKER_EFFECT_FACTORIES[79]
  ),

  makeJoker(
    {
      id: 80,
      name: 'Class Clown',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Fresh crowds love fresh jokes',
      description: '+10%/+25%/+50% profit when this period’s location is new (not last period’s)',
    },
    JOKER_EFFECT_FACTORIES[80]
  ),

  makeJoker(
    {
      id: 81,
      name: 'Detention Dodge',
      type: 'one-time',
      maxLevel: 1,
      flavorText: "Can't catch me if I'm not here",
      description: 'Event immunity for 1 day',
    },
    JOKER_EFFECT_FACTORIES[81]
  ),

  // === COMBO/META ===
  makeJoker(
    {
      id: 82,
      name: 'Collector',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Gotta catch em all',
      description: '+0.3/+0.5/+0.7 mult per unique joker owned',
    },
    JOKER_EFFECT_FACTORIES[82]
  ),

  makeJoker(
    {
      id: 83,
      name: 'Minimalist',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Less is more... way more',
      description: '+2/+4/+7 mult if exactly 3 jokers owned',
    },
    JOKER_EFFECT_FACTORIES[83]
  ),

  makeJoker(
    {
      id: 84,
      name: 'Lucky 7',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Seven is the magic number',
      description: '+6/+9/+14 mult if selling exactly 7 candy',
    },
    JOKER_EFFECT_FACTORIES[84]
  ),

  makeJoker(
    {
      id: 85,
      name: 'Night Owl',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'The best deals happen after dark',
      description: '+2/+3/+4 mult in last period of day',
    },
    JOKER_EFFECT_FACTORIES[85]
  ),

  makeJoker(
    {
      id: 86,
      name: 'Penny Pincher',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'A penny saved is a penny earned twice',
      description: '10%/15%/20% of stash to allowance, min $50/$100/$200 cash',
    },
    JOKER_EFFECT_FACTORIES[86]
  ),

  makeJoker(
    {
      id: 87,
      name: 'Tax Collector',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Uncle Sam wants his cut... and so do you',
      description: '5%/8%/12% of sale as bonus cash',
    },
    JOKER_EFFECT_FACTORIES[87]
  ),

  makeJoker(
    {
      id: 88,
      name: 'Last Stand',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'When all hope seems lost, profits soar',
      description: '+9/+14/+19 mult if selling < 5 candy',
    },
    JOKER_EFFECT_FACTORIES[88]
  ),

  makeJoker(
    {
      id: 89,
      name: 'Momentum',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Keep the sales rolling',
      description: '+30%/+50%/+80% profit per consecutive sale period',
    },
    JOKER_EFFECT_FACTORIES[89]
  ),

  makeJoker(
    {
      id: 90,
      name: 'Diversifier',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Never put all your candy in one basket',
      description: '+1/+2/+3 mult when selling 3+ types same period',
    },
    JOKER_EFFECT_FACTORIES[90]
  ),

  makeJoker(
    {
      id: 91,
      name: 'Peak Hours',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Timing is everything in this business',
      description: '+100%/+200%/+300% profit during periods 3-5',
    },
    JOKER_EFFECT_FACTORIES[91]
  ),

  makeJoker(
    {
      id: 92,
      name: 'Patience Pays',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Good things come to those who wait',
      description: '+0.5/+0.75/+1 mult when no sale previous period',
    },
    JOKER_EFFECT_FACTORIES[92]
  ),

  makeJoker(
    {
      id: 93,
      name: 'Spare Change',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Empty pockets still jingle',
      description: '$5/$10/$20 cash per empty inventory per period',
    },
    JOKER_EFFECT_FACTORIES[93]
  ),

  // === UTILITY ===
  makeJoker(
    {
      id: 94,
      name: 'Deep Freeze',
      type: 'persistent',
      maxLevel: 1,
      flavorText: 'Keep it cool, keep it fresh',
      description: 'Candy never melts',
    },
    JOKER_EFFECT_FACTORIES[94]
  ),

  // === SCALING ===
  makeJoker(
    {
      id: 95,
      name: 'Hoarder',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Full bags, full pockets',
      description: '+0.3/+0.5/+0.8 mult per time inventory hit max',
    },
    JOKER_EFFECT_FACTORIES[95]
  ),

  makeJoker(
    {
      id: 96,
      name: 'Penny Wise',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'Save a penny, earn a dollar',
      description: '+15%/+25%/+40% profit per time money was stashed',
    },
    JOKER_EFFECT_FACTORIES[96]
  ),

  makeJoker(
    {
      id: 97,
      name: 'Survivor',
      type: 'persistent',
      maxLevel: 3,
      flavorText: 'What melts away makes you stronger',
      description: '+0.5/+0.75/+1 mult per candy batch melted',
    },
    JOKER_EFFECT_FACTORIES[97]
  ),
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
