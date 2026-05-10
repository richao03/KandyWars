import { STANDARDIZED_JOKERS, StandardizedJoker } from '../../src/utils/jokerEffectEngine';
import { CandyTypeName, CandySize } from '../../src/types/candy';
import { SimJoker, SimState } from './simState';

export type PickPolicy = 'random' | 'synergy' | 'best';

export function unownedJokers(owned: SimJoker[]): StandardizedJoker[] {
  const ownedIds = new Set(owned.map((j) => j.id));
  return STANDARDIZED_JOKERS.filter((j) => !ownedIds.has(j.id));
}

export function drawJokerOffer(state: SimState, count: number): StandardizedJoker[] {
  const pool = unownedJokers(state.jokers);
  if (pool.length === 0) return [];
  const n = Math.min(count, pool.length);
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

// Heavily bias toward the canonical "+profit" and "+mult" buckets used by the
// sale calculator. These are the Balatro-style jokers that compound on every
// trade. Conditional and side-effect jokers get a fraction of the score so
// the bot doesn't pick them over a Cocoa Futures or King Size.
export function scoreJoker(jokerId: number): number {
  const joker = STANDARDIZED_JOKERS.find((j) => j.id === jokerId);
  if (!joker) return 0;
  return scoreStatic(joker);
}

function scoreStatic(joker: StandardizedJoker): number {
  let score = 0;
  for (const e of joker.effects) {
    const a = Math.abs(e.amount);
    switch (e.target) {
      // === Core profit-bucket jokers (additive % to base profit) ===
      case 'sell_flat_bonus':
      case 'type_multiplier':
        score += a * 100;
        break;
      // === Core multiplier-bucket jokers ===
      case 'sell_multiplier':
      case 'size_multiplier':
        score += a * 100;
        break;
      // === Conditional multiplier (Even Stevens, Golden Hour) — easy enough to fire ===
      case 'conditional_multiplier':
      case 'conditional_profit_boost':
        score += a * 30;
        break;
      // === Specialty boosts (most fire occasionally) ===
      case 'flip_artist_boost':
      case 'combo_platter_boost':
      case 'triple_threat_boost':
      case 'variety_pack_boost':
      case 'variety_pack_profit_boost':
      case 'bulk_sale_boost':
      case 'first_sale_boost':
      case 'first_sale_profit_boost':
      case 'peak_hours_boost':
      case 'peak_hours_profit_boost':
      case 'momentum_boost':
      case 'momentum_profit_boost':
      case 'all_in_boost':
      case 'last_stand_boost':
      case 'tax_collector_boost':
      case 'night_owl_boost':
      case 'lucky_seven_boost':
      case 'patience_pays_boost':
      case 'cash_under_boost':
      case 'cash_under_profit_boost':
      case 'street_smarts_boost':
      case 'compound_interest_boost':
      case 'compound_interest_profit_boost':
      case 'reputation_profit_boost':
      case 'glass_cannon_boost':
      case 'contraband_boost':
      case 'clearance_sale_boost':
      case 'collector_boost':
      case 'minimalist_boost':
      case 'diversifier_boost':
      case 'class_clown_boost' as any:
      case 'location_change_boost':
        score += a * 10;
        break;
      // === Economy/utility jokers (less directly impactful per trade) ===
      case 'allowance_multiplier':
        score += Math.abs(e.amount - 1) * 5;
        break;
      case 'allowance_add':
        score += Math.min(100, a) * 0.5;
        break;
      case 'stash_interest':
        score += Math.abs(e.amount - 1) * 15;
        break;
      case 'inventory_limit':
        score += a * 1;
        break;
      case 'money':
        score += Math.min(500, a) * 0.05;
        break;
      case 'money_protection':
      case 'stash_protection':
      case 'event_immunity':
        score += 5;
        break;
      default:
        score += 1;
    }
  }
  return score;
}

function synergyBonus(
  joker: StandardizedJoker,
  ownedTypes: Set<CandyTypeName>,
  ownedSizes: Set<CandySize>,
): number {
  let bonus = 0;
  for (const e of joker.effects) {
    const cType = e.conditions?.candyType;
    const cSize = e.conditions?.candySize;
    if (cType && ownedTypes.has(cType)) bonus += 2;
    if (cSize && ownedSizes.has(cSize)) bonus += 2;
  }
  return bonus;
}

export function pickJoker(
  state: SimState,
  offered: StandardizedJoker[],
  policy: PickPolicy,
  recentCandyTypes: Set<CandyTypeName>,
  recentCandySizes: Set<CandySize>,
): StandardizedJoker | null {
  if (offered.length === 0) return null;
  if (policy === 'random') {
    return offered[Math.floor(state.rng() * offered.length)];
  }
  const scored = offered.map((j) => ({
    joker: j,
    score:
      scoreStatic(j) +
      (policy === 'synergy' ? synergyBonus(j, recentCandyTypes, recentCandySizes) : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].joker;
}

export function rollMinigameOutcome(
  state: SimState,
  winRate: number,
): { won: boolean; completionLevel: number } {
  if (state.rng() >= winRate) return { won: false, completionLevel: 0 };
  const r = state.rng();
  let completionLevel: number;
  if (r < 0.3) completionLevel = 1;
  else if (r < 0.8) completionLevel = 2;
  else completionLevel = 3;
  return { won: true, completionLevel };
}
