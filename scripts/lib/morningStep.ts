import { JOKER_IDS } from '../../src/constants/jokerIds';
import { getJokerEffectsAtLevel } from '../../src/utils/jokerEffectEngine';
import { SimState } from './simState';

const MAX_DAILY_INTEREST = 5000;
const ALLOWANCE_BASE = 10;
const ALLOWANCE_MULT_CAP = 8;
const CARRY_CAP_CEILING = 100_000;
const CARRY_CAP_BASE_PCT = 0.10;
const CARRY_CAP_DEPOSIT_BONUS_PER_LEVEL = 0.05;
const CARRY_CAP_FLOOR_PCT = 0.02;
const CARRY_CAP_MIN_FLOOR = 20;

export interface CarryCapBreakdown {
  cap: number;
  floor: number;
  basePct: number;
  savings: number;
  depositBonusLevel: number;
  ceilingClamped: boolean;
}

export function computeCarryCap(state: SimState): CarryCapBreakdown {
  const savings = Math.max(0, state.stash + state.adoptionFee);
  const floor = Math.max(CARRY_CAP_MIN_FLOOR, state.adoptionFee * CARRY_CAP_FLOOR_PCT);
  const depositBonus = state.jokers.find((j) => j.id === JOKER_IDS.DEPOSIT_BONUS);
  const depositBonusLevel = depositBonus?.level ?? 0;
  const basePct = CARRY_CAP_BASE_PCT + CARRY_CAP_DEPOSIT_BONUS_PER_LEVEL * depositBonusLevel;
  const rawCap = Math.max(floor, savings * basePct);
  const cap = Math.min(rawCap, CARRY_CAP_CEILING);
  return {
    cap,
    floor,
    basePct,
    savings,
    depositBonusLevel,
    ceilingClamped: rawCap >= CARRY_CAP_CEILING,
  };
}

export interface MorningResult {
  interest: number;
  confiscated: number;
  cap: number | null;
  allowance: number;
  capBreakdown: CarryCapBreakdown | null;
}

function computeStashInterest(state: SimState): number {
  if (state.stash <= 0) return 0;
  let total = 0;
  for (const joker of state.jokers) {
    if (joker.id !== JOKER_IDS.MYSTERIOUS_ARTIFACT && joker.id !== JOKER_IDS.PIGGY_BANK_PRO) continue;
    const effects = getJokerEffectsAtLevel(joker.id, joker.level);
    const interestEffect = effects.find((e) => e.target === 'stash_interest');
    if (!interestEffect) continue;
    const rate = interestEffect.amount - 1;
    const raw = state.stash * rate;
    total += Math.min(raw, MAX_DAILY_INTEREST);
  }
  return Math.min(total, MAX_DAILY_INTEREST * 2);
}

function computeAllowance(state: SimState): number {
  let mult = 1;
  let add = 0;
  for (const joker of state.jokers) {
    const effects = getJokerEffectsAtLevel(joker.id, joker.level);
    for (const e of effects) {
      if (e.target === 'allowance_multiplier' && e.operation === 'multiply') mult *= e.amount;
      if (e.target === 'allowance_add' && e.operation === 'add') add += e.amount;
    }
  }
  mult = Math.min(mult, ALLOWANCE_MULT_CAP);
  return ALLOWANCE_BASE * mult + add;
}

export function applyMorning(state: SimState, opts: { carryCapEnabled: boolean }): MorningResult {
  const interest = computeStashInterest(state);
  if (interest > 0) state.stash += interest;

  let confiscated = 0;
  let cap: number | null = null;
  let capBreakdown: CarryCapBreakdown | null = null;

  if (opts.carryCapEnabled) {
    capBreakdown = computeCarryCap(state);
    cap = capBreakdown.cap;
    if (state.balance > cap) {
      confiscated = state.balance - cap;
      state.balance = cap;
    }
  }

  const allowance = computeAllowance(state);
  state.balance += allowance;

  return { interest, confiscated, cap, allowance, capBreakdown };
}
