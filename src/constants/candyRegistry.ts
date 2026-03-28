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
// 5 price tiers (3 candies each): Penny, Budget, Mid, Premium, Elite
export const CANDY_REGISTRY: CandyDefinition[] = [
  // Tier 1 — Penny ($1–$10)
  { name: 'Gummy Bears',     size: 'small',  types: ['gummy', 'chewy'],       baseMin: 1,    baseMax: 10 },
  { name: 'Jolly Ranchers',  size: 'small',  types: ['hard_candy', 'fruity'], baseMin: 2,    baseMax: 8 },
  { name: 'Warheads',        size: 'small',  types: ['sour', 'hard_candy'],   baseMin: 3,    baseMax: 10 },

  // Tier 2 — Budget ($10–$200)
  { name: 'M&Ms',            size: 'small',  types: ['chocolate', 'hard_candy'], baseMin: 10,  baseMax: 200 },
  { name: 'Nerd Rope',       size: 'small',  types: ['chewy', 'fruity'],      baseMin: 15,   baseMax: 150 },
  { name: 'Bubble Gum',      size: 'medium', types: ['gummy', 'sour'],        baseMin: 20,   baseMax: 200 },

  // Tier 3 — Mid ($200–$1,000)
  { name: 'Swedish Fish',    size: 'medium', types: ['gummy', 'fruity'],      baseMin: 200,  baseMax: 800 },
  { name: 'Sour Straws',     size: 'medium', types: ['sour', 'chewy'],        baseMin: 250,  baseMax: 900 },
  { name: 'Caramel',         size: 'medium', types: ['hard_candy', 'chewy'],  baseMin: 300,  baseMax: 1000 },

  // Tier 4 — Premium ($1,000–$5,000)
  { name: 'Snickers',        size: 'medium', types: ['chocolate', 'chewy'],   baseMin: 1000, baseMax: 4000 },
  { name: 'Tootsie Roll',    size: 'big',    types: ['gummy', 'chocolate'],   baseMin: 1500, baseMax: 5000 },
  { name: 'Jaw Breaker',     size: 'big',    types: ['hard_candy', 'gummy'],  baseMin: 1200, baseMax: 4500 },

  // Tier 5 — Elite ($5,000–$10,000)
  { name: 'Strawberry Bark', size: 'big',    types: ['chocolate', 'sour'],    baseMin: 5000, baseMax: 9000 },
  { name: 'Sour Patch Kids', size: 'big',    types: ['sour', 'fruity'],       baseMin: 5500, baseMax: 10000 },
  { name: 'Taffy',           size: 'big',    types: ['chocolate', 'fruity'],  baseMin: 6000, baseMax: 10000 },
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
