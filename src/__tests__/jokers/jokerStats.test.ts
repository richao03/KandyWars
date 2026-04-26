import { configureStore } from '@reduxjs/toolkit';
import jokerStatsReducer, {
  incrementStat,
  setStat,
  resetJokerStats,
  JokerStats,
} from '../../store/slices/jokerStatsSlice';
import { JOKER_IDS } from '../../constants/jokerIds';
import {
  getJokerEffectsAtLevel,
  getLiveJokerValueText,
} from '../../utils/jokerEffectEngine';
import { calculateSaleTotal } from '../../utils/saleCalculations';

function createTestStore() {
  return configureStore({
    reducer: { jokerStats: jokerStatsReducer },
  });
}

describe('Joker Stats Slice', () => {
  it('should initialize with all counters at 0', () => {
    const store = createTestStore();
    const stats = store.getState().jokerStats;
    expect(stats.compoundInterestDays).toBe(0);
    expect(stats.reputationTypesSold).toBe(0);
    expect(stats.streetSmartsEventsSurvived).toBe(0);
    expect(stats.clearanceSaleLosses).toBe(0);
    expect(stats.hoarderMaxHits).toBe(0);
    expect(stats.pennyWiseStashes).toBe(0);
    expect(stats.survivorCandiesMelted).toBe(0);
  });

  it('should increment a stat by 1 by default', () => {
    const store = createTestStore();
    store.dispatch(incrementStat({ stat: 'hoarderMaxHits' }));
    expect(store.getState().jokerStats.hoarderMaxHits).toBe(1);
    store.dispatch(incrementStat({ stat: 'hoarderMaxHits' }));
    expect(store.getState().jokerStats.hoarderMaxHits).toBe(2);
  });

  it('should increment a stat by a custom amount', () => {
    const store = createTestStore();
    store.dispatch(incrementStat({ stat: 'survivorCandiesMelted', amount: 3 }));
    expect(store.getState().jokerStats.survivorCandiesMelted).toBe(3);
  });

  it('should set a stat directly', () => {
    const store = createTestStore();
    store.dispatch(setStat({ stat: 'pennyWiseStashes', value: 5 }));
    expect(store.getState().jokerStats.pennyWiseStashes).toBe(5);
  });

  it('should reset all stats', () => {
    const store = createTestStore();
    store.dispatch(incrementStat({ stat: 'hoarderMaxHits' }));
    store.dispatch(incrementStat({ stat: 'pennyWiseStashes' }));
    store.dispatch(incrementStat({ stat: 'survivorCandiesMelted' }));
    store.dispatch(resetJokerStats());
    const stats = store.getState().jokerStats;
    expect(stats.hoarderMaxHits).toBe(0);
    expect(stats.pennyWiseStashes).toBe(0);
    expect(stats.survivorCandiesMelted).toBe(0);
  });
});

