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
  COACHING: 13,
  FRIDGE_ORGANIZER: 14,
  PERFECT_BAKE: 15,
  BAKE_SALE: 16,
  HOME_MADE: 17,
  SLOW_COOKER: 18,

  // Economy Jokers
  MARKET_CRASH: 19,
  MARKET_MANIPULATION: 20,
  THE_BIG_SHORT: 21,
  DEPOSIT_BONUS: 22,
  BULK_SALE: 23,

  // History Jokers
  THE_GOOD_OLD_DAYS: 24,
  TEMPORARY_EMPEROR: 35,
  ROMAN_COIN: 37,
  MEDIEVAL_SHIELD: 67,
  TREASURE_CHEST: 66,
  CANDY_VAULT: 74,

  // Gym Jokers
  BET_YOU_IM_FASTER: 25,
  TACHYONIC_SPRINT: 26,
  THE_BOUNCEBACK: 41,
  BULK_UP: 54,
  EMBRACE_THE_GRIND: 55,

  // Logic Jokers
  MASTER_NEGOTIATOR: 27,
  THEREFORE: 28,
  MAKING_CENTS: 45,
  SOMETHING_FROM_NOTHING: 46,
  PURSUASION: 48,

  // Recess Jokers
  JUMP_ROPE_RHYTHM: 32,
  FEED_THE_BEAST: 33,
  HOPSCOTCH_BONUS: 34,
  SWINGSET_MOMENTUM: 36,
  HIDE_AND_SEEK: 51,
  LOST_AND_FOUND: 52,

  // Geography Jokers
  CONTINENTAL_DRIFT: 40,
  MAP_MAKER: 53,
  ATLAS_BONUS: 43,
  TIME_ZONE_ARBITRAGE: 42,
  SUNSET_SURGE: 38,

  // Economy (Additional)
  DIAMOND_HAND: 50,
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
  [JOKER_IDS.COACHING]: 'Coaching',
  [JOKER_IDS.FRIDGE_ORGANIZER]: 'Fridge Organizer',
  [JOKER_IDS.PERFECT_BAKE]: 'Perfect Bake',
  [JOKER_IDS.BAKE_SALE]: 'Bake Sale',
  [JOKER_IDS.HOME_MADE]: 'Home Made',
  [JOKER_IDS.SLOW_COOKER]: 'Slow Cooker',
  [JOKER_IDS.MARKET_CRASH]: 'Market Crash',
  [JOKER_IDS.MARKET_MANIPULATION]: 'Market Manipulation',
  [JOKER_IDS.THE_BIG_SHORT]: 'The Big Short',
  [JOKER_IDS.DEPOSIT_BONUS]: 'Deposit Bonus',
  [JOKER_IDS.BULK_SALE]: 'Bulk Sale',
  [JOKER_IDS.THE_GOOD_OLD_DAYS]: 'The Good Old Days',
  [JOKER_IDS.BET_YOU_IM_FASTER]: 'Bet You I\'m Faster',
  [JOKER_IDS.TACHYONIC_SPRINT]: 'Tachyonic Sprint',
  [JOKER_IDS.MASTER_NEGOTIATOR]: 'Master Negotiator',
  [JOKER_IDS.THEREFORE]: 'Therefore...',
  [JOKER_IDS.EVEN_STEVENS]: 'Even Stevens',
  [JOKER_IDS.ODD_TODD]: 'Odd Todd',
  [JOKER_IDS.ACE_THE_TEST]: 'Ace the Test',
  [JOKER_IDS.JUMP_ROPE_RHYTHM]: 'Jump Rope Rhythm',
  [JOKER_IDS.FEED_THE_BEAST]: 'Feed the Beast',
  [JOKER_IDS.HOPSCOTCH_BONUS]: 'Hopscotch Bonus',
  [JOKER_IDS.TEMPORARY_EMPEROR]: 'Temporary Emperor',
  [JOKER_IDS.SWINGSET_MOMENTUM]: 'Swingset Momentum',
  [JOKER_IDS.ROMAN_COIN]: 'Roman Coin',
  [JOKER_IDS.CONTINENTAL_DRIFT]: 'Continental Drift',
  [JOKER_IDS.THE_BOUNCEBACK]: 'The Bounceback',
  [JOKER_IDS.ATLAS_BONUS]: 'Atlas Bonus',
  [JOKER_IDS.MAKING_CENTS]: 'Making Cents',
  [JOKER_IDS.SOMETHING_FROM_NOTHING]: 'Something from Nothing',
  [JOKER_IDS.PURSUASION]: 'Pursuasion',
  [JOKER_IDS.DIAMOND_HAND]: 'Diamond Hand',
  [JOKER_IDS.HIDE_AND_SEEK]: 'Hide and Seek',
  [JOKER_IDS.LOST_AND_FOUND]: 'Lost and Found',
  [JOKER_IDS.MAP_MAKER]: 'Map Maker',
  [JOKER_IDS.BULK_UP]: 'Bulk Up',
  [JOKER_IDS.EMBRACE_THE_GRIND]: 'Embrace the Grind',
  [JOKER_IDS.TREASURE_CHEST]: 'Treasure Chest',
  [JOKER_IDS.MEDIEVAL_SHIELD]: 'Medieval Shield',
  [JOKER_IDS.CANDY_VAULT]: 'Candy Vault',
  [JOKER_IDS.TIME_ZONE_ARBITRAGE]: 'Time Zone Arbitrage',
  [JOKER_IDS.SUNSET_SURGE]: 'Sunset Surge',
};

// Helper function to check if a joker has a specific ID
export function hasJokerById(
  jokers: { id: string | number }[],
  jokerId: string | number
): boolean {
  return jokers.some((j) => j.id === jokerId.toString() || j.id.toString() === jokerId.toString());
}

// Helper function to find a joker by ID
export function findJokerById(jokers: { id: string | number }[], jokerId: string | number) {
  return jokers.find((j) => j.id === jokerId.toString() || j.id.toString() === jokerId.toString());
}

// Type for joker ID values
export type JokerId = (typeof JOKER_IDS)[keyof typeof JOKER_IDS];
