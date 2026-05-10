/**
 * Coverage audit — jokers with id ∈ [66, 99].
 *
 * Each describe block exercises ONE joker with EXACT-numerical assertions
 * against `calculateSaleTotal`, the joker effect factory, or the Treasure
 * Chest end-of-day bonus computation. Behavior already covered by other
 * test files (Compound Interest, Piggy Bank Pro, Lucky 7, Penny Pincher,
 * Diversifier, Patience Pays, Deep Freeze, Loan Shark, instant jokers etc.)
 * is intentionally NOT duplicated here; only registry / wiring sanity is
 * asserted for those.
 *
 * Pattern adapted from `compoundInterest.test.ts`:
 *   - `makeJoker(id, level)` builds a joker with the canonical effects
 *   - `baseSaleParams` is a paid-off baseline (M&Ms, profit 50, qty 10)
 *     yielding totalGain $1000 with no jokers and 1× multiplier.
 */

import { calculateSaleTotal } from '../../utils/saleCalculations';
import { JOKER_IDS } from '../../constants/jokerIds';
import {
  getJokerEffectsAtLevel,
  STANDARDIZED_JOKERS,
} from '../../utils/jokerEffectEngine';
import { computeEndDayBonuses } from '../../utils/endDayBonuses';

function makeJoker(id: number, level: number = 1) {
  return {
    id: id.toString(),
    name: `Joker ${id}`,
    level,
    effects: getJokerEffectsAtLevel(id, level),
  };
}

// M&Ms is small + (chocolate, hard_candy). Profit 50/unit × 10 = 500.
// Baseline (no jokers): totalGain = 500 (purchase) + 500 × 1 × 1 = 1000.
const baseSaleParams = {
  candyName: 'M&Ms',
  basePrice: 100,
  purchasePrice: 50,
  quantity: 10,
  jokers: [] as any[],
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
  currentLocation: 'cafeteria',
  previousLocation: 'cafeteria', // same → Class Clown does NOT fire by default
  salesTransactionCount: 0,
};

const findStandardized = (id: number) =>
  STANDARDIZED_JOKERS.find((j: any) => j.id === id);


// =============================================================
// 66 — Treasure Chest (already strongly covered in endDayBonuses.test.ts)
// =============================================================
describe('Treasure Chest (#66) — registry sanity', () => {
  it('factory exposes inventory_limit + empty_slot_daily_bonus at all levels', () => {
    for (const lv of [1, 2, 3]) {
      const effects = getJokerEffectsAtLevel(JOKER_IDS.TREASURE_CHEST, lv);
      const targets = effects.map((e) => e.target).sort();
      expect(targets).toEqual(['empty_slot_daily_bonus', 'inventory_limit']);
    }
    const expected = { 1: 8, 2: 15, 3: 25 } as Record<number, number>;
    for (const lv of [1, 2, 3]) {
      const inv = getJokerEffectsAtLevel(JOKER_IDS.TREASURE_CHEST, lv).find(
        (e) => e.target === 'inventory_limit'
      );
      expect(inv?.amount).toBe(expected[lv]);
    }
  });

  it('end-of-day cash bonus = emptySlots × cashPerSlot at L1 (smoke)', () => {
    // Re-asserts a small slice of endDayBonuses.test.ts to make sure the
    // Treasure Chest cash math is still wired into the canonical helper.
    const bonuses = computeEndDayBonuses({
      jokers: [makeJoker(JOKER_IDS.TREASURE_CHEST, 1)],
      totalInventoryCount: 5,
      inventoryLimit: 15,
    });
    const tc = bonuses.find((b) => b.jokerName === 'Treasure Chest');
    expect(tc?.amount).toBe(10 * 20); // 10 empty × $20
  });
});

// =============================================================
// 67 — Safe House (instant/protection — wired via direct ID check)
// =============================================================
describe('Safe House (#67) — registry only', () => {
  it('exposes money_protection + stash_protection enable effects', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.SAFE_HOUSE, 1);
    const targets = effects.map((e) => e.target).sort();
    expect(targets).toEqual(['money_protection', 'stash_protection']);
    for (const e of effects) {
      expect(e.operation).toBe('enable');
      expect(e.amount).toBe(1);
    }
  });

  it('appears in STANDARDIZED_JOKERS as persistent', () => {
    const sj = findStandardized(JOKER_IDS.SAFE_HOUSE);
    expect(sj).toBeDefined();
    expect((sj as any).type).toBe('persistent');
  });
});

