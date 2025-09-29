// Centralized Joker Effect System
// This file contains all joker effect logic in one place

export type EffectTarget =
  | 'inventory_limit' // affects inventory capacity
  | 'candy_price' // affects candy prices
  | 'sell_multiplier' // multiplies selling profits only
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
  | 'big_short' // sets chosen candy to lowest market price
  | 'escalating_price_increase' // increases all candy prices by escalating amounts each period
  | 'morning_inventory_bonus' // gives money per candy in inventory at start of school day
  | 'period_start_inventory_bonus' // gives money per candy in inventory at start of each period
  | 'deposit_bonus' // gives bonus percentage when depositing to piggy bank
  | 'bulk_purchase_discount' // gives discount when buying more than half inventory space
  | 'deli_price_discount' // gives discount at afterschool deli
  | 'fill_inventory_choice' // fills inventory with player's choice of candy
  | 'time_travel_to_period' // allows player to select and travel to a specific period of the current day
  | 'found_money_multiplier' // multiplies money found during 'find money' events
  | 'allowance_multiplier' // multiplies daily allowance amount
  | 'allowance_add' // adds fixed amount to daily allowance
  | 'every_third_sale_bonus' // gives bonus on every 3rd candy sold
  | 'next_sale_multiplier' // multiplies next sale only (one-time)
  | 'even_period_sale_bonus' // gives bonus on sales during even periods
  | 'consecutive_sale_bonus' // gives escalating bonus for consecutive period sales
  | 'trigger_find_money_event' // triggers a find money event with max amount
  | 'bulk_sale_bonus' // gives bonus when selling more than half inventory space
  | 'afternoon_sale_bonus' // gives bonus during afternoon periods
  | 'morning_purchase_discount' // gives discount during morning periods
  | 'location_highlights' // highlights locations with good events
  | 'randomize_prices' // randomizes all candy prices
  | 'price_prediction'; // enables price prediction features

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
  subject: string;
  type: 'one-time' | 'persistent';
  flavorText: string;
  description: string;
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
    console.log(
      `🔧 JokerEffectEngine: Added "${joker.name}" with key "${uniqueKey}". Total effects: ${this.activeEffects.size}`
    );
  }

  // Remove a joker from active effects
  removeJoker(jokerId: number) {
    this.activeEffects.delete(jokerId.toString());
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
      console.log(
        `🔧 JokerEffectEngine: Processing ${effects.length} effects for ${target}`
      );
      console.log(
        `   Effects found:`,
        effects.map((e) => `${e.operation} ${e.amount}`)
      );
    }

    // Apply operations in order: set -> add -> multiply
    // This ensures multiplicative effects apply to the total (base + additions)
    const setEffects = effects.filter((e) => e.operation === 'set');
    const multiplyEffects = effects.filter((e) => e.operation === 'multiply');
    const addEffects = effects.filter((e) => e.operation === 'add');

    // SET operations override the base value
    if (setEffects.length > 0) {
      result = setEffects[setEffects.length - 1].amount; // Last set wins
    }

    // ADD operations first (build up the total)
    for (const effect of addEffects) {
      result += effect.amount;
    }

    // MULTIPLY operations last (apply to the final total)
    for (const effect of multiplyEffects) {
      result *= effect.amount;
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
    subject: 'Math',
    type: 'one-time',
    flavorText: 'The theorem of the period is f(x) = 2x',
    description: '2x the price of 1 candy for 1 period',
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
    subject: 'Math',
    type: 'one-time',
    flavorText:
      "When this baby hits 88 mph, you're gonna see some serious stuff",
    description: 'Reverse 1 period using temporal mathematics',
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
    subject: 'Math',
    type: 'persistent',
    flavorText: 'Increase inventory space using spatial geometry',
    description: 'Inventory limit +15',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 15,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 31,
    name: 'Ace the Test',
    subject: 'Math',
    type: 'persistent',
    flavorText: 'Perfect scores mean better rewards from mom',
    description: '2x your daily allowance',
    effects: [
      {
        target: 'allowance_multiplier',
        operation: 'multiply',
        amount: 2,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 29,
    name: 'Even Stevens',
    subject: 'Math',
    type: 'persistent',
    flavorText: 'All good things come in pairs',
    description:
      'If total inventory limit is an even number, all candy sale +10%',
    effects: [
      {
        target: 'sell_multiplier',
        operation: 'multiply',
        amount: 1.1,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 30,
    name: 'Odd Todd',
    subject: 'Math',
    type: 'persistent',
    flavorText: 'Never tell me the odds!',
    description:
      'If total inventory limit is an odd number, all candy sale +10%',
    effects: [
      {
        target: 'sell_multiplier',
        operation: 'multiply',
        amount: 1.1,
        duration: 'persistent',
      },
    ],
  },

  // COMPUTER JOKERS
  {
    id: 6,
    name: 'Tapped in',
    subject: 'Computer',
    type: 'persistent',
    flavorText: 'Signal Through the Noise',
    description: 'Hear about events before it happens',
    effects: [
      {
        target: 'hint_chance',
        operation: 'set',
        amount: 1,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 7,
    name: 'Side Gig',
    subject: 'Computer',
    type: 'persistent',
    flavorText: 'Turn your coding skills into extra cash',
    description: '2x your daily allowance',
    effects: [
      {
        target: 'allowance_multiplier',
        operation: 'multiply',
        amount: 2,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 8,
    name: 'Propacandies',
    subject: 'Computer',
    type: 'one-time',
    description: 'Drop the price of 1 candy by 90% for 1 period',
    flavorText: 'AI video to spread untrue news about a candy',
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
    id: 9,
    name: 'Data Compression',
    subject: 'Computer',
    type: 'one-time',
    flavorText: 'No loss compression for sugar to save space',
    description: 'Inventory limit + 13',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 13,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 10,
    name: 'Glitch in the Matrix',
    subject: 'Computer',
    type: 'one-time',
    flavorText: "Didn't I just see that joker?",
    description: 'Choose 1 joker in your possession, and copy it',
    effects: [
      {
        target: 'joker_duplicate',
        operation: 'activate',
        amount: 1,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 11,
    name: 'Trojan Horse',
    subject: 'Computer',
    type: 'persistent',
    flavorText: 'The virus resets nightly during the automated antivirus sweep',
    description: 'Every period candy price increase by $10, resets daily',
    effects: [
      {
        target: 'escalating_price_increase',
        operation: 'activate',
        amount: 10,
        duration: 'persistent',
      },
    ],
  },

  // HOME EC JOKERS
  {
    id: 12,
    name: 'Vacuum Sealer',
    subject: 'Home Economics',
    type: 'persistent',
    flavorText: 'All candy, no air!',
    description: '2x inventory limit',
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
    id: 14,
    name: 'Fridge Organizer',
    subject: 'Home Economics',
    type: 'persistent',
    flavorText: "Fold them neatly please, don't jut shove it in",
    description: 'Inventory limit +15',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 15,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 15,
    name: 'Deep Storage',
    subject: 'Home Economics',
    type: 'one-time',
    flavorText: 'Just shove it in the bag till it pops',
    description: 'Increase inventory limit +30 for 1 period',
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
    id: 16,
    name: 'Bake Sale',
    subject: 'Home Economics',
    type: 'one-time',
    flavorText: 'Cash rules everything around me CREAM! and cookies',
    description: 'Instantly Gain $1000 ',
    effects: [
      {
        target: 'money',
        operation: 'add',
        amount: 1000,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 17,
    name: 'Home Made',
    subject: 'Home Economics',
    type: 'persistent',
    flavorText: 'Home made is better than store bought',
    description: 'Gain $10 for every candy you bring to period 1 on a new day',
    effects: [
      {
        target: 'morning_inventory_bonus',
        operation: 'add',
        amount: 10, // per candy in inventory at start of school day
        duration: 'persistent',
      },
    ],
  },
  {
    id: 18,
    name: 'Decoy Cake',
    subject: 'Home Economics',
    type: 'one-time',
    flavorText: 'Is that made of cake!?',
    description: 'Prevents 1 negative event then is consumed',
    effects: [
      {
        target: 'event_immunity',
        operation: 'enable',
        amount: 1, // blocks one negative event
        duration: 'one-time',
      },
    ],
  },

  // HISTORY JOKERS
  {
    id: 66,
    name: 'Treasure Chest',
    subject: 'History',
    type: 'persistent',
    flavorText: 'Found a chest, but its empty... fill it with candy!',
    description: 'Inventory limit +15',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 15,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 35,
    name: 'Temporary Emperor',
    subject: 'History',
    type: 'one-time',
    flavorText: '3 of everything, NOW!',
    description:
      'Skip 1 period and gain the equivalent of selling 3 of all candy',
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
    subject: 'History',
    type: 'one-time',
    flavorText: "Mo' money mo' problems, but I'll take the coin",
    description: 'Instantly gain $2000',
    effects: [
      {
        target: 'money',
        operation: 'add',
        amount: 2000,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 67,
    name: 'Medieval Shield',
    subject: 'History',
    type: 'one-time',
    flavorText: 'This shield belonged to one Captain Rogers, of Brooklyn',
    description: 'Protect against one negative event',
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
    name: 'The Bounceback',
    subject: 'Gym',
    type: 'persistent',
    flavorText: "Don't call it a come back!",
    description: 'Every 3 period of no sale, you receive $1000',
    effects: [
      {
        target: 'drought_relief_bonus',
        operation: 'add',
        amount: 1000,
        duration: 'persistent',
      },
    ],
  },

  // LOGIC JOKERS
  {
    id: 27,
    name: 'Master Negotiator',
    subject: 'Logic',
    type: 'one-time',
    flavorText: 'Trust me this is a win-win-win situation',
    description: 'You can replace 1 type of candy for another type of candy',
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
    id: 43,
    name: 'Inductive Reasoning',
    subject: 'Logic',
    type: 'persistent',
    flavorText: "Every day's a reason to add three more.",
    description: 'Every new day, inventory limit +3',
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
    name: 'Loophole',
    subject: 'Logic',
    type: 'one-time',
    flavorText: 'Slide through like you had a hall pass',
    description: 'Bypass one negative event',
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
    name: 'Pursuasion',
    subject: 'Logic',
    type: 'one-time',
    flavorText: 'Oh these? These are limited edition man',
    description: '2x profits for next sale',
    effects: [
      {
        target: 'sell_multiplier',
        operation: 'multiply',
        amount: 2,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 46,
    name: 'Something from Nothing',
    subject: 'Logic',
    type: 'persistent',
    flavorText: 'You had nothing, now you have one thing',
    description: 'Every period, you get +1 of all candy',
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
    id: 13,
    name: 'Coaching',
    subject: 'Gym',
    type: 'persistent',
    flavorText: 'Our deepest fear is that we are powerful beyond measure.',
    description: '+$300 to daily allowance',
    effects: [
      {
        target: 'allowance_add',
        operation: 'add',
        amount: 300,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 54,
    name: 'Bulk Up',
    subject: 'Gym',
    type: 'persistent',
    flavorText: 'Get brolic to carry more goods',
    description: 'Inventory limit +15',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 15,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 55,
    name: 'Embrace the Grind',
    subject: 'Gym',
    type: 'persistent',
    flavorText: 'Stay hungry, no, stay starving.',
    description: 'Every period you end with 0 inventory, you get $500',
    effects: [
      {
        target: 'empty_inventory_bonus',
        operation: 'add',
        amount: 500,
        duration: 'persistent',
      },
    ],
  },

  {
    id: 74,
    name: 'Candy Vault',
    subject: 'History',
    type: 'persistent',
    flavorText: 'Never let no one know, how much dough you hold',
    description: 'Protect stash from confiscation permanently',
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
    id: 19,
    name: 'Market Crash',
    subject: 'Economy',
    type: 'one-time',
    flavorText: 'Flood the market like its Halloween',
    description: 'All candy prices drop by 50% for 1 period',
    effects: [
      {
        target: 'candy_price',
        operation: 'multiply',
        amount: 0.5,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 20,
    name: 'Market Manipulation',
    subject: 'Economy',
    type: 'one-time',
    flavorText: 'Pump and dump!',
    description:
      'Set any candy to the highest price of all candies this period',
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
    id: 21,
    name: 'The Big Short',
    subject: 'Economy',
    type: 'one-time',
    flavorText: 'Crash the price then buy it back for cheap',
    description: 'Set any candy to the lowest price of all candies this period',
    effects: [
      {
        target: 'big_short',
        operation: 'match_lowest',
        amount: 1, // indicates one-time usage
        duration: 'one-time',
      },
    ],
  },
  {
    id: 22,
    name: 'Deposit Bonus',
    subject: 'Economy',
    type: 'persistent',
    flavorText: 'A dollar saved is a dollar earned',
    description: 'Get 10% bonus when depositing money to the piggy bank',
    effects: [
      {
        target: 'deposit_bonus',
        operation: 'multiply',
        amount: 1.1, // 10% bonus (multiply by 1.1)
        duration: 'persistent',
      },
    ],
  },
  {
    id: 23,
    name: 'Bulk Sale',
    subject: 'Economy',
    type: 'persistent',
    flavorText: 'Sell in bulk, profit big',
    description: 'Sell >50% of your inventory space in one sale and get +20% sale profit',
    effects: [
      {
        target: 'bulk_sale_bonus',
        operation: 'multiply',
        amount: 1.2, // 20% bonus (multiply by 1.2)
        duration: 'persistent',
      },
    ],
  },
  {
    id: 24,
    name: 'The Good Old Days',
    subject: 'History',
    type: 'persistent',
    flavorText: 'OG stories for OG prices -- half off from the bodega plug',
    description: 'All candy at the afterschool deli costs half price',
    effects: [
      {
        target: 'deli_price_discount',
        operation: 'multiply',
        amount: 0.5, // 50% discount (multiply by 0.5)
        duration: 'persistent',
        conditions: {
          location: 'deli',
        },
      },
    ],
  },
  {
    id: 25,
    name: "Bet You I'm Faster",
    subject: 'Gym',
    type: 'one-time',
    flavorText: 'Bet you all the candies in the world',
    description: 'Fill your inventory with any 1 candy',
    effects: [
      {
        target: 'fill_inventory_choice',
        operation: 'activate',
        amount: 1,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 50,
    name: 'Diamond Hand',
    subject: 'Economy',
    type: 'persistent',
    flavorText: 'Hodl the line! 🚀💎🙌',
    description: '+$50 per candy in your inventory at the start of each period',
    effects: [
      {
        target: 'period_start_inventory_bonus',
        operation: 'add',
        amount: 50,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 26,
    name: 'Tachyonic Sprint',
    subject: 'Gym',
    type: 'one-time',
    flavorText: 'Run so fast time goes backwards',
    description: 'Travel back to any period of today ',
    effects: [
      {
        target: 'time_travel_to_period',
        operation: 'activate',
        amount: 1,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 28,
    name: 'Therefore...',
    subject: 'Logic',
    type: 'one-time',
    flavorText: 'By logical deduction, you deserve more allowance',
    description: '+$200 to daily allowance',
    effects: [
      {
        target: 'allowance_add',
        operation: 'add',
        amount: 200,
        duration: 'one-time',
      },
    ],
  },

  // RECESS JOKERS
  {
    id: 32,
    name: 'Jump Rope Rhythm',
    subject: 'Recess',
    type: 'persistent',
    flavorText: 'Keep the rhythm going, every third counts',
    description: 'Every 3rd sale gets +33% bonus',
    effects: [
      {
        target: 'every_third_sale_bonus',
        operation: 'multiply',
        amount: 1.33,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 33,
    name: 'Feed the Beast',
    subject: 'Recess',
    type: 'persistent',
    flavorText: 'The piggy bank grows stronger with every deposit',
    description: 'Get 10% bonus when depositing money to the piggy bank',
    effects: [
      {
        target: 'deposit_bonus',
        operation: 'multiply',
        amount: 1.1, // 10% bonus (multiply by 1.1)
        duration: 'persistent',
      },
    ],
  },
  {
    id: 34,
    name: 'Hopscotch Bonus',
    subject: 'Recess',
    type: 'persistent',
    flavorText: 'Even squares are always luckier',
    description: 'Every even period sales get +20%',
    effects: [
      {
        target: 'even_period_sale_bonus',
        operation: 'multiply',
        amount: 1.2,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 51,
    name: 'Hide and Seek',
    subject: 'Recess',
    type: 'persistent',
    flavorText: 'Finding treasure is a skill',
    description: 'Triple the money you find in found money events',
    effects: [
      {
        target: 'found_money_multiplier',
        operation: 'multiply',
        amount: 3,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 36,
    name: 'Swingset Momentum',
    subject: 'Recess',
    type: 'persistent',
    flavorText: 'Higher and higher with each push',
    description: 'Each consecutive period with a sale gets +10% sale price',
    effects: [
      {
        target: 'consecutive_sale_bonus',
        operation: 'multiply',
        amount: 1.1,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 52,
    name: 'Lost and Found',
    subject: 'Recess',
    type: 'one-time',
    flavorText: 'Someone dropped their lunch money',
    description: 'Trigger find money event with max amount of money',
    effects: [
      {
        target: 'trigger_find_money_event',
        operation: 'activate',
        amount: 1,
        duration: 'one-time',
      },
    ],
  },

  // GEOGRAPHY JOKERS
  {
    id: 38,
    name: 'Sunset Surge',
    subject: 'Geography',
    type: 'persistent',
    flavorText: 'The last 10% is 90% of the work',
    description: '+10% profit to all afternoon candy sale ',
    effects: [
      {
        target: 'afternoon_sale_bonus',
        operation: 'multiply',
        amount: 1.1,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 39,
    name: 'Trade Routes',
    subject: 'Geography',
    type: 'persistent',
    flavorText: 'Ancient paths lead to modern profits',
    description: '+1 inventory limit every period',
    effects: [
      {
        target: 'inventory_limit',
        operation: 'add',
        amount: 1,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 40,
    name: 'Continental Drift',
    subject: 'Geography',
    type: 'one-time',
    flavorText: 'Shift the market landscape',
    description: 'Randomize all candy prices for this period',
    effects: [
      {
        target: 'randomize_prices',
        operation: 'activate',
        amount: 1,
        duration: 'one-time',
      },
    ],
  },
  {
    id: 53,
    name: 'Map Maker',
    subject: 'Geography',
    type: 'persistent',
    flavorText: 'Chart your own course to success',
    description: 'See locations that will lead to good events',
    effects: [
      {
        target: 'location_highlights',
        operation: 'enable',
        amount: 1,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 42,
    name: 'Time Zone Arbitrage',
    subject: 'Geography',
    type: 'persistent',
    flavorText: 'Buy low in the morning, sell high in the afternoon',
    description: 'Morning purchases cost 10% less',
    effects: [
      {
        target: 'morning_purchase_discount',
        operation: 'multiply',
        amount: 0.9,
        duration: 'persistent',
      },
    ],
  },
  {
    id: 43,
    name: 'Atlas Bonus',
    subject: 'Geography',
    type: 'one-time',
    flavorText: 'The weight of the world brings heavy profits',
    description: 'Instantly gain $1500',
    effects: [
      {
        target: 'money',
        operation: 'add',
        amount: 1500,
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
    type: 'persistent',
    flavorText: '',
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
export const RECESS_JOKERS = getJokersBySubject('Recess');
export const GEOGRAPHY_JOKERS = getJokersBySubject('Geography');

export const ALL_JOKERS = {
  Math: MATH_JOKERS,
  Computer: COMPUTER_JOKERS,
  'Home Economics': HOME_EC_JOKERS,
  Economy: ECONOMY_JOKERS,
  History: HISTORY_JOKERS,
  Logic: LOGIC_JOKERS,
  Gym: GYM_JOKERS,
  Recess: RECESS_JOKERS,
  Geography: GEOGRAPHY_JOKERS,
};

// Utility function to process effects by target from a list of jokers
export function processEffectsByTarget(
  jokers: any[],
  targetType: EffectTarget
): Array<{
  jokerName: string;
  amount: number;
  operation: EffectOperation;
}> {
  const results: Array<{
    jokerName: string;
    amount: number;
    operation: EffectOperation;
  }> = [];

  if (!jokers || jokers.length === 0) {
    return results;
  }

  for (const joker of jokers) {
    // Find the joker in our standardized list
    const standardizedJoker = STANDARDIZED_JOKERS.find(
      (sj) => sj.id === joker.id
    );

    if (standardizedJoker?.effects) {
      // Look for effects that match the target
      for (const effect of standardizedJoker.effects) {
        if (effect.target === targetType) {
          results.push({
            jokerName: standardizedJoker.name,
            amount: effect.amount,
            operation: effect.operation,
          });
        }
      }
    }
  }

  return results;
}
