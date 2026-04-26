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
  // Small candies ($0.10–$20)
  { name: 'Gummy Bears',     size: 'small',  types: ['gummy', 'chewy'],         baseMin: 0.1,  baseMax: 2 },
  { name: 'Jolly Ranchers',  size: 'small',  types: ['hard_candy', 'fruity'],   baseMin: 0.5,  baseMax: 5 },
  { name: 'Warheads',        size: 'small',  types: ['sour', 'hard_candy'],     baseMin: 1.5,  baseMax: 10 },
  { name: 'M&Ms',            size: 'small',  types: ['chocolate', 'hard_candy'], baseMin: 3,    baseMax: 15 },
  { name: 'Nerd Rope',       size: 'small',  types: ['chewy', 'fruity'],        baseMin: 5,    baseMax: 20 },

  // Medium candies ($5–$200) — unlocked Day 2 for $5
  { name: 'Bubble Gum',      size: 'medium', types: ['gummy', 'sour'],          baseMin: 5,    baseMax: 20 },
  { name: 'Swedish Fish',    size: 'medium', types: ['gummy', 'fruity'],        baseMin: 10,   baseMax: 50 },
  { name: 'Sour Straws',     size: 'medium', types: ['sour', 'chewy'],          baseMin: 20,   baseMax: 80 },
  { name: 'Caramel',         size: 'medium', types: ['hard_candy', 'chewy'],    baseMin: 40,   baseMax: 150 },
  { name: 'Snickers',        size: 'medium', types: ['chocolate', 'chewy'],     baseMin: 60,   baseMax: 200 },

  // Big candies ($50–$1000) — unlocked Day 3 for $50
  { name: 'Tootsie Roll',    size: 'big',    types: ['gummy', 'chocolate'],     baseMin: 50,   baseMax: 150 },
  { name: 'Jaw Breaker',     size: 'big',    types: ['hard_candy', 'gummy'],    baseMin: 100,  baseMax: 300 },
  { name: 'Strawberry Bark', size: 'big',    types: ['chocolate', 'sour'],      baseMin: 200,  baseMax: 500 },
  { name: 'Sour Patch Kids', size: 'big',    types: ['sour', 'fruity'],         baseMin: 350,  baseMax: 750 },
  { name: 'Taffy',           size: 'big',    types: ['chocolate', 'fruity'],    baseMin: 500,  baseMax: 1000 },
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
