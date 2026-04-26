/**
 * Tests for SparkController singleton + pure tier helpers.
 *
 * The controller follows the queue-before-register pattern: calls made
 * before `<SparkPool />` mounts are buffered (cap 16, drop oldest) and
 * flushed on `register`.
 */

import {
  SparkController,
  getTierParticleCount,
  getTierPalette,
  __getQueueSizeForTests,
  __resetForTests,
  type TierLevel,
  type BurstOptions,
  type ArcOptions,
  type PulseOptions,
} from '../utils/sparkController';

interface ApiSpy {
  fireBurst: jest.Mock<void, [BurstOptions]>;
  fireArc: jest.Mock<void, [ArcOptions]>;
  firePulse: jest.Mock<void, [PulseOptions]>;
  reset: jest.Mock<void, []>;
}

const makeApi = (): ApiSpy => ({
  fireBurst: jest.fn(),
  fireArc: jest.fn(),
  firePulse: jest.fn(),
  reset: jest.fn(),
});

beforeEach(() => {
  __resetForTests();
});

/* --------------------------------------------------------------------------
 * Queue-before-register
 * ------------------------------------------------------------------------ */

describe('SparkController — queue before register', () => {
  it('queues burst/arc/pulse calls made before register()', () => {
    SparkController.burst({
      origin: { x: 10, y: 20 },
      tier: 'bronze',
    });
    SparkController.arc({
      from: { x: 0, y: 0 },
      to: { x: 100, y: 100 },
      tier: 'gold',
      symbol: '+$500',
    });
    SparkController.pulse({ tier: 'emerald', duration: 300 });

    expect(__getQueueSizeForTests()).toBe(3);
  });

  it('flushes queued calls on register, in order', () => {
    SparkController.burst({ origin: { x: 1, y: 1 }, tier: 'bronze' });
    SparkController.arc({
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      tier: 'silver',
      symbol: '+$50',
    });
    SparkController.pulse({ tier: 'gold', duration: 200 });

    const api = makeApi();
    SparkController.register(api);

    expect(api.fireBurst).toHaveBeenCalledTimes(1);
    expect(api.fireBurst).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'bronze' })
    );
    expect(api.fireArc).toHaveBeenCalledTimes(1);
    expect(api.fireArc).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'silver', symbol: '+$50' })
    );
    expect(api.firePulse).toHaveBeenCalledTimes(1);
    expect(api.firePulse).toHaveBeenCalledWith({
      tier: 'gold',
      duration: 200,
    });
    expect(__getQueueSizeForTests()).toBe(0);
  });

  it('caps the queue at 16 items, dropping oldest', () => {
    // Push 20 bursts with identifiable origins so we can verify which were kept.
    for (let i = 0; i < 20; i++) {
      SparkController.burst({
        origin: { x: i, y: 0 },
        tier: 'bronze',
      });
    }
    expect(__getQueueSizeForTests()).toBe(16);

    const api = makeApi();
    SparkController.register(api);

    // We should see the LAST 16 (i=4..19), not i=0..15.
    expect(api.fireBurst).toHaveBeenCalledTimes(16);
    const firstCallArg = api.fireBurst.mock.calls[0][0];
    expect(firstCallArg.origin.x).toBe(4);
    const lastCallArg = api.fireBurst.mock.calls[15][0];
    expect(lastCallArg.origin.x).toBe(19);
  });
});

/* --------------------------------------------------------------------------
 * After register → forwarded immediately
 * ------------------------------------------------------------------------ */

describe('SparkController — forwarding after register', () => {
  it('forwards burst immediately when registered', () => {
    const api = makeApi();
    SparkController.register(api);

    SparkController.burst({ origin: { x: 5, y: 5 }, tier: 'gold' });
    expect(api.fireBurst).toHaveBeenCalledTimes(1);
    expect(__getQueueSizeForTests()).toBe(0);
  });

  it('forwards arc immediately when registered', () => {
    const api = makeApi();
    SparkController.register(api);

    SparkController.arc({
      from: { x: 0, y: 0 },
      to: { x: 10, y: 10 },
      tier: 'sapphire',
      symbol: '×2',
    });
    expect(api.fireArc).toHaveBeenCalledTimes(1);
    expect(api.fireArc).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: '×2' })
    );
  });

  it('forwards pulse immediately when registered', () => {
    const api = makeApi();
    SparkController.register(api);

    SparkController.pulse({ tier: 'jackpot', duration: 600 });
    expect(api.firePulse).toHaveBeenCalledWith({
      tier: 'jackpot',
      duration: 600,
    });
  });
});

