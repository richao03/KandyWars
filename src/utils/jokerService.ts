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

  // Helper function to clean joker names (remove " (Copy)" suffix)
  private cleanJokerName(name: string): string {
    return name.replace(' (Copy)', '');
  }

  // Helper function to find joker by name (handles copied jokers)
  private findJokerByName(jokers: any[], name: string): any {
    return jokers.find(j => this.cleanJokerName(j.name) === name);
  }

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
    // Debug logging for inventory_limit target
    if (target === 'inventory_limit') {
      console.log(`🔍 JokerService - Calculating inventory limit with base: ${baseValue}`);
      console.log(`🃏 Available jokers:`, jokers.map(j => `${j.name} (type: ${j.type})`));
    }

    // Clear previous effects
    this.jokerEngine.clearAllEffects();
    
    // Add current active jokers with conditional logic
    jokers.forEach((joker) => {
      // Find the standardized joker by name (handle copied jokers by removing " (Copy)" suffix)
      const jokerName = this.cleanJokerName(joker.name);
      const standardizedJoker = STANDARDIZED_JOKERS.find(sj => sj.name === jokerName);
      
      if (target === 'inventory_limit') {
        console.log(`🔍 Processing joker: "${joker.name}" -> cleaned: "${jokerName}"`);
        console.log(`   Standardized joker found: ${!!standardizedJoker}`);
        if (standardizedJoker) {
          console.log(`   Effects: ${JSON.stringify(standardizedJoker.effects)}`);
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
            // Market Crash applies immediately when activated
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          } else {
            // Add the joker normally
            if (target === 'inventory_limit') {
              console.log(`   ✅ Adding joker to engine: ${standardizedJoker.name}`);
            }
            this.jokerEngine.addJoker(standardizedJoker, currentPeriod);
          }
      }
    });

    // Calculate base result from joker effects
    let result = this.jokerEngine.applyEffects(baseValue, target, {
      currentPeriod
    });

    if (target === 'inventory_limit') {
      console.log(`   🎯 After joker engine effects: ${result}`);
    }

    // Handle special daily effects like Inductive Reasoning
    if (target === 'inventory_limit') {
      const inductiveReasoning = this.findJokerByName(jokers, 'Inductive Reasoning');
      if (inductiveReasoning) {
        // Add 3 inventory spaces for each completed day
        const completedDays = Math.floor(currentPeriod / 8);
        const dailyBonus = completedDays * 3;
        result += dailyBonus;
        console.log(`   📚 Inductive Reasoning bonus: +${dailyBonus} (${completedDays} completed days)`);
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
    const compoundInterestJoker = this.findJokerByName(jokers, 'Compound Interest');
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
    const manipulationJoker = this.findJokerByName(jokers, 'Market Manipulation');
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
    const manipulationJoker = this.findJokerByName(jokers, 'Market Manipulation');
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
    const bigShortJoker = this.findJokerByName(jokers, 'The Big Short');
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
        const jokerName = this.cleanJokerName(joker.name);
        const standardizedJoker = STANDARDIZED_JOKERS.find(sj => sj.name === jokerName);
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