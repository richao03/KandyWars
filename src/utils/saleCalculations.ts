import { JOKER_IDS, hasJokerById, findJokerById } from '../constants/jokerIds';
import { getCandyDefinition } from '../constants/candyRegistry';
import { CandyTypeName, CandySize } from '../types/candy';
import { MerchantUtils } from './merchantUtils';
import { getJokerEffectsAtLevel } from './jokerEffectEngine';

interface SaleCalculationParams {
  candyName: string;
  basePrice: number;
  purchasePrice: number;
  quantity: number;
  jokers: any[];
  periodCount: number;
  inventoryLimit: number;
  activeEffects: any[];
  hallPassModifiers?: {
    salePriceBonusPercent: number;
  };
  merchantEffects: any[];
  consecutivePeriodSales: number;
  totalCandiesSold: number;
  hasEarlySaleToday: boolean;
  initialMultiplier?: number;
  currentCash?: number;
  inventoryCount?: number;
  day?: number;
  uniqueLocationsToday?: number;
  period?: number;
  periodsPerDay?: number;
}

interface SaleCalculationResult {
  totalGain: number;
  profitPerUnit: number;
  totalProfit: number;
  purchaseValue: number;
  hallPassBonus: number;
  jokerMultiplier: number;
  vacuumSealerPenalty: number;
  bonusBreakdown: Array<{
    emoji: string;
    name: string;
    multiplier: number;
    flatBonus?: number;
  }>;
}

