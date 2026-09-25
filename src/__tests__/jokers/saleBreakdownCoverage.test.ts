import { calculateSaleTotal } from '../../utils/saleCalculations';
import {
  getJokerEffectsAtLevel,
  JokerEffect,
} from '../../utils/jokerEffectEngine';
import { JOKER_IDS, JOKER_NAMES } from '../../constants/jokerIds';
import { CANDY_REGISTRY } from '../../constants/candyRegistry';

/**
 * Coverage guarantee: every joker whose effect contributes to a SALE's
 * profit-boost or multiplier buckets must produce a `bonusBreakdown` entry
 * (that's what the transaction modal renders in its profit-boost / multiplier
 * sections). This test activates each such joker under conditions where its
 * effect fires and asserts the joker shows up. A profit/mult joker with no
 * activation recipe here fails loudly — forcing new jokers to be covered.
 *
 * Regression origin: Lucky 7 only fired on a sporadic absolute period, so it
 * was effectively never visible in the modal.
 */

// Effect targets handled in saleCalculations that push a bonusBreakdown entry.
const SALE_BREAKDOWN_TARGETS = new Set<string>([
  'sell_flat_bonus',
  'type_multiplier',
  'size_multiplier',
  'bulk_sale_boost',
  'tax_collector_boost',
  'flip_artist_boost',
  'combo_platter_boost',
  'triple_threat_boost',
  'conditional_profit_boost',
  'first_sale_profit_boost',
  'cash_under_profit_boost',
  'variety_pack_profit_boost',
  'peak_hours_profit_boost',
  'momentum_profit_boost',
  'compound_interest_profit_boost',
  'reputation_profit_boost',
  'street_smarts_boost',
  'clearance_sale_boost',
  'penny_wise_boost',
  'hoarder_boost',
  'survivor_boost',
  'lucky_proc_mult',
  'lucky_seven_boost',
  'night_owl_boost',
  'last_stand_boost',
  'diversifier_boost',
  'patience_pays_boost',
  'glass_cannon_boost',
  'contraband_boost',
  'all_in_boost',
  'next_sale_multiplier',
  'sell_multiplier',
  'collector_boost',
  'minimalist_boost',
  'location_change_boost',
]);

// Combo Platter and Triple Threat need bespoke multi-joker setups, so they get
// dedicated tests below and are excluded from the generic sweep.
const SPECIAL_CASE_IDS = new Set<number>([
  JOKER_IDS.COMBO_PLATTER,
  JOKER_IDS.TRIPLE_THREAT,
]);

const candyByType = (type: string) =>
  CANDY_REGISTRY.find((c) => c.types.includes(type as never))?.name;
const candyBySize = (size: string) =>
  CANDY_REGISTRY.find((c) => c.size === size)?.name;

// A generous base context: a profitable sale with neutral conditions.
const baseContext = () => ({
  candyName: 'Gummy Bears',
  basePrice: 100,
  purchasePrice: 10, // 10x markup → satisfies Flip Artist too
  quantity: 1,
  jokers: [] as any[],
  periodCount: 0,
  inventoryLimit: 30, // even → satisfies even-parity conditional jokers
  activeEffects: [],
  merchantEffects: [],
  consecutivePeriodSales: 0,
  totalCandiesSold: 0,
  hasEarlySaleToday: false, // first sale of day
  currentCash: 0, // under any threshold
  period: 1,
  periodsPerDay: 8,
  didSellPreviousPeriod: true,
  ownedJokerCount: 0,
  uniqueTypesSoldThisPeriod: 0,
  salesTransactionCount: 0,
  previousLocation: 'gym',
  currentLocation: 'cafeteria', // changed location
});

// Per-target overrides that make the effect fire, plus the candy to sell.
function activate(effect: JokerEffect): { overrides: any; candyName?: string } {
  const c = effect.conditions ?? {};
  switch (effect.target) {
    case 'type_multiplier':
      return { overrides: {}, candyName: candyByType(c.candyType as string) };
    case 'size_multiplier':
      return { overrides: {}, candyName: candyBySize(c.candySize as string) };
    case 'bulk_sale_boost':
      return { overrides: { quantity: (c.bulkThreshold ?? 10) as number } };
    case 'conditional_profit_boost':
    case 'conditional_multiplier':
      // even-parity uses inventoryLimit (base is even); period:-1 needs late period
      return c.period === -1
        ? { overrides: { period: 7 } }
        : { overrides: {} };
    case 'peak_hours_profit_boost':
      return { overrides: { period: 4 } };
    case 'lucky_seven_boost':
      return { overrides: { period: 7 } };
    case 'night_owl_boost':
      return { overrides: { period: 8 } };
    case 'momentum_profit_boost':
      return { overrides: { consecutivePeriodSales: 3 } };
    case 'compound_interest_profit_boost':
      return { overrides: { compoundInterestDays: 2 } };
    case 'reputation_profit_boost':
      return { overrides: { reputationTypesSold: 3 } };
    case 'street_smarts_boost':
      return { overrides: { streetSmartsEventsSurvived: 3 } };
    case 'clearance_sale_boost':
      return { overrides: { clearanceSaleStacks: 3 } };
    case 'penny_wise_boost':
      return { overrides: { pennyWiseStashes: 3 } };
    case 'hoarder_boost':
      return { overrides: { hoarderMaxHits: 3 } };
    case 'survivor_boost':
      return { overrides: { survivorCandiesMelted: 3 } };
    case 'diversifier_boost':
      return { overrides: { uniqueTypesSoldThisPeriod: 3 } };
    case 'patience_pays_boost':
      return { overrides: { didSellPreviousPeriod: false } };
    case 'last_stand_boost':
      return { overrides: { quantity: 1 } };
    case 'collector_boost':
    case 'minimalist_boost':
      return { overrides: { ownedJokerCount: 3 } };
    case 'variety_pack_profit_boost':
      return {
        overrides: {
          inventory: CANDY_REGISTRY.slice(0, 5).map((c2) => ({
            name: c2.name,
            quantity: 1,
          })),
        },
      };
    // Always-active targets (given the base context): sell_flat_bonus,
    // tax_collector_boost, flip_artist_boost, first_sale_profit_boost,
    // cash_under_profit_boost, all_in_boost, glass_cannon_boost,
    // contraband_boost, next_sale_multiplier, sell_multiplier,
    // location_change_boost.
    default:
      return { overrides: {} };
  }
}

