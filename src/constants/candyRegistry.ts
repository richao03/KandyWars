import { CandyTypeName, CandySize } from '../types/candy';

export interface CandyDefinition {
  name: string;
  size: CandySize;
  types: [CandyTypeName, CandyTypeName];
  baseMin: number;
  baseMax: number;
}

// All 15 candies — each has a unique pair of types (C(6,2) = 15)
// Each type appears exactly 5 times across all candies
// Size correlates with price: small=cheap, medium=mid, big=expensive
// Unlocked progressively: small (Day 1), medium (Day 2, $500), big (Day 3, $5000)
export const CANDY_REGISTRY: CandyDefinition[] = [
  // Small candies ($1–$200)
  { name: 'Gummy Bears',     size: 'small',  types: ['gummy', 'chewy'],         baseMin: 1,    baseMax: 20 },
  { name: 'Jolly Ranchers',  size: 'small',  types: ['hard_candy', 'fruity'],   baseMin: 5,    baseMax: 50 },
  { name: 'Warheads',        size: 'small',  types: ['sour', 'hard_candy'],     baseMin: 15,   baseMax: 100 },
  { name: 'M&Ms',            size: 'small',  types: ['chocolate', 'hard_candy'], baseMin: 30,   baseMax: 150 },
  { name: 'Nerd Rope',       size: 'small',  types: ['chewy', 'fruity'],        baseMin: 50,   baseMax: 200 },

  // Medium candies ($50–$2,000) — unlocked Day 2 for $500
  { name: 'Bubble Gum',      size: 'medium', types: ['gummy', 'sour'],          baseMin: 50,   baseMax: 200 },
  { name: 'Swedish Fish',    size: 'medium', types: ['gummy', 'fruity'],        baseMin: 100,  baseMax: 500 },
  { name: 'Sour Straws',     size: 'medium', types: ['sour', 'chewy'],          baseMin: 200,  baseMax: 800 },
  { name: 'Caramel',         size: 'medium', types: ['hard_candy', 'chewy'],    baseMin: 400,  baseMax: 1500 },
  { name: 'Snickers',        size: 'medium', types: ['chocolate', 'chewy'],     baseMin: 600,  baseMax: 2000 },

  // Big candies ($500–$10,000) — unlocked Day 3 for $5000
  { name: 'Tootsie Roll',    size: 'big',    types: ['gummy', 'chocolate'],     baseMin: 500,  baseMax: 1500 },
  { name: 'Jaw Breaker',     size: 'big',    types: ['hard_candy', 'gummy'],    baseMin: 1000, baseMax: 3000 },
  { name: 'Strawberry Bark', size: 'big',    types: ['chocolate', 'sour'],      baseMin: 2000, baseMax: 5000 },
  { name: 'Sour Patch Kids', size: 'big',    types: ['sour', 'fruity'],         baseMin: 3500, baseMax: 7500 },
  { name: 'Taffy',           size: 'big',    types: ['chocolate', 'fruity'],    baseMin: 5000, baseMax: 10000 },
];

// All candy names as a constant array
export const CANDY_NAMES = CANDY_REGISTRY.map((c) => c.name);

// Get a candy definition by name
export function getCandyDefinition(name: string): CandyDefinition | undefined {
  return CANDY_REGISTRY.find((c) => c.name === name);
}

// Get all candies that have a specific type
export function getCandiesByType(type: CandyTypeName): CandyDefinition[] {
  return CANDY_REGISTRY.filter((c) => c.types.includes(type));
}

// Get all candies of a specific size
export function getCandiesBySize(size: CandySize): CandyDefinition[] {
  return CANDY_REGISTRY.filter((c) => c.size === size);
}

// Check if a candy matches a given type
export function candyMatchesType(candyName: string, type: CandyTypeName): boolean {
  const candy = getCandyDefinition(candyName);
  return candy ? candy.types.includes(type) : false;
}

// Check if a candy matches a given size
export function candyMatchesSize(candyName: string, size: CandySize): boolean {
  const candy = getCandyDefinition(candyName);
  return candy ? candy.size === size : false;
}

// All candy type names for display
export const ALL_CANDY_TYPES: CandyTypeName[] = ['gummy', 'chocolate', 'hard_candy', 'sour', 'chewy', 'fruity'];

// All candy sizes for display
export const ALL_CANDY_SIZES: CandySize[] = ['small', 'medium', 'big'];

// Display labels for types
export const CANDY_TYPE_LABELS: Record<CandyTypeName, string> = {
  gummy: 'Gummy',
  chocolate: 'Chocolate',
  hard_candy: 'Hard Candy',
  sour: 'Sour',
  chewy: 'Chewy',
  fruity: 'Fruity',
};

// Display labels for sizes
export const CANDY_SIZE_LABELS: Record<CandySize, string> = {
  small: 'Small',
  medium: 'Medium',
  big: 'Big',
};
