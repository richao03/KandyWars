import { generateSeededGameData, SpecialEventEffect } from '../../../utils/generateSeededGameData';

describe('Event Generation Tests', () => {
  const TOTAL_PERIODS = 40;

  describe('Determinism', () => {
    it('same seed produces same events', () => {
      const result1 = generateSeededGameData('test-seed-abc', TOTAL_PERIODS);
      const result2 = generateSeededGameData('test-seed-abc', TOTAL_PERIODS);

      expect(result1.periodEvents.length).toBe(result2.periodEvents.length);

      // Events should match in period, effect, and key properties
      result1.periodEvents.forEach((event, i) => {
        expect(event.period).toBe(result2.periodEvents[i].period);
        expect(event.effect).toBe(result2.periodEvents[i].effect);
        expect(event.isUniversal).toBe(result2.periodEvents[i].isUniversal);
      });
    });

    it('different seeds produce different events', () => {
      const result1 = generateSeededGameData('seed-alpha', TOTAL_PERIODS);
      const result2 = generateSeededGameData('seed-beta', TOTAL_PERIODS);

      // It is extremely unlikely that two different seeds produce
      // identical event sequences (periods + effects).
      const events1Signature = result1.periodEvents
        .map((e) => `${e.period}_${e.effect}`)
        .join(',');
      const events2Signature = result2.periodEvents
        .map((e) => `${e.period}_${e.effect}`)
        .join(',');

      expect(events1Signature).not.toBe(events2Signature);
    });
  });

  describe('Event timing constraints', () => {
    it('no events in periods 0, 1, 2 (first 3 periods of day 1)', () => {
      const result = generateSeededGameData('timing-test', TOTAL_PERIODS);

      const earlyEvents = result.periodEvents.filter((e) => e.period < 3);
      expect(earlyEvents).toHaveLength(0);
    });

    it('events are associated with valid period numbers (within 1–40)', () => {
      const result = generateSeededGameData('valid-periods', TOTAL_PERIODS);

      result.periodEvents.forEach((event) => {
        expect(event.period).toBeGreaterThanOrEqual(1);
        expect(event.period).toBeLessThanOrEqual(TOTAL_PERIODS);
      });
    });
  });

  describe('Event structure', () => {
    it('events have required fields (effect, hint, isUniversal)', () => {
      const result = generateSeededGameData('structure-test', TOTAL_PERIODS);

      expect(result.periodEvents.length).toBeGreaterThan(0);

      result.periodEvents.forEach((event) => {
        expect(event.effect).toBeDefined();
        expect(typeof event.hint).toBe('string');
        expect(typeof event.isUniversal).toBe('boolean');
        expect(typeof event.period).toBe('number');
      });
    });

    it('event types are valid (FOUND_MONEY, LOSE_MONEY, STASH_LOCKED, PRICE_SPIKE, PRICE_DROP)', () => {
      const validEffects = [
        'FOUND_MONEY',
        'LOSE_MONEY',
        'STASH_LOCKED',
        'PRICE_SPIKE',
        'PRICE_DROP',
      ];

      const result = generateSeededGameData('types-test', TOTAL_PERIODS);

      result.periodEvents.forEach((event) => {
        expect(validEffects).toContain(event.effect);
      });
    });
  });

  describe('Event content', () => {
    it('at least some events exist across 40 periods', () => {
      const result = generateSeededGameData('count-test', TOTAL_PERIODS);

      // With 5 days and 1-6 events per day, we should have many events
      expect(result.periodEvents.length).toBeGreaterThanOrEqual(5);
    });

    it('events include both positive and negative types', () => {
      // Use a few seeds to increase likelihood of seeing both types
      let hasPositive = false;
      let hasNegative = false;

      for (let i = 0; i < 10; i++) {
        const result = generateSeededGameData(`mixed-${i}`, TOTAL_PERIODS);

        if (result.periodEvents.some((e) => e.effect === 'FOUND_MONEY')) {
          hasPositive = true;
        }
        if (
          result.periodEvents.some(
            (e) => e.effect === 'LOSE_MONEY' || e.effect === 'STASH_LOCKED'
          )
        ) {
          hasNegative = true;
        }

        if (hasPositive && hasNegative) break;
      }

      expect(hasPositive).toBe(true);
      expect(hasNegative).toBe(true);
    });

    it('PRICE_SPIKE events have multiplier of 5', () => {
      // Try several seeds to find at least one PRICE_SPIKE
      let foundSpike = false;

      for (let i = 0; i < 20; i++) {
        const result = generateSeededGameData(`spike-${i}`, TOTAL_PERIODS);
        const spikes = result.periodEvents.filter(
          (e) => e.effect === 'PRICE_SPIKE'
        );

        for (const spike of spikes) {
          foundSpike = true;
          // Generated with multiplier = 5 (see source)
          expect(spike.multiplier).toBe(5);
        }

        if (foundSpike) break;
      }

      expect(foundSpike).toBe(true);
    });

    it('PRICE_DROP events have multiplier of 0.2 and final price >= 0.01', () => {
      let foundDrop = false;

      for (let i = 0; i < 20; i++) {
        const result = generateSeededGameData(`drop-${i}`, TOTAL_PERIODS);
        const drops = result.periodEvents.filter(
          (e) => e.effect === 'PRICE_DROP'
        );

        for (const drop of drops) {
          foundDrop = true;
          // Generated with multiplier = 0.2 (see source)
          expect(drop.multiplier).toBe(0.2);
        }

        if (foundDrop) break;
      }

      expect(foundDrop).toBe(true);

      // Also verify eventPrices cap at 0.01 minimum for drops
      for (let i = 0; i < 5; i++) {
        const result = generateSeededGameData(`drop-price-${i}`, TOTAL_PERIODS);
        for (const [period, locations] of Object.entries(result.eventPrices)) {
          for (const [location, candies] of Object.entries(
            locations as Record<string, Record<string, number>>
          )) {
            for (const [candy, price] of Object.entries(
              candies as Record<string, number>
            )) {
              expect(price).toBeGreaterThanOrEqual(0.01);
            }
          }
        }
      }
    });
  });

  describe('Return value structure', () => {
    it('returns candyPrices, periodEvents, eventPrices, and totalPeriods', () => {
      const result = generateSeededGameData('structure-check', TOTAL_PERIODS);

      expect(result.candyPrices).toBeDefined();
      expect(result.periodEvents).toBeDefined();
      expect(result.eventPrices).toBeDefined();
      expect(result.totalPeriods).toBe(TOTAL_PERIODS);
      expect(Array.isArray(result.periodEvents)).toBe(true);
    });
  });
});
