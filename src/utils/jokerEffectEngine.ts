// Centralized Joker Effect System
// This file contains all joker effect logic in one place

export type EffectTarget =
  | 'inventory_limit' // affects inventory capacity
  | 'candy_price' // affects candy prices
  | 'period_count' // affects time/periods
  | 'money' // affects wallet balance
  | 'hint_chance' // affects event hint visibility
  | 'stash_protection' // protects from confiscation
  | 'event_immunity' // prevents negative events
  | 'study_time' // affects mini-game time limits
  | 'joker_duplicate' // duplicates another joker
  | 'candy_conversion' // converts candy types
  | 'time_skip' // skips time with benefits
  | 'candy_generation' // generates candy each period
  | 'money_protection' // protects money from theft events
  | 'empty_inventory_bonus' // gives money reward for empty inventory
  | 'holding_inventory_bonus' // gives money reward for holding inventory
  | 'drought_relief_bonus' // gives money reward for no sales over multiple periods
  | 'compound_interest_bonus' // gives money per candy held at end of day
  | 'market_manipulation' // sets chosen candy to highest market price
  | 'big_short'; // sets chosen candy to lowest market price

export type EffectOperation =
  | 'add' // + operation: current + amount
  | 'multiply' // * operation: current * amount
  | 'set' // = operation: set to specific value
  | 'enable' // boolean operation: activate feature
  | 'activate' // special operation: triggers an action
  | 'convert' // conversion operation: exchange items
  | 'generate' // generation operation: creates items
  | 'match_highest' // special operation: set to highest available price
  | 'match_lowest'; // special operation: set to lowest available price

export interface JokerEffect {
  target: EffectTarget;
  operation: EffectOperation;
  amount: number;
  duration?: 'persistent' | 'one-time' | number; // number = periods
  conditions?: {
    candyType?: string;
    location?: string;
    period?: number;
  };
}

export interface StandardizedJoker {
  id: number;
  name: string;
  description: string;
  subject: string;
  effects: JokerEffect[];
}

// Core effect resolution engine
export class JokerEffectEngine {
  private activeEffects: Map<
    string,
    { joker: StandardizedJoker; activatedAt: number }
  > = new Map();
  private nextInstanceId = 0;

  // Add a joker to active effects (allows multiple instances of same joker)
  addJoker(joker: StandardizedJoker, currentPeriod: number) {
    const uniqueKey = `${joker.id}_${this.nextInstanceId++}`;
    this.activeEffects.set(uniqueKey, { joker, activatedAt: currentPeriod });
    console.log(`🔧 JokerEffectEngine: Added "${joker.name}" with key "${uniqueKey}". Total effects: ${this.activeEffects.size}`);
  }

  // Remove a joker from active effects
  removeJoker(jokerId: number) {
    this.activeEffects.delete(jokerId);
  }

  // Get all active effects for a specific target
  getEffectsForTarget(
    target: EffectTarget,
    context: {
      currentPeriod: number;
      candyType?: string;
      location?: string;
    }
  ): JokerEffect[] {
    const effects: JokerEffect[] = [];

    for (const [id, { joker, activatedAt }] of this.activeEffects.entries()) {
      for (const effect of joker.effects) {
        if (effect.target !== target) continue;

        // Check duration
        if (
          effect.duration === 'one-time' &&
          context.currentPeriod > activatedAt
        ) {
          continue; // One-time effect already used
        }
        if (
          typeof effect.duration === 'number' &&
          context.currentPeriod > activatedAt + effect.duration
        ) {
          continue; // Timed effect expired
        }

        // Check conditions
        if (effect.conditions) {
          if (
            effect.conditions.candyType &&
            effect.conditions.candyType !== context.candyType
          )
            continue;
          if (
            effect.conditions.location &&
            effect.conditions.location !== context.location
          )
            continue;
          if (
            effect.conditions.period &&
            effect.conditions.period !== context.currentPeriod
          )
            continue;
        }

        effects.push(effect);
      }
    }

    return effects;
  }