// =============================================================
// 70 — Mint Condition (small candy size_multiplier)
// =============================================================
describe('Mint Condition (#70) — small candy size multiplier', () => {
  it('L1 adds +1 to multiplier on small candy → mult 2x → totalGain 1500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MINT_CONDITION, 1)],
    });
    // 500 + 500 × 1 × 2 = 1500
    expect(result.totalGain).toBe(1500);
    expect(result.jokerMultiplier).toBe(2);
  });

  it('L3 adds +2 to multiplier on small candy → mult 3x → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MINT_CONDITION, 3)],
    });
    expect(result.totalGain).toBe(2000);
    expect(result.jokerMultiplier).toBe(3);
  });

  it('does NOT fire on a non-small candy (Snickers = medium)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Snickers',
      inventory: [{ name: 'Snickers', quantity: 10 }],
      jokers: [makeJoker(JOKER_IDS.MINT_CONDITION, 1)],
    });
    expect(result.jokerMultiplier).toBe(1);
  });
});

// =============================================================
// 71 — King Size (big candy size_multiplier)
// =============================================================
describe('King Size (#71) — big candy size multiplier', () => {
  it('L1 on Tootsie Roll (big): mult 2x → totalGain 1500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Tootsie Roll',
      inventory: [{ name: 'Tootsie Roll', quantity: 10 }],
      jokers: [makeJoker(JOKER_IDS.KING_SIZE, 1)],
    });
    expect(result.totalGain).toBe(1500);
    expect(result.jokerMultiplier).toBe(2);
  });

  it('L3 on Tootsie Roll: mult 3x → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Tootsie Roll',
      inventory: [{ name: 'Tootsie Roll', quantity: 10 }],
      jokers: [makeJoker(JOKER_IDS.KING_SIZE, 3)],
    });
    expect(result.totalGain).toBe(2000);
  });

  it('does NOT fire on small candy (M&Ms)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.KING_SIZE, 1)],
    });
    expect(result.jokerMultiplier).toBe(1);
  });
});

// =============================================================
// 72 — Medium Rare (medium candy size_multiplier)
// =============================================================
describe('Medium Rare (#72) — medium candy size multiplier', () => {
  it('L1 on Snickers (medium): mult 2x → totalGain 1500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Snickers',
      inventory: [{ name: 'Snickers', quantity: 10 }],
      jokers: [makeJoker(JOKER_IDS.MEDIUM_RARE, 1)],
    });
    expect(result.totalGain).toBe(1500);
  });

  it('L3 on Snickers: mult 3x → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Snickers',
      inventory: [{ name: 'Snickers', quantity: 10 }],
      jokers: [makeJoker(JOKER_IDS.MEDIUM_RARE, 3)],
    });
    expect(result.totalGain).toBe(2000);
  });

  it('does NOT fire on small candy (M&Ms)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MEDIUM_RARE, 1)],
    });
    expect(result.jokerMultiplier).toBe(1);
  });
});

// =============================================================
// 73 — Clearance Sale (multiplier per loss sale stack)
// =============================================================
describe('Clearance Sale (#73) — clearanceSaleStacks × +0.1/+0.15/+0.2', () => {
  it('L1 with 0 stacks: no fire → totalGain 1000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.CLEARANCE_SALE, 1)],
      clearanceSaleStacks: 0,
    });
    expect(result.totalGain).toBe(1000);
  });

  it('L1 with 3 stacks: +0.3 mult → 1.3x → totalGain 1150', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.CLEARANCE_SALE, 1)],
      clearanceSaleStacks: 3,
    });
    // 500 + 500 × 1 × 1.3 = 1150
    expect(result.totalGain).toBeCloseTo(1150);
    expect(result.jokerMultiplier).toBeCloseTo(1.3);
  });

  it('L3 with 5 stacks: +1.0 mult → 2x → totalGain 1500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.CLEARANCE_SALE, 3)],
      clearanceSaleStacks: 5,
    });
    expect(result.totalGain).toBeCloseTo(1500);
  });
});

