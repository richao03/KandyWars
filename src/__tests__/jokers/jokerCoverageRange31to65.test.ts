/**
 * Coverage audit for jokers in id range [31, 65] inclusive.
 *
 * Each describe block asserts the EXACT numerical impact at level 1, and
 * (where the joker has multiple levels) also at level 3. Where a joker is
 * already covered by an existing strong test (Compound Interest, Glass
 * Cannon, Variety Pack, Golden Hour, Mysterious Artifact, Sixth Sense,
 * Extra Credit, Inductive Reasoning), this file only adds an additional
 * sanity assertion or registry check rather than duplicating behavior.
 *
 * Range: 31, 32, 37, 38, 39, 42, 43, 45, 46, 47, 48, 49, 50, 52, 53, 55,
 *        56, 57, 58, 59, 60, 61, 62, 63, 64, 65  (26 jokers)
 */

import { calculateSaleTotal } from '../../utils/saleCalculations';
import {
  getJokerEffectsAtLevel,
  STANDARDIZED_JOKERS,
} from '../../utils/jokerEffectEngine';
import { JokerService } from '../../utils/jokerService';
import { JOKER_IDS } from '../../constants/jokerIds';

function makeJoker(id: number, level: number = 1) {
  const standardized = STANDARDIZED_JOKERS.find((j) => j.id === id);
  return {
    id: id.toString(),
    name: standardized?.name ?? `Joker ${id}`,
    level,
    effects: getJokerEffectsAtLevel(id, level),
  };
}

// Base sale params: M&Ms (small, chocolate + hard_candy)
//   profitPerUnit = 100 - 50 = 50, qty 10 → totalProfit = 500
//   purchaseValue = 500 → baseline totalGain = 500 + 500 = 1000
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
  currentCash: 100000, // intentionally high so cash-under jokers don't fire
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

// ─────────────────────────────────────────────────────────────────────────────
// 31: Ace the Test — 2x/3x/4x allowance (consumer: useWallet.addAllowance)
// ─────────────────────────────────────────────────────────────────────────────
describe('Ace the Test (31) — allowance multiplier', () => {
  it('factory wired: target=allowance_multiplier, multiply', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.ACE_THE_TEST, 1);
    expect(l1[0].target).toBe('allowance_multiplier');
    expect(l1[0].operation).toBe('multiply');
    expect(l1[0].amount).toBe(2);
  });

  it('level 3 amount is 4x', () => {
    const l3 = getJokerEffectsAtLevel(JOKER_IDS.ACE_THE_TEST, 3);
    expect(l3[0].amount).toBe(4);
  });

  it('mirrors useWallet.ts loop: allowanceMultiplier *= effect.amount', () => {
    // Mirror lines 78-91 in useWallet.ts
    const effects = getJokerEffectsAtLevel(JOKER_IDS.ACE_THE_TEST, 1);
    let allowanceMultiplier = 1;
    effects.forEach((effect) => {
      if (
        effect.target === 'allowance_multiplier' &&
        effect.operation === 'multiply'
      ) {
        allowanceMultiplier *= effect.amount;
      }
    });
    const baseAllowance = 1000;
    expect(baseAllowance * allowanceMultiplier).toBe(2000); // L1: $1000 → $2000
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 32: Double Dutch — 1.5x/2x/3x mult on Chewy candy (consumer: saleCalc type_multiplier)
// ─────────────────────────────────────────────────────────────────────────────
describe('Double Dutch (32) — chewy type multiplier', () => {
  it('L1 fires 1.5x on chewy candy (Gummy Bears: gummy+chewy)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Gummy Bears',
      basePrice: 2,
      purchasePrice: 1,
      quantity: 100,
      jokers: [makeJoker(JOKER_IDS.DOUBLE_DUTCH, 1)],
      inventory: [{ name: 'Gummy Bears', quantity: 100 }],
    });
    // totalProfit = (2-1)*100 = 100; profitBoost = 1 + 0.5 = 1.5
    // boostedProfit = 100 * 1.5 = 150; multiplier 1; totalGain = 100 + 150 = 250
    expect(result.totalGain).toBe(250);
  });

  it('L1 does NOT fire on non-chewy candy (M&Ms: chocolate+hard_candy)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.DOUBLE_DUTCH, 1)],
    });
    expect(result.totalGain).toBe(1000);
  });

  it('L3 fires 3x on chewy', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Gummy Bears',
      basePrice: 2,
      purchasePrice: 1,
      quantity: 100,
      jokers: [makeJoker(JOKER_IDS.DOUBLE_DUTCH, 3)],
      inventory: [{ name: 'Gummy Bears', quantity: 100 }],
    });
    // profitBoost = 1 + (3-1) = 3; boostedProfit = 100 * 3 = 300; total = 100 + 300 = 400
    expect(result.totalGain).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 37: Roman Coin — instant cash $2k/$5k/$10k (consumer: JokerCard.handleRomanCoin)
