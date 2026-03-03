// Centralized Joker ID System
// 54 total cards: 9 subjects x 6 each
// Trojan Horse (47), Dodgeball Dash (39 old), Tachyonic Sprint (44 old) removed

export const JOKER_IDS = {
  // Math Jokers (Size multiplier: Medium)
  DOUBLE_UP: 1,
  MEDIAN_FORMULA: 2,       // was TIME_EQUATION
  GEOMETRIC_EXPANSION: 3,
  ACE_THE_TEST: 31,
  INDUCTIVE_REASONING: 43,  // moved from Logic
  TEMPORARY_EMPEROR: 35,    // moved from Art

  // Computer Jokers (Size multiplier: Small)
  TAPPED_IN: 6,
  SIDE_GIG: 7,
  MICRO_CHIP: 8,            // was PROPACANDIES
  DATA_COMPRESSION: 9,
  OVERCLOCK: 10,            // was GLITCH_IN_THE_MATRIX
  DIAMOND_HAND: 50,         // moved from Economy

  // Home Economics Jokers (Size multiplier: Big)
  VACUUM_SEALER: 12,
  FRIDGE_ORGANIZER: 14,
  PERFECT_BAKE: 15,
  BAKE_SALE: 16,
  HOME_MADE: 17,
  SUPER_SIZE_ME: 18,        // was SLOW_COOKER

  // Art Jokers (Type multiplier: Chocolate)
  TREASURE_CHEST: 66,
  ODD_TODD: 30,             // moved from Math
  COCOA_FUTURES: 23,        // was BULK_SALE, moved from Economy
  MEDIEVAL_SHIELD: 67,
  ART_AUCTION: 52,          // was LOST_AND_FOUND, moved from Recess
  THE_GOOD_OLD_DAYS: 24,

  // Economy Jokers (Type multiplier: Gummy)
  BEAR_MARKET: 19,          // was MARKET_CRASH
  MARKET_MANIPULATION: 20,
  THE_BIG_SHORT: 21,
  DEPOSIT_BONUS: 22,
  THE_BOUNCEBACK: 41,       // moved from Gym
  ROMAN_COIN: 37,           // moved from Art

  // Gym Jokers (Type multiplier: Hard Candy)
  FARMERS_CARRY: 11,
  COACHING: 13,
  BET_YOU_IM_FASTER: 25,
  BULK_UP: 54,
  PERFECT_CHANGE: 45,       // was MAKING_CENTS, moved from Logic
  HARD_KNOCKS: 26,          // was FAMILY_BUSINESS

  // Logic Jokers (Type multiplier: Sour)
  MASTER_NEGOTIATOR: 27,
  THEREFORE: 28,
  EVEN_STEVENS: 29,         // moved from Math
  EMBRACE_THE_GRIND: 55,    // moved from Gym
  PURSUASION: 48,
  SOUR_LOGIC: 46,           // was SOMETHING_FROM_NOTHING

  // Recess Jokers (Type multiplier: Chewy)
  DOUBLE_DUTCH: 32,         // was JUMP_ROPE_RHYTHM
  FEED_THE_BEAST: 33,
  HOPSCOTCH_BONUS: 34,
  HIDE_AND_SEEK: 51,
  SWINGSET_MOMENTUM: 36,
  SECRET_HIDEOUT: 74,       // was CANDY_VAULT, moved from Art

  // Geography Jokers (Type multiplier: Fruity)
  GOLDEN_HOUR: 38,          // was SUNSET_SURGE
  TRADE_ROUTES: 39,
  CONTINENTAL_DRIFT: 40,
  MYSTERIOUS_ARTIFACT: 53,  // was HIGH_YIELD_ACCOUNT
  TROPICAL_IMPORT: 42,      // was TIME_ZONE_ARBITRAGE
  ATLAS_BONUS: 44,          // ID changed: was 43, now 44
} as const;