  // Apply effects to a base value
  applyEffects(
    baseValue: number,
    target: EffectTarget,
    context: {
      currentPeriod: number;
      candyType?: string;
      location?: string;
    }
  ): number {
    const effects = this.getEffectsForTarget(target, context);
    let result = baseValue;

    if (target === 'inventory_limit') {
      console.log(`🔧 JokerEffectEngine: Processing ${effects.length} effects for ${target}`);
      console.log(`   Effects found:`, effects.map(e => `${e.operation} ${e.amount}`));
    }

    // Apply operations in order: set -> multiply -> add
    const setEffects = effects.filter((e) => e.operation === 'set');
    const multiplyEffects = effects.filter((e) => e.operation === 'multiply');
    const addEffects = effects.filter((e) => e.operation === 'add');

    // SET operations override the base value
    if (setEffects.length > 0) {
      result = setEffects[setEffects.length - 1].amount; // Last set wins
    }

    // MULTIPLY operations
    for (const effect of multiplyEffects) {
      result *= effect.amount;
    }

    // ADD operations
    for (const effect of addEffects) {
      result += effect.amount;
    }

    return result;
  }

  // Check if a boolean effect is enabled
  hasEffect(
    target: EffectTarget,
    context: {
      currentPeriod: number;
      candyType?: string;
      location?: string;
    }
  ): boolean {
    const effects = this.getEffectsForTarget(target, context);
    return effects.some((effect) => effect.operation === 'enable');
  }

  // Clean up expired one-time effects
  cleanupExpiredEffects(currentPeriod: number) {
    for (const [id, { joker, activatedAt }] of this.activeEffects.entries()) {
      const hasOnlyOneTimeEffects = joker.effects.every(
        (effect) => effect.duration === 'one-time'
      );
      if (hasOnlyOneTimeEffects && currentPeriod > activatedAt) {
        this.activeEffects.delete(id);
      }
    }
  }

  // Get all active jokers
  getActiveJokers(): StandardizedJoker[] {
    return Array.from(this.activeEffects.values()).map(({ joker }) => joker);
  }

  // Clear all active effects
  clearAllEffects() {
    this.activeEffects.clear();
  }

  // Get debug info for current effects
  getDebugInfo(currentPeriod: number): string {
    const info: string[] = [];
    for (const [id, { joker, activatedAt }] of this.activeEffects.entries()) {
      info.push(
        `${joker.name} (ID: ${id}, Active for: ${currentPeriod - activatedAt} periods)`
      );
      for (const effect of joker.effects) {
        info.push(`  - ${effect.target} ${effect.operation} ${effect.amount}`);
      }
    }
    return info.join('\n');
  }
}

