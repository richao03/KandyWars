/**
 * Pure tier-detection utility for sale effects.
 *
 * Downstream visual/audio systems (sparks, sounds, haptics) key off the
 * {@link TierLevel} returned from {@link computeEffectTier}. No side effects
 * are performed here — this file only maps inputs to a tier + symbols + palette.
 *
 * Palette values mirror the existing sellValue-tier colors used by
 * `app/components/TransactionModal.tsx` around lines 465–553 so the established
 * visual language ("bronze/green/teal/blue/jackpot blue") is preserved.
 */

/**
 * Discrete celebration tiers, ordered from least to most extravagant.
 * Index order matches {@link TIER_ORDER} — used for `max` comparisons.
 */
export type TierLevel =
  | 'none'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'emerald'
  | 'sapphire'
  | 'jackpot';

/**
 * Inputs used to classify a sale into a tier.
 *
 * All numeric fields are coerced: `NaN` is treated as `0`, and non-finite
 * values are normalized. Downstream consumers may therefore pass raw values
 * without pre-sanitizing.
 */
export interface EffectTierInput {
  /** Final sale amount returned to the player (purchaseValue + profit). */
  totalGain: number;
  /** How much the player originally spent on the candy being sold. */
  purchaseValue: number;
  /** How many jokers contributed bonuses on this sale. */
  jokerBonusCount: number;
  /** Largest single multiplier any one joker contributed (default 1). */
  maxJokerMult: number;
}

/**
 * Classification result — ready to hand to spark/audio subsystems.
 */
export interface EffectTierResult {
  /** The resolved celebration tier. */
  level: TierLevel;
  /** Currency-symbol tokens for the UI to render, in ascending intensity. */
  symbols: string[];
  /** Hex colors for sparks, matching existing SparkEffect tier palettes. */
  palette: string[];
  /** Debug reasons listing every rule that fired for this tier. */
  reasons: string[];
}

/** Canonical tier ordering. The max index across all rules wins. */
const TIER_ORDER: readonly TierLevel[] = [
  'none',
  'bronze',
  'silver',
  'gold',
  'emerald',
  'sapphire',
  'jackpot',
] as const;

/** Map a tier → index so we can compare / take max. */
const tierIndex = (tier: TierLevel): number => TIER_ORDER.indexOf(tier);

/** Pick the higher-rank tier of two. */
const maxTier = (a: TierLevel, b: TierLevel): TierLevel =>
  tierIndex(a) >= tierIndex(b) ? a : b;

/**
 * Symbols per tier. Empty array for `none` (no celebration).
 * Emoji chosen for `jackpot` matches the existing "💎" usage elsewhere in
 * sale celebration UI.
 */
const TIER_SYMBOLS: Record<TierLevel, string[]> = {
  none: [],
  bronze: ['$'],
  silver: ['$'],
  gold: ['$', '$$'],
  emerald: ['$', '$$'],
  sapphire: ['$$', '$$$'],
  jackpot: ['💎', '$$$'],
};

/**
 * Palettes per tier. Colors are lifted from
 * `app/components/TransactionModal.tsx` (see the `sparkColors` block near
 * line 495) so existing spark visuals are unchanged when tiers are aligned
 * via this utility.
 *
 * Mapping between the 7 existing sellValue thresholds and TierLevel:
 *   <500      → bronze   (muted green, the default row)
 *   >=500     → silver   (brighter green "500" row)
 *   >=1000    → gold     (forest green "1000" row)
 *   >=2000    → emerald  (rich green "2000" row)
 *   >=5000    → sapphire intro (teal-green "5000" row)
 *   >=10000/15000 → sapphire (teal "10k/15k" rows)
 *   >=20000   → jackpot  (deep blue "20k" row)
 */
const TIER_PALETTE: Record<TierLevel, string[]> = {
  none: [],
  bronze: ['rgba(123,169,101,1)', '#7ba965', '#6a9a54'],
  silver: ['#5ced00', '#4caf50', '#43a047'],
  gold: ['#4caf50', '#43a047', '#388e3c', '#2e7d32'],
  emerald: ['#3dff88', '#2ecc71', '#27ae60', '#16a085', '#1abc9c', '#20c997'],
  sapphire: [
    '#00cccc',
    '#00e6e6',
    '#00d9ff',
    '#00c3ff',
    '#00b0ff',
    '#009fff',
    '#1e90ff',
    '#4db8ff',
  ],
  jackpot: [
    '#0066ff',
    '#0080ff',
    '#0099ff',
    '#00b3ff',
    '#1e90ff',
    '#4169e1',
    '#5a7fff',
    '#00bfff',
  ],
};

