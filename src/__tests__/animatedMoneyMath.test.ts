import {
  computeCountUpDuration,
  computeTickTimestamps,
} from '../utils/animatedMoneyMath';

describe('computeCountUpDuration', () => {
  it('returns 0 when from === to (no delta)', () => {
    expect(computeCountUpDuration(100, 100)).toBe(0);
  });

  it('returns a value within [200, 800] for a typical delta of 1000', () => {
    const result = computeCountUpDuration(0, 1000);
    expect(result).toBeGreaterThanOrEqual(200);
    expect(result).toBeLessThanOrEqual(800);
  });

  it('returns at least 200 ms (minimum clamp) for delta of 1', () => {
    const result = computeCountUpDuration(0, 1);
    expect(result).toBeGreaterThanOrEqual(200);
  });

  it('returns exactly 200 when delta < 1 (sub-unit change returns 0)', () => {
    // delta = 0.5 → treated as < 1 → 0
    expect(computeCountUpDuration(0, 0.5)).toBe(0);
  });

  it('clamps to 800 ms for very large delta (1e10)', () => {
    expect(computeCountUpDuration(0, 1e10)).toBe(800);
  });

  it('uses absolute delta — negative-to-positive same as positive same magnitude', () => {
    const posResult = computeCountUpDuration(0, 200);
    const negResult = computeCountUpDuration(-100, 100);
    expect(negResult).toBe(posResult);
  });

  it('handles from > to (abs delta)', () => {
    const result = computeCountUpDuration(500, 0);
    expect(result).toBeGreaterThanOrEqual(200);
    expect(result).toBeLessThanOrEqual(800);
  });

  it('returns 200 for delta exactly equal to 1', () => {
    const result = computeCountUpDuration(0, 1);
    // log10(1) = 0, so 200 + 0*150 = 200
    expect(result).toBe(200);
  });

  it('scales duration with log10 for mid-range delta', () => {
    const small = computeCountUpDuration(0, 10);
    const large = computeCountUpDuration(0, 10000);
    expect(large).toBeGreaterThan(small);
  });
});

describe('computeTickTimestamps', () => {
  it('returns 8 evenly-spaced timestamps at 50ms intervals for duration=400, tickCount=8', () => {
    const result = computeTickTimestamps(400, 8);
    expect(result).toHaveLength(8);
    expect(result[0]).toBeCloseTo(50);
    expect(result[1]).toBeCloseTo(100);
    expect(result[2]).toBeCloseTo(150);
    expect(result[3]).toBeCloseTo(200);
    expect(result[4]).toBeCloseTo(250);
    expect(result[5]).toBeCloseTo(300);
    expect(result[6]).toBeCloseTo(350);
    expect(result[7]).toBeCloseTo(400);
  });

  it('returns [] when duration is 0', () => {
    expect(computeTickTimestamps(0, 8)).toEqual([]);
  });

  it('returns [] when duration is negative', () => {
    expect(computeTickTimestamps(-100, 8)).toEqual([]);
  });

  it('returns [] when tickCount is 0', () => {
    expect(computeTickTimestamps(400, 0)).toEqual([]);
  });

  it('returns [] when tickCount is negative', () => {
    expect(computeTickTimestamps(400, -3)).toEqual([]);
  });

  it('returns a single timestamp at duration when tickCount=1', () => {
    const result = computeTickTimestamps(400, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(400);
  });

  it('uses default tickCount of 8 when not provided', () => {
    const result = computeTickTimestamps(800);
    expect(result).toHaveLength(8);
    expect(result[7]).toBe(800);
  });

  it('handles huge tickCount without throwing', () => {
    const result = computeTickTimestamps(400, 1000);
    expect(result).toHaveLength(1000);
    expect(result[999]).toBeCloseTo(400);
  });

  it('last timestamp always equals duration (regardless of tickCount)', () => {
    [1, 4, 8, 16].forEach((n) => {
      const result = computeTickTimestamps(500, n);
      expect(result[result.length - 1]).toBeCloseTo(500);
    });
  });

  it('all timestamps are strictly increasing', () => {
    const result = computeTickTimestamps(400, 8);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });
});
