import {
  computeEffectTier,
  EffectTierInput,
  TierLevel,
} from '../utils/computeEffectTier';

const base: EffectTierInput = {
  totalGain: 0,
  purchaseValue: 0,
  jokerBonusCount: 0,
  maxJokerMult: 1,
};

const make = (overrides: Partial<EffectTierInput>): EffectTierInput => ({
  ...base,
  ...overrides,
});

describe('computeEffectTier — absolute-gain ladder', () => {
  it('returns none for totalGain just below 100', () => {
    const r = computeEffectTier(make({ totalGain: 99 }));
    expect(r.level).toBe<TierLevel>('none');
    expect(r.symbols).toEqual([]);
    expect(r.palette).toEqual([]);
  });

  it('returns bronze at exactly 100', () => {
    const r = computeEffectTier(make({ totalGain: 100 }));
    expect(r.level).toBe<TierLevel>('bronze');
  });

  it('returns bronze just below 500', () => {
    expect(computeEffectTier(make({ totalGain: 499 })).level).toBe('bronze');
  });

  it('returns silver at exactly 500', () => {
    expect(computeEffectTier(make({ totalGain: 500 })).level).toBe('silver');
  });

  it('returns silver just below 1000', () => {
    expect(computeEffectTier(make({ totalGain: 999 })).level).toBe('silver');
  });

  it('returns gold at exactly 1000', () => {
    expect(computeEffectTier(make({ totalGain: 1000 })).level).toBe('gold');
  });

  it('returns gold just below 5000', () => {
    expect(computeEffectTier(make({ totalGain: 4999 })).level).toBe('gold');
  });

  it('returns emerald at exactly 5000', () => {
    expect(computeEffectTier(make({ totalGain: 5000 })).level).toBe('emerald');
  });

  it('returns emerald just below 10000', () => {
    expect(computeEffectTier(make({ totalGain: 9999 })).level).toBe('emerald');
  });

  it('returns sapphire at exactly 10000', () => {
    expect(computeEffectTier(make({ totalGain: 10000 })).level).toBe(
      'sapphire'
    );
  });

  it('returns sapphire just below 30000', () => {
    expect(computeEffectTier(make({ totalGain: 29999 })).level).toBe(
      'sapphire'
    );
  });

  it('returns jackpot at exactly 30000', () => {
    expect(computeEffectTier(make({ totalGain: 30000 })).level).toBe('jackpot');
  });
});

describe('computeEffectTier — ratio override (Clover Pit rule)', () => {
  it('bumps bronze to sapphire when ratio >= 10', () => {
    // totalGain=400 (bronze), purchaseValue=40 → ratio=10
    const r = computeEffectTier(
      make({ totalGain: 400, purchaseValue: 40 })
    );
    expect(r.level).toBe('sapphire');
    expect(r.reasons.some((x) => x.startsWith('ratio-'))).toBe(true);
  });

  it('bumps silver to jackpot when ratio >= 20', () => {
    const r = computeEffectTier(
      make({ totalGain: 600, purchaseValue: 30 })
    );
    expect(r.level).toBe('jackpot');
  });

  it('does NOT bump when ratio < 10', () => {
    const r = computeEffectTier(
      make({ totalGain: 300, purchaseValue: 100 })
    );
    expect(r.level).toBe('bronze');
    expect(r.reasons.find((x) => x.startsWith('ratio-'))).toBeUndefined();
  });

  it('skips ratio rule when purchaseValue is 0 (no divide-by-zero bump)', () => {
    const r = computeEffectTier(
      make({ totalGain: 300, purchaseValue: 0 })
    );
    expect(r.level).toBe('bronze');
    expect(r.reasons.find((x) => x.startsWith('ratio-'))).toBeUndefined();
  });

  it('skips ratio rule when purchaseValue is negative', () => {
    const r = computeEffectTier(
      make({ totalGain: 300, purchaseValue: -50 })
    );
    expect(r.level).toBe('bronze');
  });
});