// ─────────────────────────────────────────────────────────────────────────────
describe('Roman Coin (37) — instant cash, UI-driven', () => {
  it('factory returns no effects (handled imperatively in JokerCard)', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.ROMAN_COIN, 1);
    expect(l1).toEqual([]);
  });

  it('registry: type=one-time, maxLevel=3', () => {
    const j = STANDARDIZED_JOKERS.find((s) => s.id === JOKER_IDS.ROMAN_COIN);
    expect(j).toBeDefined();
    expect(j!.type).toBe('one-time');
    expect(j!.maxLevel).toBe(3);
    expect(j!.name).toBe('Roman Coin');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 38: Golden Hour — 1.5x/2x/3x in last 2 periods (already in jokerEffectMath)
// ─────────────────────────────────────────────────────────────────────────────
describe('Golden Hour (38) — last-2-periods boost (sanity)', () => {
  it('L1 fires in period 7 (=periodsPerDay-1) with 8 periods/day', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.GOLDEN_HOUR, 1)],
      period: 7,
      periodsPerDay: 8,
    });
    // profitBoost = 1 + (1.5-1) = 1.5; boostedProfit = 500 * 1.5 = 750; total = 500 + 750 = 1250
    expect(result.totalGain).toBe(1250);
  });

  it('L1 does NOT fire in period 1', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.GOLDEN_HOUR, 1)],
      period: 1,
      periodsPerDay: 8,
    });
    expect(result.totalGain).toBe(1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 39: Trade Routes — +2/+3/+4 inventory per period (consumer: jokerService inventory_limit)
// ─────────────────────────────────────────────────────────────────────────────
describe('Trade Routes (39) — inventory bonus', () => {
  it('factory wired: target=inventory_limit, +2 at L1', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.TRADE_ROUTES, 1);
    expect(l1[0].target).toBe('inventory_limit');
    expect(l1[0].operation).toBe('add');
    expect(l1[0].amount).toBe(2);
  });

  it('L3 amount is +4 per the factory', () => {
    const l3 = getJokerEffectsAtLevel(JOKER_IDS.TRADE_ROUTES, 3);
    expect(l3[0].amount).toBe(4);
  });

  it('jokerService inventory_limit returns base + factory bonus (no double count)', () => {
    const service = JokerService.getInstance();
    const l1 = service.applyJokerEffects(
      30,
      'inventory_limit' as any,
      [makeJoker(JOKER_IDS.TRADE_ROUTES, 1)],
      0,
      30,
      undefined,
      [],
      8
    );
    expect(l1).toBe(32); // base 30 + factory +2

    const l3 = service.applyJokerEffects(
      30,
      'inventory_limit' as any,
      [makeJoker(JOKER_IDS.TRADE_ROUTES, 3)],
      0,
      30,
      undefined,
      [],
      8
    );
    expect(l3).toBe(34); // base 30 + factory +4
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 42: Tropical Import — 1.5x/2x/3x mult on Fruity (consumer: type_multiplier)
// ─────────────────────────────────────────────────────────────────────────────
describe('Tropical Import (42) — fruity type multiplier', () => {
  it('L1 fires 1.5x on Jolly Ranchers (hard_candy+fruity)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Jolly Ranchers',
      basePrice: 5,
      purchasePrice: 1,
      quantity: 50,
      jokers: [makeJoker(JOKER_IDS.TROPICAL_IMPORT, 1)],
      inventory: [{ name: 'Jolly Ranchers', quantity: 50 }],
    });
    // totalProfit = 4*50 = 200; profitBoost = 1.5; boostedProfit = 300; total = 50 + 300 = 350
    expect(result.totalGain).toBe(350);
  });

  it('L3 fires 3x on fruity', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Jolly Ranchers',
      basePrice: 5,
      purchasePrice: 1,
      quantity: 50,
      jokers: [makeJoker(JOKER_IDS.TROPICAL_IMPORT, 3)],
      inventory: [{ name: 'Jolly Ranchers', quantity: 50 }],
    });
    // profitBoost = 1 + 2 = 3; boostedProfit = 200*3 = 600; total = 50 + 600 = 650
    expect(result.totalGain).toBe(650);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 43: Inductive Reasoning — already covered by deferredJokerCoverage; sanity only
// ─────────────────────────────────────────────────────────────────────────────
describe('Inductive Reasoning (43) — registry sanity', () => {
  it('factory: target=inventory_limit, +5 at L1, +10 at L3', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.INDUCTIVE_REASONING, 1);
    const l3 = getJokerEffectsAtLevel(JOKER_IDS.INDUCTIVE_REASONING, 3);
    expect(l1[0].target).toBe('inventory_limit');
    expect(l1[0].amount).toBe(5);
    expect(l3[0].amount).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 45: Early Bird — first sale of day profit boost
// ─────────────────────────────────────────────────────────────────────────────
describe('Early Bird (45) — first sale of day', () => {
  it('L1 fires 1.5x when hasEarlySaleToday=false', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.EARLY_BIRD, 1)],
      hasEarlySaleToday: false,
    });
    // profitBoost += 0.5; boostedProfit = 500*1.5 = 750; total = 500 + 750 = 1250
    expect(result.totalGain).toBe(1250);
  });

  it('L1 does NOT fire when hasEarlySaleToday=true', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.EARLY_BIRD, 1)],
      hasEarlySaleToday: true,
    });
    expect(result.totalGain).toBe(1000);
  });

  it('L3 fires 3x', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.EARLY_BIRD, 3)],
      hasEarlySaleToday: false,
    });
    // profitBoost = 1 + 2 = 3; boostedProfit = 1500; total = 500 + 1500 = 2000
    expect(result.totalGain).toBe(2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 46: Sour Logic — 1.5x/2x/3x mult on Sour
// ─────────────────────────────────────────────────────────────────────────────
describe('Sour Logic (46) — sour type multiplier', () => {
  it('L1 fires 1.5x on Warheads (sour+hard_candy)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Warheads',
      basePrice: 10,
      purchasePrice: 2,
      quantity: 50,
      jokers: [makeJoker(JOKER_IDS.SOUR_LOGIC, 1)],
      inventory: [{ name: 'Warheads', quantity: 50 }],
    });
    // totalProfit = 8*50 = 400; profitBoost = 1.5; boosted = 600; total = 100 + 600 = 700
    expect(result.totalGain).toBe(700);
  });

  it('L3 fires 3x on sour', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Warheads',
      basePrice: 10,
      purchasePrice: 2,
      quantity: 50,
      jokers: [makeJoker(JOKER_IDS.SOUR_LOGIC, 3)],
      inventory: [{ name: 'Warheads', quantity: 50 }],
    });
    // profitBoost = 3; boosted = 1200; total = 100 + 1200 = 1300
    expect(result.totalGain).toBe(1300);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 47: Bulk Discount — 1.5x/2x/3x when quantity >= 20
