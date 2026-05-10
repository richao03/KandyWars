/**
 * Behavioral coverage for the previously-deferred jokers:
 *
 *   Deposit Bonus (22)        — % of stash → daily allowance
 *   Penny Pincher (86)        — % of stash → daily allowance (with floor)
 *   Inductive Reasoning (43)  — +inventory limit each new day
 *
 * Treasure Chest (66) and Mysterious Artifact (53) already had coverage in
 * src/__tests__/utils/endDayBonuses.test.ts and
 * src/__tests__/hooks/piggyBankProInterest.test.ts respectively.
 *
 * These tests target the consumer functions directly (processEffectsByTarget +
 * the inline allowance arithmetic from useWallet.addAllowance, and
 * JokerService.applyJokerEffects for inventory) rather than booting Redux.
 */

import {
  processEffectsByTarget,
  getJokerEffectsAtLevel,
} from '../../utils/jokerEffectEngine';
import { JokerService } from '../../utils/jokerService';
import { JOKER_IDS } from '../../constants/jokerIds';

function makeJoker(id: number, name: string, level: number = 1) {
  return {
    id,
    name,
    level,
    effects: getJokerEffectsAtLevel(id, level),
  };
}

// Mirrors the inline arithmetic in useWallet.addAllowance:
//   for (const effect of stashBonusEffects)
//     bonus += Math.round(stashedAmount * effect.amount);
function computeStashAllowanceBonus(jokers: any[], stashedAmount: number): number {
  if (stashedAmount <= 0) return 0;
  const effects = processEffectsByTarget(jokers, 'stash_allowance_bonus');
  return effects.reduce(
    (sum: number, effect: any) =>
      sum + Math.round(stashedAmount * effect.amount),
    0
  );
}

describe('Deposit Bonus (ID 22) — stash → allowance', () => {
  it('Level 1 contributes 5% of stash to allowance', () => {
    const j = [makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 1)];
    expect(computeStashAllowanceBonus(j, 1000)).toBe(50);
    expect(computeStashAllowanceBonus(j, 10000)).toBe(500);
  });

  it('Level 2 contributes 10% of stash', () => {
    const j = [makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 2)];
    expect(computeStashAllowanceBonus(j, 1000)).toBe(100);
  });

  it('Level 3 contributes 15% of stash', () => {
    const j = [makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 3)];
    expect(computeStashAllowanceBonus(j, 1000)).toBe(150);
  });

  it('Returns 0 when stash is zero', () => {
    const j = [makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 1)];
    expect(computeStashAllowanceBonus(j, 0)).toBe(0);
  });

  it('Returns 0 when stash is negative (debt)', () => {
    const j = [makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 1)];
    expect(computeStashAllowanceBonus(j, -500)).toBe(0);
  });

  it('Higher levels yield strictly larger bonuses', () => {
    const stash = 5000;
    const l1 = computeStashAllowanceBonus(
      [makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 1)],
      stash
    );
    const l2 = computeStashAllowanceBonus(
      [makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 2)],
      stash
    );
    const l3 = computeStashAllowanceBonus(
      [makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 3)],
      stash
    );
    expect(l1).toBeLessThan(l2);
    expect(l2).toBeLessThan(l3);
  });
});

describe('Penny Pincher (ID 86) — stash → allowance', () => {
  it('Level 1 contributes 10% of stash', () => {
    const j = [makeJoker(JOKER_IDS.PENNY_PINCHER, 'Penny Pincher', 1)];
    expect(computeStashAllowanceBonus(j, 1000)).toBe(100);
  });

  it('Level 2 contributes 15% of stash', () => {
    const j = [makeJoker(JOKER_IDS.PENNY_PINCHER, 'Penny Pincher', 2)];
    expect(computeStashAllowanceBonus(j, 1000)).toBe(150);
  });

  it('Level 3 contributes 20% of stash', () => {
    const j = [makeJoker(JOKER_IDS.PENNY_PINCHER, 'Penny Pincher', 3)];
    expect(computeStashAllowanceBonus(j, 1000)).toBe(200);
  });

  it('Returns 0 when stash is zero', () => {
    const j = [makeJoker(JOKER_IDS.PENNY_PINCHER, 'Penny Pincher', 1)];
    expect(computeStashAllowanceBonus(j, 0)).toBe(0);
  });
});

