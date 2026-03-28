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

  // === STEP 2: Profit Boosts (candy TYPE jokers) ===
  // These directly scale the profit. Additive with each other.
  // e.g. base 1x + Cocoa Futures 0.5 + Bear Market 0.5 = 2x profit
  let profitBoost = 1; // starts at 1x (no boost)

  // Influencer Shoutout merchant item (+200% profit boost)
  if (MerchantUtils.hasInfluencerShoutout(merchantEffects)) {
    profitBoost += 2.0;
    bonusBreakdown.push({ emoji: '📣', name: 'Influencer Shoutout', multiplier: 1, flatBonus: totalProfit * 2.0 });
  }

  // Collect flat bonus jokers (sell_flat_bonus)
  for (const joker of jokers) {
    const jokerId = typeof joker.id === 'string' ? parseInt(joker.id) : joker.id;
    const level = joker.level ?? 1;
    const effects = getJokerEffectsAtLevel(jokerId, level);

    for (const effect of effects) {
      if (effect.target === 'sell_flat_bonus' && effect.operation === 'add') {
        profitBoost += effect.amount;
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name: _getJokerName(jokerId),
          multiplier: 1,
          flatBonus: totalProfit * effect.amount,
        });
      }

      // Type multipliers — profit boosts, fire for EACH matching type
      if (effect.target === 'type_multiplier' && effect.conditions?.candyType) {
        if (candyTypes.includes(effect.conditions.candyType)) {
          profitBoost += (effect.amount - 1); // 1.5x adds 0.5
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
            flatBonus: totalProfit * (effect.amount - 1),
          });
        }
      }

      // Early Bird — first sale of day profit boost
      if (effect.target === 'first_sale_boost') {
        if (hasEarlySaleToday === false) {
          profitBoost += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
            flatBonus: totalProfit * (effect.amount - 1),
          });
        }
      }

      // Bulk Discount — quantity threshold
      if (effect.target === 'bulk_sale_boost' && effect.conditions?.bulkThreshold) {
        if (quantity >= effect.conditions.bulkThreshold) {
          profitBoost += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
            flatBonus: totalProfit * (effect.amount - 1),
          });
        }
      }

      // Underdog / Broke and Hungry — cash below threshold
      if (effect.target === 'cash_under_boost' && effect.conditions?.cashBelow) {
        if (currentCash < effect.conditions.cashBelow) {
          profitBoost += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
            flatBonus: totalProfit * (effect.amount - 1),
          });
        }
      }

      // Penny Pincher — low profit per unit
      if (effect.target === 'low_profit_boost' && effect.conditions?.maxProfitPerUnit) {
        if (profitPerUnit <= effect.conditions.maxProfitPerUnit) {
          profitBoost += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
            flatBonus: totalProfit * (effect.amount - 1),
          });
        }
      }
    }
  }

  // Hall Pass bonus (profit boost)
  const hallPassSaleBonusPercent = hallPassModifiers?.salePriceBonusPercent ?? 0;
  const hallPassProfitBonus =
    hallPassSaleBonusPercent > 0 ? totalProfit * ((hallPassSaleBonusPercent * 5) / 100) : 0;

  if (hallPassProfitBonus > 0) {
    profitBoost += (hallPassSaleBonusPercent * 5) / 100;
    bonusBreakdown.push({
      emoji: '🎖️',
      name: 'Hall Pass',
      multiplier: 1,
      flatBonus: hallPassProfitBonus,
    });
  }

  const boostedProfit = totalProfit * profitBoost;

  // === STEP 3: Multipliers (size, conditional, one-time) ===
  // Size, Even/Odd, Golden Hour stack additively: 1x base + (1.5-1) + (1.5-1) = 2x
  // Pursuasion stacks additively too: 2x adds 1.0
  let multiplier = 1; // starts at 1x (no multiplier)

  for (const joker of jokers) {
    const jokerId = typeof joker.id === 'string' ? parseInt(joker.id) : joker.id;
    const level = joker.level ?? 1;
    const effects = getJokerEffectsAtLevel(jokerId, level);

    for (const effect of effects) {
      // Size multipliers
      if (effect.target === 'size_multiplier' && effect.conditions?.candySize) {
        if (candySize === effect.conditions.candySize) {
          multiplier += (effect.amount - 1); // 1.5x adds 0.5
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Conditional multipliers (Even Stevens, Odd Todd, Golden Hour)
      if (effect.target === 'conditional_multiplier') {
        let conditionMet = false;

        if (effect.conditions?.inventoryParity === 'even' && inventoryLimit % 2 === 0) {
          conditionMet = true;
        }
        if (effect.conditions?.inventoryParity === 'odd' && inventoryLimit % 2 === 1) {
          conditionMet = true;
        }
        // Golden Hour: last 2 periods of the day (period flag = -1)
        if (effect.conditions?.period === -1 && period >= periodsPerDay - 1) {
          conditionMet = true;
        }

        if (conditionMet) {
          multiplier += (effect.amount - 1); // 1.5x adds 0.5
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Pursuasion — one-time, stacks additively with other multipliers
      if (effect.target === 'next_sale_multiplier') {
        multiplier += (effect.amount - 1); // 2x adds 1.0
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name: _getJokerName(jokerId),
          multiplier: effect.amount,
        });
      }
    }
  }

  // === STEP 4: Apply Vacuum Sealer penalty to multiplier ===
  let vacuumSealerPenalty = 1;
  if (hasJokerById(jokers, JOKER_IDS.VACUUM_SEALER)) {
    // -3 to multiplier (min 1x — always get at least base)
    multiplier = Math.max(1, multiplier - 3);
    vacuumSealerPenalty = 0; // marker for display
    bonusBreakdown.push({
      emoji: '📦',
      name: 'Vacuum Sealer',
      multiplier: -3,
    });
  }

  // === STEP 5: Final calculation ===
  // finalProfit = boostedProfit × multiplier
  const finalProfit = boostedProfit * multiplier;
  const purchaseValue = purchasePrice * quantity;
  const totalGain = purchaseValue + finalProfit;

  return {
    totalGain,
    profitPerUnit,
    totalProfit,
    purchaseValue,
    hallPassBonus: hallPassProfitBonus,
    jokerMultiplier: multiplier,
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
    [JOKER_IDS.GOLDEN_HOUR]: '🌅',
    [JOKER_IDS.PURSUASION]: '🗣️',
    [JOKER_IDS.VACUUM_SEALER]: '📦',
    [JOKER_IDS.EARLY_BIRD]: '🌅',
    [JOKER_IDS.BULK_DISCOUNT]: '📦',
    [JOKER_IDS.UNDERDOG]: '💪',
    [JOKER_IDS.PENNY_PINCHER]: '🪙',
    [JOKER_IDS.BROKE_AND_HUNGRY]: '🔥',
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
    [JOKER_IDS.GOLDEN_HOUR]: 'Golden Hour',
    [JOKER_IDS.PURSUASION]: 'Pursuasion',
    [JOKER_IDS.VACUUM_SEALER]: 'Vacuum Sealer',
    [JOKER_IDS.EARLY_BIRD]: 'Early Bird',
    [JOKER_IDS.BULK_DISCOUNT]: 'Bulk Discount',
    [JOKER_IDS.UNDERDOG]: 'Underdog',
    [JOKER_IDS.PENNY_PINCHER]: 'Penny Pincher',
    [JOKER_IDS.BROKE_AND_HUNGRY]: 'Broke and Hungry',
  };
  return nameMap[id] || 'Joker';
}
