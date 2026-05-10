/**
 * Coverage tests for jokers with id in [1, 30] (inclusive).
 * Asserts EXACT numerical impact for level 1 (and where useful, level 3).
 *
 * Skipped jokers (already covered with strong tests elsewhere):
 *   - Flip Artist (id=2) — covered by jokerEffectMath.test.ts
 *
 * Pattern mirrors compoundInterest.test.ts — instantiates a joker via
 * makeJoker(JOKER_IDS.X, level) and asserts on totalGain / jokerMultiplier.
 *
 * For instant/UI-driven jokers (Double Up id=1, Bake Sale id=16, Market
 * Manipulation id=20, Bet You I'm Faster id=25), we only assert the registry
 * shape (id, name, type, maxLevel) and that handlers exist — not end-to-end.
 */

import * as fs from 'fs';
import * as path from 'path';
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

// Base: M&Ms — types ['chocolate', 'hard_candy'], size 'small'.
// $50 profit/unit × 10 qty → totalProfit 500, purchaseValue 500.
// Default totalGain (no jokers) = 500 + (500 × 1 × 1) = 1000.
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
};

// Read JokerCard.tsx once for instant-joker handler-presence assertions.
const JOKER_CARD_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../../app/components/JokerCard.tsx'),
  'utf8'
);

function findStandardized(id: number) {
  return STANDARDIZED_JOKERS.find((j: any) => j.id === id);
}

// ---------------------------------------------------------------------------
// 1: Double Up — instant, UI-driven (one-time)
// ---------------------------------------------------------------------------
describe('Double Up (ID 1) — registry + handler', () => {
  it('registry: id=1, type=one-time, maxLevel=3', () => {
    const j = findStandardized(1);
    expect(j).toBeDefined();
    expect(j!.id).toBe(1);
    expect(j!.name).toBe('Double Up');
    expect(j!.type).toBe('one-time');
    expect(j!.maxLevel).toBe(3);
  });

  it('JokerCard.tsx wires JOKER_IDS.DOUBLE_UP to candy selector', () => {
    expect(JOKER_CARD_SRC).toContain('JOKER_IDS.DOUBLE_UP');
  });

  it('factory: candy_price multiply 2/3/4 by level', () => {
    expect(getJokerEffectsAtLevel(1, 1)[0].amount).toBe(2);
    expect(getJokerEffectsAtLevel(1, 2)[0].amount).toBe(3);
    expect(getJokerEffectsAtLevel(1, 3)[0].amount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 6: Tapped In — hint_chance (utility, not sale-time math)
// ---------------------------------------------------------------------------
describe('Tapped In (ID 6) — hint utility', () => {
  it('factory sets hint_chance to 1 (always)', () => {
    const fx = getJokerEffectsAtLevel(6, 1);
    expect(fx[0].target).toBe('hint_chance');
    expect(fx[0].operation).toBe('set');
    expect(fx[0].amount).toBe(1);
  });

  it('does NOT change sale-time math', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.TAPPED_IN, 1)],
    });
    // Baseline 1000 — Tapped In is non-numeric utility.
    expect(result.totalGain).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 8: Combo Platter — +1x/+1.5x/+2x bonus when both candy types covered
// M&Ms types are chocolate + hard_candy. To cover both we add Cocoa Futures
// (chocolate) and Hard Knocks (hard_candy) jokers.
// ---------------------------------------------------------------------------
describe('Combo Platter (ID 8) — both-types-covered bonus', () => {
  it('level 1: +1.0 to profit boost when both M&Ms types covered → 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [
        makeJoker(JOKER_IDS.COMBO_PLATTER, 1), // +1
        makeJoker(JOKER_IDS.COCOA_FUTURES, 1), // 1.5x choc → +0.5 boost
        makeJoker(JOKER_IDS.HARD_KNOCKS, 1), //  1.5x hard → +0.5 boost
      ],
    });
    // profitBoost = 1 (base) + 0.5 (cocoa) + 0.5 (hard knocks) + 1 (combo) = 3
    // boostedProfit = 500 × 3 = 1500
    // totalGain = 500 (purchase) + 1500 = 2000
    expect(result.totalGain).toBe(2000);
  });

  it('does NOT fire if only one type covered', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [
        makeJoker(JOKER_IDS.COMBO_PLATTER, 1),
        makeJoker(JOKER_IDS.COCOA_FUTURES, 1), // only chocolate covered
      ],
    });
    // profitBoost = 1 + 0.5 = 1.5; boosted = 750; totalGain = 500 + 750 = 1250
    expect(result.totalGain).toBe(1250);
  });

  it('level 3: +2.0 boost when both covered', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [
        makeJoker(JOKER_IDS.COMBO_PLATTER, 3),
        makeJoker(JOKER_IDS.COCOA_FUTURES, 1),
        makeJoker(JOKER_IDS.HARD_KNOCKS, 1),
      ],
    });
    // profitBoost = 1 + 0.5 + 0.5 + 2 = 4; boosted = 2000; totalGain = 2500
    expect(result.totalGain).toBe(2500);
  });
});

