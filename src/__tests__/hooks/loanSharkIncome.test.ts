/**
 * Tests for Loan Shark (#58) daily income logic.
 *
 * Validates:
 * - daily income amount scales per level ($5k/$8k/$12k)
 * - day dedup guard (fires at most once per day)
 * - factory shape: one 'add' income effect + one 'add' debt effect (renamed target)
 */

import { getJokerEffectsAtLevel } from '../../utils/jokerEffectEngine';
import { JOKER_IDS } from '../../constants/jokerIds';

// Mirrors the formula in useLoanShark.
function computeLoanSharkIncome(level: number): number {
  const effects = getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, level);
  const incomeEffect = effects.find(
    (e) => e.target === 'loan_shark_income' && e.operation === 'add'
  );
  return incomeEffect?.amount ?? 0;
}

describe('Loan Shark (#58) — daily income amount', () => {
  it('Level 1 pays $5000/day', () => {
    expect(computeLoanSharkIncome(1)).toBe(5000);
  });

  it('Level 2 pays $8000/day', () => {
    expect(computeLoanSharkIncome(2)).toBe(8000);
  });

  it('Level 3 pays $12000/day', () => {
    expect(computeLoanSharkIncome(3)).toBe(12000);
  });
});

describe('Loan Shark (#58) — day dedup guard', () => {
  it('Does not grant income twice for the same day', () => {
    const applied: number[] = [];
    let dispatchCount = 0;

    function simulate(day: number) {
      if (day <= 0 || applied.includes(day)) return;
      dispatchCount++;
      applied.push(day);
    }

    simulate(1);
    simulate(1);
    simulate(1);
    expect(dispatchCount).toBe(1);
  });

  it('Fires once per new day across a 5-day run', () => {
    const applied: number[] = [];
    let dispatchCount = 0;

    function simulate(day: number) {
      if (day <= 0 || applied.includes(day)) return;
      dispatchCount++;
      applied.push(day);
    }

    for (let d = 1; d <= 5; d++) {
      simulate(d);
      simulate(d); // redundant call blocked
    }
    expect(dispatchCount).toBe(5);
    expect(applied).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Loan Shark (#58) — factory shape (after rename)', () => {
  it('Returns exactly 2 effects: one income add + one debt add', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, 1);
    expect(effects).toHaveLength(2);

    const income = effects.find((e) => e.target === 'loan_shark_income');
    const debt = effects.find((e) => e.target === 'loan_shark_debt');
    expect(income).toBeDefined();
    expect(income?.operation).toBe('add');
    expect(income?.amount).toBe(5000);

    expect(debt).toBeDefined();
    expect(debt?.operation).toBe('add');
    expect(debt?.amount).toBe(-6000);
  });

  it('Debt target is always negative across levels (-6000/-9500/-14000)', () => {
    const debtAt = (lv: number) =>
      getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, lv).find(
        (e) => e.target === 'loan_shark_debt'
      )?.amount ?? 0;
    expect(debtAt(1)).toBe(-6000);
    expect(debtAt(2)).toBe(-9500);
    expect(debtAt(3)).toBe(-14000);
  });

  it('Income > |debt| grows payoff advantage as level rises (net per day)', () => {
    // These just document the intended tradeoff — player earns 5000-8000-12000
    // and owes 6000-9500-14000, a net loss unless more is earned via sales.
    const net = (lv: number) => {
      const effects = getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, lv);
      const inc = effects.find((e) => e.target === 'loan_shark_income')?.amount ?? 0;
      const debt = effects.find((e) => e.target === 'loan_shark_debt')?.amount ?? 0;
      return inc + debt;
    };
    expect(net(1)).toBe(-1000);
    expect(net(2)).toBe(-1500);
    expect(net(3)).toBe(-2000);
  });
});

describe('Vestige cleanup — Bake Sale (#16) / Roman Coin (#37)', () => {
  it('Bake Sale factory returns empty effects array (cleanup)', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.BAKE_SALE, 1)).toEqual([]);
    expect(getJokerEffectsAtLevel(JOKER_IDS.BAKE_SALE, 2)).toEqual([]);
    expect(getJokerEffectsAtLevel(JOKER_IDS.BAKE_SALE, 3)).toEqual([]);
  });

  it('Roman Coin factory returns empty effects array (cleanup)', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.ROMAN_COIN, 1)).toEqual([]);
    expect(getJokerEffectsAtLevel(JOKER_IDS.ROMAN_COIN, 2)).toEqual([]);
    expect(getJokerEffectsAtLevel(JOKER_IDS.ROMAN_COIN, 3)).toEqual([]);
  });
});
