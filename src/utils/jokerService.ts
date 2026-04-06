// Shared joker service for applying effects across contexts
import {
  EffectTarget,
  JokerEffectEngine,
  STANDARDIZED_JOKERS,
  getJokerEffectsAtLevel,
} from './jokerEffectEngine';
import { JOKER_IDS } from '../constants/jokerIds';
import { getCandyDefinition } from '../constants/candyRegistry';
import { formatCurrency, roundToTwoDecimals } from './priceUtils';

// Hook for mini-games to get study time multiplier
export const useStudyTimeMultiplier = (
  jokers: any[],
  currentPeriod: number
): number => {
  const jokerService = JokerService.getInstance();
  return jokerService.applyJokerEffects(1, 'inventory_limit', jokers, currentPeriod);
};

export class JokerService {
  private static instance: JokerService;
  private jokerEngine = new JokerEffectEngine();

  private constructor() {}

  public cleanJokerName(name: string): string {
    return name.replace(' (Copy)', '');
  }

  private findJokerByName(jokers: any[], name: string): any {
    return jokers.find((j) => this.cleanJokerName(j.name) === name);
  }

  public static getInstance(): JokerService {
    if (!JokerService.instance) {
      JokerService.instance = new JokerService();
    }
    return JokerService.instance;
  }

  public initializeEngineForComputation(
    jokers: any[],
    currentPeriod: number,
    inventoryLimit?: number,
    activeEffects: any[] = []
  ): void {
    this.jokerEngine.clearAllEffects();

    jokers.forEach((joker) => {
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(
        (sj) => sj.name === jokerName
      );

      if (standardizedJoker) {
        const level = joker.level ?? 1;
        const levelEffects = getJokerEffectsAtLevel(standardizedJoker.id, level);
        const levelAwareJoker = { ...standardizedJoker, level, effects: levelEffects };

        if (standardizedJoker.type === 'one-time') {
          const isActivated = activeEffects.some(
            (effect) =>
              effect.jokerId === joker.id && effect.period === currentPeriod
          );
          if (isActivated) {
            this.jokerEngine.addJoker(levelAwareJoker, currentPeriod);
          }
        } else {
          this.jokerEngine.addJoker(levelAwareJoker, currentPeriod);
        }
      }
    });
  }

  public computeEffect(
    baseValue: number,
    target: EffectTarget,
    currentPeriod: number
  ): number {
    return this.jokerEngine.applyEffects(baseValue, target, {
      currentPeriod,
    });
  }

  public applyJokerEffects(
    baseValue: number,
    target: EffectTarget,
    jokers: any[],
    currentPeriod: number,
    inventoryLimit?: number,
    candyCount?: number,
    activeEffects: any[] = [],
    periodsPerDay: number = 8
  ): number {
    this.jokerEngine.clearAllEffects();

    jokers.forEach((joker) => {
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(
        (sj) => sj.name === jokerName
      );

      if (standardizedJoker) {
        const level = joker.level ?? 1;
        const levelEffects = getJokerEffectsAtLevel(standardizedJoker.id, level);
        const levelAwareJoker = { ...standardizedJoker, level, effects: levelEffects };

        if (standardizedJoker.type === 'one-time' && target === 'candy_price') {
          const isActivated = activeEffects.some(
            (effect) =>
              effect.jokerId === joker.id && effect.period === currentPeriod
          );
          if (isActivated) {
            this.jokerEngine.addJoker(levelAwareJoker, currentPeriod);
          }
        } else {
          this.jokerEngine.addJoker(levelAwareJoker, currentPeriod);
        }
      }
    });

    let result = this.jokerEngine.applyEffects(baseValue, target, {
      currentPeriod,
    });

    // Handle special daily effects like Inductive Reasoning
    if (target === 'inventory_limit') {
      const inductiveReasoning = this.findJokerByName(jokers, 'Inductive Reasoning');
      if (inductiveReasoning) {
        const level = inductiveReasoning.level ?? 1;
        const bonusPerDay = level === 1 ? 5 : level === 2 ? 10 : 15;
        const completedDays = Math.floor(currentPeriod / periodsPerDay);
        const dailyBonus = completedDays * bonusPerDay;
        result += dailyBonus;
      }

      // Handle Trade Routes: +1/+2/+3 inventory every period
      const tradeRoutes = this.findJokerByName(jokers, 'Trade Routes');
      if (tradeRoutes) {
        const level = tradeRoutes.level ?? 1;
        const periodBonus = level === 1 ? 1 : level === 2 ? 2 : 3;
        result += periodBonus;
      }

      // Handle Vacuum Sealer: 2x inventory
      const vacuumSealer = this.findJokerByName(jokers, 'Vacuum Sealer');
      if (vacuumSealer) {
        result *= 2;
      }
    }

    return result;
  }

