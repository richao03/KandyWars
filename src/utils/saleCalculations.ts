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
  bulkEmpireStacks?: number; // Bulk Empire: number of permanent +0.5x stacks earned
  inventory?: { name: string; quantity: number }[]; // Current inventory for Variety Pack check
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
    bulkEmpireStacks = 0,
    inventory = [],
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
      // 'add' operation adds directly to the multiplier (step 3), 'multiply' adds to profit boost
      if (effect.target === 'type_multiplier' && effect.conditions?.candyType) {
        if (candyTypes.includes(effect.conditions.candyType)) {
          if (effect.operation === 'add') {
            // Deferred to step 3 — adds to multiplier directly
          } else {
            profitBoost += (effect.amount - 1); // 1.5x adds 0.5
            bonusBreakdown.push({
              emoji: _getJokerEmoji(jokerId),
              name: _getJokerName(jokerId),
              multiplier: effect.amount,
              flatBonus: totalProfit * (effect.amount - 1),
            });
          }
        }
      }

      // Bulk Discount — quantity threshold (stays in profit boost)
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
    }
  }

  // Combo Platter — bonus when both candy types are covered by owned type-multiplier jokers
  if (hasJokerById(jokers, JOKER_IDS.COMBO_PLATTER) && candyTypes.length === 2) {
    // Check if each candy type has a matching type_multiplier joker
    const coveredTypes = new Set<string>();
    for (const joker of jokers) {
      const jokerId = typeof joker.id === 'string' ? parseInt(joker.id) : joker.id;
      if (jokerId === JOKER_IDS.COMBO_PLATTER) continue; // don't count self
      const level = joker.level ?? 1;
      const effects = getJokerEffectsAtLevel(jokerId, level);
      for (const effect of effects) {
        if (effect.target === 'type_multiplier' && effect.conditions?.candyType) {
          if (candyTypes.includes(effect.conditions.candyType)) {
            coveredTypes.add(effect.conditions.candyType);
          }
        }
      }
    }
    if (coveredTypes.size >= 2) {
      const comboJoker = jokers.find((j) => {
        const id = typeof j.id === 'string' ? parseInt(j.id) : j.id;
        return id === JOKER_IDS.COMBO_PLATTER;
      });
      const comboLevel = comboJoker?.level ?? 1;
      const comboEffects = getJokerEffectsAtLevel(JOKER_IDS.COMBO_PLATTER, comboLevel);
      const comboEffect = comboEffects.find((e) => e.target === 'combo_platter_boost');
      if (comboEffect) {
        profitBoost += comboEffect.amount;
        bonusBreakdown.push({
          emoji: _getJokerEmoji(JOKER_IDS.COMBO_PLATTER),
          name: _getJokerName(JOKER_IDS.COMBO_PLATTER),
          multiplier: 1 + comboEffect.amount,
          flatBonus: totalProfit * comboEffect.amount,
        });
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
      // Type multipliers with 'add' operation — adds directly to multiplier
      if (effect.target === 'type_multiplier' && effect.operation === 'add' && effect.conditions?.candyType) {
        if (candyTypes.includes(effect.conditions.candyType)) {
          multiplier += effect.amount; // +1.5 adds 1.5 to multiplier
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + effect.amount,
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
        multiplier += (effect.amount - 1);
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name: _getJokerName(jokerId),
          multiplier: effect.amount,
        });
      }

      // Early Bird — first sale of day multiplier
      if (effect.target === 'first_sale_boost') {
        if (hasEarlySaleToday === false) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Underdog / Broke and Hungry — cash below threshold multiplier
      if (effect.target === 'cash_under_boost' && effect.conditions?.cashBelow) {
        if (currentCash < effect.conditions.cashBelow) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Flip Artist — 3x+ markup multiplier
      if (effect.target === 'flip_artist_boost') {
        if (purchasePrice > 0 && basePrice / purchasePrice >= 3) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Variety Pack — 3+ candy types in inventory multiplier
      if (effect.target === 'variety_pack_boost') {
        const typesInInventory = new Set<string>();
        for (const item of inventory) {
          const def = getCandyDefinition(item.name);
          def?.types.forEach((t) => typesInInventory.add(t));
        }
        if (typesInInventory.size >= 3) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }
    }
  }

  // Bulk Empire — permanent +0.5x per stack earned from high daily volume
  if (hasJokerById(jokers, JOKER_IDS.BULK_EMPIRE) && bulkEmpireStacks > 0) {
    const bulkBonus = bulkEmpireStacks * 0.5;
    multiplier += bulkBonus;
    bonusBreakdown.push({
      emoji: _getJokerEmoji(JOKER_IDS.BULK_EMPIRE),
      name: _getJokerName(JOKER_IDS.BULK_EMPIRE),
      multiplier: 1 + bulkBonus,
    });
  }

  // === STEP 4: Apply Vacuum Sealer penalty to multiplier ===
  let vacuumSealerPenalty = 1;
  if (hasJokerById(jokers, JOKER_IDS.VACUUM_SEALER)) {
    // -3 to multiplier (min 1x — always get at least base)
    multiplier = Math.max(1, multiplier - 2);
    vacuumSealerPenalty = 0; // marker for display
    bonusBreakdown.push({
      emoji: '📦',
      name: 'Vacuum Sealer',
      multiplier: -2,
    });
  }

  // === STEP 5: Final calculation ===
  // finalProfit = boostedProfit × multiplier
  const finalProfit = boostedProfit * multiplier;
  const purchaseValue = purchasePrice * quantity;
  // If selling at a loss (current price < purchase price), player gets current market value
  const marketValue = basePrice * quantity;
  const totalGain = profitPerUnit > 0 ? purchaseValue + finalProfit : marketValue;

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
    [JOKER_IDS.FLIP_ARTIST]: '🔄',
    [JOKER_IDS.COMBO_PLATTER]: '🍱',
    [JOKER_IDS.BULK_EMPIRE]: '👑',
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
    [JOKER_IDS.VARIETY_PACK]: '🎨',
    [JOKER_IDS.BROKE_AND_HUNGRY]: '🔥',
  };
  return emojiMap[id] || '🃏';
}

function _getJokerName(id: number): string {
  const nameMap: Record<number, string> = {
    [JOKER_IDS.FLIP_ARTIST]: 'Flip Artist',
    [JOKER_IDS.COMBO_PLATTER]: 'Combo Platter',
    [JOKER_IDS.BULK_EMPIRE]: 'Bulk Empire',
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
    [JOKER_IDS.VARIETY_PACK]: 'Variety Pack',
    [JOKER_IDS.BROKE_AND_HUNGRY]: 'Broke and Hungry',
  };
  return nameMap[id] || 'Joker';
}