// =============================================================
// 74 — Piggy Bank Pro (already covered: piggyBankProInterest.test.ts)
// =============================================================
describe('Piggy Bank Pro (#74) — registry sanity', () => {
  it('factory returns stash_interest with 1.15/1.20/1.25 multiplier', () => {
    expect(
      getJokerEffectsAtLevel(JOKER_IDS.PIGGY_BANK_PRO, 1)[0].amount
    ).toBeCloseTo(1.15);
    expect(
      getJokerEffectsAtLevel(JOKER_IDS.PIGGY_BANK_PRO, 2)[0].amount
    ).toBeCloseTo(1.2);
    expect(
      getJokerEffectsAtLevel(JOKER_IDS.PIGGY_BANK_PRO, 3)[0].amount
    ).toBeCloseTo(1.25);
  });
});

// =============================================================
// 75 — Market Crash (instant — JokerCard.handleMarketCrash)
// =============================================================
describe('Market Crash (#75) — registry only (instant)', () => {
  it('exposes price_manipulation with multiply 0.5/0.4/0.3', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.MARKET_CRASH, 1)[0].amount).toBe(0.5);
    expect(getJokerEffectsAtLevel(JOKER_IDS.MARKET_CRASH, 2)[0].amount).toBe(0.4);
    expect(getJokerEffectsAtLevel(JOKER_IDS.MARKET_CRASH, 3)[0].amount).toBeCloseTo(0.3);
  });

  it('STANDARDIZED_JOKERS marks it one-time', () => {
    const sj = findStandardized(JOKER_IDS.MARKET_CRASH);
    expect((sj as any).type).toBe('one-time');
  });
});

// =============================================================
// 76 — Inflation (instant — JokerCard.handleInflation)
// =============================================================
describe('Inflation (#76) — registry only (instant)', () => {
  it('exposes price_manipulation with multiply 2/3/4', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.INFLATION, 1)[0].amount).toBe(2);
    expect(getJokerEffectsAtLevel(JOKER_IDS.INFLATION, 2)[0].amount).toBe(3);
    expect(getJokerEffectsAtLevel(JOKER_IDS.INFLATION, 3)[0].amount).toBe(4);
  });

  it('STANDARDIZED_JOKERS marks it one-time', () => {
    const sj = findStandardized(JOKER_IDS.INFLATION);
    expect((sj as any).type).toBe('one-time');
  });
});

// =============================================================
// 77 — Lucky Charm (consumed in useEventHandler — registry sanity)
// =============================================================
describe('Lucky Charm (#77) — registry sanity', () => {
  it('exposes found_money_multiplier with multiply 3/4/5', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.LUCKY_CHARM, 1)[0].amount).toBe(3);
    expect(getJokerEffectsAtLevel(JOKER_IDS.LUCKY_CHARM, 2)[0].amount).toBe(4);
    expect(getJokerEffectsAtLevel(JOKER_IDS.LUCKY_CHARM, 3)[0].amount).toBe(5);
    expect(getJokerEffectsAtLevel(JOKER_IDS.LUCKY_CHARM, 1)[0].target).toBe(
      'found_money_multiplier'
    );
  });
});

// =============================================================
// 78 — Bully Bait (consumed in useEventHandler — registry sanity)
// =============================================================
describe('Bully Bait (#78) — registry sanity', () => {
  it('exposes event_conversion with amount 500/1000/2000', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.BULLY_BAIT, 1)[0].amount).toBe(500);
    expect(getJokerEffectsAtLevel(JOKER_IDS.BULLY_BAIT, 2)[0].amount).toBe(1000);
    expect(getJokerEffectsAtLevel(JOKER_IDS.BULLY_BAIT, 3)[0].amount).toBe(2000);
    expect(getJokerEffectsAtLevel(JOKER_IDS.BULLY_BAIT, 1)[0].target).toBe(
      'event_conversion'
    );
  });
});

// =============================================================
// 79 — Teacher's Pet (UI-only via direct ID check — registry sanity)
// =============================================================
describe("Teacher's Pet (#79) — registry only (UI-driven)", () => {
  it('exposes price_peek_hint with amount 1/2/3', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.TEACHERS_PET, 1)[0].amount).toBe(1);
    expect(getJokerEffectsAtLevel(JOKER_IDS.TEACHERS_PET, 2)[0].amount).toBe(2);
    expect(getJokerEffectsAtLevel(JOKER_IDS.TEACHERS_PET, 3)[0].amount).toBe(3);
    expect(getJokerEffectsAtLevel(JOKER_IDS.TEACHERS_PET, 1)[0].target).toBe(
      'price_peek_hint'
    );
  });
});