// ---------------------------------------------------------------------------
// 9: Data Compression — Inventory +13/+26/+39
// Wired through jokerService applyJokerEffects → 'inventory_limit'.
// ---------------------------------------------------------------------------
describe('Data Compression (ID 9) — inventory_limit', () => {
  it('factory: +13/+26/+39 inventory by level', () => {
    expect(getJokerEffectsAtLevel(9, 1)[0].amount).toBe(13);
    expect(getJokerEffectsAtLevel(9, 2)[0].amount).toBe(26);
    expect(getJokerEffectsAtLevel(9, 3)[0].amount).toBe(39);
  });

  it('does NOT change sale-time math', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.DATA_COMPRESSION, 1)],
    });
    expect(result.totalGain).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 11: Farmers Carry — $5/$25/$100 per inventory item per period
// Consumer: src/hooks/useFarmersCarry.ts (target 'farmers_carry_bonus').
// ---------------------------------------------------------------------------
describe('Farmers Carry (ID 11) — farmers_carry_bonus', () => {
  it('factory: $5/$25/$100 per candy by level', () => {
    expect(getJokerEffectsAtLevel(11, 1)[0].amount).toBe(5);
    expect(getJokerEffectsAtLevel(11, 2)[0].amount).toBe(25);
    expect(getJokerEffectsAtLevel(11, 3)[0].amount).toBe(100);
    expect(getJokerEffectsAtLevel(11, 1)[0].target).toBe('farmers_carry_bonus');
  });
});

// ---------------------------------------------------------------------------
// 12: Vacuum Sealer — 2x inventory, -2 final mult (min 1x)
// Consumer: saleCalculations.ts (subtracts 2 from multiplier).
// ---------------------------------------------------------------------------
describe('Vacuum Sealer (ID 12) — final-mult penalty', () => {
  it('on its own: subtracts 2 from multiplier, min 1x → totalGain 1000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.VACUUM_SEALER, 1)],
    });
    // base mult = 1 → 1 - 2 = -1 → clamped to 1. boosted=500, final=500.
    // totalGain = 500 + 500 = 1000
    expect(result.totalGain).toBe(1000);
    expect(result.jokerMultiplier).toBe(1);
  });

  it('cancels 2 of multiplier from a stacking joker (Sugar Rush 2x)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [
        makeJoker(JOKER_IDS.SUGAR_RUSH, 1), // 2x mult → +1 to multiplier
        makeJoker(JOKER_IDS.VACUUM_SEALER, 1),
      ],
    });
    // multiplier = 1 (base) + 1 (sugar rush adds 2x-1=1) = 2; vacuum: max(1, 2-2)=1
    // boosted = 500, final = 500; totalGain = 500 + 500 = 1000
    expect(result.totalGain).toBe(1000);
    expect(result.jokerMultiplier).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 15: Perfect Bake — $1k/$3k/$5k for ending day with 0 inventory