describe('New Scaling Joker Effects', () => {
  describe('Hoarder (95)', () => {
    it('should have hoarder_boost target with add operation', () => {
      const effects = getJokerEffectsAtLevel(JOKER_IDS.HOARDER, 1);
      expect(effects).toHaveLength(1);
      expect(effects[0].target).toBe('hoarder_boost');
      expect(effects[0].operation).toBe('add');
      expect(effects[0].amount).toBe(0.3);
    });

    it('should scale with level', () => {
      expect(getJokerEffectsAtLevel(JOKER_IDS.HOARDER, 2)[0].amount).toBe(0.5);
      expect(getJokerEffectsAtLevel(JOKER_IDS.HOARDER, 3)[0].amount).toBe(0.8);
    });

    it('should add to multiplier based on hoarderMaxHits', () => {
      const result = calculateSaleTotal({
        candyName: 'Gummy Bears',
        basePrice: 10,
        purchasePrice: 5,
        quantity: 1,
        jokers: [{ id: JOKER_IDS.HOARDER, level: 1 }],
        periodCount: 0,
        inventoryLimit: 30,
        merchantEffects: [],
        hoarderMaxHits: 3,
      });
      // +0.3 mult per hit x 3 hits = +0.9 mult, total mult = 1.9
      // profit = (10-5) * 1 = 5, boosted = 5, final = 5 * 1.9 = 9.5
      // totalGain = purchaseValue(5) + finalProfit(9.5) = 14.5
      expect(result.totalGain).toBeCloseTo(14.5, 1);
    });

    it('should have no effect with 0 hits', () => {
      const result = calculateSaleTotal({
        candyName: 'Gummy Bears',
        basePrice: 10,
        purchasePrice: 5,
        quantity: 1,
        jokers: [{ id: JOKER_IDS.HOARDER, level: 1 }],
        periodCount: 0,
        inventoryLimit: 30,
        merchantEffects: [],
        hoarderMaxHits: 0,
      });
      // totalGain = purchaseValue(5) + finalProfit(5) = 10
      expect(result.totalGain).toBeCloseTo(10, 1);
    });
  });

  describe('Penny Wise (96)', () => {
    it('should have penny_wise_boost target with add operation', () => {
      const effects = getJokerEffectsAtLevel(JOKER_IDS.PENNY_WISE, 1);
      expect(effects).toHaveLength(1);
      expect(effects[0].target).toBe('penny_wise_boost');
      expect(effects[0].operation).toBe('add');
      expect(effects[0].amount).toBe(0.15);
    });

    it('should scale with level', () => {
      expect(getJokerEffectsAtLevel(JOKER_IDS.PENNY_WISE, 2)[0].amount).toBe(0.25);
      expect(getJokerEffectsAtLevel(JOKER_IDS.PENNY_WISE, 3)[0].amount).toBe(0.4);
    });

    it('should add to profitBoost based on pennyWiseStashes', () => {
      const result = calculateSaleTotal({
        candyName: 'Gummy Bears',
        basePrice: 10,
        purchasePrice: 5,
        quantity: 1,
        jokers: [{ id: JOKER_IDS.PENNY_WISE, level: 1 }],
        periodCount: 0,
        inventoryLimit: 30,
        merchantEffects: [],
        pennyWiseStashes: 4,
      });
      // +15% profit per stash x 4 = +60% profit
      // profit = 5, profitBoost = 1 + 0.6 = 1.6, boosted = 8
      // totalGain = purchaseValue(5) + finalProfit(8) = 13
      expect(result.totalGain).toBeCloseTo(13, 1);
    });

    it('should have no effect with 0 stashes', () => {
      const result = calculateSaleTotal({
        candyName: 'Gummy Bears',
        basePrice: 10,
        purchasePrice: 5,
        quantity: 1,
        jokers: [{ id: JOKER_IDS.PENNY_WISE, level: 1 }],
        periodCount: 0,
        inventoryLimit: 30,
        merchantEffects: [],
        pennyWiseStashes: 0,
      });
      // totalGain = purchaseValue(5) + finalProfit(5) = 10
      expect(result.totalGain).toBeCloseTo(10, 1);
    });
  });

  describe('Survivor (97)', () => {
    it('should have survivor_boost target with add operation', () => {
      const effects = getJokerEffectsAtLevel(JOKER_IDS.SURVIVOR, 1);
      expect(effects).toHaveLength(1);
      expect(effects[0].target).toBe('survivor_boost');
      expect(effects[0].operation).toBe('add');
      expect(effects[0].amount).toBe(0.5);
    });

    it('should scale with level', () => {
      expect(getJokerEffectsAtLevel(JOKER_IDS.SURVIVOR, 2)[0].amount).toBe(0.75);
      expect(getJokerEffectsAtLevel(JOKER_IDS.SURVIVOR, 3)[0].amount).toBe(1.0);
    });

    it('should add to multiplier based on survivorCandiesMelted', () => {
      const result = calculateSaleTotal({
        candyName: 'Gummy Bears',
        basePrice: 10,
        purchasePrice: 5,
        quantity: 1,
        jokers: [{ id: JOKER_IDS.SURVIVOR, level: 1 }],
        periodCount: 0,
        inventoryLimit: 30,
        merchantEffects: [],
        survivorCandiesMelted: 2,
      });
      // +0.5 mult per melt x 2 = +1.0 mult, total mult = 2.0
      // profit = 5, final = 5 * 2.0 = 10
      // totalGain = purchaseValue(5) + finalProfit(10) = 15
      expect(result.totalGain).toBeCloseTo(15, 1);
    });

    it('should have no effect with 0 melts', () => {
      const result = calculateSaleTotal({
        candyName: 'Gummy Bears',
        basePrice: 10,
        purchasePrice: 5,
        quantity: 1,
        jokers: [{ id: JOKER_IDS.SURVIVOR, level: 1 }],
        periodCount: 0,
        inventoryLimit: 30,
        merchantEffects: [],
        survivorCandiesMelted: 0,
      });
      // totalGain = purchaseValue(5) + finalProfit(5) = 10
      expect(result.totalGain).toBeCloseTo(10, 1);
    });
  });
});