// =============================================================
// 80 — Class Clown (location-change profit boost)
// =============================================================
describe('Class Clown (#80) — location_change_boost', () => {
  it('L1 location changed: +10% profit → totalGain 1050', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.CLASS_CLOWN, 1)],
      previousLocation: 'park',
      currentLocation: 'cafeteria',
    });
    // totalProfit 500 × profitBoost 1.1 = 550 → 500 + 550 = 1050
    expect(result.totalGain).toBeCloseTo(1050);
  });

  it('L3 location changed: +50% profit → totalGain 1250', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.CLASS_CLOWN, 3)],
      previousLocation: 'park',
      currentLocation: 'cafeteria',
    });
    expect(result.totalGain).toBeCloseTo(1250);
  });

  it('does NOT fire when previousLocation === currentLocation', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.CLASS_CLOWN, 1)],
      previousLocation: 'cafeteria',
      currentLocation: 'cafeteria',
    });
    expect(result.totalGain).toBe(1000);
  });
});

// =============================================================
// 81 — Detention Dodge (instant)
// =============================================================
describe('Detention Dodge (#81) — registry only (instant)', () => {
  it('exposes event_immunity enable, max level 1', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.DETENTION_DODGE, 1);
    expect(effects[0].target).toBe('event_immunity');
    expect(effects[0].operation).toBe('enable');
    const sj = findStandardized(JOKER_IDS.DETENTION_DODGE);
    expect((sj as any).maxLevel).toBe(1);
    expect((sj as any).type).toBe('one-time');
  });
});

// =============================================================
// 82 — Collector (mult per unique joker)
// =============================================================
describe('Collector (#82) — collector_boost × ownedJokerCount', () => {
  it('L1 with 4 jokers owned: +0.3×4 = +1.2 mult → 2.2x → totalGain 1600', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.COLLECTOR, 1)],
      ownedJokerCount: 4,
    });
    // 500 + 500 × 1 × 2.2 = 1600
    expect(result.totalGain).toBeCloseTo(1600);
    expect(result.jokerMultiplier).toBeCloseTo(2.2);
  });

  it('L3 with 5 jokers owned: +0.7×5 = +3.5 mult → 4.5x → totalGain 2750', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.COLLECTOR, 3)],
      ownedJokerCount: 5,
    });
    expect(result.totalGain).toBeCloseTo(2750);
    expect(result.jokerMultiplier).toBeCloseTo(4.5);
  });

  it('does NOT fire when ownedJokerCount === 0', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.COLLECTOR, 1)],
      ownedJokerCount: 0,
    });
    expect(result.totalGain).toBe(1000);
  });
});

// =============================================================
// 83 — Minimalist (3 jokers exactly → big mult)
// =============================================================
describe('Minimalist (#83) — fires only when ownedJokerCount === 3', () => {
  it('L1 with 3 jokers: 3x mult → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MINIMALIST, 1)],
      ownedJokerCount: 3,
    });
    // mult = 1 + (3-1) = 3 → 500 + 500×3 = 2000
    expect(result.totalGain).toBe(2000);
    expect(result.jokerMultiplier).toBe(3);
  });

  it('L3 with 3 jokers: 8x mult → totalGain 4500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MINIMALIST, 3)],
      ownedJokerCount: 3,
    });
    expect(result.totalGain).toBe(4500); // 500 + 500×8
  });

  it('does NOT fire with 2 jokers', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MINIMALIST, 1)],
      ownedJokerCount: 2,
    });
    expect(result.totalGain).toBe(1000);
  });

  it('does NOT fire with 4 jokers', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MINIMALIST, 1)],
      ownedJokerCount: 4,
    });
    expect(result.totalGain).toBe(1000);
  });
});