// Predefined standardized jokers with the new system
export const STANDARDIZED_JOKERS: StandardizedJoker[] = [
  // MATH JOKERS
  {
    id: 1,
    name: 'Double Up',
    description: 'Double the price of one candy for one period',
    subject: 'Math',
    effects: [
      {
        target: 'candy_price',
        operation: 'multiply',
        amount: 2,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 2,
    name: 'Time Equation',
    description: 'Reverse one period using temporal mathematics',
    subject: 'Math',
    effects: [
      {
        target: 'period_count',
        operation: 'add',
        amount: -1,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 3,
    name: 'Geometric Expansion',
    description:
      'Increase inventory space using spatial geometry \nInventory Capacity + 10',
    subject: 'Math',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 10,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 28,
    name: 'Even Stevens',
    description:
      'If total inventory limit is an even number, all candy prices are 50% higher',
    subject: 'Math',
    effects: [
      {
        target: 'candy_price',
        operation: 'multiply',
        amount: 1.5,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 29,
    name: 'Odd Todd',
    description:
      'If total inventory limit is an odd number, all candy prices are 50% higher',
    subject: 'Math',
    effects: [
      {
        target: 'candy_price',
        operation: 'multiply',
        amount: 1.5,
        duration: 'persistent',
      },
    ],
  },

  // COMPUTER JOKERS
  {
    id: 11,
    name: 'Scout',
    description: '50% chance to hear about events before it happens',
    subject: 'Computer',
    effects: [
      {
        target: 'hint_chance',
        operation: 'set',
        amount: 0.5,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 12,
    name: 'Predictor',
    description: '100% chance to hear about events before it happens',
    subject: 'Computer',
    effects: [
      {
        target: 'hint_chance',
        operation: 'set',
        amount: 1.0,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 13,
    name: 'Propacandies',
    description:
      'Make one candy price crash by spreading untrue news\n selected candy cost 10% of original price',
    subject: 'Computer',
    effects: [
      {
        target: 'candy_price',
        operation: 'multiply',
        amount: 0.1, // 10% of original price
        duration: 'one-time',
      },
    ],
  },
  {
    id: 14,
    name: 'Data Compression',
    description:
      'Candied no loss compression to save space\n Inventory Capacity +13',
    subject: 'Computer',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 13,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 15,
    name: 'Glitch in the Matrix',
    description: 'Choose a joker in your possession, and copy it',
    subject: 'Computer',
    effects: [
      {
        target: 'joker_duplicate',
        operation: 'activate',
        amount: 1,
        duration: 'one-time',
      },
    ],
  },

  // HOME EC JOKERS
  {
    id: 19,
    name: 'Vacuum Sealer',
    description: 'All candy, no air! \nInventory capacity * 2',
    subject: 'Home Economics',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'multiply',
        amount: 2,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 20,
    name: 'Pomodoro Timer',
    description: 'Studying mini-games have 50% more time',
    subject: 'Home Economics',
    effects: [
      {
        target: 'study_time',
        operation: 'multiply',
        amount: 1.5, // 50% more time = multiply by 1.5
        duration: 'persistent',
      },
    ],
  },
  {
    id: 63,
    name: 'Fridge Organizer',
    description: 'Inventory limit +15',
    subject: 'Home Economics',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 15,
        duration: 'persistent',
      },
    ],
  },
  // ECONOMY JOKERS
  {
    id: 27,
    name: 'Master of Trade',
    description:
      'Exchange any candy for another type of candy. \n No questions asked!',
    subject: 'Economy',
    effects: [
      {
        target: 'candy_conversion',
        operation: 'convert',
        amount: 1, // 1:1 conversion ratio
        duration: 'one-time',
      },
    ],
  },

  {
    id: 64,
    name: 'Market Crash',
    description:
      'All candy prices drop by 50% for one period (great for bulk buying)',
    subject: 'Economy',
    effects: [
      {
        target: 'candy_price',
        operation: 'multiply',
        amount: 0.5,
        duration: 'one-time',
      },
    ],
  },

  // HISTORY JOKERS
  {
    id: 35,
    name: 'Temporary Emperor',
    description:
      'skip one period and gain the equivalent of selling 3 of every candy',
    subject: 'History',
    effects: [
      {
        target: 'time_skip',
        operation: 'activate',
        amount: 3, // equivalent to selling 3 of each candy
        duration: 'one-time',
      },
    ],
  },

  {
    id: 37,
    name: 'Roman Coin',
    description: 'Sell the ancient coin for some modern coins!',
    subject: 'History',
    effects: [
      {
        target: 'money',
        operation: 'add',
        amount: 200,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 40,
    name: 'Medieval Shield',
    description: 'Protect against one negative event',
    subject: 'History',
    effects: [
      {
        target: 'event_immunity',
        operation: 'enable',
        amount: 1,
        duration: 1, // Lasts 1 period
      },
    ],
  },
  {
    id: 41,
    name: 'Drought Relief',
    description: 'If you have made no sales in 3 periods, you receive $150',
    subject: 'History',
    effects: [
      {
        target: 'drought_relief_bonus',
        operation: 'add',
        amount: 150,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 63,
    name: 'Treasure Chest',
    description: 'Inventory limit +15',
    subject: 'History',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 15,
        duration: 'persistent',
      },
    ],
  },

  // LOGIC JOKERS
  {
    id: 43,
    name: 'Inductive Reasoning',
    description: 'Every new day, inventory incrases by 3',
    subject: 'Logic',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 3,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 45,
    name: 'Lock Pick',
    description: 'Bypass one negative event',
    subject: 'Logic',
    effects: [
      {
        target: 'event_immunity',
        operation: 'enable',
        amount: 1,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 48,
    name: 'Digital Lock',
    description: 'Double profits for one period',
    subject: 'Logic',
    effects: [
      {
        target: 'candy_price',
        operation: 'multiply',
        amount: 2,
        duration: 1, // Lasts 1 period
      },
    ],
  },
  {
    id: 50,
    name: 'Safe Deposit',
    description: 'Protect money from theft events',
    subject: 'Logic',
    effects: [
      {
        target: 'money_protection',
        operation: 'enable',
        amount: 1,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 46,
    name: 'Something from Nothing',
    description: 'Every period, you get one of each candy',
    subject: 'Logic',
    effects: [
      {
        target: 'candy_generation',
        operation: 'generate',
        amount: 1,
        duration: 'persistent',
      },
    ],
  },

  // GYM JOKERS
  {
    id: 51,
    name: "Bet you I'm faster",
    description: 'Gain $100 from being the fastet kid alive',
    subject: 'Gym',
    effects: [
      {
        target: 'money',
        operation: 'add',
        amount: 100, // No direct effect, could be used for speed boost in future
        duration: 'one-time',
      },
    ],
  },
  {
    id: 66,
    name: 'Bulk Up',
    description: 'Inventory limit +20',
    subject: 'Gym',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 20,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 67,
    name: 'Embrace the Grind',
    description: 'Every period you end with 0 inventory, you get $50',
    subject: 'Gym',
    effects: [
      {
        target: 'empty_inventory_bonus',
        operation: 'add',
        amount: 50,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 68,
    name: 'Diamond Hand',
    description:
      'Every period when you have inventory but you dont sell, you get $50',
    subject: 'Gym',
    effects: [
      {
        target: 'holding_inventory_bonus',
        operation: 'add',
        amount: 50,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 72,
    name: 'Deep Storage',
    description: 'Increase inventory limit by 30 for one period',
    subject: 'Home Economics',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 30,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 74,
    name: 'Candy Vault',
    description: 'Protect stash from confiscation permanently',
    subject: 'History',
    effects: [
      {
        target: 'stash_protection',
        operation: 'enable',
        amount: 1,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 75,
    name: 'Compound Interest',
    description: 'Gain $10 for every candy held at the end of each day',
    subject: 'Economy',
    effects: [
      {
        target: 'compound_interest_bonus',
        operation: 'add',
        amount: 10, // per candy in inventory
        duration: 'persistent',
      },
    ],
  },
  {
    id: 76,
    name: 'Market Manipulation',
    description:
      'Set any candy to the highest price of all candies this period',
    subject: 'Economy',
    effects: [
      {
        target: 'market_manipulation',
        operation: 'match_highest',
        amount: 1, // indicates one-time usage
        duration: 'one-time',
      },
    ],
  },
  {
    id: 77,
    name: 'The Big Short',
    description: 'Set any candy to the lowest price of all candies this period',
    subject: 'Economy',
    effects: [
      {
        target: 'big_short',
        operation: 'match_lowest',
        amount: 1, // indicates one-time usage
        duration: 'one-time',
      },
    ],
  },
];

// Helper function to convert old jokers to standardized format
export function convertLegacyJoker(legacyJoker: any): StandardizedJoker {
  // This would convert old joker format to new standardized format
  // Implementation depends on the exact legacy format
  return {
    id: legacyJoker.id,
    name: legacyJoker.name,
    description: legacyJoker.description,
    subject: 'Unknown',
    effects: [], // Would need to be mapped based on legacy effect
  };
}

// Helper functions for compatibility with old system
export const getJokersBySubject = (subject: string): StandardizedJoker[] => {
  return STANDARDIZED_JOKERS.filter((joker) => joker.subject === subject);
};

export const MATH_JOKERS = getJokersBySubject('Math');
export const COMPUTER_JOKERS = getJokersBySubject('Computer');
export const HOME_EC_JOKERS = getJokersBySubject('Home Economics');
export const ECONOMY_JOKERS = getJokersBySubject('Economy');
export const HISTORY_JOKERS = getJokersBySubject('History');
export const LOGIC_JOKERS = getJokersBySubject('Logic');
export const GYM_JOKERS = getJokersBySubject('Gym');

export const ALL_JOKERS = {
  Math: MATH_JOKERS,
  Computer: COMPUTER_JOKERS,
  'Home Economics': HOME_EC_JOKERS,
  Economy: ECONOMY_JOKERS,
  History: HISTORY_JOKERS,
  Logic: LOGIC_JOKERS,
  Gym: GYM_JOKERS,
};