/* --------------------------------------------------------------------------
 * reset()
 * ------------------------------------------------------------------------ */

describe('SparkController — reset', () => {
  it('clears the queue when not registered', () => {
    SparkController.burst({ origin: { x: 0, y: 0 }, tier: 'bronze' });
    SparkController.burst({ origin: { x: 1, y: 1 }, tier: 'silver' });
    expect(__getQueueSizeForTests()).toBe(2);

    SparkController.reset();
    expect(__getQueueSizeForTests()).toBe(0);
  });

  it('forwards reset to the registered api AND clears queue', () => {
    // Queue one then register (flushes), then queue another mid-flight.
    SparkController.burst({ origin: { x: 0, y: 0 }, tier: 'bronze' });
    const api = makeApi();
    SparkController.register(api);
    // Now registered; queue should be empty.
    expect(__getQueueSizeForTests()).toBe(0);

    SparkController.reset();
    expect(api.reset).toHaveBeenCalledTimes(1);
    expect(__getQueueSizeForTests()).toBe(0);
  });

  it('does NOT flush queued items on reset — they are discarded', () => {
    SparkController.burst({ origin: { x: 0, y: 0 }, tier: 'bronze' });
    SparkController.reset();

    const api = makeApi();
    SparkController.register(api);
    expect(api.fireBurst).not.toHaveBeenCalled();
  });
});

/* --------------------------------------------------------------------------
 * Pure tier helpers
 * ------------------------------------------------------------------------ */

describe('getTierParticleCount', () => {
  it('returns 0 for none', () => {
    expect(getTierParticleCount('none')).toBe(0);
  });

  it('matches the documented count ladder', () => {
    const expected: Record<TierLevel, number> = {
      none: 0,
      bronze: 3,
      silver: 5,
      gold: 7,
      emerald: 12,
      sapphire: 20,
      jackpot: 24,
    };
    (Object.keys(expected) as TierLevel[]).forEach((tier) => {
      expect(getTierParticleCount(tier)).toBe(expected[tier]);
    });
  });
});

describe('getTierPalette', () => {
  const HEX_OR_RGBA = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))$/;

  it('returns an empty array for none', () => {
    expect(getTierPalette('none')).toEqual([]);
  });

  it('returns a non-empty array of valid color strings for gold', () => {
    const palette = getTierPalette('gold');
    expect(palette.length).toBeGreaterThan(0);
    for (const color of palette) {
      expect(color).toMatch(HEX_OR_RGBA);
    }
  });

  it('returns a non-empty array of valid color strings for every non-none tier', () => {
    const tiers: TierLevel[] = [
      'bronze',
      'silver',
      'gold',
      'emerald',
      'sapphire',
      'jackpot',
    ];
    for (const tier of tiers) {
      const palette = getTierPalette(tier);
      expect(palette.length).toBeGreaterThan(0);
      for (const color of palette) {
        expect(color).toMatch(HEX_OR_RGBA);
      }
    }
  });

  it('returns a fresh copy so mutations do not leak into module state', () => {
    const a = getTierPalette('gold');
    a.push('#ffffff');
    const b = getTierPalette('gold');
    expect(b).not.toContain('#ffffff');
  });
});

/* --------------------------------------------------------------------------
 * Type re-export sanity — compile-time only but make the symbol visible.
 * ------------------------------------------------------------------------ */

describe('TierLevel re-export', () => {
  it('accepts all documented tier values', () => {
    const tiers: TierLevel[] = [
      'none',
      'bronze',
      'silver',
      'gold',
      'emerald',
      'sapphire',
      'jackpot',
    ];
    expect(tiers).toHaveLength(7);
  });
});