describe('Transaction modal breakdown coverage', () => {
  let randomSpy: jest.SpyInstance;
  beforeAll(() => {
    // Force chance-based effects (Sixth Sense / lucky_proc_mult) to proc.
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterAll(() => randomSpy.mockRestore());

  // Build the list of jokers that have a sale-display effect.
  const saleJokers = (
    Object.keys(JOKER_NAMES) as unknown as number[]
  )
    .map((k) => Number(k))
    .filter((id) => !SPECIAL_CASE_IDS.has(id))
    .map((id) => {
      const effects = getJokerEffectsAtLevel(id, 1);
      const effect = effects.find((e) => SALE_BREAKDOWN_TARGETS.has(e.target));
      return { id, name: JOKER_NAMES[id], effect };
    })
    .filter((j) => j.effect);

  it('covers a meaningful number of profit/mult jokers', () => {
    // Guards against the sweep silently matching nothing.
    expect(saleJokers.length).toBeGreaterThan(20);
  });

  it.each(saleJokers.map((j) => [j.name, j.id]))(
    '%s shows up in the sale breakdown when active',
    (name, id) => {
      const effects = getJokerEffectsAtLevel(id as number, 1);
      const effect = effects.find((e) => SALE_BREAKDOWN_TARGETS.has(e.target))!;
      const { overrides, candyName } = activate(effect);

      const result = calculateSaleTotal({
        ...baseContext(),
        ...(candyName ? { candyName } : {}),
        ...overrides,
        jokers: [{ id, level: 1 }],
      } as any);

      const shown = result.bonusBreakdown.some((b) => b.name === name);
      expect(shown).toBe(true);
    }
  );

  it('Combo Platter shows up when both candy types are covered', () => {
    // Need a 2-type candy and a type joker covering EACH of its types.
    const candy = CANDY_REGISTRY.find((c) => c.types.length === 2)!;
    const typeJokerFor = (type: string) =>
      (Object.keys(JOKER_NAMES) as unknown as number[])
        .map(Number)
        .find((id) => {
          if (id === JOKER_IDS.COMBO_PLATTER) return false;
          return getJokerEffectsAtLevel(id, 1).some(
            (e) =>
              e.target === 'type_multiplier' &&
              e.conditions?.candyType === type
          );
        });
    const j1 = typeJokerFor(candy.types[0]);
    const j2 = typeJokerFor(candy.types[1]);
    expect(j1).toBeDefined();
    expect(j2).toBeDefined();

    const result = calculateSaleTotal({
      ...baseContext(),
      candyName: candy.name,
      jokers: [
        { id: JOKER_IDS.COMBO_PLATTER, level: 1 },
        { id: j1, level: 1 },
        { id: j2, level: 1 },
      ],
    } as any);

    expect(
      result.bonusBreakdown.some((b) => b.name === 'Combo Platter')
    ).toBe(true);
  });

  it('Triple Threat shows up on its every-3rd sale', () => {
    const result = calculateSaleTotal({
      ...baseContext(),
      jokers: [{ id: JOKER_IDS.TRIPLE_THREAT, level: 1 }],
      salesTransactionCount: 2, // this sale is the 3rd → fires
    } as any);

    expect(
      result.bonusBreakdown.some((b) => b.name === 'Triple Threat')
    ).toBe(true);
  });

  it('Lucky 7 shows up on the 7th period of the day (regression)', () => {
    const onPeriod7 = calculateSaleTotal({
      ...baseContext(),
      jokers: [{ id: JOKER_IDS.LUCKY_7, level: 1 }],
      period: 7,
    } as any);
    expect(
      onPeriod7.bonusBreakdown.some((b) => b.name === 'Lucky 7')
    ).toBe(true);

    const offPeriod = calculateSaleTotal({
      ...baseContext(),
      jokers: [{ id: JOKER_IDS.LUCKY_7, level: 1 }],
      period: 3,
    } as any);
    expect(
      offPeriod.bonusBreakdown.some((b) => b.name === 'Lucky 7')
    ).toBe(false);
  });
});
