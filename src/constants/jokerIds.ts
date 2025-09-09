// Centralized Joker ID System
// This file contains all joker identifiers in one place
// To rename a joker, simply update its entry here

export const JOKER_IDS = {
  // Math Jokers
  DOUBLE_UP: 1,
  TIME_EQUATION: 2,
  COMPOUND_INTEREST: 3,
  LOGARITHMIC_GROWTH: 4,
  ACE_THE_TEST: 31,

  // Computer Jokers
  DIGITAL_LOCK: 5,
  GLITCH_IN_THE_MATRIX: 6,
  SIDE_GIG: 7,
  PREDICTOR: 8,
  TROJAN_HORSE: 20,

  // Home Economics Jokers
  CANDY_SALAD: 9,
  EMBRACE_THE_GRIND: 10,
  SOMETHING_FROM_NOTHING: 11,
  MASTER_OF_TRADE: 12,

  // Economy Jokers
  THE_BIG_SHORT: 14,
  MARKET_MANIPULATION: 20,
  DIAMOND_HAND: 15,
  DROUGHT_RELIEF: 16,
  DEPOSIT_BONUS: 22,
  BULK_DISCOUNT: 23,
  VENDOR_KICKBACK: 24,

  // History Jokers
  ROMAN_COIN: 17,
  TEMPORARY_EMPEROR: 18,

  // Logic Jokers
  MARKET_CRASH: 19,
  THEREFORE: 28,
  EVEN_STEVENS: 29,
  ODD_TODD: 30,

  // Gym Jokers
  COACHING: 13,
  BET_YOU_IM_FASTER: 25,
  TACHYONIC_SPRINT: 26,

  // Recess Jokers
  JUMP_ROPE_RHYTHM: 32,
  FEED_THE_BEAST: 33,
  HOPSCOTCH_BONUS: 34,
  HIDE_AND_SEEK: 35,
  SWINGSET_MOMENTUM: 36,
  LOST_AND_FOUND: 37,
} as const;

// Reverse mapping for getting ID from name
export const JOKER_NAMES: Record<number, string> = {
  [JOKER_IDS.DOUBLE_UP]: 'Double Up',
  [JOKER_IDS.TIME_EQUATION]: 'Time Equation',
  [JOKER_IDS.COMPOUND_INTEREST]: 'Compound Interest',
  [JOKER_IDS.LOGARITHMIC_GROWTH]: 'Logarithmic Growth',
  [JOKER_IDS.DIGITAL_LOCK]: 'Digital Lock',
  [JOKER_IDS.GLITCH_IN_THE_MATRIX]: 'Glitch in the Matrix',
  [JOKER_IDS.SIDE_GIG]: 'Side Gig',
  [JOKER_IDS.PREDICTOR]: 'Predictor',
  [JOKER_IDS.CANDY_SALAD]: 'Candy Salad',
  [JOKER_IDS.EMBRACE_THE_GRIND]: 'Embrace the Grind',
  [JOKER_IDS.SOMETHING_FROM_NOTHING]: 'Something from Nothing',
  [JOKER_IDS.MASTER_OF_TRADE]: 'Master of Trade',
  [JOKER_IDS.COACHING]: 'Coaching',
  [JOKER_IDS.MARKET_MANIPULATION]: 'Market Manipulation',
  [JOKER_IDS.THE_BIG_SHORT]: 'The Big Short',
  [JOKER_IDS.DIAMOND_HAND]: 'Diamond Hand',
  [JOKER_IDS.DROUGHT_RELIEF]: 'Drought Relief',
  [JOKER_IDS.ROMAN_COIN]: 'Roman Coin',
  [JOKER_IDS.TEMPORARY_EMPEROR]: 'Temporary Emperor',
  [JOKER_IDS.MARKET_CRASH]: 'Market Crash',
  [JOKER_IDS.TROJAN_HORSE]: 'Trojan Horse',
  [JOKER_IDS.DEPOSIT_BONUS]: 'Deposit Bonus',
  [JOKER_IDS.BULK_DISCOUNT]: 'Bulk Discount',
  [JOKER_IDS.VENDOR_KICKBACK]: 'Vendor Kickback',
  [JOKER_IDS.BET_YOU_IM_FASTER]: 'Bet You I\'m Faster',
  [JOKER_IDS.TACHYONIC_SPRINT]: 'Tachyonic Sprint',
  [JOKER_IDS.THEREFORE]: 'Therefore...',
  [JOKER_IDS.EVEN_STEVENS]: 'Even Stevens',
  [JOKER_IDS.ODD_TODD]: 'Odd Todd',
  [JOKER_IDS.ACE_THE_TEST]: 'Ace the Test',
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
