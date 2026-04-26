import { JOKER_IDS } from './jokerIds';
import { CandyTypeName } from '../types/candy';

// ========================================
// LEVEL SYSTEM
// ========================================

export interface ShopkeeperLevel {
  level: number;
  xpRequired: number;  // Total cumulative XP to reach this level
  discount: number;     // Friendship discount percentage (0-0.20)
  jokerSlots: number;   // How many jokers displayed in shop (1 or 2)
  dailySpecials: number; // How many daily candy specials (0, 1, or 2)
  rerollBaseCost: number; // Base reroll cost
  label: string;
}

export const SHOPKEEPER_LEVELS: ShopkeeperLevel[] = [
  { level: 1,  xpRequired: 0,    discount: 0,    jokerSlots: 1, dailySpecials: 0, rerollBaseCost: 500, label: 'Stranger' },
  { level: 2,  xpRequired: 50,   discount: 0.05, jokerSlots: 1, dailySpecials: 1, rerollBaseCost: 500, label: 'Acquaintance' },
  { level: 3,  xpRequired: 120,  discount: 0.05, jokerSlots: 1, dailySpecials: 1, rerollBaseCost: 500, label: 'Regular' },
  { level: 4,  xpRequired: 220,  discount: 0.10, jokerSlots: 1, dailySpecials: 1, rerollBaseCost: 500, label: 'Familiar' },
  { level: 5,  xpRequired: 350,  discount: 0.10, jokerSlots: 1, dailySpecials: 2, rerollBaseCost: 300, label: 'Buddy' },
  { level: 6,  xpRequired: 520,  discount: 0.10, jokerSlots: 2, dailySpecials: 2, rerollBaseCost: 300, label: 'Pal' },
  { level: 7,  xpRequired: 730,  discount: 0.15, jokerSlots: 2, dailySpecials: 2, rerollBaseCost: 300, label: 'Trusted' },
  { level: 8,  xpRequired: 1000, discount: 0.15, jokerSlots: 2, dailySpecials: 2, rerollBaseCost: 300, label: 'Close Friend' },
  { level: 9,  xpRequired: 1350, discount: 0.15, jokerSlots: 2, dailySpecials: 2, rerollBaseCost: 300, label: 'Family' },
  { level: 10, xpRequired: 1800, discount: 0.20, jokerSlots: 2, dailySpecials: 2, rerollBaseCost: 300, label: 'Best Friend' },
];

export function getLevelFromXP(totalXP: number): number {
  for (let i = SHOPKEEPER_LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= SHOPKEEPER_LEVELS[i].xpRequired) {
      return SHOPKEEPER_LEVELS[i].level;
    }
  }
  return 1;
}

export function getLevelConfig(level: number): ShopkeeperLevel {
  return SHOPKEEPER_LEVELS[Math.min(level, 10) - 1];
}

export function getXPForNextLevel(level: number): number | null {
  if (level >= 10) return null;
  return SHOPKEEPER_LEVELS[level].xpRequired; // level is 1-indexed, array is 0-indexed
}

// ========================================
// XP REWARDS
// ========================================

export const XP_REWARDS = {
  CHAT: 5,
  TRIVIA_CORRECT: 5,
  NIGHTLY_QUEST_COMPLETE: 15,
  MULTI_DAY_QUEST_COMPLETE: 25,
  PURCHASE_CANDY: 3,
  PURCHASE_JOKER: 8,
  REROLL: 2,
  END_OF_RUN_BONUS: 10, // If visited deli 3+ times
  MIN_VISITS_FOR_BONUS: 3,
};

// ========================================
// JOKER SHOP
// ========================================

export const JOKER_SHOP = {
  // Joker price escalates with each reroll: $500, $1000, $2000, $4000
  INITIAL_JOKER_PRICE: 500,
  JOKER_PRICE_MULTIPLIER: 2, // Each reroll doubles the joker purchase price
  UPGRADE_L1_TO_L2: 5000,
  UPGRADE_L2_TO_L3: 30000,
  MAX_REROLLS_PER_VISIT: 3,
  REROLL_COST_MULTIPLIER: 2, // Each reroll doubles the reroll cost too
};

// Get joker purchase price based on reroll count
export function getJokerPriceForReroll(rerollCount: number): number {
  return JOKER_SHOP.INITIAL_JOKER_PRICE * Math.pow(JOKER_SHOP.JOKER_PRICE_MULTIPLIER, rerollCount);
}

// Joker pool tiers by shopkeeper level
// Since jokers don't have a rarity field, we define pools by ID groupings
// Common: simpler/straightforward effects
// Uncommon: stronger/more interesting effects
// Rare: powerful/complex effects
// Exclusive: only available from the shopkeeper at high levels