// Consumer: src/utils/endDayBonuses.ts.
// ---------------------------------------------------------------------------
describe('Perfect Bake (ID 15) — end-day bonus', () => {
  it('level 1 fires when totalInventoryCount === 0 → $1000 bonus', () => {
    const bonuses = computeEndDayBonuses({
      jokers: [makeJoker(JOKER_IDS.PERFECT_BAKE, 1)],
      totalInventoryCount: 0,
      inventoryLimit: 30,
    });
    const pb = bonuses.find((b) => b.jokerName === 'Perfect Bake');
    expect(pb).toBeDefined();
    expect(pb!.amount).toBe(1000);
  });

  it('level 3 fires for $5000', () => {
    const bonuses = computeEndDayBonuses({
      jokers: [makeJoker(JOKER_IDS.PERFECT_BAKE, 3)],
      totalInventoryCount: 0,
      inventoryLimit: 30,
    });
    const pb = bonuses.find((b) => b.jokerName === 'Perfect Bake');
    expect(pb!.amount).toBe(5000);
  });

  it('does NOT fire when inventory > 0', () => {
    const bonuses = computeEndDayBonuses({
      jokers: [makeJoker(JOKER_IDS.PERFECT_BAKE, 1)],
      totalInventoryCount: 5,
      inventoryLimit: 30,
    });
    expect(bonuses.find((b) => b.jokerName === 'Perfect Bake')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 16: Bake Sale — instant +$3k/$6k/$9k (UI-driven via JokerCard)
// ---------------------------------------------------------------------------
describe('Bake Sale (ID 16) — registry + handler', () => {
  it('registry: id=16, type=one-time, maxLevel=3', () => {
    const j = findStandardized(16);
    expect(j).toBeDefined();
    expect(j!.type).toBe('one-time');
    expect(j!.maxLevel).toBe(3);
  });

  it('factory returns no effects (handled imperatively)', () => {
    expect(getJokerEffectsAtLevel(16, 1)).toEqual([]);
  });

  it('JokerCard.tsx wires JOKER_IDS.BAKE_SALE handler', () => {
    expect(JOKER_CARD_SRC).toContain('JOKER_IDS.BAKE_SALE');
    expect(JOKER_CARD_SRC).toContain('handleBakeSale');
  });
});

// ---------------------------------------------------------------------------
// 17: Home Made — $25/$50/$100 per candy at start of day
// Consumer: src/hooks/useHomeMadeBonus.ts (target 'morning_inventory_bonus').
// ---------------------------------------------------------------------------
describe('Home Made (ID 17) — morning_inventory_bonus', () => {
  it('factory: $25/$50/$100 per candy by level', () => {
    expect(getJokerEffectsAtLevel(17, 1)[0].amount).toBe(25);
    expect(getJokerEffectsAtLevel(17, 2)[0].amount).toBe(50);
    expect(getJokerEffectsAtLevel(17, 3)[0].amount).toBe(100);
    expect(getJokerEffectsAtLevel(17, 1)[0].target).toBe(
      'morning_inventory_bonus'
    );
  });
});

// ---------------------------------------------------------------------------
// 18: Triple Threat — +1/+1.5/+2 mult on every 3rd sale transaction.
// salesTransactionCount = N means this is the (N+1)th sale.
// ---------------------------------------------------------------------------
describe('Triple Threat (ID 18) — every 3rd sale', () => {
  it('level 1: 3rd sale (count=2) adds +1 mult → totalGain 1500', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.TRIPLE_THREAT, 1)],
      salesTransactionCount: 2, // this becomes the 3rd sale
    } as any);
    // multiplier = 1 + 1 = 2; boosted = 500; final = 500 × 2 = 1000
    // totalGain = 500 + 1000 = 1500
    expect(result.totalGain).toBe(1500);
  });

  it('level 1: 1st and 2nd sales do NOT fire', () => {
    const r1 = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.TRIPLE_THREAT, 1)],
      salesTransactionCount: 0,
    } as any);
    const r2 = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.TRIPLE_THREAT, 1)],
      salesTransactionCount: 1,
    } as any);
    expect(r1.totalGain).toBe(1000);
    expect(r2.totalGain).toBe(1000);
  });

  it('level 3: 6th sale (count=5) adds +2 mult → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.TRIPLE_THREAT, 3)],
      salesTransactionCount: 5,
    } as any);
    // multiplier = 1 + 2 = 3; final = 500 × 3 = 1500; totalGain = 500 + 1500 = 2000
    expect(result.totalGain).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// 19: Bear Market — +1.5/+2/+3 mult on Gummy candy
