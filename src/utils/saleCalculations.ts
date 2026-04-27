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
  bulkEmpireStacks?: number; // Legacy field (unused, kept for compatibility)
  inventory?: { name: string; quantity: number }[]; // Current inventory for Variety Pack check
  didSellPreviousPeriod?: boolean; // For Patience Pays
  ownedJokerCount?: number; // For Collector
  uniqueTypesSoldThisPeriod?: number; // For Diversifier
  clearanceSaleStacks?: number; // For Clearance Sale — how many loss sales so far
  compoundInterestDays?: number; // For Compound Interest — days held
  reputationTypesSold?: number; // For Reputation — unique candy types sold ever
  streetSmartsEventsSurvived?: number; // For Street Smarts — events survived count
  hoarderMaxHits?: number; // For Hoarder — times inventory hit max
  pennyWiseStashes?: number; // For Penny Wise — times money was stashed
  survivorCandiesMelted?: number; // For Survivor — candy batches melted
  selectedPassIds?: string[]; // For Final Exam period-specific multiplier
  currentLocation?: string; // For Lunchroom Monopoly location-specific multiplier
  previousLocation?: string; // For Class Clown — compare vs current to boost on location change
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
    didSellPreviousPeriod = true,
    ownedJokerCount = 0,
    uniqueTypesSoldThisPeriod = 0,
    clearanceSaleStacks = 0,
    compoundInterestDays = 0,
    reputationTypesSold = 0,
    streetSmartsEventsSurvived = 0,
    hoarderMaxHits = 0,
    pennyWiseStashes = 0,
    survivorCandiesMelted = 0,
    selectedPassIds = [],
    currentLocation = '',
    previousLocation = '',
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

  // Street Cred merchant item — +10% profit boost per level (max 5 levels = +50%)
  const streetCredEffect = merchantEffects.find((e: any) => e.itemId === 'street_cred');
  const streetCredLevel = streetCredEffect?.level ?? 0;
  if (streetCredLevel > 0) {
    const streetCredBoost = streetCredLevel * 0.1;
    profitBoost += streetCredBoost;
    bonusBreakdown.push({
      emoji: '🌟',
      name: 'Street Cred',
      multiplier: 1,
      flatBonus: totalProfit * streetCredBoost,
    });
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

      // Tax Collector — % of sale as bonus (adds to profit boost)
      if (effect.target === 'tax_collector_boost') {
        profitBoost += effect.amount; // 5%/8%/12% added to profit boost
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name: _getJokerName(jokerId),
          multiplier: 1,
          flatBonus: totalProfit * effect.amount,
        });
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

  // Penny Wise — profit % per time money was stashed
  for (const joker of jokers) {
    const jokerId = typeof joker.id === 'string' ? parseInt(joker.id) : joker.id;
    const level = joker.level ?? 1;
    const effects = getJokerEffectsAtLevel(jokerId, level);
    for (const effect of effects) {
      if (effect.target === 'penny_wise_boost' && pennyWiseStashes > 0) {
        const pennyWiseBonus = effect.amount * pennyWiseStashes;
        profitBoost += pennyWiseBonus;
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name: _getJokerName(jokerId),
          multiplier: 1,
          flatBonus: totalProfit * pennyWiseBonus,
        });
      }
    }
  }

  // Conditional profit boosts (Even Stevens, Golden Hour — converted from mult)
  for (const joker of jokers) {
    const jokerId = typeof joker.id === 'string' ? parseInt(joker.id) : joker.id;
    const level = joker.level ?? 1;
    const effects = getJokerEffectsAtLevel(jokerId, level);
    for (const effect of effects) {
      if (effect.target === 'conditional_profit_boost') {
        let conditionMet = false;
        if (effect.conditions?.inventoryParity === 'even' && inventoryLimit % 2 === 0) {
          conditionMet = true;
        }
        if (effect.conditions?.period === -1 && period >= periodsPerDay - 1) {
          conditionMet = true;
        }
        if (conditionMet) {
          profitBoost += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
            flatBonus: totalProfit * (effect.amount - 1),
          });
        }
      }

      // Early Bird — first sale of day profit boost
      if (effect.target === 'first_sale_profit_boost') {
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

      // Underdog — cash below threshold profit boost
      if (effect.target === 'cash_under_profit_boost' && effect.conditions?.cashBelow) {
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

      // Variety Pack — 3+ candy types in inventory profit boost
      if (effect.target === 'variety_pack_profit_boost') {
        const typesInInventory = new Set<string>();
        for (const item of inventory) {
          const def = getCandyDefinition(item.name);
          def?.types.forEach((t) => typesInInventory.add(t));
        }
        if (typesInInventory.size >= 3) {
          profitBoost += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
            flatBonus: totalProfit * (effect.amount - 1),
          });
        }
      }

      // Peak Hours — profit boost during periods 3-5
      if (effect.target === 'peak_hours_profit_boost') {
        if (period >= 3 && period <= 5) {
          profitBoost += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
            flatBonus: totalProfit * (effect.amount - 1),
          });
        }
      }

      // Compound Interest — scaling profit boost over days
      if (effect.target === 'compound_interest_profit_boost') {
        if (compoundInterestDays > 0) {
          profitBoost += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
            flatBonus: totalProfit * (effect.amount - 1),
          });
        }
      }

      // Reputation — profit boost per unique candy type sold
      if (effect.target === 'reputation_profit_boost') {
        if (reputationTypesSold > 0) {
          const reputationBonus = effect.amount * reputationTypesSold;
          profitBoost += reputationBonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + reputationBonus,
            flatBonus: totalProfit * reputationBonus,
          });
        }
      }

      // Momentum — profit boost per consecutive sale period
      if (effect.target === 'momentum_profit_boost') {
        if (consecutivePeriodSales > 0) {
          const momentumBonus = effect.amount * consecutivePeriodSales;
          profitBoost += momentumBonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + momentumBonus,
            flatBonus: totalProfit * momentumBonus,
          });
        }
      }

      // Class Clown — profit boost when current location differs from the previous period's.
      // If there's no previous location recorded (first period of run), treat as "changed".
      if (effect.target === 'location_change_boost') {
        const locationChanged =
          !previousLocation || previousLocation !== currentLocation;
        if (locationChanged) {
          profitBoost += effect.amount;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + effect.amount,
            flatBonus: totalProfit * effect.amount,
          });
        }
      }
    }
  }

  const boostedProfit = totalProfit * profitBoost;

  // === STEP 3: Multipliers (size, conditional, one-time) ===
  // Size, Odd Todd stack additively: 1x base + (1.5-1) = 1.5x
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

      // Conditional multipliers (Odd Todd)
      if (effect.target === 'conditional_multiplier') {
        let conditionMet = false;

        if (effect.conditions?.inventoryParity === 'odd' && inventoryLimit % 2 === 1) {
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

      // Broke and Hungry — cash below threshold multiplier
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

      // (Variety Pack moved to profit boost section)

      // Size multipliers — Mint Condition (small), King Size (big), Medium Rare (medium)
      if (effect.target === 'size_multiplier' && effect.conditions?.candySize) {
        if (candySize === effect.conditions.candySize) {
          multiplier += effect.amount; // +1/+1.5/+2 adds directly to multiplier
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + effect.amount,
          });
        }
      }

      // Sell multiplier — Sugar Rush, Hot Potato
      if (effect.target === 'sell_multiplier') {
        multiplier += (effect.amount - 1);
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name: _getJokerName(jokerId),
          multiplier: effect.amount,
        });
      }

      // Glass Cannon — huge one-time multiplier
      if (effect.target === 'glass_cannon_boost') {
        multiplier += (effect.amount - 1);
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name: _getJokerName(jokerId),
          multiplier: effect.amount,
        });
      }

      // Contraband — high multiplier with confiscation risk
      if (effect.target === 'contraband_boost') {
        multiplier += (effect.amount - 1);
        bonusBreakdown.push({
          emoji: _getJokerEmoji(jokerId),
          name: _getJokerName(jokerId),
          multiplier: effect.amount,
        });
      }

      // All In — big multiplier when selling entire stack AND cash is low.
      // Both gates must be met: threshold (level-scaled) and stack-empties-out.
      if (effect.target === 'all_in_boost' && effect.conditions?.cashBelow) {
        const ownedQty =
          inventory.find((item) => item.name === candyName)?.quantity ?? 0;
        const sellingFullStack =
          !effect.conditions?.requiresFullStack || quantity >= ownedQty;
        if (currentCash < effect.conditions.cashBelow && sellingFullStack) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Lucky 7 — bonus when selling exactly 7 candy
      if (effect.target === 'lucky_seven_boost') {
        if (quantity === 7) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Night Owl — bonus in last period of day
      if (effect.target === 'night_owl_boost') {
        if (period >= periodsPerDay - 1) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Last Stand — huge bonus when selling < 5 candy
      if (effect.target === 'last_stand_boost') {
        if (quantity < 5) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // (Momentum moved to profit boost section)

      // Diversifier — bonus when selling 3+ types same period
      if (effect.target === 'diversifier_boost') {
        if (__DEV__) console.log('🌈 DIVERSIFIER CALC:', { uniqueTypesSoldThisPeriod, threshold: 3, amount: effect.amount, willApply: uniqueTypesSoldThisPeriod >= 3 });
        if (uniqueTypesSoldThisPeriod >= 3) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // (Peak Hours moved to profit boost section)

      // Patience Pays — bonus when no sale previous period
      if (effect.target === 'patience_pays_boost') {
        if (!didSellPreviousPeriod) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Collector — bonus per unique joker owned
      if (effect.target === 'collector_boost') {
        if (ownedJokerCount > 0) {
          const collectorBonus = effect.amount * ownedJokerCount;
          multiplier += collectorBonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + collectorBonus,
          });
        }
      }

      // Minimalist — big bonus if exactly 3 jokers owned
      if (effect.target === 'minimalist_boost') {
        if (ownedJokerCount === 3) {
          multiplier += (effect.amount - 1);
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: effect.amount,
          });
        }
      }

      // Clearance Sale — permanent multiplier per loss sale
      if (effect.target === 'clearance_sale_boost') {
        if (clearanceSaleStacks > 0) {
          const clearanceBonus = effect.amount * clearanceSaleStacks;
          multiplier += clearanceBonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + clearanceBonus,
          });
        }
      }

      // (Compound Interest and Reputation moved to profit boost section)

      // Street Smarts — bonus per event survived
      if (effect.target === 'street_smarts_boost') {
        if (streetSmartsEventsSurvived > 0) {
          const streetSmartsBonus = effect.amount * streetSmartsEventsSurvived;
          multiplier += streetSmartsBonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + streetSmartsBonus,
          });
        }
      }

      // Hoarder — mult per time inventory hit max
      if (effect.target === 'hoarder_boost') {
        if (hoarderMaxHits > 0) {
          const hoarderBonus = effect.amount * hoarderMaxHits;
          multiplier += hoarderBonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + hoarderBonus,
          });
        }
      }



      // Sixth Sense — chance-based flat multiplier proc
      if (effect.target === 'lucky_proc_mult') {
        const chance = effect.conditions?.chance ?? 0;
        if (chance > 0 && Math.random() < chance) {
          multiplier += effect.amount;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + effect.amount,
          });
        }
      }

      // Survivor — mult per candy batch melted
      if (effect.target === 'survivor_boost') {
        if (survivorCandiesMelted > 0) {
          const survivorBonus = effect.amount * survivorCandiesMelted;
          multiplier += survivorBonus;
          bonusBreakdown.push({
            emoji: _getJokerEmoji(jokerId),
            name: _getJokerName(jokerId),
            multiplier: 1 + survivorBonus,
          });
        }
      }
    }
  }

  // Triple Threat — bonus when 3+ candy types covered by owned type-multiplier jokers
  if (hasJokerById(jokers, JOKER_IDS.TRIPLE_THREAT) && candyTypes.length >= 1) {
    const coveredTypes = new Set<string>();
    for (const joker of jokers) {
      const jokerId = typeof joker.id === 'string' ? parseInt(joker.id) : joker.id;
      if (jokerId === JOKER_IDS.TRIPLE_THREAT) continue; // don't count self
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
    if (coveredTypes.size >= 3) {
      const ttJoker = jokers.find((j: any) => {
        const id = typeof j.id === 'string' ? parseInt(j.id) : j.id;
        return id === JOKER_IDS.TRIPLE_THREAT;
      });
      const ttLevel = ttJoker?.level ?? 1;
      const ttEffects = getJokerEffectsAtLevel(JOKER_IDS.TRIPLE_THREAT, ttLevel);
      const ttEffect = ttEffects.find((e: any) => e.target === 'triple_threat_boost');
      if (ttEffect) {
        multiplier += ttEffect.amount;
        bonusBreakdown.push({
          emoji: _getJokerEmoji(JOKER_IDS.TRIPLE_THREAT),
          name: _getJokerName(JOKER_IDS.TRIPLE_THREAT),
          multiplier: 1 + ttEffect.amount,
        });
      }
    }
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

  // === STEP 4b: Final Exam hall pass (period-specific multiplier) ===
  let finalExamMultiplier = 1;
  if (selectedPassIds.includes('final_exam')) {
    const effectivePeriodsPerDay = periodsPerDay;
    if (period === effectivePeriodsPerDay) {
      // Last period: 15x profit
      finalExamMultiplier = 15;
      bonusBreakdown.push({
        emoji: '📝',
        name: 'Final Exam (Last Period)',
        multiplier: 15,
      });
    } else {
      // All other periods: -75% profit (0.25x)
      finalExamMultiplier = 0.25;
      bonusBreakdown.push({
        emoji: '📝',
        name: 'Final Exam (Penalty)',
        multiplier: 0.25,
      });
    }
  }

  // === STEP 4c: Lunchroom Monopoly hall pass (location-specific multiplier) ===
  let lunchroomMonopolyMultiplier = 1;
  if (selectedPassIds.includes('lunchroom_monopoly')) {
    if (currentLocation === 'cafeteria') {
      lunchroomMonopolyMultiplier = 6; // +500%
      bonusBreakdown.push({
        emoji: '🍽️',
        name: 'Lunchroom Monopoly (Cafeteria)',
        multiplier: 6,
      });
    } else {
      lunchroomMonopolyMultiplier = 0.5; // −50%
      bonusBreakdown.push({
        emoji: '🍽️',
        name: 'Lunchroom Monopoly (Off-Site)',
        multiplier: 0.5,
      });
    }
  }

  // === STEP 5: Final calculation ===
  const finalProfit =
    boostedProfit * multiplier * finalExamMultiplier * lunchroomMonopolyMultiplier;
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
    [JOKER_IDS.TRIPLE_THREAT]: '🎯',
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
    [JOKER_IDS.SUGAR_RUSH]: '🍬',
    [JOKER_IDS.GLASS_CANNON]: '💥',
    [JOKER_IDS.CONTRABAND]: '🚫',
    [JOKER_IDS.ALL_IN]: '🎰',
    [JOKER_IDS.HOT_POTATO]: '🥔',
    [JOKER_IDS.COMPOUND_INTEREST]: '📈',
    [JOKER_IDS.REPUTATION]: '⭐',
    [JOKER_IDS.STREET_SMARTS]: '🧠',
    [JOKER_IDS.MINT_CONDITION]: '🌿',
    [JOKER_IDS.KING_SIZE]: '👑',
    [JOKER_IDS.MEDIUM_RARE]: '🥩',
    [JOKER_IDS.CLEARANCE_SALE]: '🏷️',
    [JOKER_IDS.LUCKY_7]: '🎰',
    [JOKER_IDS.NIGHT_OWL]: '🦉',
    [JOKER_IDS.TAX_COLLECTOR]: '💰',
    [JOKER_IDS.LAST_STAND]: '🛡️',
    [JOKER_IDS.MOMENTUM]: '🚀',
    [JOKER_IDS.DIVERSIFIER]: '🌈',
    [JOKER_IDS.PEAK_HOURS]: '⏰',
    [JOKER_IDS.PATIENCE_PAYS]: '🧘',
    [JOKER_IDS.COLLECTOR]: '🗂️',
    [JOKER_IDS.MINIMALIST]: '✨',
    [JOKER_IDS.SIXTH_SENSE]: '🔮',
  };
  return emojiMap[id] || '🃏';
}

