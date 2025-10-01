// Shared joker service for applying effects across contexts
import {
  EffectTarget,
  JokerEffectEngine,
  STANDARDIZED_JOKERS,
} from './jokerEffectEngine';

// Hook for mini-games to get study time multiplier
export const useStudyTimeMultiplier = (
  jokers: any[],
  currentPeriod: number
): number => {
  const jokerService = JokerService.getInstance();
  return jokerService.applyJokerEffects(1, 'study_time', jokers, currentPeriod);
};

export class JokerService {
  private static instance: JokerService;
  private jokerEngine = new JokerEffectEngine();

  private constructor() {}

  // Helper function to clean joker names (remove " (Copy)" suffix)
  public cleanJokerName(name: string): string {
    return name.replace(' (Copy)', '');
  }

  // Helper function to find joker by name (handles copied jokers)
  private findJokerByName(jokers: any[], name: string): any {
    return jokers.find((j) => this.cleanJokerName(j.name) === name);
  }

  public static getInstance(): JokerService {
    if (!JokerService.instance) {
      JokerService.instance = new JokerService();
    }
    return JokerService.instance;
  }

  /**
   * Initialize the joker engine once with all jokers for efficient batch computation.
   * This should be called once before computing multiple effect targets.
   */
  public initializeEngineForComputation(
    jokers: any[],
    currentPeriod: number,
    inventoryLimit?: number,
    activeEffects: any[] = []
  ): void {
    // Clear previous effects
    this.jokerEngine.clearAllEffects();

    // Add all jokers once
    jokers.forEach((joker) => {
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(
        (sj) => sj.name === jokerName
      );

      if (standardizedJoker) {
        // Handle conditional jokers
        if (jokerName === 'Even Stevens') {
          if (inventoryLimit && inventoryLimit % 2 === 0) {
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
        } else if (jokerName === 'Odd Todd') {
          if (inventoryLimit && inventoryLimit % 2 === 1) {
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
        } else if (jokerName === 'Market Crash') {
          const isActivated = activeEffects.some(
            (effect) => effect.jokerId === joker.id && effect.period === currentPeriod
          );
          if (isActivated) {
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
        } else if (standardizedJoker.type === 'one-time') {
          const isActivated = activeEffects.some(
            (effect) => effect.jokerId === joker.id && effect.period === currentPeriod
          );
          if (isActivated) {
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
        } else {
          // Persistent joker - always add
          this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
        }
      }
    });
  }

  /**
   * Compute a specific effect without re-initializing the engine.
   * Must call initializeEngineForComputation first.
   */
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
    activeEffects: any[] = []
  ): number {
    // Debug logging for inventory_limit target
    if (target === 'inventory_limit') {
      console.log(
        `🔍 JokerService - Calculating inventory limit with base: ${baseValue}`
      );
      console.log(
        `🃏 Available jokers:`,
        jokers.map((j) => `${j.name} (type: ${j.type})`)
      );
    }

    // Clear previous effects
    this.jokerEngine.clearAllEffects();

    // Add current active jokers with conditional logic
    jokers.forEach((joker) => {
      // Find the standardized joker by name (handle copied jokers by removing " (Copy)" suffix)
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(
        (sj) => sj.name === jokerName
      );

      if (target === 'inventory_limit') {
        console.log(
          `🔍 Processing joker: "${joker.name}" -> cleaned: "${jokerName}"`
        );
        console.log(`   Standardized joker found: ${!!standardizedJoker}`);
        if (standardizedJoker) {
          console.log(
            `   Effects: ${JSON.stringify(standardizedJoker.effects)}`
          );
        }
      }

      if (standardizedJoker) {
        // Handle conditional jokers like Even Stevens and Odd Todd
        if (jokerName === 'Even Stevens' && target === 'candy_price') {
          // Only apply if inventory limit is even
          if (inventoryLimit && inventoryLimit % 2 === 0) {
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
        } else if (jokerName === 'Odd Todd' && target === 'candy_price') {
          // Only apply if inventory limit is odd
          if (inventoryLimit && inventoryLimit % 2 === 1) {
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
        } else if (jokerName === 'Market Crash' && target === 'candy_price') {
          // Market Crash only applies if it has been activated this period
          const isActivated = activeEffects.some(
            (effect) => effect.jokerId === joker.id && effect.period === currentPeriod
          );
          if (isActivated) {
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
        } else if (standardizedJoker.type === 'one-time' && target === 'candy_price') {
          // One-time candy price jokers only apply if activated this period
          const isActivated = activeEffects.some(
            (effect) => effect.jokerId === joker.id && effect.period === currentPeriod
          );
          if (isActivated) {
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
        } else {
          // Add the joker normally
          if (target === 'inventory_limit') {
            console.log(
              `   ✅ Adding joker to engine: ${standardizedJoker.name}`
            );
          }
          this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
        }
      }
    });

    // Calculate base result from joker effects
    let result = this.jokerEngine.applyEffects(baseValue, target, {
      currentPeriod,
    });

    if (target === 'inventory_limit') {
      console.log(`   🎯 After joker engine effects: ${result}`);
    }

    // Handle special daily effects like Inductive Reasoning
    if (target === 'inventory_limit') {
      const inductiveReasoning = this.findJokerByName(
        jokers,
        'Inductive Reasoning'
      );
      if (inductiveReasoning) {
        // Add 3 inventory spaces for each completed day
        const completedDays = Math.floor(currentPeriod / 8);
        const dailyBonus = completedDays * 3;
        result += dailyBonus;
        console.log(
          `   📚 Inductive Reasoning bonus: +${dailyBonus} (${completedDays} completed days)`
        );
      }

      // Handle Trade Routes: +1 inventory every period
      const tradeRoutes = this.findJokerByName(jokers, 'Trade Routes');
      if (tradeRoutes) {
        // Add 1 inventory space every period (flat bonus)
        const periodBonus = 1;
        result += periodBonus;
        console.log(
          `   🗺️ Trade Routes bonus: +${periodBonus} (active every period)`
        );
      }

      console.log(`   📊 Final inventory limit: ${result}`);
    }

    return result;
  }

  // Calculate compound interest bonus for end-of-day
  public calculateCompoundInterest(
    jokers: any[],
    currentPeriod: number,
    candyCount: number
  ): number {
    const compoundInterestJoker = this.findJokerByName(
      jokers,
      'Compound Interest'
    );
    if (!compoundInterestJoker) return 0;

    const standardizedJoker = STANDARDIZED_JOKERS.find(
      (sj) => sj.name === 'Compound Interest'
    );
    if (!standardizedJoker) return 0;

    // $10 per candy held at end of day
    const bonusPerCandy = standardizedJoker.effects[0].amount;
    const totalBonus = candyCount * bonusPerCandy;

    console.log(
      `💰 Compound Interest: ${candyCount} candies × $${bonusPerCandy} = $${totalBonus}`
    );

    return totalBonus;
  }

  // Apply market manipulation to set chosen candy to highest price
  public applyMarketManipulation(
    jokers: any[],
    currentPeriod: number,
    chosenCandyType: string,
    allCandyPrices: Record<string, number>
  ): number {
    const manipulationJoker = this.findJokerByName(
      jokers,
      'Market Manipulation'
    );
    if (!manipulationJoker) return 0;

    const standardizedJoker = STANDARDIZED_JOKERS.find(
      (sj) => sj.name === 'Market Manipulation'
    );
    if (!standardizedJoker) return 0;

    // Find the highest price among all candies
    const highestPrice = Math.max(...Object.values(allCandyPrices));
    const originalPrice = allCandyPrices[chosenCandyType] || 0;

    console.log(
      `📈 Market Manipulation: ${chosenCandyType} price ${originalPrice} → ${highestPrice} (highest market price)`
    );

    // Return the highest price to set for the chosen candy
    return highestPrice;
  }

  // Check if market manipulation is available
  public hasMarketManipulation(jokers: any[], currentPeriod: number): boolean {
    const manipulationJoker = this.findJokerByName(
      jokers,
      'Market Manipulation'
    );
    return !!manipulationJoker;
  }

  // Apply big short to set chosen candy to lowest price
  public applyBigShort(
    jokers: any[],
    currentPeriod: number,
    chosenCandyType: string,
    allCandyPrices: Record<string, number>
  ): number {
    const bigShortJoker = this.findJokerByName(jokers, 'The Big Short');
    if (!bigShortJoker) return 0;

    const standardizedJoker = STANDARDIZED_JOKERS.find(
      (sj) => sj.name === 'The Big Short'
    );
    if (!standardizedJoker) return 0;

    // Find the lowest price among all candies
    const lowestPrice = Math.min(...Object.values(allCandyPrices));
    const originalPrice = allCandyPrices[chosenCandyType] || 0;

    console.log(
      `📉 The Big Short: ${chosenCandyType} price ${originalPrice} → ${lowestPrice} (lowest market price)`
    );

    // Return the lowest price to set for the chosen candy
    return lowestPrice;
  }

  // Check if big short is available
  public hasBigShort(jokers: any[], currentPeriod: number): boolean {
    const bigShortJoker = this.findJokerByName(jokers, 'The Big Short');
    return !!bigShortJoker;
  }

  // Get detailed price breakdown showing base price and individual joker effects
  // Effects are applied in order: persistent, limited duration, then one-time
  // Now includes both candy_price and sell_multiplier effects for comprehensive display
  public getPriceBreakdown(
    basePrice: number,
    jokers: any[],
    currentPeriod: number,
    inventoryLimit?: number,
    activeEffects: any[] = []
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

    // Helper function to process a joker's price effects
    const processJokerEffects = (joker: any) => {
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(
        (sj) => sj.name === jokerName
      );

      if (!standardizedJoker) return;

      // Check if this joker affects candy prices, sell multipliers, escalating price increases, morning purchase discounts, or afternoon sale bonuses
      const priceEffects = standardizedJoker.effects.filter(
        (effect) => effect.target === 'candy_price' || effect.target === 'sell_multiplier' || effect.target === 'escalating_price_increase' || effect.target === 'morning_purchase_discount' || effect.target === 'afternoon_sale_bonus'
      );

      priceEffects.forEach((effect) => {
        let shouldApply = true;
        let jokerEmoji = '🃏';

        // Handle conditional jokers and assign emojis
        if (jokerName === 'Even Stevens') {
          shouldApply = inventoryLimit ? inventoryLimit % 2 === 0 : false;
          jokerEmoji = '📊';
        } else if (jokerName === 'Odd Todd') {
          shouldApply = inventoryLimit ? inventoryLimit % 2 === 1 : false;
          jokerEmoji = '🎲';
        } else if (jokerName === 'Market Crash') {
          jokerEmoji = '💥';
        } else if (jokerName === 'Double Up') {
          jokerEmoji = '📈';
        } else if (jokerName === 'Propacandies') {
          jokerEmoji = '📰';
        } else if (jokerName === 'Pursuasion') {
          jokerEmoji = '🗣️';
        } else if (jokerName === 'Trojan Horse') {
          jokerEmoji = '🐴';
        }
        // Determine if the joker is currently active
        let isActive = false;
        if (effect.duration === 'persistent') {
          isActive = true;
        } else if (effect.duration === 'one-time') {
          isActive = activeEffects.some(
            (activeEffect) => activeEffect.jokerId === joker.id && activeEffect.period === currentPeriod
          );
        }

        // Determine effect type
        const effectType: 'buy' | 'sell' = (effect.target === 'candy_price' || effect.target === 'escalating_price_increase') ? 'buy' : 'sell';

        if (shouldApply || !isActive) { // Show all relevant effects, even if not active
          let effectAmount = 0;
          let effectText = '';

          if (effect.target === 'candy_price') {
            // Only apply to current price calculation if active
            if (isActive && shouldApply) {
              if (effect.operation === 'add') {
                effectAmount = effect.amount;
                effectText = `+$${effect.amount.toFixed(2)}`;
                currentPrice += effect.amount;
              } else if (effect.operation === 'multiply') {
                effectAmount = currentPrice * (effect.amount - 1);
                effectText = `×${effect.amount} (+$${effectAmount.toFixed(2)})`;
                currentPrice *= effect.amount;
              }
            } else {
              // Show potential effect even if not active
              if (effect.operation === 'add') {
                effectAmount = effect.amount;
                effectText = `+$${effect.amount.toFixed(2)}`;
              } else if (effect.operation === 'multiply') {
                effectAmount = basePrice * (effect.amount - 1);
                effectText = `×${effect.amount}`;
              }
            }
          } else if (effect.target === 'sell_multiplier') {
            // Show sell multiplier effects
            if (effect.operation === 'multiply') {
              const percentage = (effect.amount - 1) * 100;
              effectText = `+${percentage.toFixed(0)}% selling`;
              effectAmount = percentage;
            }
          } else if (effect.target === 'escalating_price_increase') {
            // Special handling for Trojan Horse escalating price increase
            const periodWithinDay = currentPeriod % 8;
            const priceIncrease = (periodWithinDay + 1) * effect.amount;
            effectText = `+$${priceIncrease.toFixed(2)} (period ${periodWithinDay + 1})`;
            effectAmount = priceIncrease;

            // Apply to current price if active
            if (isActive && shouldApply) {
              currentPrice += priceIncrease;
            }
          } else if (effect.target === 'morning_purchase_discount') {
            // Special handling for Time Zone Arbitrage morning purchase discount
            const periodWithinDay = currentPeriod % 8;
            const isMorning = periodWithinDay <= 2; // Periods 0, 1, 2 are "morning"
            const discountPercent = (1 - effect.amount) * 100; // Convert 0.9 to 10%

            effectText = isMorning ? `-${discountPercent.toFixed(0)}% morning buy` : `Morning buy discount (inactive)`;
            effectAmount = isMorning ? effect.amount : 1;
            effectType = 'buy';
            jokerEmoji = '🕘';

            // Apply discount to current price if active and it's morning
            if (isActive && shouldApply && isMorning) {
              currentPrice = currentPrice * effect.amount;
            }

            // Override shouldApply for visual feedback
            shouldApply = isMorning;
          } else if (effect.target === 'afternoon_sale_bonus') {
            // Special handling for Sunset Surge afternoon sale bonus
            const periodWithinDay = currentPeriod % 8;
            const isAfternoon = periodWithinDay >= 3; // Periods 3, 4, 5, 6, 7 are "afternoon"
            const bonusPercent = (effect.amount - 1) * 100; // Convert 1.1 to 10%

            effectText = isAfternoon ? `+${bonusPercent.toFixed(0)}% afternoon sell` : `Afternoon sell bonus (inactive)`;
            effectAmount = isAfternoon ? effect.amount : 1;
            effectType = 'sell';
            jokerEmoji = '🌅';

            // Apply bonus to current price if active and it's afternoon
            if (isActive && shouldApply && isAfternoon) {
              currentPrice = currentPrice * effect.amount;
            }

            // Override shouldApply for visual feedback
            shouldApply = isAfternoon;
          }

          breakdown.jokerEffects.push({
            jokerName: jokerName,
            jokerEmoji: jokerEmoji,
            effect: effectText,
            amount: effectAmount,
            effectType: effectType,
            isActive: isActive && shouldApply,
          });
        }
      });
    };

    // Separate jokers by effect duration for ordered application
    const persistentJokers: any[] = [];
    const limitedDurationJokers: any[] = [];
    const oneTimeJokers: any[] = [];

    jokers.forEach((joker) => {
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(
        (sj) => sj.name === jokerName
      );

      if (standardizedJoker) {
        const priceEffects = standardizedJoker.effects.filter(
          (effect) => effect.target === 'candy_price' || effect.target === 'sell_multiplier' || effect.target === 'escalating_price_increase'
        );

        if (priceEffects.length > 0) {
          const firstEffect = priceEffects[0]; // Use first price effect to determine duration

          if (firstEffect.duration === 'persistent') {
            persistentJokers.push(joker);
          } else if (firstEffect.duration === 'one-time') {
            // Only include one-time jokers if they have been activated
            const isActivated = activeEffects.some(
              (effect) => effect.jokerId === joker.id && effect.period === currentPeriod
            );
            if (isActivated) {
              oneTimeJokers.push(joker);
            }
          } else if (typeof firstEffect.duration === 'number') {
            limitedDurationJokers.push(joker);
          }
        }
      }
    });

    // Apply effects in order: persistent -> limited duration -> one-time
    [...persistentJokers, ...limitedDurationJokers, ...oneTimeJokers].forEach(
      processJokerEffects
    );

    breakdown.finalPrice = Math.max(0, currentPrice); // Ensure price doesn't go negative
    return breakdown;
  }

  // Get selling multiplier from jokers like Digital Lock
  public getSellMultiplier(jokers: any[], currentPeriod: number): number {
    let multiplier = 1;

    jokers.forEach((joker) => {
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(
        (sj) => sj.name === jokerName
      );

      if (standardizedJoker) {
        const sellEffects = standardizedJoker.effects.filter(
          (effect) => effect.target === 'sell_multiplier'
        );

        sellEffects.forEach((effect) => {
          if (effect.operation === 'multiply') {
            multiplier *= effect.amount;
          }
        });
      }
    });

    return multiplier;
  }

  // Check if a joker has one-time sell multiplier effect and has been activated
  public hasOneTimeSellMultiplier(
    jokers: any[],
    currentPeriod: number,
    activeEffects: any[]
  ): { hasEffect: boolean; jokerName?: string; multiplier?: number } {
    for (const joker of jokers) {
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(
        (sj) => sj.name === jokerName
      );

      if (standardizedJoker) {
        const sellEffects = standardizedJoker.effects.filter(
          (effect) =>
            effect.target === 'sell_multiplier' &&
            effect.duration === 'one-time'
        );

        if (sellEffects.length > 0) {
          // Check if this joker has been activated for this period
          const isActivated = activeEffects.some(
            (effect) => effect.jokerId === joker.id && effect.period === currentPeriod
          );
          
          if (isActivated) {
            return {
              hasEffect: true,
              jokerName: jokerName,
              multiplier: sellEffects[0].amount,
            };
          }
        }
      }
    }

    return { hasEffect: false };
  }

  public hasJokerEffect(
    target: EffectTarget,
    jokers: any[],
    currentPeriod: number
  ): boolean {
    // Clear previous effects
    this.jokerEngine.clearAllEffects();

    // Add current active jokers
    jokers.forEach((joker) => {
      if (joker.type === 'persistent') {
        const jokerName = this.cleanJokerName(joker.name);
        const standardizedJoker = STANDARDIZED_JOKERS.find(
          (sj) => sj.name === jokerName
        );
        if (standardizedJoker) {
          this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
        }
      }
    });

    // Check for effect
    return this.jokerEngine.hasEffect(target, {
      currentPeriod,
    });
  }
}