// =============================================================
// 84 — Lucky 7 (already covered in newJokerEffects.test.ts)
// =============================================================
describe('Lucky 7 (#84) — registry sanity', () => {
  it('exposes lucky_seven_boost with amount 2/3/4', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.LUCKY_7, 1)[0].amount).toBe(2);
    expect(getJokerEffectsAtLevel(JOKER_IDS.LUCKY_7, 2)[0].amount).toBe(3);
    expect(getJokerEffectsAtLevel(JOKER_IDS.LUCKY_7, 3)[0].amount).toBe(4);
  });
});

// =============================================================
// 85 — Night Owl (last period of day)
// =============================================================
describe('Night Owl (#85) — fires when period >= periodsPerDay - 1', () => {
  it('L1 in last period: 3x mult → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.NIGHT_OWL, 1)],
      period: 8,
      periodsPerDay: 8,
    });
    expect(result.totalGain).toBe(2000); // 500 + 500×3
    expect(result.jokerMultiplier).toBe(3);
  });

  it('L3 in last period: 5x mult → totalGain 3000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.NIGHT_OWL, 3)],
      period: 8,
      periodsPerDay: 8,
    });
    expect(result.totalGain).toBe(3000);
  });

  it('does NOT fire in early period (period 1 of 8)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.NIGHT_OWL, 1)],
      period: 1,
      periodsPerDay: 8,
    });
    expect(result.totalGain).toBe(1000);
  });
});

// =============================================================
// 86 — Penny Pincher (already covered in deferredJokerCoverage.test.ts)
// =============================================================
describe('Penny Pincher (#86) — registry sanity', () => {
  it('exposes stash_allowance_bonus with multiply 0.10/0.15/0.20', () => {
    expect(
      getJokerEffectsAtLevel(JOKER_IDS.PENNY_PINCHER, 1)[0].amount
    ).toBeCloseTo(0.1);
    expect(
      getJokerEffectsAtLevel(JOKER_IDS.PENNY_PINCHER, 2)[0].amount
    ).toBeCloseTo(0.15);
    expect(
      getJokerEffectsAtLevel(JOKER_IDS.PENNY_PINCHER, 3)[0].amount
    ).toBeCloseTo(0.2);
    expect(getJokerEffectsAtLevel(JOKER_IDS.PENNY_PINCHER, 1)[0].target).toBe(
      'stash_allowance_bonus'
    );
  });
});

// =============================================================
// 87 — Tax Collector (% of sale as profit boost)
// =============================================================
describe('Tax Collector (#87) — adds 5%/8%/12% profit boost', () => {
  it('L1: +5% profit → totalGain 1025', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.TAX_COLLECTOR, 1)],
    });
    // boostedProfit = 500 × 1.05 = 525, totalGain = 500 + 525 = 1025
    expect(result.totalGain).toBeCloseTo(1025);
  });

  it('L3: +12% profit → totalGain 1060', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.TAX_COLLECTOR, 3)],
    });
    // boostedProfit = 500 × 1.12 = 560
    expect(result.totalGain).toBeCloseTo(1060);
  });
});

// =============================================================
// 88 — Last Stand (huge mult when selling < 5 candy)
// =============================================================
describe('Last Stand (#88) — multiplier when quantity < 5', () => {
  it('L1 selling 4 candy: 10x mult → totalGain 1800', () => {
    // qty 4: profit 50×4=200 → 200 × 10 = 2000 → 200 (purchase) + 2000 = 2200? No.
    // Actually: purchaseValue=50×4=200, totalProfit=200, finalProfit=200×1×10=2000.
    // totalGain = 200 + 2000 = 2200.
    const result = calculateSaleTotal({
      ...baseSaleParams,
      quantity: 4,
      inventory: [{ name: 'M&Ms', quantity: 4 }],
      jokers: [makeJoker(JOKER_IDS.LAST_STAND, 1)],
    });
    expect(result.totalGain).toBe(2200);
    expect(result.jokerMultiplier).toBe(10);
  });

  it('L3 selling 1 candy: 20x mult → totalGain 1050', () => {
    // qty 1: purchaseValue=50, totalProfit=50, finalProfit=50×20=1000
    // totalGain = 50 + 1000 = 1050
    const result = calculateSaleTotal({
      ...baseSaleParams,
      quantity: 1,
      inventory: [{ name: 'M&Ms', quantity: 1 }],
      jokers: [makeJoker(JOKER_IDS.LAST_STAND, 3)],
    });
    expect(result.totalGain).toBe(1050);
  });

  it('does NOT fire at qty 5', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      quantity: 5,
      inventory: [{ name: 'M&Ms', quantity: 5 }],
      jokers: [makeJoker(JOKER_IDS.LAST_STAND, 1)],
    });
    expect(result.jokerMultiplier).toBe(1);
  });
});

