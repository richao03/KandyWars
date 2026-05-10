import { CANDY_REGISTRY, getCandyDefinition } from '../../src/constants/candyRegistry';
import { CandyTypeName, CandySize } from '../../src/types/candy';
import { getJokerEffectsAtLevel } from '../../src/utils/jokerEffectEngine';
import { SimState, rollingAvg, INVENTORY_UNIT_LIMIT, MIN_HOLD_PERIODS } from './simState';

export const SELL_THRESHOLD = 1.0;
export const BUY_THRESHOLD = 1.0;
export const BUY_BUDGET_PCT = 0.95;
export const MIN_BALANCE_RESERVE = 5;
export const BOT_JOKER_EFFICIENCY = 1.0;
// Wallet to retain after end-of-day stash. Mirrors observed player behavior:
// stash hard, keep wallet small so LOSE_MONEY events take a fixed-ish loss.
export const END_OF_DAY_WALLET_TARGET = 200;

export interface BotConfig {
  sellThreshold: number;
  buyThreshold: number;
  buyBudgetPct: number;
  minBalanceReserve: number;
  jokerEfficiency: number;
}

export const DEFAULT_BOT_CONFIG: BotConfig = {
  sellThreshold: SELL_THRESHOLD,
  buyThreshold: BUY_THRESHOLD,
  buyBudgetPct: BUY_BUDGET_PCT,
  minBalanceReserve: MIN_BALANCE_RESERVE,
  jokerEfficiency: BOT_JOKER_EFFICIENCY,
};

/**
 * Simplified joker-aware sale value calculation. Captures the dominant effects
 * (type/size/generic profit boost and multiplier) from `sell_flat_bonus`,
 * `type_multiplier`, `sell_multiplier`, `size_multiplier`. Skips conditional
 * jokers (Underdog, Patience Pays, etc.) — v1 limitation. Uses the canonical
 * Balatro-style formula: total × (1 + boost) × (1 + mult).
 */
export function simSaleValue(opts: {
  candyName: string;
  currentPrice: number;
  purchasePrice: number;
  quantity: number;
  jokers: { id: number; level: number }[];
  jokerEfficiency?: number;
}): { totalGain: number; profit: number } {
  const candy = getCandyDefinition(opts.candyName);
  if (!candy) return { totalGain: opts.currentPrice * opts.quantity, profit: 0 };

  const grossProfit = Math.max(0, (opts.currentPrice - opts.purchasePrice) * opts.quantity);
  const purchaseValue = opts.purchasePrice * opts.quantity;
  const efficiency = opts.jokerEfficiency ?? BOT_JOKER_EFFICIENCY;

  let boostBucket = 0;
  let multBucket = 0;

  // Boost-bucket targets — additive % to base profit. Type and direct flat
  // bonuses fire deterministically when conditions match; specialty boosts
  // fire opportunistically (averaged over a run), so we apply at ~50%.
  const boostTargets = new Set([
    'sell_flat_bonus',
    'type_multiplier',
    'flip_artist_boost',
    'combo_platter_boost',
    'triple_threat_boost',
    'variety_pack_boost',
    'variety_pack_profit_boost',
    'bulk_sale_boost',
    'first_sale_boost',
    'first_sale_profit_boost',
    'peak_hours_boost',
    'peak_hours_profit_boost',
    'momentum_boost',
    'momentum_profit_boost',
    'all_in_boost',
    'last_stand_boost',
    'tax_collector_boost',
    'night_owl_boost',
    'lucky_seven_boost',
    'patience_pays_boost',
    'cash_under_boost',
    'cash_under_profit_boost',
    'street_smarts_boost',
    'compound_interest_boost',
    'compound_interest_profit_boost',
    'reputation_profit_boost',
    'glass_cannon_boost',
    'contraband_boost',
    'clearance_sale_boost',
    'collector_boost',
    'minimalist_boost',
    'diversifier_boost',
    'location_change_boost',
    'conditional_profit_boost',
    'hoarder_boost',
    'penny_wise_boost',
    'survivor_boost',
  ]);
  // Targets that are deterministic when type/size matches
  const directTargets = new Set(['sell_flat_bonus', 'type_multiplier']);
  const directMultTargets = new Set(['sell_multiplier', 'size_multiplier']);
  const SPECIALTY_FIRE_RATE = 0.75;

  for (const j of opts.jokers) {
    const effects = getJokerEffectsAtLevel(j.id, j.level);
    for (const e of effects) {
      if (e.operation !== 'add') continue;
      const cType = e.conditions?.candyType;
      const cSize = e.conditions?.candySize;
      if (cType && !candy.types.includes(cType as CandyTypeName)) continue;
      if (cSize && cSize !== (candy.size as CandySize)) continue;

      if (directTargets.has(e.target)) {
        boostBucket += e.amount;
      } else if (directMultTargets.has(e.target)) {
        multBucket += e.amount;
      } else if (e.target === 'conditional_multiplier') {
        multBucket += e.amount * SPECIALTY_FIRE_RATE;
      } else if (boostTargets.has(e.target)) {
        boostBucket += e.amount * SPECIALTY_FIRE_RATE;
      }
    }
  }

  // Apply efficiency factor to capture "missed opportunities" — real players
  // don't realize 100% of theoretical joker stack because of timing, conditions,
  // and the v1 sim ignoring conditional jokers. Tuned via smoke tests.
  const finalProfit = grossProfit * (1 + boostBucket * efficiency) * (1 + multBucket * efficiency);
  const totalGain = purchaseValue + finalProfit;
  return { totalGain, profit: finalProfit };
}