// Reverse mapping for getting name from ID
export const JOKER_NAMES: Record<number, string> = {
  [JOKER_IDS.DOUBLE_UP]: 'Double Up',
  [JOKER_IDS.MEDIAN_FORMULA]: 'Median Formula',
  [JOKER_IDS.GEOMETRIC_EXPANSION]: 'Geometric Expansion',
  [JOKER_IDS.ACE_THE_TEST]: 'Ace the Test',
  [JOKER_IDS.INDUCTIVE_REASONING]: 'Inductive Reasoning',
  [JOKER_IDS.TEMPORARY_EMPEROR]: 'Temporary Emperor',
  [JOKER_IDS.TAPPED_IN]: 'Tapped in',
  [JOKER_IDS.SIDE_GIG]: 'Side Gig',
  [JOKER_IDS.MICRO_CHIP]: 'Micro Chip',
  [JOKER_IDS.DATA_COMPRESSION]: 'Data Compression',
  [JOKER_IDS.OVERCLOCK]: 'Overclock',
  [JOKER_IDS.DIAMOND_HAND]: 'Diamond Hand',
  [JOKER_IDS.VACUUM_SEALER]: 'Vacuum Sealer',
  [JOKER_IDS.FRIDGE_ORGANIZER]: 'Fridge Organizer',
  [JOKER_IDS.PERFECT_BAKE]: 'Perfect Bake',
  [JOKER_IDS.BAKE_SALE]: 'Bake Sale',
  [JOKER_IDS.HOME_MADE]: 'Home Made',
  [JOKER_IDS.SUPER_SIZE_ME]: 'Super Size Me',
  [JOKER_IDS.TREASURE_CHEST]: 'Treasure Chest',
  [JOKER_IDS.ODD_TODD]: 'Odd Todd',
  [JOKER_IDS.COCOA_FUTURES]: 'Cocoa Futures',
  [JOKER_IDS.MEDIEVAL_SHIELD]: 'Medieval Shield',
  [JOKER_IDS.ART_AUCTION]: 'Art Auction',
  [JOKER_IDS.THE_GOOD_OLD_DAYS]: 'The Good Old Days',
  [JOKER_IDS.BEAR_MARKET]: 'Bear Market',
  [JOKER_IDS.MARKET_MANIPULATION]: 'Market Manipulation',
  [JOKER_IDS.THE_BIG_SHORT]: 'The Big Short',
  [JOKER_IDS.DEPOSIT_BONUS]: 'Deposit Bonus',
  [JOKER_IDS.THE_BOUNCEBACK]: 'The Bounceback',
  [JOKER_IDS.ROMAN_COIN]: 'Roman Coin',
  [JOKER_IDS.FARMERS_CARRY]: 'Farmers Carry',
  [JOKER_IDS.COACHING]: 'Coaching',
  [JOKER_IDS.BET_YOU_IM_FASTER]: "Bet You I'm Faster",
  [JOKER_IDS.BULK_UP]: 'Bulk Up',
  [JOKER_IDS.PERFECT_CHANGE]: 'Perfect Change',
  [JOKER_IDS.HARD_KNOCKS]: 'Hard Knocks',
  [JOKER_IDS.MASTER_NEGOTIATOR]: 'Master Negotiator',
  [JOKER_IDS.THEREFORE]: 'Therefore...',
  [JOKER_IDS.EVEN_STEVENS]: 'Even Stevens',
  [JOKER_IDS.EMBRACE_THE_GRIND]: 'Embrace the Grind',
  [JOKER_IDS.PURSUASION]: 'Pursuasion',
  [JOKER_IDS.SOUR_LOGIC]: 'Sour Logic',
  [JOKER_IDS.DOUBLE_DUTCH]: 'Double Dutch',
  [JOKER_IDS.FEED_THE_BEAST]: 'Feed the Beast',
  [JOKER_IDS.HOPSCOTCH_BONUS]: 'Hopscotch Bonus',
  [JOKER_IDS.HIDE_AND_SEEK]: 'Hide and Seek',
  [JOKER_IDS.SWINGSET_MOMENTUM]: 'Swingset Momentum',
  [JOKER_IDS.SECRET_HIDEOUT]: 'Secret Hideout',
  [JOKER_IDS.GOLDEN_HOUR]: 'Golden Hour',
  [JOKER_IDS.TRADE_ROUTES]: 'Trade Routes',
  [JOKER_IDS.CONTINENTAL_DRIFT]: 'Continental Drift',
  [JOKER_IDS.MYSTERIOUS_ARTIFACT]: 'Mysterious Artifact',
  [JOKER_IDS.TROPICAL_IMPORT]: 'Tropical Import',
  [JOKER_IDS.ATLAS_BONUS]: 'Atlas Bonus',
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