/** Normalize any numeric input — NaN / non-finite → 0. */
const toSafe = (n: number): number => (Number.isFinite(n) ? n : 0);

/**
 * Classify an absolute `totalGain` value into a tier using the documented
 * absolute-gain ladder.
 */
function absoluteTier(totalGain: number): TierLevel {
  if (totalGain <= 0 || totalGain < 100) return 'none';
  if (totalGain < 500) return 'bronze';
  if (totalGain < 1000) return 'silver';
  if (totalGain < 5000) return 'gold';
  if (totalGain < 10000) return 'emerald';
  if (totalGain < 30000) return 'sapphire';
  return 'jackpot';
}

/**
 * Compute the celebration tier for a given sale.
 *
 * The function applies four rules and takes the MAX tier across them:
 *   1. Absolute-gain ladder (primary)
 *   2. Ratio override (totalGain / purchaseValue) — Clover-Pit rule: tiny
 *      purchases turning into decent gains still get celebrated.
 *   3. Combo override — many jokers firing bumps the floor.
 *   4. Crit override — a single huge multiplier bumps the floor.
 *
 * Edge cases:
 *   - `totalGain <= 0` (or NaN) → always `none`.
 *   - `purchaseValue <= 0` → ratio rule is skipped (no divide-by-tiny bump).
 *   - `NaN` in any field → coerced to 0; still returns a valid result.
 *
 * @param input see {@link EffectTierInput}
 * @returns see {@link EffectTierResult}
 */
export function computeEffectTier(input: EffectTierInput): EffectTierResult {
  const totalGain = toSafe(input.totalGain);
  const purchaseValue = toSafe(input.purchaseValue);
  const jokerBonusCount = Math.max(0, Math.floor(toSafe(input.jokerBonusCount)));
  const maxJokerMult = toSafe(input.maxJokerMult);

  // Dead-sale short-circuit: no celebration at all.
  if (totalGain <= 0) {
    return {
      level: 'none',
      symbols: TIER_SYMBOLS.none,
      palette: TIER_PALETTE.none,
      reasons: [],
    };
  }

  const reasons: string[] = [];

  // 1. Absolute.
  const absLevel = absoluteTier(totalGain);
  reasons.push(`abs-${absLevel}`);
  let level: TierLevel = absLevel;

  // 2. Ratio override (skipped when purchaseValue is non-positive).
  if (purchaseValue > 0) {
    const ratio = totalGain / purchaseValue;
    if (ratio >= 20) {
      level = maxTier(level, 'jackpot');
      reasons.push(`ratio-${ratio.toFixed(1)}x`);
    } else if (ratio >= 10) {
      level = maxTier(level, 'sapphire');
      reasons.push(`ratio-${ratio.toFixed(1)}x`);
    }
  }

  // 3. Combo override.
  if (jokerBonusCount >= 7) {
    level = maxTier(level, 'sapphire');
    reasons.push(`combo-${jokerBonusCount}`);
  } else if (jokerBonusCount >= 5) {
    level = maxTier(level, 'emerald');
    reasons.push(`combo-${jokerBonusCount}`);
  } else if (jokerBonusCount >= 3) {
    level = maxTier(level, 'gold');
    reasons.push(`combo-${jokerBonusCount}`);
  }

  // 4. Crit override.
  if (maxJokerMult >= 8) {
    level = maxTier(level, 'jackpot');
    reasons.push(`crit-${maxJokerMult}x`);
  } else if (maxJokerMult >= 5) {
    level = maxTier(level, 'sapphire');
    reasons.push(`crit-${maxJokerMult}x`);
  } else if (maxJokerMult >= 3) {
    level = maxTier(level, 'emerald');
    reasons.push(`crit-${maxJokerMult}x`);
  }

  return {
    level,
    symbols: TIER_SYMBOLS[level],
    palette: TIER_PALETTE[level],
    reasons,
  };
}