interface SellAction {
  candy: string;
  qty: number;
  pricePerUnit: number;
  proceeds: number;
}

interface BuyAction {
  candy: string;
  qty: number;
  pricePerUnit: number;
  cost: number;
}

export function decideSells(state: SimState, currentPrices: Record<string, number>, cfg: BotConfig): SellAction[] {
  const sells: SellAction[] = [];
  for (const item of state.inventory) {
    if (item.qty <= 0) continue;
    const heldFor = state.period - item.purchasedAtPeriod;
    if (heldFor < MIN_HOLD_PERIODS) continue;
    const price = currentPrices[item.candy];
    if (!price) continue;
    const avg = rollingAvg(state, item.candy, 5);
    const reference = avg ?? price;
    const meaningfulProfit = price >= item.avgCost * 1.3;
    const aboveAvg = price >= reference * cfg.sellThreshold;
    if (aboveAvg || meaningfulProfit) {
      const value = simSaleValue({
        candyName: item.candy,
        currentPrice: price,
        purchasePrice: item.avgCost,
        quantity: item.qty,
        jokers: state.jokers,
        jokerEfficiency: cfg.jokerEfficiency,
      });
      sells.push({
        candy: item.candy,
        qty: item.qty,
        pricePerUnit: price,
        proceeds: value.totalGain,
      });
    }
  }
  return sells;
}

function unlockedCandies(state: SimState): typeof CANDY_REGISTRY {
  return CANDY_REGISTRY.filter((c) => {
    if (c.size === 'small') return true;
    if (c.size === 'medium') return state.mediumUnlocked;
    if (c.size === 'big') return state.bigUnlocked;
    return false;
  });
}

function totalInventoryUnits(state: SimState): number {
  return state.inventory.reduce((sum, item) => sum + item.qty, 0);
}

export function decideBuys(state: SimState, currentPrices: Record<string, number>, cfg: BotConfig): BuyAction[] {
  const budget = Math.max(0, state.balance * cfg.buyBudgetPct - cfg.minBalanceReserve);
  if (budget <= 0) return [];

  const remainingUnits = INVENTORY_UNIT_LIMIT - totalInventoryUnits(state);
  if (remainingUnits <= 0) return [];

  const candidates: { candy: string; price: number; ratio: number }[] = [];
  for (const candy of unlockedCandies(state)) {
    const price = currentPrices[candy.name];
    if (!price) continue;
    const avg = rollingAvg(state, candy.name, 5);
    const midpoint = (candy.baseMin + candy.baseMax) / 2;
    const reference = avg ?? midpoint;
    if (price <= reference * cfg.buyThreshold) {
      candidates.push({ candy: candy.name, price, ratio: reference / price });
    }
  }

  if (candidates.length === 0) return [];
  candidates.sort((a, b) => b.ratio - a.ratio);

  // Allocate budget across top 3 candidates (parallel positions). Mirrors
  // observed player behavior of juggling multiple candies simultaneously.
  const buys: BuyAction[] = [];
  const picks = candidates.slice(0, Math.min(3, candidates.length));
  const perPickBudget = budget / picks.length;
  let unitsRemaining = remainingUnits;
  for (const pick of picks) {
    if (unitsRemaining <= 0) break;
    const qty = Math.min(Math.floor(perPickBudget / pick.price), unitsRemaining);
    if (qty <= 0) continue;
    buys.push({ candy: pick.candy, qty, pricePerUnit: pick.price, cost: qty * pick.price });
    unitsRemaining -= qty;
  }
  return buys;
}