describe('getLiveJokerValueText', () => {
  const ZERO_STATS: JokerStats = {
    compoundInterestDays: 0,
    reputationTypesSold: 0,
    streetSmartsEventsSurvived: 0,
    clearanceSaleLosses: 0,
    hoarderMaxHits: 0,
    pennyWiseStashes: 0,
    survivorCandiesMelted: 0,
    tradeRoutesPeriods: 0,
  };
  const ZERO_CTX = { jokerStats: ZERO_STATS };

  it('returns null for non-variable jokers', () => {
    expect(getLiveJokerValueText(JOKER_IDS.DOUBLE_UP, 1, ZERO_CTX)).toBeNull();
  });

  it('returns null when the variable joker has zero stacks', () => {
    expect(getLiveJokerValueText(JOKER_IDS.CLEARANCE_SALE, 1, ZERO_CTX)).toBeNull();
    expect(getLiveJokerValueText(JOKER_IDS.HOARDER, 2, ZERO_CTX)).toBeNull();
    expect(getLiveJokerValueText(JOKER_IDS.PENNY_WISE, 3, ZERO_CTX)).toBeNull();
    expect(getLiveJokerValueText(JOKER_IDS.TRADE_ROUTES, 1, ZERO_CTX)).toBeNull();
    expect(getLiveJokerValueText(JOKER_IDS.MOMENTUM, 1, ZERO_CTX)).toBeNull();
  });

  describe('Trade Routes (39)', () => {
    it.each([
      [1, 3, 'currently +6 inventory'], // 2 per period × 3 periods
      [2, 4, 'currently +12 inventory'], // 3 × 4
      [3, 5, 'currently +20 inventory'], // 4 × 5
    ])('L%i × %i periods → %s', (level, stacks, expected) => {
      expect(
        getLiveJokerValueText(JOKER_IDS.TRADE_ROUTES, level, {
          jokerStats: { ...ZERO_STATS, tradeRoutesPeriods: stacks },
        })
      ).toBe(expected);
    });
  });

  describe('Clearance Sale (73)', () => {
    it.each([
      [1, 3, 'currently +30% mult'], // 0.10 * 3 = 0.30 = 30%
      [2, 4, 'currently +60% mult'], // 0.15 * 4 = 0.60
      [3, 5, 'currently +100% mult'], // 0.20 * 5 = 1.00
    ])('L%i × %i loss sales → %s', (level, stacks, expected) => {
      expect(
        getLiveJokerValueText(JOKER_IDS.CLEARANCE_SALE, level, {
          jokerStats: { ...ZERO_STATS, clearanceSaleLosses: stacks },
        })
      ).toBe(expected);
    });
  });

  describe('Reputation (64)', () => {
    it('L1 × 3 unique candies → currently +60%', () => {
      expect(
        getLiveJokerValueText(JOKER_IDS.REPUTATION, 1, {
          jokerStats: { ...ZERO_STATS, reputationTypesSold: 3 },
        })
      ).toBe('currently +60%');
    });
  });

  describe('Street Smarts (65)', () => {
    it.each([
      [1, 3, 'currently +1.5 mult'],
      [2, 4, 'currently +3 mult'],
      [3, 2, 'currently +2 mult'],
    ])('L%i × %i events → %s', (level, stacks, expected) => {
      expect(
        getLiveJokerValueText(JOKER_IDS.STREET_SMARTS, level, {
          jokerStats: { ...ZERO_STATS, streetSmartsEventsSurvived: stacks },
        })
      ).toBe(expected);
    });
  });

  describe('Momentum (89)', () => {
    it.each([
      [1, 2, 'currently +0.6 mult'], // 0.3 × 2
      [2, 3, 'currently +1.5 mult'], // 0.5 × 3
      [3, 4, 'currently +3.2 mult'], // 0.8 × 4
    ])(
      'L%i × %i consecutive sale periods → %s',
      (level, consecutive, expected) => {
        expect(
          getLiveJokerValueText(JOKER_IDS.MOMENTUM, level, {
            jokerStats: ZERO_STATS,
            consecutivePeriodSales: consecutive,
          })
        ).toBe(expected);
      }
    );
  });

  describe('Hoarder (95)', () => {
    it('L1 × 2 hits → currently +0.6 mult', () => {
      expect(
        getLiveJokerValueText(JOKER_IDS.HOARDER, 1, {
          jokerStats: { ...ZERO_STATS, hoarderMaxHits: 2 },
        })
      ).toBe('currently +0.6 mult');
    });
  });

  describe('Penny Wise (96)', () => {
    it.each([
      [1, 2, 'currently +30%'], // 0.15 * 2
      [2, 3, 'currently +75%'], // 0.25 * 3
      [3, 1, 'currently +40%'], // 0.40 * 1
    ])('L%i × %i stashes → %s', (level, stacks, expected) => {
      expect(
        getLiveJokerValueText(JOKER_IDS.PENNY_WISE, level, {
          jokerStats: { ...ZERO_STATS, pennyWiseStashes: stacks },
        })
      ).toBe(expected);
    });
  });

  describe('Survivor (97)', () => {
    it('L2 × 4 melts → currently +3 mult', () => {
      expect(
        getLiveJokerValueText(JOKER_IDS.SURVIVOR, 2, {
          jokerStats: { ...ZERO_STATS, survivorCandiesMelted: 4 },
        })
      ).toBe('currently +3 mult');
    });
  });

  describe('Compound Interest (63)', () => {
    it('returns base level boost (binary, fires once days > 0)', () => {
      // L1 base 1.2x → +20%
      expect(
        getLiveJokerValueText(JOKER_IDS.COMPOUND_INTEREST, 1, {
          jokerStats: { ...ZERO_STATS, compoundInterestDays: 1 },
        })
      ).toBe('currently +20%');
      // L3 base 1.6x → +60% (no per-day scaling — see helper docs)
      expect(
        getLiveJokerValueText(JOKER_IDS.COMPOUND_INTEREST, 3, {
          jokerStats: { ...ZERO_STATS, compoundInterestDays: 7 },
        })
      ).toBe('currently +60%');
    });
  });
});
