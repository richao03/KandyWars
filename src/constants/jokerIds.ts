// Centralized Joker ID System
// This file contains all joker identifiers in one place
// To rename a joker, simply update its entry here

export const JOKER_IDS = {
  // Math Jokers
  DOUBLE_UP: 1,
  TIME_EQUATION: 2,
  COMPOUND_INTEREST: 3,
  LOGARITHMIC_GROWTH: 4,

  // Computer Jokers
  DIGITAL_LOCK: 5,
  GLITCH_IN_THE_MATRIX: 6,
  TAPPED_IN: 7,
  PREDICTOR: 8,

  // Home Economics Jokers
  CANDY_SALAD: 9,
  EMBRACE_THE_GRIND: 10,
  SOMETHING_FROM_NOTHING: 11,
  MASTER_OF_TRADE: 12,

  // Economy Jokers
  MARKET_MANIPULATION: 13,
  THE_BIG_SHORT: 14,
  DIAMOND_HAND: 15,
  DROUGHT_RELIEF: 16,

  // History Jokers
  ROMAN_COIN: 17,
  TEMPORARY_EMPEROR: 18,

  // Logic Jokers
  MARKET_CRASH: 19,

  // Gym Jokers
  // Add gym jokers as needed
} as const;

// Reverse mapping for getting ID from name
export const JOKER_NAMES: Record<number, string> = {
  [JOKER_IDS.DOUBLE_UP]: 'Double Up',
  [JOKER_IDS.TIME_EQUATION]: 'Time Equation',
  [JOKER_IDS.COMPOUND_INTEREST]: 'Compound Interest',
  [JOKER_IDS.LOGARITHMIC_GROWTH]: 'Logarithmic Growth',
  [JOKER_IDS.DIGITAL_LOCK]: 'Digital Lock',
  [JOKER_IDS.GLITCH_IN_THE_MATRIX]: 'Glitch in the Matrix',
  [JOKER_IDS.TAPPED_IN]: 'Tapped in',
  [JOKER_IDS.PREDICTOR]: 'Predictor',
  [JOKER_IDS.CANDY_SALAD]: 'Candy Salad',
  [JOKER_IDS.EMBRACE_THE_GRIND]: 'Embrace the Grind',
  [JOKER_IDS.SOMETHING_FROM_NOTHING]: 'Something from Nothing',
  [JOKER_IDS.MASTER_OF_TRADE]: 'Master of Trade',
  [JOKER_IDS.MARKET_MANIPULATION]: 'Market Manipulation',
  [JOKER_IDS.THE_BIG_SHORT]: 'The Big Short',
  [JOKER_IDS.DIAMOND_HAND]: 'Diamond Hand',
  [JOKER_IDS.DROUGHT_RELIEF]: 'Drought Relief',
  [JOKER_IDS.ROMAN_COIN]: 'Roman Coin',
  [JOKER_IDS.TEMPORARY_EMPEROR]: 'Temporary Emperor',
  [JOKER_IDS.MARKET_CRASH]: 'Market Crash',
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