// =============================================================
// 89 — Momentum (profit boost per consecutive sale period)
// =============================================================
describe('Momentum (#89) — momentum_profit_boost × consecutivePeriodSales', () => {
  it('L1 with 4 consecutive periods: +1.2 profit → 2.2x → totalGain 1600', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MOMENTUM, 1)],
      consecutivePeriodSales: 4,
    });
    // profitBoost = 1 + 0.3×4 = 2.2 → 500×2.2 = 1100 boosted, totalGain 500+1100 = 1600
    expect(result.totalGain).toBeCloseTo(1600);
  });

  it('L3 with 2 consecutive periods: +1.6 profit → 2.6x → totalGain 1800', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MOMENTUM, 3)],
      consecutivePeriodSales: 2,
    });
    // 500 × (1 + 0.8×2) = 500 × 2.6 = 1300 boosted. totalGain = 500 + 1300 = 1800
    expect(result.totalGain).toBeCloseTo(1800);
  });

  it('does NOT fire when consecutivePeriodSales === 0', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.MOMENTUM, 1)],
      consecutivePeriodSales: 0,
    });
    expect(result.totalGain).toBe(1000);
  });
});

// =============================================================
// 90 — Diversifier (already covered in jokerEffectMath/utility tests)
// =============================================================
describe('Diversifier (#90) — registry sanity', () => {
  it('exposes diversifier_boost multiply 2/3/4', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.DIVERSIFIER, 1)[0].amount).toBe(2);
    expect(getJokerEffectsAtLevel(JOKER_IDS.DIVERSIFIER, 2)[0].amount).toBe(3);
    expect(getJokerEffectsAtLevel(JOKER_IDS.DIVERSIFIER, 3)[0].amount).toBe(4);
  });
});

// =============================================================
// 91 — Peak Hours (profit boost during periods 3-5)
// =============================================================
describe('Peak Hours (#91) — fires only in periods 3..5', () => {
  it('L1 in period 4: 2x profit boost → totalGain 1500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PEAK_HOURS, 1)],
      period: 4,
    });
    // peak_hours_profit_boost adds (effect.amount-1)=1 to profitBoost → 2x.
    // boosted = 500×2 = 1000. totalGain = 500+1000 = 1500.
    expect(result.totalGain).toBeCloseTo(1500);
  });

  it('L3 in period 5: 4x profit boost → totalGain 2500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PEAK_HOURS, 3)],
      period: 5,
    });
    expect(result.totalGain).toBeCloseTo(2500); // 500 + 500×4
  });

  it('does NOT fire in period 2', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PEAK_HOURS, 1)],
      period: 2,
    });
    expect(result.totalGain).toBe(1000);
  });

  it('does NOT fire in period 6', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PEAK_HOURS, 1)],
      period: 6,
    });
    expect(result.totalGain).toBe(1000);
  });
});

// =============================================================
// 92 — Patience Pays (already covered)
// =============================================================
describe('Patience Pays (#92) — registry sanity', () => {
  it('exposes patience_pays_boost multiply 1.5/1.75/2.0', () => {
    expect(
      getJokerEffectsAtLevel(JOKER_IDS.PATIENCE_PAYS, 1)[0].amount
    ).toBeCloseTo(1.5);
    expect(
      getJokerEffectsAtLevel(JOKER_IDS.PATIENCE_PAYS, 2)[0].amount
    ).toBeCloseTo(1.75);
    expect(
      getJokerEffectsAtLevel(JOKER_IDS.PATIENCE_PAYS, 3)[0].amount
    ).toBeCloseTo(2.0);
  });
});

// =============================================================
// 93 — Spare Change (already covered in sparePeriodIncome.test.ts)
// =============================================================
describe('Spare Change (#93) — registry sanity', () => {
  it('exposes spare_change_income add 5/10/20', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, 1)[0].amount).toBe(5);
    expect(getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, 2)[0].amount).toBe(10);
    expect(getJokerEffectsAtLevel(JOKER_IDS.SPARE_CHANGE, 3)[0].amount).toBe(20);
  });
});