function _getJokerName(id: number): string {
  const nameMap: Record<number, string> = {
    [JOKER_IDS.FLIP_ARTIST]: 'Flip Artist',
    [JOKER_IDS.COMBO_PLATTER]: 'Combo Platter',
    [JOKER_IDS.TRIPLE_THREAT]: 'Triple Threat',
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
    [JOKER_IDS.SUGAR_RUSH]: 'Sugar Rush',
    [JOKER_IDS.GLASS_CANNON]: 'Glass Cannon',
    [JOKER_IDS.CONTRABAND]: 'Contraband',
    [JOKER_IDS.ALL_IN]: 'All In',
    [JOKER_IDS.HOT_POTATO]: 'Hot Potato',
    [JOKER_IDS.COMPOUND_INTEREST]: 'Compound Interest',
    [JOKER_IDS.REPUTATION]: 'Reputation',
    [JOKER_IDS.STREET_SMARTS]: 'Street Smarts',
    [JOKER_IDS.MINT_CONDITION]: 'Mint Condition',
    [JOKER_IDS.KING_SIZE]: 'King Size',
    [JOKER_IDS.MEDIUM_RARE]: 'Medium Rare',
    [JOKER_IDS.CLEARANCE_SALE]: 'Clearance Sale',
    [JOKER_IDS.LUCKY_7]: 'Lucky 7',
    [JOKER_IDS.NIGHT_OWL]: 'Night Owl',
    [JOKER_IDS.TAX_COLLECTOR]: 'Tax Collector',
    [JOKER_IDS.LAST_STAND]: 'Last Stand',
    [JOKER_IDS.MOMENTUM]: 'Momentum',
    [JOKER_IDS.DIVERSIFIER]: 'Diversifier',
    [JOKER_IDS.PEAK_HOURS]: 'Peak Hours',
    [JOKER_IDS.PATIENCE_PAYS]: 'Patience Pays',
    [JOKER_IDS.COLLECTOR]: 'Collector',
    [JOKER_IDS.MINIMALIST]: 'Minimalist',
    [JOKER_IDS.SIXTH_SENSE]: 'Sixth Sense',
  };
  return nameMap[id] || 'Joker';
}
