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
// Price tiers by size: Small ($1–$10), Medium ($500–$1,000), Big ($1,000–$2,000)
export const CANDY_REGISTRY: CandyDefinition[] = [
  // Small candies ($1–$10)
  { name: 'Gummy Bears',     size: 'small',  types: ['gummy', 'chewy'],      baseMin: 1,    baseMax: 10 },
  { name: 'M&Ms',            size: 'small',  types: ['chocolate', 'hard_candy'], baseMin: 1, baseMax: 10 },
  { name: 'Jolly Ranchers',  size: 'small',  types: ['hard_candy', 'fruity'], baseMin: 1,    baseMax: 10 },
  { name: 'Warheads',        size: 'small',  types: ['sour', 'hard_candy'],   baseMin: 1,    baseMax: 10 },
  { name: 'Nerd Rope',       size: 'small',  types: ['chewy', 'fruity'],      baseMin: 1,    baseMax: 10 },

  // Medium candies ($500–$1,000)
  { name: 'Swedish Fish',    size: 'medium', types: ['gummy', 'fruity'],      baseMin: 500,  baseMax: 1000 },
  { name: 'Snickers',        size: 'medium', types: ['chocolate', 'chewy'],   baseMin: 500,  baseMax: 1000 },
  { name: 'Caramel',         size: 'medium', types: ['hard_candy', 'chewy'],  baseMin: 500,  baseMax: 1000 },
  { name: 'Sour Straws',     size: 'medium', types: ['sour', 'chewy'],        baseMin: 500,  baseMax: 1000 },
  { name: 'Bubble Gum',      size: 'medium', types: ['gummy', 'sour'],        baseMin: 500,  baseMax: 1000 },

  // Big candies ($1,000–$2,000)
  { name: 'Tootsie Roll',    size: 'big',    types: ['gummy', 'chocolate'],   baseMin: 1000, baseMax: 2000 },
  { name: 'Strawberry Bark', size: 'big',    types: ['chocolate', 'sour'],    baseMin: 1000, baseMax: 2000 },
  { name: 'Jaw Breaker',     size: 'big',    types: ['hard_candy', 'gummy'],  baseMin: 1000, baseMax: 2000 },
  { name: 'Sour Patch Kids', size: 'big',    types: ['sour', 'fruity'],       baseMin: 1000, baseMax: 2000 },
  { name: 'Taffy',           size: 'big',    types: ['chocolate', 'fruity'],  baseMin: 1000, baseMax: 2000 },
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
