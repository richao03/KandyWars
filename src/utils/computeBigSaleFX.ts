/**
 * Big-sale FX thresholds.
 *
 * Maps a final `totalGain` to which screen-wide celebrations to fire:
 *   - shake       (>= $250 — small at low tiers, ramps up with sale value)
 *   - edgeLights  (>= $10,000) — pulsing edge bands tiered at $10k / $15k / $20k
 *
 * Stops align with computeSparkScale so shake intensity grows alongside the
 * spark count/color tier. Pure lookup — no runtime math.
 */

import type {
  EdgeLightsTier,
  ScreenShakeOptions,
} from './screenFXController';

export interface BigSaleFX {
  shake: ScreenShakeOptions | null;
  edgeLights: EdgeLightsTier;
  edgeLightsDuration: number;
}

const NONE: BigSaleFX = {
  shake: null,
  edgeLights: 'none',
  edgeLightsDuration: 0,
};

interface FXStop {
  value: number;
  shake: ScreenShakeOptions;
  edgeLights: EdgeLightsTier;
  edgeLightsDuration: number;
}

// Shake ramps from a tiny 2px wiggle at $250 up to a 18px / 5-cycle blast at
// $100k+. Edge lights kick in at $10k+ and intensify in steps.
const FX_STOPS: FXStop[] = [
  {
    value: 250,
    shake: { intensity: 2, cycles: 1, duration: 200 },
    edgeLights: 'none',
    edgeLightsDuration: 0,
  },
  {
    value: 1000,
    shake: { intensity: 3, cycles: 1, duration: 250 },
    edgeLights: 'none',
    edgeLightsDuration: 0,
  },
  {
    value: 3000,
    shake: { intensity: 4, cycles: 2, duration: 300 },
    edgeLights: 'none',
    edgeLightsDuration: 0,
  },
  {
    value: 7500,
    shake: { intensity: 6, cycles: 2, duration: 350 },
    edgeLights: 'none',
    edgeLightsDuration: 0,
  },
  {
    value: 15000,
    shake: { intensity: 8, cycles: 3, duration: 450 },
    edgeLights: 'tier-10k',
    edgeLightsDuration: 1800,
  },
  {
    value: 30000,
    shake: { intensity: 10, cycles: 3, duration: 500 },
    edgeLights: 'tier-15k',
    edgeLightsDuration: 2100,
  },
  {
    value: 50000,
    shake: { intensity: 12, cycles: 4, duration: 550 },
    edgeLights: 'tier-20k',
    edgeLightsDuration: 2400,
  },
  {
    value: 80000,
    shake: { intensity: 14, cycles: 4, duration: 600 },
    edgeLights: 'tier-20k',
    edgeLightsDuration: 2400,
  },
  {
    value: 100000,
    shake: { intensity: 18, cycles: 5, duration: 700 },
    edgeLights: 'tier-20k',
    edgeLightsDuration: 2400,
  },
];

/** Pure mapping — no side effects, safe to call from previews/tests. */
export function computeBigSaleFX(totalGain: number): BigSaleFX {
  if (!Number.isFinite(totalGain) || totalGain < FX_STOPS[0]!.value) {
    return NONE;
  }
  // Walk from the top so we land on the highest stop the value clears.
  for (let i = FX_STOPS.length - 1; i >= 0; i--) {
    const stop = FX_STOPS[i]!;
    if (totalGain >= stop.value) {
      return {
        shake: stop.shake,
        edgeLights: stop.edgeLights,
        edgeLightsDuration: stop.edgeLightsDuration,
      };
    }
  }
  return NONE;
}

/**
 * Edge light palettes per tier — three colors per palette (used for top,
 * left/right, and bottom bands). Tiers progress blue → teal → green.
 */
export const EDGE_LIGHT_PALETTES: Record<EdgeLightsTier, string[]> = {
  none: [],
  // Blue
  'tier-10k': ['#1e90ff', '#0080ff', '#0066ff'],
  // Teal — blue/green crossover
  'tier-15k': ['#14b8a6', '#06b6d4', '#0891b2'],
  // Green
  'tier-20k': ['#22c55e', '#10b981', '#16a34a'],
};
