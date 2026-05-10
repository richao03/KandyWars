import seedrandom from 'seedrandom';
import { CANDY_REGISTRY } from '../../src/constants/candyRegistry';

export const ADOPTION_FEES: Record<number, number> = {
  1: 5000,
  2: 12000,
  3: 25000,
  4: 50000,
  5: 100000,
  6: 175000,
  7: 300000,
  8: 500000,
  9: 750000,
  10: 1000000,
  11: 1500000,
  12: 2500000,
  13: 3500000,
  14: 5000000,
  15: 7500000,
  16: 10000000,
};

export const PERIODS_PER_DAY = 8;
export const TOTAL_DAYS = 5;
export const TOTAL_PERIODS = PERIODS_PER_DAY * TOTAL_DAYS;
export const MEDIUM_UNLOCK_FEE = 5;
export const BIG_UNLOCK_FEE = 50;

export interface InventoryItem {
  candy: string;
  qty: number;
  avgCost: number;
  purchasedAtPeriod: number;
}

export const INVENTORY_UNIT_LIMIT = 500;
export const MIN_HOLD_PERIODS = 0;

export interface SimJoker {
  id: number;
  level: number;
}

export interface TrajectoryPoint {
  period: number;
  day: number;
  balance: number;
  stash: number;
  inventoryValue: number;
  netWorth: number;
  jokersHeld: number;
  confiscated?: number;
  cap?: number;
}

export interface SimState {
  rng: seedrandom.PRNG;
  seed: string;
  difficultyLevel: number;
  adoptionFee: number;

  day: number;
  period: number;

  balance: number;
  stash: number;
  inventory: InventoryItem[];
  jokers: SimJoker[];

  mediumUnlocked: boolean;
  bigUnlocked: boolean;

  priceHistory: Record<string, number[]>;
  trajectory: TrajectoryPoint[];

  consecutivePeriodSales: number;
  totalCandiesSold: number;
  soldThisPeriod: boolean;

  done: boolean;
  paidOff?: boolean;
  finalNetWorth?: number;
}

export function adoptionFeeForLevel(level: number): number {
  return ADOPTION_FEES[level] ?? 5000;
}

export function createInitialState(opts: { difficultyLevel: number; seed: string }): SimState {
  const adoptionFee = adoptionFeeForLevel(opts.difficultyLevel);
  return {
    rng: seedrandom(opts.seed + '-bot'),
    seed: opts.seed,
    difficultyLevel: opts.difficultyLevel,
    adoptionFee,
    day: 1,
    period: 1,
    balance: 20,
    stash: -adoptionFee,
    inventory: [],
    jokers: [],
    mediumUnlocked: false,
    bigUnlocked: false,
    priceHistory: Object.fromEntries(CANDY_REGISTRY.map((c) => [c.name, [] as number[]])),
    trajectory: [],
    consecutivePeriodSales: 0,
    totalCandiesSold: 0,
    soldThisPeriod: false,
    done: false,
  };
}

export function inventoryValue(state: SimState, currentPrices: Record<string, number>): number {
  return state.inventory.reduce((sum, item) => {
    const price = currentPrices[item.candy] ?? 0;
    return sum + price * item.qty;
  }, 0);
}

export function netWorth(state: SimState, currentPrices: Record<string, number>): number {
  return state.balance + state.stash + inventoryValue(state, currentPrices);
}

export function recordTrajectory(
  state: SimState,
  currentPrices: Record<string, number>,
  extra?: { confiscated?: number; cap?: number },
): void {
  const invValue = inventoryValue(state, currentPrices);
  state.trajectory.push({
    period: state.period,
    day: state.day,
    balance: state.balance,
    stash: state.stash,
    inventoryValue: invValue,
    netWorth: state.balance + state.stash + invValue,
    jokersHeld: state.jokers.length,
    confiscated: extra?.confiscated,
    cap: extra?.cap,
  });
}

export function rollingAvg(state: SimState, candy: string, n = 3): number | null {
  const history = state.priceHistory[candy];
  if (!history || history.length === 0) return null;
  const slice = history.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function recordPrice(state: SimState, candy: string, price: number): void {
  if (!state.priceHistory[candy]) state.priceHistory[candy] = [];
  state.priceHistory[candy].push(price);
}

export function dayFromPeriod(period: number): number {
  return Math.floor((period - 1) / PERIODS_PER_DAY) + 1;
}

export function isFirstPeriodOfDay(period: number): boolean {
  return (period - 1) % PERIODS_PER_DAY === 0;
}

export function isLastPeriodOfDay(period: number): boolean {
  return period % PERIODS_PER_DAY === 0;
}
