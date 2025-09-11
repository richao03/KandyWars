// Centralized Joker ID System
// This file contains all joker identifiers in one place
// To rename a joker, simply update its entry here

export const JOKER_IDS = {
  // Math Jokers
  DOUBLE_UP: 1,
  TIME_EQUATION: 2,
  GEOMETRIC_EXPANSION: 3,
  ACE_THE_TEST: 31,
  EVEN_STEVENS: 29,
  ODD_TODD: 30,

  // Computer Jokers
  TAPPED_IN: 6,
  SIDE_GIG: 7,
  PROPACANDIES: 8,
  DATA_COMPRESSION: 9,
  GLITCH_IN_THE_MATRIX: 10,
  TROJAN_HORSE: 11,

  // Home Economics Jokers
  VACUUM_SEALER: 12,
  FRIDGE_ORGANIZER: 14,
  DEEP_STORAGE: 15,
  BAKE_SALE: 16,
  HOME_MADE: 17,
  DECOY_CAKE: 18,

  // History Jokers
  TREASURE_CHEST: 66,
  TEMPORARY_EMPEROR: 35,
  ROMAN_COIN: 37,
  MEDIEVAL_SHIELD: 40,
  CANDY_VAULT: 74,
  THE_GOOD_OLD_DAYS: 24,

  // Logic Jokers
  MASTER_NEGOTIATOR: 27,
  INDUCTIVE_REASONING: 43,
  LOOPHOLE: 45,
  PURSUASION: 48,
  SOMETHING_FROM_NOTHING: 46,

  // Gym Jokers
  COACHING: 13,
  BULK_UP: 66, // Note: Same ID as Treasure Chest in standardized list
  EMBRACE_THE_GRIND: 67,
  THE_BOUNCEBACK: 41,
  BET_YOU_IM_FASTER: 25,
  TACHYONIC_SPRINT: 26,

  // Economy Jokers
  MARKET_CRASH: 19,
  MARKET_MANIPULATION: 20,
  SWING_TRADE: 21,
  DEPOSIT_BONUS: 22,
  BULK_DISCOUNT: 23,
  DIAMOND_HAND: 15, // Note: Same ID as Deep Storage

  // Logic (continued)
  THEREFORE: 28,

  // Recess Jokers
  JUMP_ROPE_RHYTHM: 32,
  FEED_THE_BEAST: 33,
  HOPSCOTCH_BONUS: 34,
  HIDE_AND_SEEK: 35, // Note: Same ID as Temporary Emperor
  SWINGSET_MOMENTUM: 36,
  LOST_AND_FOUND: 37, // Note: Same ID as Roman Coin
} as const;

// Reverse mapping for getting ID from name
export const JOKER_NAMES: Record<number, string> = {
  [JOKER_IDS.DOUBLE_UP]: 'Double Up',
  [JOKER_IDS.TIME_EQUATION]: 'Time Equation',
  [JOKER_IDS.GEOMETRIC_EXPANSION]: 'Geometric Expansion',
  [JOKER_IDS.ACE_THE_TEST]: 'Ace the Test',
  [JOKER_IDS.EVEN_STEVENS]: 'Even Stevens',
  [JOKER_IDS.ODD_TODD]: 'Odd Todd',
  [JOKER_IDS.TAPPED_IN]: 'Tapped in',
  [JOKER_IDS.SIDE_GIG]: 'Side Gig',
  [JOKER_IDS.PROPACANDIES]: 'Propacandies',
  [JOKER_IDS.DATA_COMPRESSION]: 'Data Compression',
  [JOKER_IDS.GLITCH_IN_THE_MATRIX]: 'Glitch in the Matrix',
  [JOKER_IDS.TROJAN_HORSE]: 'Trojan Horse',
  [JOKER_IDS.VACUUM_SEALER]: 'Vacuum Sealer',
  [JOKER_IDS.FRIDGE_ORGANIZER]: 'Fridge Organizer',
  [JOKER_IDS.DEEP_STORAGE]: 'Deep Storage',
  [JOKER_IDS.BAKE_SALE]: 'Bake Sale',
  [JOKER_IDS.HOME_MADE]: 'Home Made',
  [JOKER_IDS.DECOY_CAKE]: 'Decoy Cake',
  [JOKER_IDS.TREASURE_CHEST]: 'Treasure Chest',
  [JOKER_IDS.TEMPORARY_EMPEROR]: 'Temporary Emperor',
  [JOKER_IDS.ROMAN_COIN]: 'Roman Coin',
  [JOKER_IDS.MEDIEVAL_SHIELD]: 'Medieval Shield',
  [JOKER_IDS.CANDY_VAULT]: 'Candy Vault',
  [JOKER_IDS.THE_GOOD_OLD_DAYS]: 'The Good Old Days',
  [JOKER_IDS.MASTER_NEGOTIATOR]: 'Master Negotiator',
  [JOKER_IDS.INDUCTIVE_REASONING]: 'Inductive Reasoning',
  [JOKER_IDS.LOOPHOLE]: 'Loophole',
  [JOKER_IDS.PURSUASION]: 'Pursuasion',
  [JOKER_IDS.SOMETHING_FROM_NOTHING]: 'Something from Nothing',
  [JOKER_IDS.COACHING]: 'Coaching',
  [JOKER_IDS.BULK_UP]: 'Bulk Up',
  [JOKER_IDS.EMBRACE_THE_GRIND]: 'Embrace the Grind',
  [JOKER_IDS.THE_BOUNCEBACK]: 'The Bounceback',
  [JOKER_IDS.BET_YOU_IM_FASTER]: 'Bet You I\'m Faster',
  [JOKER_IDS.TACHYONIC_SPRINT]: 'Tachyonic Sprint',
  [JOKER_IDS.MARKET_CRASH]: 'Market Crash',
  [JOKER_IDS.MARKET_MANIPULATION]: 'Market Manipulation',
  [JOKER_IDS.SWING_TRADE]: 'Swing Trade',
  [JOKER_IDS.DEPOSIT_BONUS]: 'Deposit Bonus',
  [JOKER_IDS.BULK_DISCOUNT]: 'Bulk Discount',
  [JOKER_IDS.DIAMOND_HAND]: 'Diamond Hand',
  [JOKER_IDS.THEREFORE]: 'Therefore...',
  [JOKER_IDS.JUMP_ROPE_RHYTHM]: 'Jump Rope Rhythm',
  [JOKER_IDS.FEED_THE_BEAST]: 'Feed the Beast',
  [JOKER_IDS.HOPSCOTCH_BONUS]: 'Hopscotch Bonus',
  [JOKER_IDS.HIDE_AND_SEEK]: 'Hide and Seek',
  [JOKER_IDS.SWINGSET_MOMENTUM]: 'Swingset Momentum',
  [JOKER_IDS.LOST_AND_FOUND]: 'Lost and Found',
};

// Helper function to check if a joker has a specific ID
export function hasJokerById(
  jokers: Array<{ id: number }>,
  jokerId: number
): boolean {
  return jokers.some((j) => j.id === jokerId);
}

// Helper function to find a joker by ID
export function findJokerById(jokers: Array<{ id: number }>, jokerId: number) {
  return jokers.find((j) => j.id === jokerId);
}

// Type for joker ID values
export type JokerId = (typeof JOKER_IDS)[keyof typeof JOKER_IDS];
