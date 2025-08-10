export interface Joker {
  id: number;
  name: string;
  description: string;
  type: 'one-time' | 'persistent';
  aoe: string;
  effect: { name: string; amount?: number };
}

export const MATH_JOKERS: Joker[] = [
  {
    id: 1,
    name: 'Double Up',
    description: 'Double the price of one candy for one period',
    type: 'one-time',
    aoe: 'price',
    effect: { name: 'double_candy_price' },
  },
  {
    id: 2,
    name: 'Time Equation',
    description: 'Reverse one period using temporal mathematics',
    type: 'one-time',
    aoe: 'price',
    effect: { name: 'revert_period' },
  },
  {
    id: 3,
    name: 'Geometric Expansion',
    description: 'Increase inventory space using spatial geometry',
    type: 'persistent',
    aoe: 'inventory',
    effect: { name: 'incrase_inventory_limit', amount: 10 },
  },
  // { id: 4, name: 'Market Statistics', description: 'Half the price of one candy for one period' },
  // { id: 5, name: 'Fortune Algorithm', description: 'Use predictive modeling for market insights' },
  // { id: 6, name: 'Instant Calculus', description: 'Calculate optimal sell points in real-time' },
  // { id: 7, name: 'Exponential Growth', description: 'Apply compound interest to double money once' },
  // { id: 8, name: 'Logic Gate', description: 'Use boolean logic to bypass negative events' },
  // { id: 9, name: 'Infinity Theory', description: 'Break inventory limits with mathematical concepts' },
  // { id: 10, name: 'Prophet Equations', description: 'Forecast market trends 2 periods ahead' },
];

export const COMPUTER_JOKERS: Joker[] = [
  {
    id: 11,
    name: 'Scout',
    description: '25% chance to hear about events before it happens',
    type: 'persistent',
    effect: '25%_hint',
  },
  {
    id: 12,
    name: 'Predictor',
    description: '100% chance to hear about events before it happens',
    type: 'persistent',
    effect: '100%_hint',
  },
  {
    id: 13,
    name: 'Propacandies',
    description: 'Make one candy price crash by spreading untrue news',
    type: 'one-time',
    effect: 'crash_price',
  },
  {
    id: 14,
    name: 'Data Compression',
    description: 'Candied no loss compression to save space',
    type: 'persistent',
    effect: 'double_inventory_space',
  },
  {
    id: 15,
    name: 'Market Database',
    description: "Predict next period's trending items",
  },
  {
    id: 16,
    name: 'System Backup',
    description: 'Duplicate any successful trade strategy',
  },
  {
    id: 17,
    name: 'Auto-Sort Algorithm',
    description: 'Auto-organize inventory by profitability',
  },
  {
    id: 18,
    name: 'Data Compiler',
    description: 'Combine 3 small items into 1 premium item',
  },
];

export const HOME_EC_JOKERS: Joker[] = [
  {
    id: 19,
    name: 'Vacuum Sealer',
    description: 'All candy, no air!',
    type: 'persistent',
    effect: 'double_inventory_space',
  },
  {
    id: 20,
    name: 'Time Freeze',
    description: 'Slow down kitchen rush for 15 seconds',
  },
  {
    id: 21,
    name: 'Extra Prep Time',
    description: 'Add 30 seconds to cooking timer',
  },
  {
    id: 22,
    name: 'Perfect Technique',
    description: 'Next 5 sorts are automatically perfect',
  },
  {
    id: 23,
    name: 'Crystal Ball',
    description: 'See next 10 ingredients coming',
  },
  {
    id: 24,
    name: 'Lightning Hands',
    description: 'Super fast sorting reflexes for 20 seconds',
  },
  {
    id: 25,
    name: 'Forgiveness',
    description: 'Ignore next 3 sorting mistakes',
  },
  {
    id: 26,
    name: 'Ingredient Rain',
    description: 'Bonus points for perfect combos',
  },
];