export function calculateSaleTotal(params: SaleCalculationParams): SaleCalculationResult {
  const {
    candyName,
    basePrice,
    purchasePrice,
    quantity,
    jokers,
    periodCount,
    inventoryLimit,
    activeEffects,
    hallPassModifiers,
    merchantEffects,
    consecutivePeriodSales,
    totalCandiesSold,
    hasEarlySaleToday,
    initialMultiplier = 1,
    currentCash = 0,
    inventoryCount = 0,
    day = 1,
    uniqueLocationsToday = 0,
    period = 1,
    periodsPerDay = 8,
  } = params;

  const bonusBreakdown: Array<{
    emoji: string;
    name: string;
    multiplier: number;
    flatBonus?: number;
  }> = [];

  // Look up candy definition for type/size
  const candyDef = getCandyDefinition(candyName);
  const candyTypes: CandyTypeName[] = candyDef?.types ?? [];
  const candySize: CandySize | undefined = candyDef?.size;

  // === STEP 1: Calculate base profit ===
  const profitPerUnit = Math.max(0, basePrice - purchasePrice);
  const totalProfit = profitPerUnit * quantity;

  // === STEP 2: Collect flat bonuses (additive % of base profit) ===
  let flatBonusPercent = 0;

  // Influencer Shoutout merchant item (+200% profit as flat bonus)
  if (MerchantUtils.hasInfluencerShoutout(merchantEffects)) {
    flatBonusPercent += 2.0; // +200%
    bonusBreakdown.push({ emoji: '📣', name: 'Influencer Shoutout', multiplier: 1, flatBonus: totalProfit * 2.0 });
  }

  // Collect flat bonus jokers (sell_flat_bonus and new dynamic bonus types)
  for (const joker of jokers) {
    const jokerId = typeof joker.id === 'string' ? parseInt(joker.id) : joker.id;
    const level = joker.level ?? 1;
    const effects = getJokerEffectsAtLevel(jokerId, level);

    for (const effect of effects) {
      if (effect.target === 'sell_flat_bonus' && effect.operation === 'add') {
        flatBonusPercent += effect.amount;
        const name = _getJokerName(jokerId);
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name,
          multiplier: 1,
          flatBonus: totalProfit * effect.amount,
        });
      }

      // Overclock: +X% per candy in inventory
      if (effect.target === 'inventory_count_bonus' && effect.operation === 'add') {
        const bonus = effect.amount * inventoryCount;
        if (bonus > 0) {
          flatBonusPercent += bonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1,
            flatBonus: totalProfit * bonus,
          });
        }
      }

      // Art Auction: +X% per day elapsed
      if (effect.target === 'day_scaling_bonus' && effect.operation === 'add') {
        const bonus = effect.amount * day;
        if (bonus > 0) {
          flatBonusPercent += bonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1,
            flatBonus: totalProfit * bonus,
          });
        }
      }

      // Hopscotch Bonus: +X% per unique location visited today
      if (effect.target === 'location_diversity_bonus' && effect.operation === 'add') {
        const bonus = effect.amount * uniqueLocationsToday;
        if (bonus > 0) {
          flatBonusPercent += bonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1,
            flatBonus: totalProfit * bonus,
          });
        }
      }

      // Golden Hour: bonus only in last 2 periods of the day
      if (effect.target === 'late_period_bonus' && effect.operation === 'add') {
        if (period >= periodsPerDay - 1) {
          flatBonusPercent += effect.amount;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1,
            flatBonus: totalProfit * effect.amount,
          });
        }
      }
    }
  }

  // Swingset Momentum: +X% per consecutive period sale
  if (hasJokerById(jokers, JOKER_IDS.SWINGSET_MOMENTUM) && consecutivePeriodSales > 1) {
    const j = findJokerById(jokers, JOKER_IDS.SWINGSET_MOMENTUM);
    const level = j && 'level' in j ? (j as any).level ?? 1 : 1;
    const bonusPerStreak = level === 1 ? 0.10 : level === 2 ? 0.20 : 0.30;
    const swingsetBonus = (consecutivePeriodSales - 1) * bonusPerStreak;
    flatBonusPercent += swingsetBonus;
    bonusBreakdown.push({
      emoji: '⛹️',
      name: 'Swingset',
      multiplier: 1,
      flatBonus: totalProfit * swingsetBonus,
    });
  }

  // Hall Pass bonus (flat bonus on profit)
  const hallPassSaleBonusPercent = hallPassModifiers?.salePriceBonusPercent ?? 0;
  const hallPassProfitBonus =
    hallPassSaleBonusPercent > 0 ? totalProfit * ((hallPassSaleBonusPercent * 5) / 100) : 0;

  if (hallPassProfitBonus > 0) {
    bonusBreakdown.push({
      emoji: '🎖️',
      name: 'Hall Pass',
      multiplier: 1,
      flatBonus: hallPassProfitBonus,
    });
  }

  const flatBonusAmount = totalProfit * flatBonusPercent + hallPassProfitBonus;

  // === STEP 3: Collect multipliers (multiplicative) ===
  let productOfMultipliers = initialMultiplier;

  // Type multipliers — fire for EACH matching type on the candy
  for (const joker of jokers) {
    const jokerId = typeof joker.id === 'string' ? parseInt(joker.id) : joker.id;
    const level = joker.level ?? 1;
    const effects = getJokerEffectsAtLevel(jokerId, level);

    for (const effect of effects) {
      if (effect.target === 'type_multiplier' && effect.conditions?.candyType) {
        if (candyTypes.includes(effect.conditions.candyType)) {
          productOfMultipliers *= effect.amount;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      if (effect.target === 'size_multiplier' && effect.conditions?.candySize) {
        if (candySize === effect.conditions.candySize) {
          productOfMultipliers *= effect.amount;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      if (effect.target === 'conditional_multiplier') {
        let conditionMet = false;

        if (effect.conditions?.inventoryParity === 'even' && inventoryLimit % 2 === 0) {
          conditionMet = true;
        }
        if (effect.conditions?.inventoryParity === 'odd' && inventoryLimit % 2 === 1) {
          conditionMet = true;
        }
        if (effect.conditions?.cashEndsWith === '.00') {
          const cashStr = currentCash.toFixed(2);
          if (cashStr.endsWith('.00')) {
            conditionMet = true;
          }
        }

        if (conditionMet) {
          productOfMultipliers *= effect.amount;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Next sale multiplier (Pursuasion) — one-time
      if (effect.target === 'next_sale_multiplier') {
        productOfMultipliers *= effect.amount;
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name: _getJokerName(jokerId),
          multiplier: effect.amount,
        });
      }
    }
  }

  // === STEP 4: Apply Vacuum Sealer penalty ===
  let vacuumSealerPenalty = 1;
  if (hasJokerById(jokers, JOKER_IDS.VACUUM_SEALER)) {
    // -2 to final multiplier (min 1x — always get at least base profit)
    productOfMultipliers = Math.max(1, productOfMultipliers - 2);
    vacuumSealerPenalty = 0; // marker for display
    bonusBreakdown.push({
      emoji: '📦',
      name: 'Vacuum Sealer',
      multiplier: -2,
    });
  }

  // === STEP 5: Calculate final profit ===
  // finalProfit = (baseProfit + flatBonuses) × productOfAllMultipliers
  const profitWithBonuses = totalProfit + flatBonusAmount;
  const finalProfit = profitWithBonuses * productOfMultipliers;
  const purchaseValue = purchasePrice * quantity;
  const totalGain = purchaseValue + finalProfit;

  return {
    totalGain,
    profitPerUnit,
    totalProfit,
    purchaseValue,
    hallPassBonus: hallPassProfitBonus,
    jokerMultiplier: productOfMultipliers,
    vacuumSealerPenalty,
    bonusBreakdown,
  };
}

// Emoji mapping for joker IDs
function _getJokerEmoji(id: number): string {
  const emojiMap: Record<number, string> = {
    [JOKER_IDS.MEDIAN_FORMULA]: '📐',
    [JOKER_IDS.MICRO_CHIP]: '🔬',
    [JOKER_IDS.SUPER_SIZE_ME]: '🍔',
    [JOKER_IDS.COCOA_FUTURES]: '🍫',
    [JOKER_IDS.BEAR_MARKET]: '🐻',
    [JOKER_IDS.HARD_KNOCKS]: '💎',
    [JOKER_IDS.SOUR_LOGIC]: '🍋',
    [JOKER_IDS.DOUBLE_DUTCH]: '🪢',
    [JOKER_IDS.TROPICAL_IMPORT]: '🍍',
    [JOKER_IDS.EVEN_STEVENS]: '⚖️',
    [JOKER_IDS.ODD_TODD]: '🎭',
    [JOKER_IDS.PERFECT_CHANGE]: '💰',
    [JOKER_IDS.OVERCLOCK]: '⚡',
    [JOKER_IDS.ART_AUCTION]: '🎨',
    [JOKER_IDS.HOPSCOTCH_BONUS]: '🏃',
    [JOKER_IDS.GOLDEN_HOUR]: '🌅',
    [JOKER_IDS.SWINGSET_MOMENTUM]: '⛹️',
    [JOKER_IDS.PURSUASION]: '🗣️',
    [JOKER_IDS.VACUUM_SEALER]: '📦',
  };
  return emojiMap[id] || '🃏';
}

function _getJokerName(id: number): string {
  const nameMap: Record<number, string> = {
    [JOKER_IDS.MEDIAN_FORMULA]: 'Median Formula',
    [JOKER_IDS.MICRO_CHIP]: 'Micro Chip',
    [JOKER_IDS.SUPER_SIZE_ME]: 'Super Size Me',
    [JOKER_IDS.COCOA_FUTURES]: 'Cocoa Futures',
    [JOKER_IDS.BEAR_MARKET]: 'Bear Market',
    [JOKER_IDS.HARD_KNOCKS]: 'Hard Knocks',
    [JOKER_IDS.SOUR_LOGIC]: 'Sour Logic',
    [JOKER_IDS.DOUBLE_DUTCH]: 'Double Dutch',
    [JOKER_IDS.TROPICAL_IMPORT]: 'Tropical Import',
    [JOKER_IDS.EVEN_STEVENS]: 'Even Stevens',
    [JOKER_IDS.ODD_TODD]: 'Odd Todd',
    [JOKER_IDS.PERFECT_CHANGE]: 'Perfect Change',
    [JOKER_IDS.OVERCLOCK]: 'Overclock',
    [JOKER_IDS.ART_AUCTION]: 'Art Auction',
    [JOKER_IDS.HOPSCOTCH_BONUS]: 'Hopscotch Bonus',
    [JOKER_IDS.GOLDEN_HOUR]: 'Golden Hour',
    [JOKER_IDS.SWINGSET_MOMENTUM]: 'Swingset',
    [JOKER_IDS.PURSUASION]: 'Pursuasion',
    [JOKER_IDS.VACUUM_SEALER]: 'Vacuum Sealer',
  };
  return nameMap[id] || 'Joker';
}