// (factory uses 'add' op, consumer adds amount directly to multiplier)
// ---------------------------------------------------------------------------
describe('Bear Market (ID 19) — Gummy multiplier', () => {
  it('level 1: gummy candy gets +1.5 mult → totalGain 1750', () => {
    // Use Gummy Bears (gummy + chewy), basePrice 2, purchase 1, qty 100
    // profit/unit = 1, totalProfit = 100, purchaseValue = 100.
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Gummy Bears',
      basePrice: 2,
      purchasePrice: 1,
      quantity: 100,
      inventory: [{ name: 'Gummy Bears', quantity: 100 }],
      jokers: [makeJoker(JOKER_IDS.BEAR_MARKET, 1)],
    });
    // multiplier = 1 + 1.5 = 2.5; profitBoost = 1; boosted = 100; final = 250
    // totalGain = 100 + 250 = 350
    expect(result.totalGain).toBe(350);
  });

  it('does NOT fire on non-gummy candy (M&Ms = chocolate + hard_candy)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.BEAR_MARKET, 1)],
    });
    expect(result.totalGain).toBe(1000);
    expect(result.jokerMultiplier).toBe(1);
  });

  it('level 3: +3 mult on gummy', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Gummy Bears',
      basePrice: 2,
      purchasePrice: 1,
      quantity: 100,
      inventory: [{ name: 'Gummy Bears', quantity: 100 }],
      jokers: [makeJoker(JOKER_IDS.BEAR_MARKET, 3)],
    });
    // multiplier = 1 + 3 = 4; final = 100 × 4 = 400; totalGain = 500
    expect(result.totalGain).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// 20: Market Manipulation — instant, UI-driven (one-time, not upgradeable)
// ---------------------------------------------------------------------------
describe('Market Manipulation (ID 20) — registry + handler', () => {
  it('registry: id=20, type=one-time, maxLevel=1', () => {
    const j = findStandardized(20);
    expect(j).toBeDefined();
    expect(j!.type).toBe('one-time');
    expect(j!.maxLevel).toBe(1);
  });

  it('factory: market_manipulation match_highest one-time', () => {
    const fx = getJokerEffectsAtLevel(20, 1);
    expect(fx[0].target).toBe('market_manipulation');
    expect(fx[0].operation).toBe('match_highest');
    expect(fx[0].duration).toBe('one-time');
  });

  it('JokerCard.tsx wires JOKER_IDS.MARKET_MANIPULATION', () => {
    expect(JOKER_CARD_SRC).toContain('JOKER_IDS.MARKET_MANIPULATION');
  });
});

// ---------------------------------------------------------------------------
// 22: Deposit Bonus — 5%/10%/15% of stash as daily allowance.
// Consumer: src/hooks/useWallet.ts (target 'stash_allowance_bonus').
// ---------------------------------------------------------------------------
describe('Deposit Bonus (ID 22) — stash_allowance_bonus', () => {
  it('factory: 0.05/0.10/0.15 by level', () => {
    expect(getJokerEffectsAtLevel(22, 1)[0].amount).toBeCloseTo(0.05);
    expect(getJokerEffectsAtLevel(22, 2)[0].amount).toBeCloseTo(0.1);
    expect(getJokerEffectsAtLevel(22, 3)[0].amount).toBeCloseTo(0.15);
    expect(getJokerEffectsAtLevel(22, 1)[0].target).toBe(
      'stash_allowance_bonus'
    );
  });
});

// ---------------------------------------------------------------------------
// 23: Cocoa Futures — 1.5x/2x/3x mult Chocolate (profit-boost path)
// ---------------------------------------------------------------------------
describe('Cocoa Futures (ID 23) — Chocolate profit boost', () => {
  it('level 1: 1.5x on chocolate (M&Ms) → totalGain 1250', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.COCOA_FUTURES, 1)],
    });
    // profitBoost = 1 + 0.5 = 1.5; boosted = 750; totalGain = 500 + 750 = 1250
    expect(result.totalGain).toBe(1250);
  });

  it('level 3: 3x on chocolate → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.COCOA_FUTURES, 3)],
    });
    // profitBoost = 1 + 2 = 3; boosted = 1500; totalGain = 500 + 1500 = 2000
    expect(result.totalGain).toBe(2000);
  });

  it('does NOT fire on non-chocolate (Gummy Bears)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Gummy Bears',
      basePrice: 2,
      purchasePrice: 1,
      quantity: 100,
      inventory: [{ name: 'Gummy Bears', quantity: 100 }],
      jokers: [makeJoker(JOKER_IDS.COCOA_FUTURES, 1)],
    });
    // No boost, totalGain = 100 + 100 = 200
    expect(result.totalGain).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 24: Shrinking Glass — Deli 50%/75%/90% off
// Consumer: app/deli.tsx — uses hardcoded multiplier by JOKER_IDS check.
// We assert the factory amounts match the deli's hardcoded values.
// ---------------------------------------------------------------------------
describe('Shrinking Glass (ID 24) — deli discount', () => {
  it('factory: deli_price_discount 0.5/0.25/0.1 by level', () => {
    expect(getJokerEffectsAtLevel(24, 1)[0].amount).toBeCloseTo(0.5);
    expect(getJokerEffectsAtLevel(24, 2)[0].amount).toBeCloseTo(0.25);
    expect(getJokerEffectsAtLevel(24, 3)[0].amount).toBeCloseTo(0.1);
    expect(getJokerEffectsAtLevel(24, 1)[0].target).toBe('deli_price_discount');
  });

  it('does NOT change sale-time math', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.SHRINKING_GLASS, 1)],
    });
    expect(result.totalGain).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 25: Bet You I'm Faster — instant inventory fill (UI-driven)
