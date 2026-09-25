// Single source of truth for joker level-up costs.
// Keyed by the joker's CURRENT level (the cost to go from that level to the next).
export const UPGRADE_COSTS: Record<number, number> = {
  1: 5000, // L1 → L2
  2: 30000, // L2 → L3
};

// Per-level accent colors used by level-up UIs.
export const LEVEL_COLORS = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#a855f7',
} as const;
