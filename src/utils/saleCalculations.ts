import { JOKER_IDS } from '../constants/jokerIds';
import { MerchantUtils } from './merchantUtils';

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
  inventory: any[];
  initialMultiplier?: number; // For one-time jokers like Persuasion
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
    inventory,
    initialMultiplier = 1,
  } = params;

  let multiplier = initialMultiplier;
  const bonusBreakdown: Array<{
    emoji: string;
    name: string;
    multiplier: number;
    flatBonus?: number;
  }> = [];

  // 2. Check for Influencer Shoutout merchant item (+200% profit)
  if (MerchantUtils.hasInfluencerShoutout(merchantEffects)) {
    multiplier *= 3; // +200% = 3x total
    bonusBreakdown.push({
      emoji: '📣',
      name: 'Influencer Shoutout',
      multiplier: 3,
    });
  }

  // 3. Check for Even Stevens / Odd Todd
  const hasEvenStevens = jokers.some(
    (j) => j.id == JOKER_IDS.EVEN_STEVENS || j.id === JOKER_IDS.EVEN_STEVENS.toString()
  );
  const hasOddTodd = jokers.some(
    (j) => j.id == JOKER_IDS.ODD_TODD || j.id === JOKER_IDS.ODD_TODD.toString()
  );

  if (hasEvenStevens && inventoryLimit % 2 === 0) {
    multiplier *= 1.5;
    bonusBreakdown.push({
      emoji: '⚖️',
      name: 'Even Stevens',
      multiplier: 1.5,
    });
  } else if (hasOddTodd && inventoryLimit % 2 === 1) {
    multiplier *= 1.5;
    bonusBreakdown.push({
      emoji: '🎭',
      name: 'Odd Todd',
      multiplier: 1.5,
    });
  }

  // 4. Check for Recess bonuses
  const hasHopscotch = jokers.some(
    (j) => j.id == JOKER_IDS.HOPSCOTCH_BONUS || j.id === JOKER_IDS.HOPSCOTCH_BONUS.toString()
  );
  const hasSwingset = jokers.some(
    (j) => j.id == JOKER_IDS.SWINGSET_MOMENTUM || j.id === JOKER_IDS.SWINGSET_MOMENTUM.toString()
  );

  const period = periodCount % 8;
  if (hasHopscotch && period % 2 === 0) {
    multiplier *= 1.25;
    bonusBreakdown.push({
      emoji: '🏃',
      name: 'Hopscotch',
      multiplier: 1.25,
    });
  }

  if (hasSwingset && consecutivePeriodSales > 1) {
    const swingsetMultiplier = 1 + (consecutivePeriodSales - 1) * 0.1;
    multiplier *= swingsetMultiplier;
    bonusBreakdown.push({
      emoji: '⛹️',
      name: 'Swingset',
      multiplier: swingsetMultiplier,
    });
  }

  // Check for Jump Rope Rhythm (every 3rd sale)
  const hasJumpRope = jokers.some(
    (j) => j.id == JOKER_IDS.JUMP_ROPE_RHYTHM || j.id === JOKER_IDS.JUMP_ROPE_RHYTHM.toString()
  );
  if (hasJumpRope) {
    const nextSaleNumber = totalCandiesSold + 1;
    if (nextSaleNumber % 3 === 0) {
      multiplier *= 1.66;
      bonusBreakdown.push({
        emoji: '🪢',
        name: 'Jump Rope',
        multiplier: 1.66,
      });
    }
  }

  // 5. Check for Sunset Surge afternoon bonus
  const periodWithinDay = periodCount % 8;
  const isAfternoon = periodWithinDay >= 3;
  const hasSunsetSurge = jokers.some((joker: any) => joker.id == 38 || joker.id === '38');

  if (hasSunsetSurge && isAfternoon) {
    multiplier *= 1.33;
    bonusBreakdown.push({
      emoji: '🌅',
      name: 'Sunset Surge',
      multiplier: 1.33,
    });
  }

  // 6. Check for Bulk Sale bonus
  const hasBulkSale = jokers.some(
    (joker: any) => joker.id == JOKER_IDS.BULK_SALE || joker.id === JOKER_IDS.BULK_SALE.toString()
  );
  const isBulkSale = quantity > inventoryLimit * 0.5;

  if (hasBulkSale && isBulkSale) {
    multiplier *= 1.2;
    bonusBreakdown.push({
      emoji: '📦',
      name: 'Bulk Sale',
      multiplier: 1.2,
    });
  }

  // 7. Check for Slow Cooker sell multiplier
  const hasSlowCooker = jokers.some(
    (j) => j.id == JOKER_IDS.SLOW_COOKER || j.id === JOKER_IDS.SLOW_COOKER.toString()
  );
  if (hasSlowCooker) {
    const inventoryItem = inventory.find((item) => item.name === candyName);
    const purchasedAtPeriod = inventoryItem?.purchasedAt ?? periodCount;

    const currentDay = Math.floor(periodCount / 8);
    const purchasedDay = Math.floor(purchasedAtPeriod / 8);

    const effectivePurchasedPeriod =
      currentDay === purchasedDay ? purchasedAtPeriod : Math.floor(periodCount / 8) * 8;

    const periodsHeld = Math.max(0, periodCount - effectivePurchasedPeriod);
    const slowCookerMultiplier = Math.pow(1.1, periodsHeld);

    // Only apply and show bonus if candy has been held for at least 1 period
    if (periodsHeld > 0) {
      multiplier *= slowCookerMultiplier;
      bonusBreakdown.push({
        emoji: '🍲',
        name: 'Slow Cooker',
        multiplier: slowCookerMultiplier,
      });
    }
  }

  // 8. Calculate profit-based hall pass bonus
  const profitPerUnit = Math.max(0, basePrice - purchasePrice);
  const totalProfit = profitPerUnit * quantity;

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

  // 9. Apply Vacuum Sealer penalty if applicable
  const hasVacuumSealer = jokers.some(
    (j) => j.id == JOKER_IDS.VACUUM_SEALER || j.id === JOKER_IDS.VACUUM_SEALER.toString()
  );
  const isEarlyPeriod = periodWithinDay < 5;
  let vacuumSealerPenalty = 1;

  if (hasVacuumSealer && (isEarlyPeriod || hasEarlySaleToday)) {
    vacuumSealerPenalty = 0.5;
  }

  // Calculate final gain
  const purchaseValue = purchasePrice * quantity;
  const profitWithBonuses = (totalProfit + hallPassProfitBonus) * multiplier;
  const finalProfit = profitWithBonuses * vacuumSealerPenalty;
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
