/**
 * computeSparkScale — granular tier lookup keyed by sale value.
 *
 * Maps a numeric sale value (or running pocket value) to a particle count and
 * a color palette via direct table lookup — NO runtime math beyond a single
 * walk to find the matching stop. Used for both:
 *   - the ambient sparks rising behind the Sell button
 *   - the climaxExplosion at the running-total component
 *
 * 9 stops span 250 → 100k with hues from green → teal → blue → purple →
 * pink/gold so every range has a clearly distinct color.
 */

export interface SparkScale {
  /** Particle count for the ambient sparks rising behind the Sell button. */
  count: number;
  /**
   * Particle count for the climaxExplosion (centered on the running total).
   * Scaled MUCH more aggressively across tiers than `count` — the climax
   * reads as a true crescendo, with low tiers getting only a handful of
   * candies and high tiers a full burst.
   */
  climaxCount: number;
  colors: string[];
  /** Particle image (cent / coin / money) — varies by stop tier. */
  imageSource: number;
}

interface ScaleStop {
  value: number;
  count: number;
  climaxCount: number;
  colors: string[];
  imageSource: number;
}

// Tiered particle images: stops 1–4 use cent, 5–7 use coin, 8–9 use money.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CENT_IMG = require('../../assets/images/emojis/cent.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const COIN_IMG = require('../../assets/images/emojis/coin.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MONEY_IMG = require('../../assets/images/emojis/money.png');

// `count` (sell-button sparks) resets within each image tier (8→12→18) since
// the image size differs (cent / coin / money). `climaxCount` (the candy.png
// explosion) ramps monotonically 3 → 50 across all tiers so the discrepancy
// between low-end and jackpot is dramatic.
const SCALE_STOPS: ScaleStop[] = [
  // Stops 1–3 → cent.png
  {
    value: 250,
    count: 8,
    climaxCount: 3,
    colors: ['#9ad07e', '#7ba965', '#6a9a54'], // muted green
    imageSource: CENT_IMG,
  },
  {
    value: 1000,
    count: 12,
    climaxCount: 5,
    colors: ['#5ced00', '#4caf50', '#43a047'], // bright green
    imageSource: CENT_IMG,
  },
  {
    value: 3000,
    count: 18,
    climaxCount: 8,
    colors: ['#3dff88', '#2ecc71', '#27ae60', '#16a085'], // emerald
    imageSource: CENT_IMG,
  },
  // Stops 4–6 → coin.png
  {
    value: 7500,
    count: 8,
    climaxCount: 12,
    colors: ['#1abc9c', '#20c997', '#00cccc', '#00e6e6'], // teal
    imageSource: COIN_IMG,
  },
  {
    value: 15000,
    count: 12,
    climaxCount: 16,
    colors: ['#00b0ff', '#00c3ff', '#00d9ff', '#1e90ff'], // sky blue
    imageSource: COIN_IMG,
  },
  {
    value: 30000,
    count: 18,
    climaxCount: 22,
    colors: ['#0066ff', '#0080ff', '#4169e1', '#5a7fff'], // royal blue
    imageSource: COIN_IMG,
  },
  // Stops 7–9 → money.png
  {
    value: 50000,
    count: 8,
    climaxCount: 30,
    colors: ['#8b5cf6', '#a855f7', '#c084fc', '#d946ef'], // purple/violet
    imageSource: MONEY_IMG,
  },
  {
    value: 80000,
    count: 12,
    climaxCount: 40,
    colors: ['#ec4899', '#f472b6', '#fde047', '#facc15'], // pink/gold
    imageSource: MONEY_IMG,
  },
  {
    value: 100000,
    count: 18,
    climaxCount: 50,
    colors: ['#fbbf24', '#f59e0b', '#dc2626', '#fb7185'], // gold/red — top tier
    imageSource: MONEY_IMG,
  },
];

/** Return the spark counts + palette + image for a given sale value. */
export function computeSparkScale(value: number): SparkScale {
  if (!Number.isFinite(value) || value < SCALE_STOPS[0]!.value) {
    return { count: 0, climaxCount: 0, colors: [], imageSource: CENT_IMG };
  }
  // Walk from the top so we land on the highest stop the value clears.
  for (let i = SCALE_STOPS.length - 1; i >= 0; i--) {
    const stop = SCALE_STOPS[i]!;
    if (value >= stop.value) {
      return {
        count: stop.count,
        climaxCount: stop.climaxCount,
        colors: stop.colors,
        imageSource: stop.imageSource,
      };
    }
  }
  return { count: 0, climaxCount: 0, colors: [], imageSource: CENT_IMG };
}
