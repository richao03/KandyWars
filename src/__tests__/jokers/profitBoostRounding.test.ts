/**
 * Diagnostic: trace +50% profit joker math end-to-end. The user reports
 * "+50% profit jokers seem to be rounding down" — these tests pin where
 * (if anywhere) precision is lost in the calculateSaleTotal pipeline.
 */
import { calculateSaleTotal } from '../../utils/saleCalculations';

describe('+50% profit joker — precision audit', () => {
  test('Cocoa Futures L1 (1.5x multiply) on chocolate at decimal price', () => {
    const res = calculateSaleTotal({
      candyName: 'M&Ms',
      basePrice: 12.37,
      purchasePrice: 5.13,
      quantity: 3,
      jokers: [{ id: 23, level: 1 }],
      periodCount: 1,
      inventoryLimit: 10,
      activeEffects: [],
      merchantEffects: [],
      consecutivePeriodSales: 0,
      totalCandiesSold: 0,
      hasEarlySaleToday: false,
      inventory: [],
    });

    // profitPerUnit = 12.37 - 5.13 = 7.24
    // totalProfit = 7.24 * 3 = 21.72
    // boostedProfit = 21.72 * 1.5 = 32.58
    // purchaseValue = 5.13 * 3 = 15.39
    // totalGain = 15.39 + 32.58 = 47.97
    expect(res.profitPerUnit).toBeCloseTo(7.24, 2);
    expect(res.totalProfit).toBeCloseTo(21.72, 2);
    expect(res.totalGain - res.purchaseValue).toBeCloseTo(32.58, 2);
    expect(res.totalGain).toBeCloseTo(47.97, 2);
  });

  test('Bulk Discount L1 (+50%) at qty=20', () => {
    const res = calculateSaleTotal({
      candyName: 'Chocolate Bar',
      basePrice: 10,
      purchasePrice: 4,
      quantity: 20,
      jokers: [{ id: 47, level: 1 }],
      periodCount: 1,
      inventoryLimit: 30,
      activeEffects: [],
      merchantEffects: [],
      consecutivePeriodSales: 0,
      totalCandiesSold: 0,
      hasEarlySaleToday: false,
      inventory: [],
    });

    // profit/unit=6, qty=20 → totalProfit=120, +50% → boostedProfit=180
    // purchaseValue=80, totalGain=260
    expect(res.totalProfit).toBe(120);
    expect(res.totalGain - res.purchaseValue).toBe(180);
    expect(res.totalGain).toBe(260);
  });

  test('No joker baseline — totalGain has no rounding', () => {
    const res = calculateSaleTotal({
      candyName: 'Chocolate Bar',
      basePrice: 7.77,
      purchasePrice: 3.33,
      quantity: 1,
      jokers: [],
      periodCount: 1,
      inventoryLimit: 10,
      activeEffects: [],
      merchantEffects: [],
      consecutivePeriodSales: 0,
      totalCandiesSold: 0,
      hasEarlySaleToday: false,
      inventory: [],
    });
    // profit = 4.44, gain = 7.77
    expect(res.totalGain).toBeCloseTo(7.77, 2);
  });

  test('Even Stevens L1 (+50% when inventoryLimit even)', () => {
    const res = calculateSaleTotal({
      candyName: 'Gummy Bears',
      basePrice: 10,
      purchasePrice: 0,
      quantity: 1,
      jokers: [{ id: 29, level: 1 }], // Even Stevens
      periodCount: 1,
      inventoryLimit: 10, // even
      activeEffects: [],
      merchantEffects: [],
      consecutivePeriodSales: 0,
      totalCandiesSold: 0,
      hasEarlySaleToday: false,
      inventory: [],
    });
    // profit=10, +50% → 15
    expect(res.totalGain).toBe(15);
  });

  test('Underdog L1 (+50% when cash < $5k)', () => {
    const res = calculateSaleTotal({
      candyName: 'Gummy Bears',
      basePrice: 10,
      purchasePrice: 0,
      quantity: 1,
      jokers: [{ id: 49, level: 1 }], // Underdog
      periodCount: 1,
      inventoryLimit: 10,
      activeEffects: [],
      merchantEffects: [],
      consecutivePeriodSales: 0,
      totalCandiesSold: 0,
      currentCash: 1000, // below threshold
      hasEarlySaleToday: false,
      inventory: [],
    });
    // profit=10, +50% → 15
    expect(res.totalGain).toBe(15);
  });

  test('Early Bird L1 (+50% on first sale of day)', () => {
    const res = calculateSaleTotal({
      candyName: 'Gummy Bears',
      basePrice: 10,
      purchasePrice: 0,
      quantity: 1,
      jokers: [{ id: 45, level: 1 }], // Early Bird
      periodCount: 1,
      inventoryLimit: 10,
      activeEffects: [],
      merchantEffects: [],
      consecutivePeriodSales: 0,
      totalCandiesSold: 0,
      hasEarlySaleToday: false, // first sale!
      inventory: [],
    });
    // profit=10, +50% → 15
    expect(res.totalGain).toBe(15);
  });

  test('Multi-type stack: M&Ms with both Cocoa Futures L1 (chocolate) AND Hard Knocks L1 (hard_candy)', () => {
    const res = calculateSaleTotal({
      candyName: 'M&Ms', // chocolate + hard_candy
      basePrice: 10,
      purchasePrice: 0,
      quantity: 1,
      jokers: [
        { id: 23, level: 1 }, // Cocoa Futures +50% chocolate
        { id: 26, level: 1 }, // Hard Knocks +50% hard_candy
      ],
      periodCount: 1,
      inventoryLimit: 10,
      activeEffects: [],
      merchantEffects: [],
      consecutivePeriodSales: 0,
      totalCandiesSold: 0,
      hasEarlySaleToday: false,
      inventory: [],
    });
    // Both fire additively: profit=10, +50% +50% = +100% → 20
    expect(res.totalGain).toBe(20);
  });

  test('Street Cred level 5 (+50% profit) appears in bonusBreakdown', () => {
    const res = calculateSaleTotal({
      candyName: 'Gummy Bears',
      basePrice: 10,
      purchasePrice: 0,
      quantity: 1,
      jokers: [],
      periodCount: 1,
      inventoryLimit: 10,
      activeEffects: [],
      merchantEffects: [{ itemId: 'street_cred', level: 5 } as any],
      consecutivePeriodSales: 0,
      totalCandiesSold: 0,
      hasEarlySaleToday: false,
      inventory: [],
    });
    // profit=10, +50% via Street Cred → 15
    expect(res.totalGain).toBe(15);
    const streetCredEntry = res.bonusBreakdown.find((b) => b.name === 'Street Cred');
    expect(streetCredEntry).toBeDefined();
    expect(streetCredEntry?.flatBonus).toBe(5); // 10 * 0.5
  });

  test('Cocoa Futures L1 +50% on integer price', () => {
    const res = calculateSaleTotal({
      candyName: 'M&Ms',
      basePrice: 10,
      purchasePrice: 0,
      quantity: 1,
      jokers: [{ id: 23, level: 1 }],
      periodCount: 1,
      inventoryLimit: 10,
      activeEffects: [],
      merchantEffects: [],
      consecutivePeriodSales: 0,
      totalCandiesSold: 0,
      hasEarlySaleToday: false,
      inventory: [],
    });
    // profit=10, +50% = boosted 15, purchase 0, gain 15
    expect(res.totalGain).toBe(15);
  });
});
