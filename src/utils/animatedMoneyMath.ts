/**
 * animatedMoneyMath.ts
 *
 * Pure math utilities for the useAnimatedMoney hook.
 * All functions are side-effect-free and fully unit-testable.
 */

/**
 * Compute animation duration (ms) for a count-up from `from` to `to`.
 * Uses a log10 curve scaled to the delta magnitude, clamped to [200, 800] ms.
 * Returns 0 when `from === to`.
 */
export function computeCountUpDuration(from: number, to: number): number {
  const delta = Math.abs(to - from);
  if (delta < 1) return 0;
  return Math.min(800, Math.max(200, 200 + Math.log10(delta) * 150));
}

/**
 * Compute the ms offsets from animation start at which tick sounds should fire.
 * Ticks are evenly spaced so the last tick lands exactly at `duration`.
 * Default 8 ticks. Returns [] when duration ≤ 0 or tickCount < 1.
 */
export function computeTickTimestamps(duration: number, tickCount = 8): number[] {
  if (duration <= 0 || tickCount < 1) return [];
  const out: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    out.push(((i + 1) / tickCount) * duration);
  }
  return out;
}