  public applyMarketManipulation(
    jokers: any[],
    currentPeriod: number,
    chosenCandyType: string,
    allCandyPrices: Record<string, number>
  ): number {
    const manipulationJoker = this.findJokerByName(jokers, 'Market Manipulation');
    if (!manipulationJoker) return 0;

    const highestPrice = Math.max(...Object.values(allCandyPrices));
    return highestPrice;
  }

  public hasMarketManipulation(jokers: any[], currentPeriod: number): boolean {
    const manipulationJoker = this.findJokerByName(jokers, 'Market Manipulation');
    return !!manipulationJoker;
  }

  public applyBigShort(
    jokers: any[],
    currentPeriod: number,
    chosenCandyType: string,
    allCandyPrices: Record<string, number>
  ): number {
    const bigShortJoker = this.findJokerByName(jokers, 'The Big Short');
    if (!bigShortJoker) return 0;

    const lowestPrice = Math.min(...Object.values(allCandyPrices));
    return lowestPrice;
  }

  public hasBigShort(jokers: any[], currentPeriod: number): boolean {
    const bigShortJoker = this.findJokerByName(jokers, 'The Big Short');
    return !!bigShortJoker;
  }

  public getPriceBreakdown(
    basePrice: number,
    jokers: any[],
    currentPeriod: number,
    inventoryLimit?: number,
    activeEffects: any[] = [],
    consecutivePeriodSales?: number,
    totalSales?: number,
    candyName?: string,
    currentCash?: number
  ): {
    basePrice: number;
    jokerEffects: Array<{
      jokerName: string;
      jokerEmoji: string;
      effect: string;
      amount: number;
      effectType: 'buy' | 'sell';
      isActive: boolean;
    }>;
    finalPrice: number;
  } {
    const breakdown = {
      basePrice,
      jokerEffects: [] as Array<{
        jokerName: string;
        jokerEmoji: string;
        effect: string;
        amount: number;
        effectType: 'buy' | 'sell';
        isActive: boolean;
      }>,
      finalPrice: basePrice,
    };

    let currentPrice = basePrice;

    // Look up candy type/size info
    const candyDef = candyName ? getCandyDefinition(candyName) : undefined;

    const processJokerEffects = (joker: any) => {
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(
        (sj) => sj.name === jokerName
      );

      if (!standardizedJoker) return;

      const jokerId = typeof joker.id === 'string' ? parseInt(joker.id) : joker.id;
      const level = joker.level ?? 1;
      const effects = getJokerEffectsAtLevel(jokerId, level);

      for (const effect of effects) {
        let jokerEmoji = '🃏';
        let isActive = effect.duration === 'persistent';
        let effectType: 'buy' | 'sell' = 'sell';
        let shouldShow = true;

        if (effect.duration === 'one-time') {
          isActive = activeEffects.some(
            (ae) => ae.jokerId === joker.id && ae.period === currentPeriod
          );
        }

        // Handle buy-price effects
        if (effect.target === 'candy_price') {
          effectType = 'buy';
          jokerEmoji = '📈';
          if (isActive && effect.operation === 'multiply') {
            const change = currentPrice * (effect.amount - 1);
            breakdown.jokerEffects.push({
              jokerName, jokerEmoji,
              effect: `×${effect.amount} (+$${formatCurrency(change)})`,
              amount: change, effectType, isActive,
            });
            currentPrice = roundToTwoDecimals(currentPrice * effect.amount);
          }
          continue;
        }

        // Flat bonus effects (+X% profit)
        if (effect.target === 'sell_flat_bonus') {
          const pct = effect.amount * 100;
          jokerEmoji = _getEmoji(jokerId);
          breakdown.jokerEffects.push({
            jokerName, jokerEmoji,
            effect: `+${pct.toFixed(0)}% profit`,
            amount: pct, effectType: 'sell', isActive,
          });
          continue;
        }

        // Type multipliers
        if (effect.target === 'type_multiplier' && effect.conditions?.candyType) {
          const matches = candyDef ? candyDef.types.includes(effect.conditions.candyType) : false;
          jokerEmoji = _getEmoji(jokerId);
          breakdown.jokerEffects.push({
            jokerName, jokerEmoji,
            effect: `×${effect.amount} ${effect.conditions.candyType}`,
            amount: matches ? effect.amount : 0,
            effectType: 'sell',
            isActive: isActive && matches,
          });
          continue;
        }

        // Flip Artist — bonus when selling at 3x+ markup
        if (effect.target === 'flip_artist_boost') {
          jokerEmoji = _getEmoji(jokerId);
          breakdown.jokerEffects.push({
            jokerName, jokerEmoji,
            effect: `×${effect.amount} on 3x+ markup`,
            amount: effect.amount,
            effectType: 'sell',
            isActive,
          });
          continue;
        }

        // Combo Platter — bonus when both candy types covered by jokers
        if (effect.target === 'combo_platter_boost') {
          jokerEmoji = _getEmoji(jokerId);
          breakdown.jokerEffects.push({
            jokerName, jokerEmoji,
            effect: `+${effect.amount}x dual-type bonus`,
            amount: effect.amount,
            effectType: 'sell',
            isActive,
          });
          continue;
        }

        // Bulk Empire — permanent stacking multiplier
        if (effect.target === 'bulk_empire_boost') {
          jokerEmoji = _getEmoji(jokerId);
          breakdown.jokerEffects.push({
            jokerName, jokerEmoji,
            effect: `+0.5x per ${effect.amount} sold/day`,
            amount: effect.amount,
            effectType: 'sell',
            isActive,
          });
          continue;
        }

        // Conditional multipliers (Even Stevens, Odd Todd, Perfect Change)
        if (effect.target === 'conditional_multiplier') {
          let condMet = false;
          let label = '';

          if (effect.conditions?.inventoryParity === 'even') {
            condMet = inventoryLimit ? inventoryLimit % 2 === 0 : false;
            label = 'even inv';
            jokerEmoji = '⚖️';
          } else if (effect.conditions?.inventoryParity === 'odd') {
            condMet = inventoryLimit ? inventoryLimit % 2 === 1 : false;
            label = 'odd inv';
            jokerEmoji = '🎭';
          } else if (effect.conditions?.cashEndsWith === '.00') {
            const cashStr = formatCurrency(currentCash ?? 0);
            condMet = cashStr.endsWith('.00');
            label = 'cash .00';
            jokerEmoji = '💰';
          }

          breakdown.jokerEffects.push({
            jokerName, jokerEmoji,
            effect: `×${effect.amount} (${label})`,
            amount: condMet ? effect.amount : 0,
            effectType: 'sell',
            isActive: isActive && condMet,
          });
          continue;
        }

        // Next sale multiplier (Pursuasion)
        if (effect.target === 'next_sale_multiplier') {
          jokerEmoji = '🗣️';
          breakdown.jokerEffects.push({
            jokerName, jokerEmoji,
            effect: `×${effect.amount} next sale`,
            amount: effect.amount, effectType: 'sell', isActive,
          });
          continue;
        }

        // Vacuum Sealer penalty
        if (effect.target === 'inventory_double_with_penalty') {
          jokerEmoji = '📦';
          breakdown.jokerEffects.push({
            jokerName, jokerEmoji,
            effect: '2x inv, -2 mult',
            amount: -2, effectType: 'sell', isActive,
          });
          continue;
        }
      }
    };

    // Process all jokers
    jokers.forEach(processJokerEffects);

    breakdown.finalPrice = roundToTwoDecimals(Math.max(0, currentPrice));
    return breakdown;
  }

  public hasOneTimeSellMultiplier(
    jokers: any[],
    currentPeriod: number,
    activeEffects: any[]
  ): {
    hasEffect: boolean;
    jokerName?: string;
    multiplier?: number;
    jokerId?: number;
  } {
    for (const activeEffect of activeEffects) {
      if (activeEffect.period === currentPeriod) {
        const standardizedJoker = STANDARDIZED_JOKERS.find(
          (sj) => sj.id === activeEffect.jokerId
        );

        if (standardizedJoker) {
          const jokerId = standardizedJoker.id;
          const level = 1; // active effects don't store level, use default
          const effects = getJokerEffectsAtLevel(jokerId, level);
          const sellEffect = effects.find(
            (e) => e.target === 'next_sale_multiplier' && e.duration === 'one-time'
          );

          if (sellEffect) {
            return {
              hasEffect: true,
              jokerName: standardizedJoker.name,
              multiplier: sellEffect.amount,
              jokerId: activeEffect.jokerId,
            };
          }
        }
      }
    }

    return { hasEffect: false };
  }

}

function _getEmoji(id: number): string {
  const map: Record<number, string> = {
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
  };
  return map[id] || '🃏';
}