export function applySells(state: SimState, sells: SellAction[]): number {
  let totalProceeds = 0;
  for (const s of sells) {
    state.balance += s.proceeds;
    state.inventory = state.inventory.filter((i) => i.candy !== s.candy);
    state.totalCandiesSold += s.qty;
    state.soldThisPeriod = true;
    totalProceeds += s.proceeds;
  }
  return totalProceeds;
}

export function applyBuys(state: SimState, buys: BuyAction[]): number {
  let totalCost = 0;
  for (const b of buys) {
    if (state.balance < b.cost) continue;
    state.balance -= b.cost;
    const existing = state.inventory.find((i) => i.candy === b.candy);
    if (existing) {
      const totalQty = existing.qty + b.qty;
      const totalCostBasis = existing.avgCost * existing.qty + b.cost;
      existing.qty = totalQty;
      existing.avgCost = totalCostBasis / totalQty;
      existing.purchasedAtPeriod = state.period;
    } else {
      state.inventory.push({
        candy: b.candy,
        qty: b.qty,
        avgCost: b.pricePerUnit,
        purchasedAtPeriod: state.period,
      });
    }
    totalCost += b.cost;
  }
  return totalCost;
}

export function executePeriodTrades(
  state: SimState,
  currentPrices: Record<string, number>,
  cfg: BotConfig = DEFAULT_BOT_CONFIG,
): { sells: SellAction[]; buys: BuyAction[] } {
  state.soldThisPeriod = false;

  const sells = decideSells(state, currentPrices, cfg);
  applySells(state, sells);

  if (sells.length > 0) state.consecutivePeriodSales++;
  else state.consecutivePeriodSales = 0;

  const buys = decideBuys(state, currentPrices, cfg);
  applyBuys(state, buys);

  return { sells, buys };
}

export function tryUnlockSizes(state: SimState): void {
  if (!state.mediumUnlocked && state.day >= 2 && state.balance >= 5) {
    state.balance -= 5;
    state.mediumUnlocked = true;
  }
  if (!state.bigUnlocked && state.day >= 3 && state.balance >= 50) {
    state.balance -= 50;
    state.bigUnlocked = true;
  }
}

const UPGRADE_COST_L2 = 5000;
const UPGRADE_COST_L3 = 30000;

/**
 * After-minigame upgrade decision. If the bot has cash to spare, upgrade the
 * highest-value owned joker that's not yet maxed. Mirrors observed player
 * behavior of dumping piggy-bank windfalls into joker level-ups.
 */
export function tryUpgradeJokers(state: SimState, scoreFn: (jokerId: number) => number): void {
  // Sort owned jokers by score desc, level asc (prioritize upgrading our best).
  const candidates = state.jokers
    .filter((j) => j.level < 3)
    .map((j) => ({ joker: j, score: scoreFn(j.id) }))
    .sort((a, b) => b.score - a.score);

  for (const { joker } of candidates) {
    const cost = joker.level === 1 ? UPGRADE_COST_L2 : UPGRADE_COST_L3;
    // Keep at least 2× cost in reserve so trading doesn't stall.
    if (state.balance >= cost * 2) {
      state.balance -= cost;
      joker.level += 1;
    }
  }
}

/**
 * End-of-day stash decision. With carry-cap on, bot stashes anything above the
 * predicted next-morning cap (so it isn't confiscated). With carry-cap off, bot
 * stashes a small fraction as basic savings — so adoption fee progresses.
 */
export function decideEndOfDayStash(
  state: SimState,
  carryCapEnabled: boolean,
  predictCap: (s: SimState) => number,
): number {
  if (state.balance <= 0) return 0;
  if (carryCapEnabled) {
    const expectedCap = predictCap(state);
    return Math.max(0, state.balance - expectedCap);
  }
  // Mirror observed player behavior: stash everything except a small float for
  // tomorrow's openers. Bully only takes 50% of WALLET, so keeping wallet
  // small caps the worst-case event loss to ~$100.
  return Math.max(0, state.balance - END_OF_DAY_WALLET_TARGET);
}

export function applyStash(state: SimState, amount: number): number {
  if (amount <= 0) return 0;
  const stashAmount = Math.min(amount, state.balance);
  state.balance -= stashAmount;
  state.stash += stashAmount;
  return stashAmount;
}