// ─────────────────────────────────────────────────────────────────────────────
describe('Bulk Discount (47) — bulk threshold profit boost', () => {
  it('L1 fires 1.5x when quantity >= 20', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      quantity: 20,
      inventory: [{ name: 'M&Ms', quantity: 20 }],
      jokers: [makeJoker(JOKER_IDS.BULK_DISCOUNT, 1)],
    });
    // totalProfit = 50*20 = 1000; profitBoost = 1.5; boosted = 1500; total = 1000 + 1500 = 2500
    expect(result.totalGain).toBe(2500);
  });

  it('L1 does NOT fire when quantity < 20', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      quantity: 19,
      inventory: [{ name: 'M&Ms', quantity: 19 }],
      jokers: [makeJoker(JOKER_IDS.BULK_DISCOUNT, 1)],
    });
    // totalProfit = 50*19 = 950; total = 950 + 950 = 1900
    expect(result.totalGain).toBe(1900);
  });

  it('L3 fires 3x at bulk threshold', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      quantity: 20,
      inventory: [{ name: 'M&Ms', quantity: 20 }],
      jokers: [makeJoker(JOKER_IDS.BULK_DISCOUNT, 3)],
    });
    // profitBoost = 3; boosted = 3000; total = 1000 + 3000 = 4000
    expect(result.totalGain).toBe(4000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 48: Pursuasion — one-time, 2x/4x/6x next-sale multiplier
// ─────────────────────────────────────────────────────────────────────────────
describe('Pursuasion (48) — one-time multiplier', () => {
  it('factory wired: next_sale_multiplier 2x at L1', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.PURSUASION, 1);
    expect(l1[0].target).toBe('next_sale_multiplier');
    expect(l1[0].amount).toBe(2);
    expect(l1[0].duration).toBe('one-time');
  });

  it('L1 applied via saleCalc adds 2x → finalProfit doubled', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PURSUASION, 1)],
    });
    // multiplier = 1 + (2-1) = 2; boosted=500; finalProfit=500*2=1000; total=500+1000=1500
    expect(result.totalGain).toBe(1500);
    expect(result.jokerMultiplier).toBe(2);
  });

  it('L3 applies 6x', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.PURSUASION, 3)],
    });
    // multiplier = 1 + 5 = 6; finalProfit = 3000; total = 500 + 3000 = 3500
    expect(result.totalGain).toBe(3500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 49: Underdog — cash-under-threshold profit boost
// ─────────────────────────────────────────────────────────────────────────────
describe('Underdog (49) — cash under threshold', () => {
  it('L1 fires 1.5x when cash < $5000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 4999,
      jokers: [makeJoker(JOKER_IDS.UNDERDOG, 1)],
    });
    // profitBoost = 1.5; boosted = 750; total = 500 + 750 = 1250
    expect(result.totalGain).toBe(1250);
  });

  it('L1 does NOT fire when cash >= $5000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 5000,
      jokers: [makeJoker(JOKER_IDS.UNDERDOG, 1)],
    });
    expect(result.totalGain).toBe(1000);
  });

  it('L3 fires 3x when cash < $15000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 14999,
      jokers: [makeJoker(JOKER_IDS.UNDERDOG, 3)],
    });
    // profitBoost = 3; boosted = 1500; total = 500 + 1500 = 2000
    expect(result.totalGain).toBe(2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 50: Variety Pack — already covered in jokerEffectMath; sanity only
// ─────────────────────────────────────────────────────────────────────────────
describe('Variety Pack (50) — sanity check', () => {
  it('factory wired: variety_pack_profit_boost 1.5x at L1', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.VARIETY_PACK, 1);
    expect(l1[0].target).toBe('variety_pack_profit_boost');
    expect(l1[0].amount).toBe(1.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 52: Broke and Hungry — cash-under multiplier (NOT profit boost)
// ─────────────────────────────────────────────────────────────────────────────
describe('Broke and Hungry (52) — cash under threshold multiplier', () => {
  it('L1 fires 2x mult when cash < $2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 1999,
      jokers: [makeJoker(JOKER_IDS.BROKE_AND_HUNGRY, 1)],
    });
    // multiplier = 1 + (2-1) = 2; boostedProfit = 500; finalProfit = 500*2 = 1000; total = 500 + 1000 = 1500
    expect(result.totalGain).toBe(1500);
    expect(result.jokerMultiplier).toBe(2);
  });

  it('L1 does NOT fire when cash >= $2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 2000,
      jokers: [makeJoker(JOKER_IDS.BROKE_AND_HUNGRY, 1)],
    });
    expect(result.totalGain).toBe(1000);
  });

  it('L3 fires 4x when cash < $5000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 4999,
      jokers: [makeJoker(JOKER_IDS.BROKE_AND_HUNGRY, 3)],
    });
    // multiplier = 4; finalProfit = 500*4 = 2000; total = 500 + 2000 = 2500
    expect(result.totalGain).toBe(2500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 53: Mysterious Artifact — registry sanity (already in piggyBankProInterest)
// ─────────────────────────────────────────────────────────────────────────────
describe('Mysterious Artifact (53) — registry sanity', () => {
  it('factory: stash_interest 1.08/1.15/1.25', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.MYSTERIOUS_ARTIFACT, 1)[0].amount).toBe(1.08);
    expect(getJokerEffectsAtLevel(JOKER_IDS.MYSTERIOUS_ARTIFACT, 2)[0].amount).toBe(1.15);
    expect(getJokerEffectsAtLevel(JOKER_IDS.MYSTERIOUS_ARTIFACT, 3)[0].amount).toBe(1.25);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 55: Extra Credit — UI-driven; registry sanity
// ─────────────────────────────────────────────────────────────────────────────
describe('Extra Credit (55) — registry sanity', () => {
  it('factory: extra_joker_choice +1 (max level 1)', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.EXTRA_CREDIT, 1);
    expect(l1[0].target).toBe('extra_joker_choice');
    expect(l1[0].amount).toBe(1);
    const j = STANDARDIZED_JOKERS.find((s) => s.id === JOKER_IDS.EXTRA_CREDIT);
    expect(j!.maxLevel).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 56: Sixth Sense — registry sanity (already covered in utilityJokerCoverage)
// ─────────────────────────────────────────────────────────────────────────────
describe('Sixth Sense (56) — registry sanity', () => {
  it('factory: lucky_proc_mult +6 with 10% chance', () => {
    const l1 = getJokerEffectsAtLevel(JOKER_IDS.SIXTH_SENSE, 1);
    expect(l1[0].target).toBe('lucky_proc_mult');
    expect(l1[0].amount).toBe(6);
    expect(l1[0].conditions?.chance).toBe(0.1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 57: Sugar Rush — sell_multiplier 2x/3x/4x
// ─────────────────────────────────────────────────────────────────────────────
describe('Sugar Rush (57) — sell multiplier', () => {
  it('L1 applies 2x multiplier', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.SUGAR_RUSH, 1)],
    });
    // multiplier = 1 + 1 = 2; finalProfit = 500*2 = 1000; total = 500 + 1000 = 1500
    expect(result.totalGain).toBe(1500);
    expect(result.jokerMultiplier).toBe(2);
  });

  it('L3 applies 4x multiplier', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.SUGAR_RUSH, 3)],
    });
    // multiplier = 4; finalProfit = 2000; total = 500 + 2000 = 2500
    expect(result.totalGain).toBe(2500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 58: Loan Shark — daily income / debt (consumer: useLoanShark + endDayBonuses)
// ─────────────────────────────────────────────────────────────────────────────
describe('Loan Shark (58) — daily income / debt', () => {
  it('L1: income +$5000, debt -$6000', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, 1);
    const income = effects.find((e) => e.target === 'loan_shark_income');
    const debt = effects.find((e) => e.target === 'loan_shark_debt');
    expect(income?.amount).toBe(5000);
    expect(debt?.amount).toBe(-6000);
  });

  it('L3: income +$12000, debt -$14000', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, 3);
    expect(effects.find((e) => e.target === 'loan_shark_income')?.amount).toBe(12000);
    expect(effects.find((e) => e.target === 'loan_shark_debt')?.amount).toBe(-14000);
  });

  it('net loss per day: $1000 at L1', () => {
    const effects = getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, 1);
    const income = effects.find((e) => e.target === 'loan_shark_income')!.amount;
    const debt = effects.find((e) => e.target === 'loan_shark_debt')!.amount;
    expect(income + debt).toBe(-1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 59: Glass Cannon — already covered in jokerEffectMath; sanity only
// ─────────────────────────────────────────────────────────────────────────────
describe('Glass Cannon (59) — sanity check', () => {
  it('factory: glass_cannon_boost 5/7/10', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.GLASS_CANNON, 1)[0].amount).toBe(5);
    expect(getJokerEffectsAtLevel(JOKER_IDS.GLASS_CANNON, 2)[0].amount).toBe(7);
    expect(getJokerEffectsAtLevel(JOKER_IDS.GLASS_CANNON, 3)[0].amount).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 60: Contraband — 2x/3x/4x sell multiplier with confiscation risk
// ─────────────────────────────────────────────────────────────────────────────
describe('Contraband (60) — multiplier', () => {
  it('L1 applies 2x multiplier', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.CONTRABAND, 1)],
    });
    // multiplier = 1 + (2-1) = 2; finalProfit = 1000; total = 1500
    expect(result.totalGain).toBe(1500);
    expect(result.jokerMultiplier).toBe(2);
  });

  it('L3 applies 4x multiplier', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.CONTRABAND, 3)],
    });
    // multiplier = 4; finalProfit = 2000; total = 2500
    expect(result.totalGain).toBe(2500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 61: All In — multiplier when selling full stack AND cash is below threshold
// ─────────────────────────────────────────────────────────────────────────────
describe('All In (61) — full-stack + low-cash multiplier', () => {
  it('L1 fires 4x when selling full stack and cash < $500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 499,
      quantity: 10, // full inventory of 10
      inventory: [{ name: 'M&Ms', quantity: 10 }],
      jokers: [makeJoker(JOKER_IDS.ALL_IN, 1)],
    });
    // multiplier = 1 + 3 = 4; finalProfit = 2000; total = 500 + 2000 = 2500
    expect(result.totalGain).toBe(2500);
    expect(result.jokerMultiplier).toBe(4);
  });

  it('L1 does NOT fire when cash >= $500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 500,
      quantity: 10,
      inventory: [{ name: 'M&Ms', quantity: 10 }],
      jokers: [makeJoker(JOKER_IDS.ALL_IN, 1)],
    });
    expect(result.totalGain).toBe(1000);
  });

  it('L1 does NOT fire when not selling full stack', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 100,
      quantity: 5, // only half of 10
      inventory: [{ name: 'M&Ms', quantity: 10 }],
      jokers: [makeJoker(JOKER_IDS.ALL_IN, 1)],
    });
    // No bonus; totalProfit = 50*5 = 250; total = 250 + 250 = 500
    expect(result.totalGain).toBe(500);
  });

  it('L3 fires 8x when cash < $15000 and full stack', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      currentCash: 14999,
      quantity: 10,
      inventory: [{ name: 'M&Ms', quantity: 10 }],
      jokers: [makeJoker(JOKER_IDS.ALL_IN, 3)],
    });
    // multiplier = 1 + 7 = 8; finalProfit = 4000; total = 500 + 4000 = 4500
    expect(result.totalGain).toBe(4500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 62: Hot Potato — sell_multiplier (factory amounts: 4/6/8)
// ─────────────────────────────────────────────────────────────────────────────
describe('Hot Potato (62) — sell multiplier (and 3-period melt)', () => {
  it('factory amounts: 4 / 6 / 8 (note: comment says 3/5/7 but code is 4/6/8)', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.HOT_POTATO, 1)[0].amount).toBe(4);
    expect(getJokerEffectsAtLevel(JOKER_IDS.HOT_POTATO, 2)[0].amount).toBe(6);
    expect(getJokerEffectsAtLevel(JOKER_IDS.HOT_POTATO, 3)[0].amount).toBe(8);
  });

  it('L1 applies 4x multiplier', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.HOT_POTATO, 1)],
    });
    // multiplier = 1 + (4-1) = 4; finalProfit = 2000; total = 500 + 2000 = 2500
    expect(result.totalGain).toBe(2500);
    expect(result.jokerMultiplier).toBe(4);
  });

  it('L3 applies 8x multiplier', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.HOT_POTATO, 3)],
    });
    // multiplier = 8; finalProfit = 4000; total = 4500
    expect(result.totalGain).toBe(4500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 63: Compound Interest — already covered comprehensively; registry sanity only
// ─────────────────────────────────────────────────────────────────────────────
describe('Compound Interest (63) — sanity check', () => {
  it('factory: compound_interest_profit_boost 1.2/1.4/1.6', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.COMPOUND_INTEREST, 1)[0].amount).toBe(1.2);
    expect(getJokerEffectsAtLevel(JOKER_IDS.COMPOUND_INTEREST, 2)[0].amount).toBe(1.4);
    expect(getJokerEffectsAtLevel(JOKER_IDS.COMPOUND_INTEREST, 3)[0].amount).toBe(1.6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 64: Reputation — +20%/+30%/+40% profit per unique candy ever sold
// ─────────────────────────────────────────────────────────────────────────────
describe('Reputation (64) — per-unique-type profit boost', () => {
  it('L1 with 0 unique types sold: no bonus', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.REPUTATION, 1)],
      reputationTypesSold: 0,
    });
    expect(result.totalGain).toBe(1000);
  });

  it('L1 with 3 unique types sold: +60% profit boost', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.REPUTATION, 1)],
      reputationTypesSold: 3,
    });
    // bonus = 0.2 * 3 = 0.6; profitBoost = 1.6; boosted = 800; total = 500 + 800 = 1300
    expect(result.totalGain).toBe(1300);
  });

  it('L3 with 5 unique types sold: +200% profit boost', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.REPUTATION, 3)],
      reputationTypesSold: 5,
    });
    // bonus = 0.4 * 5 = 2.0; profitBoost = 3.0; boosted = 1500; total = 500 + 1500 = 2000
    expect(result.totalGain).toBe(2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 65: Street Smarts — +50%/+75%/+100% multiplier per event survived
// (factory amounts are 0.5/0.75/1.0, NOT 0.1/0.15/0.2 as the comment claims)
// ─────────────────────────────────────────────────────────────────────────────
describe('Street Smarts (65) — per-event-survived multiplier', () => {
  it('factory amounts: 0.5 / 0.75 / 1.0 (note: comment says 10%/15%/20% but code is 50%/75%/100%)', () => {
    expect(getJokerEffectsAtLevel(JOKER_IDS.STREET_SMARTS, 1)[0].amount).toBe(0.5);
    expect(getJokerEffectsAtLevel(JOKER_IDS.STREET_SMARTS, 2)[0].amount).toBe(0.75);
    expect(getJokerEffectsAtLevel(JOKER_IDS.STREET_SMARTS, 3)[0].amount).toBe(1.0);
  });

  it('L1 with 0 events survived: no bonus', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.STREET_SMARTS, 1)],
      streetSmartsEventsSurvived: 0,
    });
    expect(result.totalGain).toBe(1000);
  });

  it('L1 with 2 events survived: +1.0 mult (2*0.5)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.STREET_SMARTS, 1)],
      streetSmartsEventsSurvived: 2,
    });
    // multiplier = 1 + (0.5*2) = 2; finalProfit = 500*2 = 1000; total = 500 + 1000 = 1500
    expect(result.totalGain).toBe(1500);
    expect(result.jokerMultiplier).toBe(2);
  });

  it('L3 with 4 events survived: +4.0 mult (4*1.0)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.STREET_SMARTS, 3)],
      streetSmartsEventsSurvived: 4,
    });
    // multiplier = 1 + 4.0 = 5; finalProfit = 500*5 = 2500; total = 500 + 2500 = 3000
    expect(result.totalGain).toBe(3000);
  });
});