export const JOKER_POOL_COMMON: number[] = [
  JOKER_IDS.DOUBLE_UP,
  JOKER_IDS.FLIP_ARTIST,
  JOKER_IDS.ODD_TODD,
  JOKER_IDS.EVEN_STEVENS,
  JOKER_IDS.FARMERS_CARRY,
  JOKER_IDS.DEPOSIT_BONUS,
  JOKER_IDS.EARLY_BIRD,
  JOKER_IDS.PENNY_PINCHER,
  JOKER_IDS.SPARE_CHANGE,
  JOKER_IDS.HOARDER,
  JOKER_IDS.PENNY_WISE,
  JOKER_IDS.CLEARANCE_SALE,
  JOKER_IDS.COLLECTOR,
  JOKER_IDS.MINIMALIST,
  JOKER_IDS.MOMENTUM,
  JOKER_IDS.PATIENCE_PAYS,
];

export const JOKER_POOL_UNCOMMON: number[] = [
  JOKER_IDS.COMBO_PLATTER,
  JOKER_IDS.COCOA_FUTURES,
  JOKER_IDS.BEAR_MARKET,
  JOKER_IDS.BULK_DISCOUNT,
  JOKER_IDS.SOUR_LOGIC,
  JOKER_IDS.GOLDEN_HOUR,
  JOKER_IDS.TRADE_ROUTES,
  JOKER_IDS.TROPICAL_IMPORT,
  JOKER_IDS.MEDIUM_RARE,
  JOKER_IDS.KING_SIZE,
  JOKER_IDS.SUGAR_RUSH,
  JOKER_IDS.PEAK_HOURS,
  JOKER_IDS.DIVERSIFIER,
  JOKER_IDS.DEEP_FREEZE,
  JOKER_IDS.PIGGY_BANK_PRO,
  JOKER_IDS.NIGHT_OWL,
];

export const JOKER_POOL_RARE: number[] = [
  JOKER_IDS.VACUUM_SEALER,
  JOKER_IDS.TRIPLE_THREAT,
  JOKER_IDS.MARKET_MANIPULATION,
  JOKER_IDS.GLASS_CANNON,
  JOKER_IDS.ALL_IN,
  JOKER_IDS.CONTRABAND,
  JOKER_IDS.COMPOUND_INTEREST,
  JOKER_IDS.REPUTATION,
  JOKER_IDS.STREET_SMARTS,
  JOKER_IDS.LOAN_SHARK,
  JOKER_IDS.LUCKY_CHARM,
  JOKER_IDS.LAST_STAND,
  JOKER_IDS.SURVIVOR,
  JOKER_IDS.TAX_COLLECTOR,
];

// Exclusive jokers only available at shopkeeper level 9+
// These are powerful jokers that reward long-term shopkeeper relationship
export const JOKER_POOL_EXCLUSIVE: number[] = [
  JOKER_IDS.TREASURE_CHEST,
  JOKER_IDS.SAFE_HOUSE,
  JOKER_IDS.SIXTH_SENSE,
  JOKER_IDS.MYSTERIOUS_ARTIFACT,
  JOKER_IDS.SHRINKING_GLASS,
];

export function getJokerPoolForLevel(level: number): number[] {
  let pool = [...JOKER_POOL_COMMON];
  if (level >= 4) pool = pool.concat(JOKER_POOL_UNCOMMON);
  if (level >= 7) pool = pool.concat(JOKER_POOL_RARE);
  if (level >= 9) pool = pool.concat(JOKER_POOL_EXCLUSIVE);
  return pool;
}

// ========================================
// DAILY SPECIALS
// ========================================

export const DAILY_SPECIAL_CONFIG = {
  DISCOUNT_MIN: 0.15, // 15% off
  DISCOUNT_MAX: 0.30, // 30% off
};

// ========================================
// NIGHTLY QUEST TYPES
// ========================================

export type NightlyQuestType = 'sell_candy' | 'sell_quantity' | 'earn_profit' | 'sell_type' | 'multi_day';

export interface NightlyQuestTemplate {
  type: NightlyQuestType;
  minLevel: number; // Minimum shopkeeper level to generate this type
  descriptionTemplate: string; // Uses {target}, {quantity}, {amount} placeholders
}