describe('computeEffectTier — combo override', () => {
  it('bumps low sale to gold when jokerBonusCount >= 3', () => {
    const r = computeEffectTier(
      make({ totalGain: 200, jokerBonusCount: 3 })
    );
    expect(r.level).toBe('gold');
    expect(r.reasons).toContain('combo-3');
  });

  it('bumps low sale to emerald when jokerBonusCount >= 5', () => {
    const r = computeEffectTier(
      make({ totalGain: 200, jokerBonusCount: 5 })
    );
    expect(r.level).toBe('emerald');
  });

  it('bumps low sale to sapphire when jokerBonusCount >= 7', () => {
    const r = computeEffectTier(
      make({ totalGain: 200, jokerBonusCount: 7 })
    );
    expect(r.level).toBe('sapphire');
  });

  it('does not bump when jokerBonusCount < 3', () => {
    const r = computeEffectTier(
      make({ totalGain: 200, jokerBonusCount: 2 })
    );
    expect(r.level).toBe('bronze');
  });
});

describe('computeEffectTier — crit override', () => {
  it('bumps low sale to emerald when maxJokerMult >= 3', () => {
    const r = computeEffectTier(
      make({ totalGain: 200, maxJokerMult: 3 })
    );
    expect(r.level).toBe('emerald');
    expect(r.reasons).toContain('crit-3x');
  });

  it('bumps low sale to sapphire when maxJokerMult >= 5', () => {
    const r = computeEffectTier(
      make({ totalGain: 200, maxJokerMult: 5 })
    );
    expect(r.level).toBe('sapphire');
  });

  it('bumps low sale to jackpot when maxJokerMult >= 8', () => {
    const r = computeEffectTier(
      make({ totalGain: 200, maxJokerMult: 8 })
    );
    expect(r.level).toBe('jackpot');
  });

  it('does not bump when maxJokerMult < 3', () => {
    const r = computeEffectTier(
      make({ totalGain: 200, maxJokerMult: 2.5 })
    );
    expect(r.level).toBe('bronze');
  });
});

describe('computeEffectTier — combined overrides take MAX', () => {
  it('absolute=bronze + crit=emerald → emerald', () => {
    const r = computeEffectTier(
      make({ totalGain: 300, maxJokerMult: 3 })
    );
    expect(r.level).toBe('emerald');
    expect(r.reasons).toContain('abs-bronze');
    expect(r.reasons).toContain('crit-3x');
  });

  it('absolute=silver + combo=5 + crit=3 → emerald (max of all)', () => {
    const r = computeEffectTier(
      make({
        totalGain: 800,
        jokerBonusCount: 5,
        maxJokerMult: 3,
      })
    );
    expect(r.level).toBe('emerald');
  });

  it('absolute=gold but crit=8 → jackpot', () => {
    const r = computeEffectTier(
      make({ totalGain: 2000, maxJokerMult: 8 })
    );
    expect(r.level).toBe('jackpot');
  });

  it('absolute=jackpot dominates weaker rules', () => {
    const r = computeEffectTier(
      make({
        totalGain: 50000,
        purchaseValue: 49000,
        jokerBonusCount: 0,
        maxJokerMult: 1,
      })
    );
    expect(r.level).toBe('jackpot');
  });
});

describe('computeEffectTier — edge cases', () => {
  it('totalGain = 0 → none', () => {
    const r = computeEffectTier(make({ totalGain: 0, maxJokerMult: 100 }));
    expect(r.level).toBe('none');
    expect(r.reasons).toEqual([]);
  });

  it('negative totalGain → none', () => {
    const r = computeEffectTier(make({ totalGain: -100 }));
    expect(r.level).toBe('none');
  });

  it('NaN totalGain → none', () => {
    const r = computeEffectTier(make({ totalGain: NaN }));
    expect(r.level).toBe('none');
  });

  it('NaN purchaseValue → ratio rule skipped, still valid result', () => {
    const r = computeEffectTier(
      make({ totalGain: 300, purchaseValue: NaN })
    );
    expect(r.level).toBe('bronze');
    expect(r.reasons.find((x) => x.startsWith('ratio-'))).toBeUndefined();
  });

  it('NaN jokerBonusCount / NaN maxJokerMult → treated as 0 (but ratio still fires)', () => {
    // totalGain=300, purchaseValue=10 → ratio=30 → jackpot.
    // NaN combo/crit fields must be coerced to 0 (no crash, no bump from them).
    const r = computeEffectTier({
      totalGain: 300,
      purchaseValue: 10,
      jokerBonusCount: NaN,
      maxJokerMult: NaN,
    });
    expect(r.level).toBe('jackpot');
    expect(r.reasons.find((x) => x.startsWith('combo-'))).toBeUndefined();
    expect(r.reasons.find((x) => x.startsWith('crit-'))).toBeUndefined();
  });

  it('NaN combo/crit with no ratio → stays at absolute tier', () => {
    const r = computeEffectTier({
      totalGain: 300,
      purchaseValue: 0,
      jokerBonusCount: NaN,
      maxJokerMult: NaN,
    });
    expect(r.level).toBe('bronze');
  });

  it('Infinity totalGain → coerced to 0 → none', () => {
    const r = computeEffectTier(make({ totalGain: Infinity }));
    expect(r.level).toBe('none');
  });
});

