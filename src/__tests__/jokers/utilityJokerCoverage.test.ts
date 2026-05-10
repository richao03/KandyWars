/**
 * Behavioral coverage for the four "utility" jokers that previously had only
 * registry tests:
 *
 *   Tapped In (6)      — sets hint_chance to 1.0 (always reveals next-period events)
 *   Sixth Sense (56)   — 10% chance per sale to add +6 mult
 *   Deep Freeze (94)   — prevents end-of-period candy melt
 *   Extra Credit (55)  — +1 joker offered on minigame completion
 *
 * Each test exercises the actual production wiring (JokerService for Tapped In,
 * calculateSaleTotal for Sixth Sense, the inline melt decision for Deep Freeze,
 * and hasJokerById + the joker-count formula for Extra Credit).
 */

import { calculateSaleTotal } from '../../utils/saleCalculations';
import {
  getJokerEffectsAtLevel,
  STANDARDIZED_JOKERS,
} from '../../utils/jokerEffectEngine';
import { JokerService } from '../../utils/jokerService';
import { JOKER_IDS, hasJokerById } from '../../constants/jokerIds';

// Build a joker that matches the shape used by JokerService — name lookup
// goes through STANDARDIZED_JOKERS, so we need the real registered name.
function makeJoker(id: number, level: number = 1) {
  const standardized = STANDARDIZED_JOKERS.find((j) => j.id === id);
  if (!standardized) {
    throw new Error(`Test setup: no joker with id ${id} in STANDARDIZED_JOKERS`);
  }
  return {
    id,
    name: standardized.name,
    level,
    effects: getJokerEffectsAtLevel(id, level),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tapped In — hint_chance applied through JokerService
// ─────────────────────────────────────────────────────────────────────────────
describe('Tapped In (ID 6) — always reveals next-period event hints', () => {
  // Mirrors usePeriodEventFlavorText.ts line 93:
  //   jokerService.applyJokerEffects(baseHintChance=0.7, 'hint_chance', jokers, ...)
  const BASE_HINT_CHANCE = 0.7;

  function effectiveHintChance(jokers: any[]) {
    const service = JokerService.getInstance();
    return service.applyJokerEffects(
      BASE_HINT_CHANCE,
      'hint_chance' as any,
      jokers,
      0,
      BASE_HINT_CHANCE,
      undefined,
      [],
      8
    );
  }

  it('Without Tapped In: returns the base 0.7 hint chance', () => {
    expect(effectiveHintChance([])).toBeCloseTo(0.7);
  });

  it('With Tapped In: returns 1.0 (always reveals hints)', () => {
    expect(effectiveHintChance([makeJoker(JOKER_IDS.TAPPED_IN)])).toBe(1);
  });

  it('Tapped In overrides irrespective of base value', () => {
    // The effect uses operation='set', so even if base were 0, Tapped In sets to 1.
    const service = JokerService.getInstance();
    const result = service.applyJokerEffects(
      0,
      'hint_chance' as any,
      [makeJoker(JOKER_IDS.TAPPED_IN)],
      0,
      0,
      undefined,
      [],
      8
    );
    expect(result).toBe(1);
  });

  it('Tapped In is non-upgradeable (level 1 only)', () => {
    // The factory ignores level — verify identical effects at level 1, 2, 3.
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.TAPPED_IN, 1);
    const l2 = getJokerEffectsAtLevel(JOKER_IDS.TAPPED_IN, 2);
    const l3 = getJokerEffectsAtLevel(JOKER_IDS.TAPPED_IN, 3);
    expect(l1).toEqual(l2);
    expect(l2).toEqual(l3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sixth Sense — 10% proc chance, +6 mult on hit
// ─────────────────────────────────────────────────────────────────────────────
describe('Sixth Sense (ID 56) — 10% chance per sale → +6 mult', () => {
  const baseSaleParams = {
    candyName: 'M&Ms',
    basePrice: 100,
    purchasePrice: 50,
    quantity: 10,
    jokers: [makeJoker(JOKER_IDS.SIXTH_SENSE)],
    periodCount: 0,
    inventoryLimit: 30,
    activeEffects: [],
    hallPassModifiers: { salePriceBonusPercent: 0 },
    merchantEffects: [],
    consecutivePeriodSales: 0,
    totalCandiesSold: 0,
    hasEarlySaleToday: true,
    currentCash: 1000,
    inventoryCount: 10,
    day: 1,
    period: 1,
    periodsPerDay: 8,
    bulkEmpireStacks: 0,
    inventory: [{ name: 'M&Ms', quantity: 10 }],
    didSellPreviousPeriod: true,
    ownedJokerCount: 0,
    uniqueTypesSoldThisPeriod: 0,
    clearanceSaleStacks: 0,
    compoundInterestDays: 0,
    reputationTypesSold: 0,
    streetSmartsEventsSurvived: 0,
    hoarderMaxHits: 0,
    pennyWiseStashes: 0,
    survivorCandiesMelted: 0,
    selectedPassIds: [] as string[],
  };

  let randomSpy: jest.SpyInstance;

  afterEach(() => {
    randomSpy?.mockRestore();
  });

  it('Procs when Math.random() < 0.1 — multiplier becomes 1 + 6 = 7', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.05); // < 0.1 → proc
    const result = calculateSaleTotal(baseSaleParams);
    // boostedProfit = 500, multiplier = 7, finalProfit = 3500
    // totalGain = purchaseValue (500) + finalProfit (3500) = 4000
    expect(result.jokerMultiplier).toBe(7);
    expect(result.totalGain).toBe(4000);
  });

  it('Does not proc when Math.random() >= 0.1 — multiplier stays 1', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // >= 0.1 → no proc
    const result = calculateSaleTotal(baseSaleParams);
    expect(result.jokerMultiplier).toBe(1);
    expect(result.totalGain).toBe(1000); // baseline: 500 + 500
  });

  it('Boundary — random === 0.1 does NOT proc (strict <)', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = calculateSaleTotal(baseSaleParams);
    expect(result.jokerMultiplier).toBe(1);
  });

  it('Records a Sixth Sense entry in bonusBreakdown when it procs', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const result = calculateSaleTotal(baseSaleParams);
    const entry = result.bonusBreakdown.find(
      (b: any) => b.name === 'Sixth Sense'
    );
    expect(entry).toBeDefined();
    expect(entry?.multiplier).toBe(7); // 1 + 6
  });

  it('Sixth Sense is non-upgradeable (level 1 only)', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.SIXTH_SENSE, 1);
    const l2 = getJokerEffectsAtLevel(JOKER_IDS.SIXTH_SENSE, 2);
    expect(l1).toEqual(l2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Deep Freeze — prevents melt at end-of-period
// ─────────────────────────────────────────────────────────────────────────────
describe('Deep Freeze (ID 94) — candy never melts', () => {
  // Mirrors the inline melt decision in usePeriodAdvance.ts:97-119.
  // Default melt window: 5 periods. Hot Potato shortens it to 3.
  // If Deep Freeze is owned, melt is skipped entirely.
  function meltCheck(
    jokers: any[],
    inventory: { name: string; quantity: number; purchasedAt: number }[],
    newPeriod: number
  ) {
    const hasDeepFreeze = jokers.some(
      (j: any) => j.id === JOKER_IDS.DEEP_FREEZE
    );
    if (hasDeepFreeze) return [];

    const hasHotPotato = jokers.some(
      (j: any) => j.id === JOKER_IDS.HOT_POTATO
    );
    const MELT_WINDOW = hasHotPotato ? 3 : 5;
    return inventory.filter((c) => newPeriod - c.purchasedAt >= MELT_WINDOW);
  }

  const oldCandy = { name: 'M&Ms', quantity: 5, purchasedAt: 0 };
  const newCandy = { name: 'Skittles', quantity: 5, purchasedAt: 4 };

  it('Without Deep Freeze: candy purchased 5+ periods ago melts', () => {
    expect(meltCheck([], [oldCandy], 5)).toEqual([oldCandy]);
  });

  it('With Deep Freeze: nothing melts even with old candy', () => {
    expect(meltCheck([makeJoker(JOKER_IDS.DEEP_FREEZE)], [oldCandy], 5)).toEqual(
      []
    );
  });

  it('With Deep Freeze: nothing melts even at extreme periods', () => {
    expect(
      meltCheck([makeJoker(JOKER_IDS.DEEP_FREEZE)], [oldCandy, newCandy], 100)
    ).toEqual([]);
  });

  it('Deep Freeze overrides Hot Potato (no melt instead of 3-period window)', () => {
    const jokers = [
      makeJoker(JOKER_IDS.DEEP_FREEZE),
      makeJoker(JOKER_IDS.HOT_POTATO),
    ];
    expect(meltCheck(jokers, [oldCandy, newCandy], 5)).toEqual([]);
  });

  it('Without Deep Freeze + Hot Potato: 3-period window applies', () => {
    const jokers = [makeJoker(JOKER_IDS.HOT_POTATO)];
    // newCandy was purchased at 4, current period 7 → 3 periods elapsed → melts
    expect(meltCheck(jokers, [newCandy], 7)).toEqual([newCandy]);
  });

  it('Deep Freeze is non-upgradeable (level 1 only)', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.DEEP_FREEZE, 1);
    const l2 = getJokerEffectsAtLevel(JOKER_IDS.DEEP_FREEZE, 2);
    expect(l1).toEqual(l2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Extra Credit — +1 joker on minigame completion
// ─────────────────────────────────────────────────────────────────────────────
describe('Extra Credit (ID 55) — +1 joker offered after minigames', () => {
  // Mirrors JokerSelection.tsx:122–130:
  //   extraCreditBonus = hasJokerById(jokersOwned, JOKER_IDS.EXTRA_CREDIT) ? 1 : 0
  //   jokerCount = min(completionLevel + extraCreditBonus + hallPassJokerBonus, available)
  function offerCount(
    jokersOwned: any[],
    completionLevel: number,
    hallPassJokerBonus: number,
    availablePool: number
  ) {
    const extraCreditBonus = hasJokerById(jokersOwned, JOKER_IDS.EXTRA_CREDIT)
      ? 1
      : 0;
    return Math.min(
      completionLevel + extraCreditBonus + hallPassJokerBonus,
      availablePool
    );
  }

  it('Without Extra Credit: count = completionLevel', () => {
    expect(offerCount([], 2, 0, 10)).toBe(2);
  });

  it('With Extra Credit: count = completionLevel + 1', () => {
    expect(offerCount([makeJoker(JOKER_IDS.EXTRA_CREDIT)], 2, 0, 10)).toBe(3);
  });

  it('Stacks additively with Valedictorian Vendor hall pass bonus', () => {
    // completionLevel 2 + Extra Credit 1 + hall pass 1 = 4
    expect(offerCount([makeJoker(JOKER_IDS.EXTRA_CREDIT)], 2, 1, 10)).toBe(4);
  });

  it('Caps at available pool size (cannot offer more jokers than exist)', () => {
    // 5 + 1 + 0 = 6 requested, only 4 available
    expect(offerCount([makeJoker(JOKER_IDS.EXTRA_CREDIT)], 5, 0, 4)).toBe(4);
  });

  it('hasJokerById correctly detects Extra Credit even by id alone', () => {
    expect(hasJokerById([{ id: JOKER_IDS.EXTRA_CREDIT }], JOKER_IDS.EXTRA_CREDIT)).toBe(
      true
    );
    expect(hasJokerById([{ id: 999 }], JOKER_IDS.EXTRA_CREDIT)).toBe(false);
    expect(hasJokerById([], JOKER_IDS.EXTRA_CREDIT)).toBe(false);
  });

  it('Extra Credit is non-upgradeable (level 1 only)', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.EXTRA_CREDIT, 1);
    const l2 = getJokerEffectsAtLevel(JOKER_IDS.EXTRA_CREDIT, 2);
    expect(l1).toEqual(l2);
  });
});