export const NIGHTLY_QUEST_TEMPLATES: NightlyQuestTemplate[] = [
  { type: 'sell_candy',    minLevel: 1, descriptionTemplate: 'Sell {quantity} {target} tomorrow' },
  { type: 'sell_quantity', minLevel: 1, descriptionTemplate: 'Sell {quantity} total candies tomorrow' },
  { type: 'earn_profit',  minLevel: 3, descriptionTemplate: 'Earn ${amount} in sales tomorrow' },
  { type: 'sell_type',    minLevel: 3, descriptionTemplate: 'Sell some {target} candy tomorrow' },
  { type: 'multi_day',    minLevel: 8, descriptionTemplate: 'Sell {quantity} {target} over the next 2 days' },
];

// Quest reward scaling by day
export const QUEST_REWARDS = {
  BASE_CASH: 200,
  CASH_PER_DAY: 200, // Increases by this much per day
  MAX_CASH: 1000,
};

export function getQuestCashReward(day: number, isMultiDay: boolean): number {
  const base = QUEST_REWARDS.BASE_CASH + (day - 1) * QUEST_REWARDS.CASH_PER_DAY;
  const reward = Math.min(base, QUEST_REWARDS.MAX_CASH);
  return isMultiDay ? Math.floor(reward * 1.5) : reward;
}

// Quest difficulty scaling
export const QUEST_DIFFICULTY = {
  SELL_CANDY_QTY: { min: 3, max: 8 },      // Sell N of specific candy
  SELL_TOTAL_QTY: { min: 8, max: 20 },      // Sell N total candies
  EARN_PROFIT: { min: 300, max: 2000 },      // Earn $X
  SELL_TYPE_QTY: { min: 3, max: 10 },        // Sell N of a type
  MULTI_DAY_QTY: { min: 10, max: 20 },       // Multi-day sell target
};

// ========================================
// TRIVIA SYSTEM
// ========================================

export interface TriviaQuestion {
  id: string;
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
  category: 'candy_facts' | 'candy_history' | 'game_knowledge' | 'food_science';
}

export const TRIVIA_QUESTIONS_PER_VISIT = 3;