export const ECONOMY_JOKERS: Joker[] = [
  {
    id: 27,
    name: 'Trade Route Map',
    description: 'See all possible trade combinations',
  },
  {
    id: 28,
    name: 'Merchant Network',
    description: 'Unlock exclusive premium trades',
  },
  {
    id: 29,
    name: 'Economic Forecast',
    description: 'Predict market changes 3 steps ahead',
  },
  {
    id: 30,
    name: 'Diplomatic Immunity',
    description: 'Bypass trade restrictions once',
  },
  {
    id: 31,
    name: 'Resource Monopoly',
    description: 'Control supply of one item type',
  },
  {
    id: 32,
    name: 'Ancient Currency',
    description: 'Trade any item for any other item',
  },
  {
    id: 33,
    name: 'Cultural Exchange',
    description: 'Double value on international trades',
  },
  {
    id: 34,
    name: 'Market Analysis',
    description: 'Highlight most profitable trade paths',
  },
];

export const HISTORY_JOKERS: Joker[] = [
  {
    id: 35,
    name: 'Time Machine',
    description: 'Skip one period and keep all profits',
  },
  {
    id: 36,
    name: 'Ancient Wisdom',
    description: 'See all events for current day',
  },
  { id: 37, name: 'Roman Coin', description: 'Double your money instantly' },
  {
    id: 38,
    name: 'Egyptian Treasure',
    description: 'Find rare candy worth 10x normal price',
  },
  {
    id: 39,
    name: 'Viking Raid',
    description: 'Steal candy from other players (future)',
  },
  {
    id: 40,
    name: 'Medieval Shield',
    description: 'Protect against one negative event',
  },
  {
    id: 41,
    name: "Scholar's Scroll",
    description: 'Get hints about next 3 periods',
  },
  {
    id: 42,
    name: "Caesar's Cipher",
    description: 'Decode secret market information',
  },
];

export const LOGIC_JOKERS: Joker[] = [
  {
    id: 43,
    name: 'Master Key',
    description: 'Open any locked market instantly',
  },
  {
    id: 44,
    name: 'Safe Cracker',
    description: 'Reveal one random candy location',
  },
  { id: 45, name: 'Lock Pick', description: 'Bypass one negative event' },
  {
    id: 46,
    name: 'Security Bypass',
    description: 'Access premium candy early',
  },
  {
    id: 47,
    name: 'Code Breaker',
    description: "See competitor's inventory (future)",
  },
  {
    id: 48,
    name: 'Digital Lock',
    description: 'Double profits for one period',
  },
  {
    id: 49,
    name: 'Combination Finder',
    description: 'Get hints about market changes',
  },
  {
    id: 50,
    name: 'Safe Deposit',
    description: 'Protect money from theft events',
  },
];

export const GYM_JOKERS: Joker[] = [
  {
    id: 51,
    name: 'Energy Drink',
    description: 'Boost speed and reaction time for 2 periods',
  },
  {
    id: 52,
    name: "Coach's Whistle",
    description: 'Instantly motivate team for better performance',
  },
  {
    id: 53,
    name: 'Athletic Tape',
    description: 'Prevent injuries from risky market moves',
  },
  {
    id: 54,
    name: 'Protein Shake',
    description: 'Double strength for heavy lifting (big trades)',
  },
  {
    id: 55,
    name: 'Stopwatch',
    description: 'Time trades perfectly for maximum profit',
  },
  {
    id: 56,
    name: 'Team Jersey',
    description: 'Rally support from other students',
  },
  {
    id: 57,
    name: 'Gym Membership',
    description: 'Access exclusive training (premium markets)',
  },
  {
    id: 58,
    name: 'Victory Medal',
    description: 'Inspire confidence for bigger risks',
  },
];

export const ALL_JOKERS = {
  Math: MATH_JOKERS,
  Computer: COMPUTER_JOKERS,
  'Home Economics': HOME_EC_JOKERS,
  Economy: ECONOMY_JOKERS,
  History: HISTORY_JOKERS,
  Logic: LOGIC_JOKERS,
  Gym: GYM_JOKERS,
};

export const getJokersBySubject = (subject: string): Joker[] => {
  return ALL_JOKERS[subject as keyof typeof ALL_JOKERS] || [];
};