describe('Stash-allowance jokers — stacking', () => {
  it('Both Deposit Bonus and Penny Pincher stack additively', () => {
    const stash = 1000;
    const jokers = [
      makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 1), // 5%
      makeJoker(JOKER_IDS.PENNY_PINCHER, 'Penny Pincher', 1), // 10%
    ];
    // Combined: 5% + 10% = 15% of $1000 = $150
    expect(computeStashAllowanceBonus(jokers, stash)).toBe(150);
  });

  it('Both at max level stack to 35% (15% + 20%)', () => {
    const stash = 10000;
    const jokers = [
      makeJoker(JOKER_IDS.DEPOSIT_BONUS, 'Deposit Bonus', 3),
      makeJoker(JOKER_IDS.PENNY_PINCHER, 'Penny Pincher', 3),
    ];
    expect(computeStashAllowanceBonus(jokers, stash)).toBe(3500);
  });
});

describe('Inductive Reasoning (ID 43) — inventory grows each day', () => {
  // applyJokerEffects has both:
  //   1) the engine factory's 'inventory_limit' (add 5/7/10 once — the day-1 grant)
  //   2) the per-day scaling override that adds 5/7/10 × completedDays
  // Both contribute and use the SAME per-level amounts so total = amount × day.
  //
  // We verify the per-day delta (which equals the per-level amount) by
  // computing inventoryAt(N×periodsPerDay) − inventoryAt(0); the factory bonus
  // is constant across calls so it cancels.

  const PERIODS_PER_DAY = 8;
  const BASE_INVENTORY = 20;

  function inventoryAt(period: number, level: number) {
    const service = JokerService.getInstance();
    const joker = makeJoker(
      JOKER_IDS.INDUCTIVE_REASONING,
      'Inductive Reasoning',
      level
    );
    return service.applyJokerEffects(
      BASE_INVENTORY,
      'inventory_limit',
      [joker],
      period,
      undefined,
      undefined,
      [],
      PERIODS_PER_DAY
    );
  }

  it('Level 1 — adds +5 inventory per completed day', () => {
    const day1 = inventoryAt(0, 1);
    const day2 = inventoryAt(PERIODS_PER_DAY, 1);
    const day3 = inventoryAt(PERIODS_PER_DAY * 2, 1);
    expect(day2 - day1).toBe(5);
    expect(day3 - day1).toBe(10);
  });

  it('Level 2 — adds +7 inventory per completed day', () => {
    const day1 = inventoryAt(0, 2);
    const day2 = inventoryAt(PERIODS_PER_DAY, 2);
    const day3 = inventoryAt(PERIODS_PER_DAY * 2, 2);
    expect(day2 - day1).toBe(7);
    expect(day3 - day1).toBe(14);
  });

  it('Level 3 — adds +10 inventory per completed day', () => {
    const day1 = inventoryAt(0, 3);
    const day2 = inventoryAt(PERIODS_PER_DAY, 3);
    const day3 = inventoryAt(PERIODS_PER_DAY * 2, 3);
    expect(day2 - day1).toBe(10);
    expect(day3 - day1).toBe(20);
  });

  it('Mid-day periods do NOT add the daily bonus (only completed days count)', () => {
    // Period 4 is mid-day-1, so completedDays = 0 → no daily bonus.
    // Period 7 is end-of-day-1 still on day 1 → completedDays = 0.
    // Both should equal period 0 (start of day 1).
    expect(inventoryAt(4, 1)).toBe(inventoryAt(0, 1));
    expect(inventoryAt(7, 1)).toBe(inventoryAt(0, 1));
  });

  it('Higher levels yield larger inventory at the same period', () => {
    const period = PERIODS_PER_DAY * 3;
    const l1 = inventoryAt(period, 1);
    const l2 = inventoryAt(period, 2);
    const l3 = inventoryAt(period, 3);
    expect(l1).toBeLessThan(l2);
    expect(l2).toBeLessThan(l3);
  });

  it('Respects custom periodsPerDay (Time Crunch = 6)', () => {
    const service = JokerService.getInstance();
    const joker = makeJoker(
      JOKER_IDS.INDUCTIVE_REASONING,
      'Inductive Reasoning',
      1
    );

    // With periodsPerDay = 6, period 6 = end of day 1 (1 completed day)
    const inventoryAtPeriod6_pp6 = service.applyJokerEffects(
      BASE_INVENTORY,
      'inventory_limit',
      [joker],
      6,
      undefined,
      undefined,
      [],
      6
    );
    // With periodsPerDay = 8, period 6 = mid day 1 (0 completed days)
    const inventoryAtPeriod6_pp8 = service.applyJokerEffects(
      BASE_INVENTORY,
      'inventory_limit',
      [joker],
      6,
      undefined,
      undefined,
      [],
      8
    );

    // Same period, different periodsPerDay → different completed-day counts.
    // With periodsPerDay=6, the daily bonus has fired once (5 more inventory).
    expect(inventoryAtPeriod6_pp6 - inventoryAtPeriod6_pp8).toBe(5);
  });
});