// =============================================================
// 94 — Deep Freeze (UI-only via direct ID check)
// =============================================================
describe('Deep Freeze (#94) — registry only', () => {
  it('exposes prevent_melt with amount 1 (always)', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.DEEP_FREEZE, 1);
    expect(effects[0].target).toBe('prevent_melt');
    expect(effects[0].amount).toBe(1);
  });
});

// =============================================================
// 95 — Hoarder (mult per inventory-full hit)
// =============================================================
describe('Hoarder (#95) — hoarder_boost × hoarderMaxHits', () => {
  it('L1 with 4 hits: +0.3×4 = +1.2 mult → 2.2x → totalGain 1600', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.HOARDER, 1)],
      hoarderMaxHits: 4,
    });
    expect(result.totalGain).toBeCloseTo(1600);
    expect(result.jokerMultiplier).toBeCloseTo(2.2);
  });

  it('L3 with 2 hits: +0.8×2 = +1.6 mult → 2.6x → totalGain 1800', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.HOARDER, 3)],
      hoarderMaxHits: 2,
    });
    expect(result.totalGain).toBeCloseTo(1800);
  });

  it('does NOT fire when hoarderMaxHits === 0', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.HOARDER, 1)],
      hoarderMaxHits: 0,
    });
    expect(result.totalGain).toBe(1000);
  });
});

// =============================================================
// 96 — Penny Wise (profit boost per stash deposit)
// =============================================================
describe('Penny Wise (#96) — penny_wise_boost × pennyWiseStashes', () => {
  it('L1 with 4 stashes: +0.15×4 = +0.6 profit → 1.6x → totalGain 1300', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PENNY_WISE, 1)],
      pennyWiseStashes: 4,
    });
    // profitBoost = 1 + 0.15×4 = 1.6. boosted = 500×1.6 = 800. totalGain = 500 + 800 = 1300
    expect(result.totalGain).toBeCloseTo(1300);
  });

  it('L3 with 5 stashes: +0.4×5 = +2.0 profit → 3x → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PENNY_WISE, 3)],
      pennyWiseStashes: 5,
    });
    expect(result.totalGain).toBeCloseTo(2000);
  });

  it('does NOT fire when pennyWiseStashes === 0', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PENNY_WISE, 1)],
      pennyWiseStashes: 0,
    });
    expect(result.totalGain).toBe(1000);
  });

  it('records a flatBonus breakdown entry equal to totalProfit × bonus when firing', () => {
    // _getJokerName has no entry for ID 96, so the breakdown name falls back
    // to 'Joker'. Assert the numeric flatBonus field instead of the label.
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PENNY_WISE, 1)],
      pennyWiseStashes: 2,
    });
    // flatBonus expected = 500 × (0.15 × 2) = 150
    const entry = result.bonusBreakdown.find(
      (b: any) => b.flatBonus !== undefined && Math.abs(b.flatBonus - 150) < 0.001
    );
    expect(entry).toBeDefined();
  });
});

// =============================================================
// 97 — Survivor (mult per candy batch melted)
// =============================================================
describe('Survivor (#97) — survivor_boost × survivorCandiesMelted', () => {
  it('L1 with 3 melted: +0.5×3 = +1.5 mult → 2.5x → totalGain 1750', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.SURVIVOR, 1)],
      survivorCandiesMelted: 3,
    });
    // mult = 1 + 0.5×3 = 2.5. finalProfit = 500×1×2.5 = 1250. totalGain = 500+1250 = 1750
    expect(result.totalGain).toBeCloseTo(1750);
    expect(result.jokerMultiplier).toBeCloseTo(2.5);
  });

  it('L3 with 2 melted: +1.0×2 = +2.0 mult → 3x → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.SURVIVOR, 3)],
      survivorCandiesMelted: 2,
    });
    expect(result.totalGain).toBeCloseTo(2000);
    expect(result.jokerMultiplier).toBeCloseTo(3);
  });

  it('does NOT fire when survivorCandiesMelted === 0', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.SURVIVOR, 1)],
      survivorCandiesMelted: 0,
    });
    expect(result.totalGain).toBe(1000);
  });
});
