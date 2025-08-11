// Shared joker service for applying effects across contexts
import { JokerEffectEngine, STANDARDIZED_JOKERS, EffectTarget } from './jokerEffectEngine';

// Hook for mini-games to get study time multiplier
export const useStudyTimeMultiplier = (jokers: any[], currentPeriod: number): number => {
  const jokerService = JokerService.getInstance();
  return jokerService.applyJokerEffects(1, 'study_time', jokers, currentPeriod);
};

export class JokerService {
  private static instance: JokerService;
  private jokerEngine = new JokerEffectEngine();

  private constructor() {}

  public static getInstance(): JokerService {
    if (!JokerService.instance) {
      JokerService.instance = new JokerService();
    }
    return JokerService.instance;
  }

  public applyJokerEffects(
    baseValue: number,
    target: EffectTarget,
    jokers: any[],
    currentPeriod: number,
    inventoryLimit?: number,
    candyCount?: number
  ): number {
    // Clear previous effects
    this.jokerEngine.clearAllEffects();
    
    // Add current active jokers with conditional logic
    jokers.forEach((joker) => {
      // Find the standardized joker by name (all jokers should have a name)
      const standardizedJoker = STANDARDIZED_JOKERS.find(sj => sj.name === joker.name);
      
      if (standardizedJoker) {
          // Handle conditional jokers like Even Stevens and Odd Todd
          if (joker.name === 'Even Stevens' && target === 'candy_price') {
            // Only apply if inventory limit is even
            if (inventoryLimit && inventoryLimit % 2 === 0) {
              this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
            }
          } else if (joker.name === 'Odd Todd' && target === 'candy_price') {
            // Only apply if inventory limit is odd
            if (inventoryLimit && inventoryLimit % 2 === 1) {
              this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
            }
          } else if (joker.name === 'Market Crash' && target === 'candy_price') {
            // Market Crash applies immediately when activated
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          } else {
            // Add the joker normally
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
      }
    });

    // Calculate base result from joker effects
    let result = this.jokerEngine.applyEffects(baseValue, target, {
      currentPeriod
    });

    // Handle special daily effects like Inductive Reasoning
    if (target === 'inventory_limit') {
      const inductiveReasoning = jokers.find(j => j.name === 'Inductive Reasoning');
      if (inductiveReasoning) {
        // Add 3 inventory spaces for each completed day
        const completedDays = Math.floor(currentPeriod / 8);
        const dailyBonus = completedDays * 3;
        result += dailyBonus;
      }
    }

    return result;
  }

  // Calculate compound interest bonus for end-of-day
  public calculateCompoundInterest(
    jokers: any[],
    currentPeriod: number,
    candyCount: number
  ): number {
    const compoundInterestJoker = jokers.find(j => j.name === 'Compound Interest');
    if (!compoundInterestJoker) return 0;

    const standardizedJoker = STANDARDIZED_JOKERS.find(sj => sj.name === 'Compound Interest');
    if (!standardizedJoker) return 0;

    // $10 per candy held at end of day
    const bonusPerCandy = standardizedJoker.effects[0].amount;
    const totalBonus = candyCount * bonusPerCandy;
    
    console.log(`💰 Compound Interest: ${candyCount} candies × $${bonusPerCandy} = $${totalBonus}`);
    
    return totalBonus;
  }

  // Apply market manipulation to set chosen candy to highest price
  public applyMarketManipulation(
    jokers: any[],
    currentPeriod: number,
    chosenCandyType: string,
    allCandyPrices: Record<string, number>
  ): number {
    const manipulationJoker = jokers.find(j => j.name === 'Market Manipulation');
    if (!manipulationJoker) return 0;

    const standardizedJoker = STANDARDIZED_JOKERS.find(sj => sj.name === 'Market Manipulation');
    if (!standardizedJoker) return 0;

    // Find the highest price among all candies
    const highestPrice = Math.max(...Object.values(allCandyPrices));
    const originalPrice = allCandyPrices[chosenCandyType] || 0;
    
    console.log(`📈 Market Manipulation: ${chosenCandyType} price ${originalPrice} → ${highestPrice} (highest market price)`);
    
    // Return the highest price to set for the chosen candy
    return highestPrice;
  }

  // Check if market manipulation is available
  public hasMarketManipulation(
    jokers: any[],
    currentPeriod: number
  ): boolean {
    const manipulationJoker = jokers.find(j => j.name === 'Market Manipulation');
    return !!manipulationJoker;
  }

  // Apply big short to set chosen candy to lowest price
  public applyBigShort(
    jokers: any[],
    currentPeriod: number,
    chosenCandyType: string,
    allCandyPrices: Record<string, number>
  ): number {
    const bigShortJoker = jokers.find(j => j.name === 'The Big Short');
    if (!bigShortJoker) return 0;

    const standardizedJoker = STANDARDIZED_JOKERS.find(sj => sj.name === 'The Big Short');
    if (!standardizedJoker) return 0;

    // Find the lowest price among all candies
    const lowestPrice = Math.min(...Object.values(allCandyPrices));
    const originalPrice = allCandyPrices[chosenCandyType] || 0;
    
    console.log(`📉 The Big Short: ${chosenCandyType} price ${originalPrice} → ${lowestPrice} (lowest market price)`);
    
    // Return the lowest price to set for the chosen candy
    return lowestPrice;
  }

  // Check if big short is available
  public hasBigShort(
    jokers: any[],
    currentPeriod: number
  ): boolean {
    const bigShortJoker = jokers.find(j => j.name === 'The Big Short');
    return !!bigShortJoker;
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
        const standardizedJoker = STANDARDIZED_JOKERS.find(sj => sj.name === joker.name);
        if (standardizedJoker) {
          this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
        }
      }
    });

    // Check for effect
    return this.jokerEngine.hasEffect(target, {
      currentPeriod
    });
  }
}