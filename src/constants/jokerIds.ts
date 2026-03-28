// Centralized Joker ID System
// 47 total jokers

export const JOKER_IDS = {
  // Math Jokers (Size multiplier: Medium)
  DOUBLE_UP: 1,
  MEDIAN_FORMULA: 2,
  ACE_THE_TEST: 31,
  INDUCTIVE_REASONING: 43,
  PENNY_PINCHER: 50,

  // Computer Jokers (Size multiplier: Small)
  TAPPED_IN: 6,
  SIDE_GIG: 7,
  MICRO_CHIP: 8,
  DATA_COMPRESSION: 9,
  SIXTH_SENSE: 56,

  // Home Economics Jokers (Size multiplier: Big)
  VACUUM_SEALER: 12,
  PERFECT_BAKE: 15,
  BAKE_SALE: 16,
  HOME_MADE: 17,
  SUPER_SIZE_ME: 18,

  // Art Jokers (Type multiplier: Chocolate)
  TREASURE_CHEST: 66,
  ODD_TODD: 30,
  COCOA_FUTURES: 23,
  MEDIEVAL_SHIELD: 67,
  THE_GOOD_OLD_DAYS: 24,

  // Economy Jokers (Type multiplier: Gummy)
  BEAR_MARKET: 19,
  MARKET_MANIPULATION: 20,
  THE_BIG_SHORT: 21,
  DEPOSIT_BONUS: 22,
  ROMAN_COIN: 37,
  BULK_DISCOUNT: 47,
  BROKE_AND_HUNGRY: 52,

  // Gym Jokers (Type multiplier: Hard Candy)
  FARMERS_CARRY: 11,
  COACHING: 13,
  BET_YOU_IM_FASTER: 25,
  BULK_UP: 54,
  HARD_KNOCKS: 26,
  UNDERDOG: 49,

  // Logic Jokers (Type multiplier: Sour)
  EVEN_STEVENS: 29,
  PURSUASION: 48,
  SOUR_LOGIC: 46,
  EXTRA_CREDIT: 55,

  // Recess Jokers (Type multiplier: Chewy)
  DOUBLE_DUTCH: 32,
  HIDE_AND_SEEK: 51,
  SECRET_HIDEOUT: 74,
  EARLY_BIRD: 45,

  // Geography Jokers (Type multiplier: Fruity)
  GOLDEN_HOUR: 38,
  TRADE_ROUTES: 39,
  CONTINENTAL_DRIFT: 40,
  MYSTERIOUS_ARTIFACT: 53,
  TROPICAL_IMPORT: 42,
  ATLAS_BONUS: 44,
} as const;

// Reverse mapping for getting name from ID
export const JOKER_NAMES: Record<number, string> = {
  [JOKER_IDS.DOUBLE_UP]: 'Double Up',
  [JOKER_IDS.MEDIAN_FORMULA]: 'Median Formula',
  [JOKER_IDS.ACE_THE_TEST]: 'Ace the Test',
  [JOKER_IDS.INDUCTIVE_REASONING]: 'Inductive Reasoning',
  [JOKER_IDS.TAPPED_IN]: 'Tapped in',
  [JOKER_IDS.SIDE_GIG]: 'Side Gig',
  [JOKER_IDS.MICRO_CHIP]: 'Micro Chip',
  [JOKER_IDS.DATA_COMPRESSION]: 'Data Compression',
  [JOKER_IDS.VACUUM_SEALER]: 'Vacuum Sealer',
  [JOKER_IDS.PERFECT_BAKE]: 'Perfect Bake',
  [JOKER_IDS.BAKE_SALE]: 'Bake Sale',
  [JOKER_IDS.HOME_MADE]: 'Home Made',
  [JOKER_IDS.SUPER_SIZE_ME]: 'Super Size Me',
  [JOKER_IDS.TREASURE_CHEST]: 'Treasure Chest',
  [JOKER_IDS.ODD_TODD]: 'Odd Todd',
  [JOKER_IDS.COCOA_FUTURES]: 'Cocoa Futures',
  [JOKER_IDS.MEDIEVAL_SHIELD]: 'Medieval Shield',
  [JOKER_IDS.THE_GOOD_OLD_DAYS]: 'The Good Old Days',
  [JOKER_IDS.BEAR_MARKET]: 'Bear Market',
  [JOKER_IDS.MARKET_MANIPULATION]: 'Market Manipulation',
  [JOKER_IDS.THE_BIG_SHORT]: 'The Big Short',
  [JOKER_IDS.DEPOSIT_BONUS]: 'Deposit Bonus',
  [JOKER_IDS.ROMAN_COIN]: 'Roman Coin',
  [JOKER_IDS.FARMERS_CARRY]: 'Farmers Carry',
  [JOKER_IDS.COACHING]: 'Coaching',
  [JOKER_IDS.BET_YOU_IM_FASTER]: "Bet You I'm Faster",
  [JOKER_IDS.BULK_UP]: 'Bulk Up',
  [JOKER_IDS.HARD_KNOCKS]: 'Hard Knocks',
  [JOKER_IDS.EVEN_STEVENS]: 'Even Stevens',
  [JOKER_IDS.PURSUASION]: 'Pursuasion',
  [JOKER_IDS.SOUR_LOGIC]: 'Sour Logic',
  [JOKER_IDS.DOUBLE_DUTCH]: 'Double Dutch',
  [JOKER_IDS.HIDE_AND_SEEK]: 'Hide and Seek',
  [JOKER_IDS.SECRET_HIDEOUT]: 'Secret Hideout',
  [JOKER_IDS.GOLDEN_HOUR]: 'Golden Hour',
  [JOKER_IDS.TRADE_ROUTES]: 'Trade Routes',
  [JOKER_IDS.CONTINENTAL_DRIFT]: 'Continental Drift',
  [JOKER_IDS.MYSTERIOUS_ARTIFACT]: 'Mysterious Artifact',
  [JOKER_IDS.TROPICAL_IMPORT]: 'Tropical Import',
  [JOKER_IDS.ATLAS_BONUS]: 'Atlas Bonus',
  [JOKER_IDS.EARLY_BIRD]: 'Early Bird',
  [JOKER_IDS.BULK_DISCOUNT]: 'Bulk Discount',
  [JOKER_IDS.UNDERDOG]: 'Underdog',
  [JOKER_IDS.PENNY_PINCHER]: 'Penny Pincher',
  [JOKER_IDS.BROKE_AND_HUNGRY]: 'Broke and Hungry',
  [JOKER_IDS.EXTRA_CREDIT]: 'Extra Credit',
  [JOKER_IDS.SIXTH_SENSE]: 'Sixth Sense',
};

// Helper function to check if a joker has a specific ID
export function hasJokerById(
  jokers: { id: string | number }[],
  jokerId: string | number
): boolean {
  return jokers.some(
    (j) => j.id === jokerId.toString() || j.id.toString() === jokerId.toString()
  );
}

// Helper function to find a joker by ID
export function findJokerById(
  jokers: { id: string | number }[],
  jokerId: string | number
) {
  return jokers.find(
    (j) => j.id === jokerId.toString() || j.id.toString() === jokerId.toString()
  );
}

// Type for joker ID values
export type JokerId = (typeof JOKER_IDS)[keyof typeof JOKER_IDS];