export const TRIVIA_POOL: TriviaQuestion[] = [
  // === CANDY FACTS ===
  {
    id: 'cf1',
    question: 'What country produces the most chocolate in the world?',
    choices: ['Switzerland', 'Belgium', 'Ivory Coast', 'United States'],
    correctIndex: 2,
    category: 'candy_facts',
  },
  {
    id: 'cf2',
    question: 'What gives sour candy its tang?',
    choices: ['Vinegar', 'Citric acid', 'Lemon juice', 'Baking soda'],
    correctIndex: 1,
    category: 'candy_facts',
  },
  {
    id: 'cf3',
    question: 'How many licks does it take to get to the center of a Tootsie Pop (according to science)?',
    choices: ['100', '364', '500', '1,000'],
    correctIndex: 1,
    category: 'candy_facts',
  },
  {
    id: 'cf4',
    question: 'What is the best-selling candy bar in the world?',
    choices: ['Kit Kat', 'Snickers', 'Twix', 'Reeses'],
    correctIndex: 1,
    category: 'candy_facts',
  },
  {
    id: 'cf5',
    question: 'What ingredient makes gummy candy chewy?',
    choices: ['Sugar', 'Gelatin', 'Corn syrup', 'Flour'],
    correctIndex: 1,
    category: 'candy_facts',
  },
  {
    id: 'cf6',
    question: 'Which color M&M was discontinued in 1976 over dye concerns?',
    choices: ['Yellow', 'Orange', 'Red', 'Green'],
    correctIndex: 2,
    category: 'candy_facts',
  },
  {
    id: 'cf7',
    question: "What's the most popular Halloween candy in America?",
    choices: ['Candy Corn', 'Snickers', 'Reeses Cups', 'Kit Kat'],
    correctIndex: 2,
    category: 'candy_facts',
  },
  {
    id: 'cf8',
    question: 'Cotton candy was invented by who?',
    choices: ['A candy maker', 'A dentist', 'A chef', 'A farmer'],
    correctIndex: 1,
    category: 'candy_facts',
  },

  // === CANDY HISTORY ===
  {
    id: 'ch1',
    question: 'What year were Gummy Bears invented?',
    choices: ['1920', '1922', '1945', '1960'],
    correctIndex: 1,
    category: 'candy_history',
  },
  {
    id: 'ch2',
    question: 'Which candy was the first to be individually wrapped?',
    choices: ['Tootsie Roll', 'Hersheys Kiss', 'Jolly Rancher', 'Starburst'],
    correctIndex: 0,
    category: 'candy_history',
  },
  {
    id: 'ch3',
    question: 'Warheads candy originated from which country?',
    choices: ['United States', 'Japan', 'Australia', 'Germany'],
    correctIndex: 2,
    category: 'candy_history',
  },
  {
    id: 'ch4',
    question: 'What decade were Sour Patch Kids introduced?',
    choices: ['1970s', '1980s', '1990s', '1960s'],
    correctIndex: 1,
    category: 'candy_history',
  },
  {
    id: 'ch5',
    question: 'M&Ms were originally made for who?',
    choices: ['Kids at school', 'Movie theaters', 'Military soldiers', 'The president'],
    correctIndex: 2,
    category: 'candy_history',
  },
  {
    id: 'ch6',
    question: 'Jolly Ranchers were first sold in what state?',
    choices: ['Texas', 'California', 'Colorado', 'New York'],
    correctIndex: 2,
    category: 'candy_history',
  },
  {
    id: 'ch7',
    question: 'The first chocolate bar was made in what country?',
    choices: ['Belgium', 'Switzerland', 'England', 'France'],
    correctIndex: 2,
    category: 'candy_history',
  },
  {
    id: 'ch8',
    question: "Swedish Fish aren't actually from Sweden. Where are they from?",
    choices: ['Norway', 'Canada', 'Sweden (actually)', 'United States'],
    correctIndex: 1,
    category: 'candy_history',
  },

  // === GAME KNOWLEDGE ===
  {
    id: 'gk1',
    question: 'Which candy size unlocks on Day 2?',
    choices: ['Small', 'Medium', 'Big', 'Extra Large'],
    correctIndex: 1,
    category: 'game_knowledge',
  },
  {
    id: 'gk2',
    question: 'How many candy types are there in the game?',
    choices: ['4', '5', '6', '8'],
    correctIndex: 2,
    category: 'game_knowledge',
  },
  {
    id: 'gk3',
    question: 'What happens to candy if you hold it too long?',
    choices: ['Price drops', 'It melts', 'Nothing', 'It duplicates'],
    correctIndex: 1,
    category: 'game_knowledge',
  },
  {
    id: 'gk4',
    question: 'How many persistent joker slots can you have?',
    choices: ['3', '4', '5', '6'],
    correctIndex: 2,
    category: 'game_knowledge',
  },
  {
    id: 'gk5',
    question: 'What is the cheapest candy in the game?',
    choices: ['Jolly Ranchers', 'Gummy Bears', 'Warheads', 'M&Ms'],
    correctIndex: 1,
    category: 'game_knowledge',
  },
  {
    id: 'gk6',
    question: 'How many total candies are in the game?',
    choices: ['10', '12', '15', '20'],
    correctIndex: 2,
    category: 'game_knowledge',
  },
  {
    id: 'gk7',
    question: 'What does the Vacuum Sealer joker do?',
    choices: ['Doubles prices', 'Increases inventory', 'Gives free candy', 'Prevents melting'],
    correctIndex: 1,
    category: 'game_knowledge',
  },
  {
    id: 'gk8',
    question: 'How many days does a full game last?',
    choices: ['3', '5', '7', '10'],
    correctIndex: 1,
    category: 'game_knowledge',
  },

  // === FOOD SCIENCE ===
  {
    id: 'fs1',
    question: 'What makes Jawbreakers so hard?',
    choices: ['Metal flakes', 'Layers of sugar', 'Concrete', 'Frozen gelatin'],
    correctIndex: 1,
    category: 'food_science',
  },
  {
    id: 'fs2',
    question: 'What is taffy made of?',
    choices: ['Flour and butter', 'Sugar, butter, and air', 'Honey and wax', 'Milk and eggs'],
    correctIndex: 1,
    category: 'food_science',
  },
  {
    id: 'fs3',
    question: 'Why does chocolate melt in your mouth?',
    choices: ['Its melting point is below body temp', 'Saliva dissolves it', 'Its just soft', 'Sugar breaks down'],
    correctIndex: 0,
    category: 'food_science',
  },
  {
    id: 'fs4',
    question: 'What gives Nerds their crunchy coating?',
    choices: ['Corn starch', 'Sugar crystals', 'Baked flour', 'Caramel shell'],
    correctIndex: 1,
    category: 'food_science',
  },
  {
    id: 'fs5',
    question: 'Rock candy is actually just what?',
    choices: ['Compressed sugar', 'Flavored glass', 'Sugar crystals', 'Frozen syrup'],
    correctIndex: 2,
    category: 'food_science',
  },
  {
    id: 'fs6',
    question: 'What makes caramel turn golden brown?',
    choices: ['Food coloring', 'Butter browning', 'Sugar caramelization', 'Cocoa powder'],
    correctIndex: 2,
    category: 'food_science',
  },
  {
    id: 'fs7',
    question: 'Why does Pop Rocks candy pop?',
    choices: ['Chemical reaction', 'Tiny CO2 bubbles', 'Static electricity', 'Yeast expanding'],
    correctIndex: 1,
    category: 'food_science',
  },
  {
    id: 'fs8',
    question: 'White chocolate is technically not chocolate because it lacks what?',
    choices: ['Sugar', 'Milk', 'Cocoa solids', 'Butter'],
    correctIndex: 2,
    category: 'food_science',
  },
];