// ---------------------------------------------------------------------------
describe("Bet You I'm Faster (ID 25) — registry + handler", () => {
  it('registry: id=25, type=one-time, maxLevel=1', () => {
    const j = findStandardized(25);
    expect(j).toBeDefined();
    expect(j!.type).toBe('one-time');
    expect(j!.maxLevel).toBe(1);
  });

  it('factory: fill_inventory_choice activate one-time', () => {
    const fx = getJokerEffectsAtLevel(25, 1);
    expect(fx[0].target).toBe('fill_inventory_choice');
    expect(fx[0].operation).toBe('activate');
    expect(fx[0].duration).toBe('one-time');
  });

  it('JokerCard.tsx wires JOKER_IDS.BET_YOU_IM_FASTER', () => {
    expect(JOKER_CARD_SRC).toContain('JOKER_IDS.BET_YOU_IM_FASTER');
  });
});

// ---------------------------------------------------------------------------
// 26: Hard Knocks — 1.5x/2x/3x mult Hard Candy (profit-boost path).
// M&Ms includes hard_candy.
// ---------------------------------------------------------------------------
describe('Hard Knocks (ID 26) — Hard Candy profit boost', () => {
  it('level 1: 1.5x on M&Ms (hard_candy) → totalGain 1250', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.HARD_KNOCKS, 1)],
    });
    expect(result.totalGain).toBe(1250);
  });

  it('does NOT fire on non-hard_candy (Gummy Bears)', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      candyName: 'Gummy Bears',
      basePrice: 2,
      purchasePrice: 1,
      quantity: 100,
      inventory: [{ name: 'Gummy Bears', quantity: 100 }],
      jokers: [makeJoker(JOKER_IDS.HARD_KNOCKS, 1)],
    });
    expect(result.totalGain).toBe(200);
  });

  it('level 3: 3x → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.HARD_KNOCKS, 3)],
    });
    expect(result.totalGain).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// 29: Even Stevens — 1.5x/2x/3x ALL when inventory limit is even.
// (conditional_profit_boost path).
// ---------------------------------------------------------------------------
describe('Even Stevens (ID 29) — even inventoryLimit profit boost', () => {
  it('level 1: inventoryLimit 30 (even) → +0.5 boost → totalGain 1250', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.EVEN_STEVENS, 1)],
      inventoryLimit: 30,
    });
    expect(result.totalGain).toBe(1250);
  });

  it('does NOT fire when inventoryLimit is odd', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.EVEN_STEVENS, 1)],
      inventoryLimit: 31,
    });
    expect(result.totalGain).toBe(1000);
  });

  it('level 3: 3x → +2 profit boost → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.EVEN_STEVENS, 3)],
      inventoryLimit: 30,
    });
    expect(result.totalGain).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// 30: Odd Todd — 1.5x/2x/3x ALL when inventory limit is odd.
// (conditional_multiplier path — adds (amount-1) to multiplier).
// ---------------------------------------------------------------------------
describe('Odd Todd (ID 30) — odd inventoryLimit multiplier', () => {
  it('level 1: inventoryLimit 31 (odd) → +0.5 mult → totalGain 1250', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.ODD_TODD, 1)],
      inventoryLimit: 31,
    });
    // multiplier = 1 + 0.5 = 1.5; final = 500 × 1.5 = 750; totalGain = 500 + 750 = 1250
    expect(result.totalGain).toBe(1250);
    expect(result.jokerMultiplier).toBeCloseTo(1.5);
  });

  it('does NOT fire when inventoryLimit is even', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.ODD_TODD, 1)],
      inventoryLimit: 30,
    });
    expect(result.totalGain).toBe(1000);
  });

  it('level 3: 3x mult on odd inv → totalGain 2000', () => {
    const result = calculateSaleTotal({
      ...baseSaleParams,
      jokers: [makeJoker(JOKER_IDS.ODD_TODD, 3)],
      inventoryLimit: 31,
    });
    expect(result.totalGain).toBe(2000);
    expect(result.jokerMultiplier).toBeCloseTo(3);
  });
});
