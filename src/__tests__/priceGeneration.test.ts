// Mock image requires before importing the module
jest.mock('../../assets/images/pricedrop.png', () => 'pricedrop-mock', { virtual: true });
jest.mock('../../assets/images/bully.png', () => 'bully-mock', { virtual: true });
jest.mock('../../assets/images/foundmoney.png', () => 'foundmoney-mock', { virtual: true });
jest.mock('../../assets/images/pricehike.png', () => 'pricehike-mock', { virtual: true });
jest.mock('../../assets/images/confiscate.png', () => 'confiscate-mock', { virtual: true });
jest.mock('../../assets/images/react-logo.png', () => 'react-logo-mock', { virtual: true });

import { generateSeededGameData } from '../../utils/generateSeededGameData';
import { CANDY_REGISTRY, CANDY_NAMES } from '../constants/candyRegistry';

const SEED = 'test-seed-42';
const TOTAL_PERIODS = 40;

// Pre-compute base price info for validation
const candyBasePrices: Record<string, { baseMax: number; maxSpikePrice: number; floorPrice: number; size: string }> = {};
CANDY_REGISTRY.forEach((candy) => {
  const maxSpikePrice = candy.baseMax * 14;
  const floorPrice = Math.max(maxSpikePrice * 0.03, 0.01);
  candyBasePrices[candy.name] = { baseMax: candy.baseMax, maxSpikePrice, floorPrice, size: candy.size };
});

describe('Price Generation', () => {
  const gameData = generateSeededGameData(SEED, TOTAL_PERIODS);

  it('should be deterministic — same seed produces same prices', () => {
    const gameData2 = generateSeededGameData(SEED, TOTAL_PERIODS);
    expect(gameData.candyPrices).toEqual(gameData2.candyPrices);
  });

  it('should have all prices positive (> 0)', () => {
    Object.entries(gameData.candyPrices).forEach(([candy, prices]) => {
      prices.forEach((price, i) => {
        expect(price).toBeGreaterThan(0);
      });
    });
  });

  it('should have Day 5 average prices higher than Day 1 (day scaling)', () => {
    const day1Ratios: number[] = [];
    const day5Ratios: number[] = [];

    Object.entries(gameData.candyPrices).forEach(([candy, prices]) => {
      // Day 1 = periods 0-7, Day 5 = periods 32-39
      const day1Avg = prices.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
      const day5Avg = prices.slice(32, 40).reduce((a, b) => a + b, 0) / 8;

      // Normalize by tier to compare across sizes
      const info = candyBasePrices[candy];
      day1Ratios.push(day1Avg / info.maxSpikePrice);
      day5Ratios.push(day5Avg / info.maxSpikePrice);
    });

    const avgDay1Ratio = day1Ratios.reduce((a, b) => a + b, 0) / day1Ratios.length;
    const avgDay5Ratio = day5Ratios.reduce((a, b) => a + b, 0) / day5Ratios.length;

    expect(avgDay5Ratio).toBeGreaterThan(avgDay1Ratio);
  });

  it('should have per-candy personality — different avg prices within same tier', () => {
    const sizeGroups: Record<string, number[]> = {};

    Object.entries(gameData.candyPrices).forEach(([candy, prices]) => {
      const info = candyBasePrices[candy];
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      if (!sizeGroups[info.size]) sizeGroups[info.size] = [];
      sizeGroups[info.size].push(avg);
    });

    // Within each size tier, not all averages should be identical
    Object.entries(sizeGroups).forEach(([size, avgs]) => {
      if (avgs.length > 1) {
        const allSame = avgs.every((a) => Math.abs(a - avgs[0]) < 0.01);
        expect(allSame).toBe(false);
      }
    });
  });

  it('should have trend clusters — consecutive same-direction moves above random baseline', () => {
    let totalPairs = 0;
    let sameDirectionPairs = 0;

    Object.values(gameData.candyPrices).forEach((prices) => {
      for (let i = 1; i < prices.length - 1; i++) {
        const delta1 = prices[i] - prices[i - 1];
        const delta2 = prices[i + 1] - prices[i];
        if (delta1 !== 0 && delta2 !== 0) {
          totalPairs++;
          if (Math.sign(delta1) === Math.sign(delta2)) {
            sameDirectionPairs++;
          }
        }
      }
    });

    // With trend clusters, same-direction ratio should be > 50% (random baseline)
    const ratio = sameDirectionPairs / totalPairs;
    expect(ratio).toBeGreaterThan(0.5);
  });

  it('should not exceed ceiling (baseMax * 14) for any candy', () => {
    Object.entries(gameData.candyPrices).forEach(([candy, prices]) => {
      const info = candyBasePrices[candy];
      prices.forEach((price) => {
        expect(price).toBeLessThanOrEqual(info.maxSpikePrice);
      });
    });
  });

  it('should not fall below floor price for any candy', () => {
    Object.entries(gameData.candyPrices).forEach(([candy, prices]) => {
      const info = candyBasePrices[candy];
      prices.forEach((price) => {
        expect(price).toBeGreaterThanOrEqual(info.floorPrice);
      });
    });
  });

  it('should have exactly totalPeriods prices per candy', () => {
    Object.values(gameData.candyPrices).forEach((prices) => {
      expect(prices).toHaveLength(TOTAL_PERIODS);
    });
  });

  it('should have all 15 candies present', () => {
    const candyNames = Object.keys(gameData.candyPrices);
    expect(candyNames).toHaveLength(15);
    CANDY_NAMES.forEach((name) => {
      expect(gameData.candyPrices[name]).toBeDefined();
    });
  });
});