// ========================================
// DIALOGUE SYSTEM
// ========================================

type DialogueLevel = 'low' | 'mid' | 'high';

export function getDialogueLevel(level: number): DialogueLevel {
  if (level <= 3) return 'low';
  if (level <= 6) return 'mid';
  return 'high';
}

export const SHOPKEEPER_DIALOGUE = {
  greeting: {
    low: [
      "Store's open.",
      "What do you need?",
      "You again? Fine, come in.",
      "Money talks, kid.",
    ],
    mid: [
      "Hey, welcome back!",
      "Good to see you!",
      "My regular! Come on in.",
      "I was hoping you'd stop by.",
    ],
    high: [
      "My favorite customer!",
      "I saved the good stuff for you.",
      "There you are! I was just thinking about you.",
      "The store lights up when you walk in.",
    ],
  },
  farewell: {
    low: [
      "Later.",
      "Don't let the door hit you.",
      "Come back when you got money.",
    ],
    mid: [
      "See you tomorrow!",
      "Stay safe out there.",
      "Come back anytime.",
    ],
    high: [
      "Take care, kid. You're always welcome.",
      "Get home safe. See you tomorrow!",
      "Best customer I ever had. No cap.",
    ],
  },
  chat: {
    low: [
      "You just gonna stand there?",
      "I don't do small talk.",
      "What, you need directions?",
    ],
    mid: [
      "Business has been good lately.",
      "You know, this neighborhood's changed a lot.",
      "I heard some new candy shipments are coming in.",
    ],
    high: [
      "You remind me of myself at your age.",
      "I got a feeling tomorrow's gonna be a good day for you.",
      "Between you and me, I think you got real business sense.",
    ],
  },
  trivia_intro: {
    low: [
      "Think you know candy? Try this.",
      "Pop quiz, kid.",
    ],
    mid: [
      "Got a question for ya!",
      "Let's see how smart you are today.",
    ],
    high: [
      "Alright genius, try this one.",
      "I've been saving a tough one for you.",
    ],
  },
  trivia_correct: [
    "Not bad, kid!",
    "You know your stuff!",
    "Look at the big brain on you!",
    "Correct! I'm impressed.",
  ],
  trivia_wrong: [
    "Nah, but good guess.",
    "Close! Not quite though.",
    "Wrong! But hey, now you know.",
    "Nope. Better luck next time.",
  ],
  quest_given: [
    "Got a job for you tomorrow.",
    "Think you can handle this?",
    "Do this for me and I'll make it worth your while.",
    "I need a favor. You in?",
  ],
  quest_complete: [
    "You actually did it! Nice work.",
    "I knew I could count on you!",
    "That's what I'm talking about!",
    "You're a real one. Here's your cut.",
  ],
  purchase: [
    "Good choice.",
    "You got an eye for this.",
    "Solid pick.",
    "Pleasure doing business.",
  ],
  reroll: [
    "Let's see what else I got...",
    "Alright, alright...",
    "Picky, huh? Let me dig around.",
  ],
  reroll_limit: [
    "That's all I got tonight, kid.",
    "Come back tomorrow for new stock.",
    "I'm all out of surprises.",
  ],
  daily_special: [
    "Got a deal for you today.",
    "Check out today's special!",
    "This one's on sale, just for you.",
  ],
} as const;

// All candy types for quest generation
export const CANDY_TYPES_FOR_QUESTS: CandyTypeName[] = ['gummy', 'chocolate', 'hard_candy', 'sour', 'chewy', 'fruity'];

// Candy names for quest generation (small candies always available)
export const SMALL_CANDY_NAMES = ['Gummy Bears', 'Jolly Ranchers', 'Warheads', 'M&Ms', 'Nerd Rope'];
export const MEDIUM_CANDY_NAMES = ['Bubble Gum', 'Swedish Fish', 'Sour Straws', 'Caramel', 'Snickers'];
export const BIG_CANDY_NAMES = ['Tootsie Roll', 'Jaw Breaker', 'Strawberry Bark', 'Sour Patch Kids', 'Taffy'];