describe('computeEffectTier — symbols & palette per tier', () => {
  const tiers: { level: TierLevel; input: Partial<EffectTierInput> }[] = [
    { level: 'none', input: { totalGain: 0 } },
    { level: 'bronze', input: { totalGain: 200 } },
    { level: 'silver', input: { totalGain: 700 } },
    { level: 'gold', input: { totalGain: 2000 } },
    { level: 'emerald', input: { totalGain: 7000 } },
    { level: 'sapphire', input: { totalGain: 20000 } },
    { level: 'jackpot', input: { totalGain: 40000 } },
  ];

  tiers.forEach(({ level, input }) => {
    it(`${level}: returns expected symbols`, () => {
      const r = computeEffectTier(make(input));
      expect(r.level).toBe(level);
      if (level === 'none') {
        expect(r.symbols).toEqual([]);
      } else {
        expect(r.symbols.length).toBeGreaterThan(0);
      }
    });

    it(`${level}: palette length is sensible`, () => {
      const r = computeEffectTier(make(input));
      if (level === 'none') {
        expect(r.palette.length).toBe(0);
      } else {
        expect(r.palette.length).toBeGreaterThan(0);
        // All entries should be non-empty strings.
        r.palette.forEach((hex) => {
          expect(typeof hex).toBe('string');
          expect(hex.length).toBeGreaterThan(0);
        });
      }
    });
  });

  it('bronze symbols are ["$"]', () => {
    expect(computeEffectTier(make({ totalGain: 200 })).symbols).toEqual(['$']);
  });

  it('jackpot symbols include the diamond emoji', () => {
    expect(
      computeEffectTier(make({ totalGain: 40000 })).symbols
    ).toEqual(['💎', '$$$']);
  });

  it('gold symbols are ["$", "$$"]', () => {
    expect(computeEffectTier(make({ totalGain: 2000 })).symbols).toEqual([
      '$',
      '$$',
    ]);
  });
});

describe('computeEffectTier — reasons population', () => {
  it('always includes the absolute-tier reason for a real sale', () => {
    const r = computeEffectTier(make({ totalGain: 250 }));
    expect(r.reasons).toContain('abs-bronze');
  });

  it('includes ratio reason when triggered', () => {
    const r = computeEffectTier(
      make({ totalGain: 500, purchaseValue: 20 })
    );
    // ratio = 25.0
    expect(r.reasons.some((x) => x === 'ratio-25.0x')).toBe(true);
  });

  it('includes combo reason when triggered', () => {
    const r = computeEffectTier(
      make({ totalGain: 300, jokerBonusCount: 4 })
    );
    expect(r.reasons).toContain('combo-4');
  });

  it('includes crit reason when triggered', () => {
    const r = computeEffectTier(
      make({ totalGain: 300, maxJokerMult: 4 })
    );
    expect(r.reasons).toContain('crit-4x');
  });

  it('includes all four reason categories when all fire', () => {
    const r = computeEffectTier({
      totalGain: 6000,
      purchaseValue: 500,
      jokerBonusCount: 4,
      maxJokerMult: 3,
    });
    // abs=emerald (5000<=6000<10000), ratio=12 → sapphire bump, combo=4 → gold,
    // crit=3 → emerald. Max = sapphire.
    expect(r.level).toBe('sapphire');
    expect(r.reasons.some((x) => x.startsWith('abs-'))).toBe(true);
    expect(r.reasons.some((x) => x.startsWith('ratio-'))).toBe(true);
    expect(r.reasons.some((x) => x.startsWith('combo-'))).toBe(true);
    expect(r.reasons.some((x) => x.startsWith('crit-'))).toBe(true);
  });
});
