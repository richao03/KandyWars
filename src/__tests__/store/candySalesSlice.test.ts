import { createMockStore } from '../utils/testStore';
import {
  addSale,
  clearSales,
  resetEarlySaleFlag,
  resetCandySales,
  selectSalesByPeriod,
  selectRevenueByPeriod,
} from '../../store/slices/candySalesSlice';

const makeSale = (overrides: Record<string, any> = {}) => ({
  candyId: 'candy_001',
  candyName: 'Gummy Bear',
  quantity: 5,
  price: 2.0,
  total: 10.0,
  timestamp: Date.now(),
  period: 1,
  ...overrides,
});

describe('candySalesSlice', () => {
  it('should have empty sales array in initial state', () => {
    const store = createMockStore();
    const state = store.getState().candySales;

    expect(state.sales).toEqual([]);
    expect(state.totalRevenue).toBe(0);
    expect(state.totalCandiesSold).toBe(0);
    expect(state.hasEarlySaleToday).toBe(false);
    expect(state.transactionCount).toBe(0);
  });

  it('addSale records a sale with correct fields', () => {
    const store = createMockStore();
    const sale = makeSale();
    store.dispatch(addSale(sale));

    const state = store.getState().candySales;
    expect(state.sales).toHaveLength(1);
    expect(state.sales[0].candyId).toBe('candy_001');
    expect(state.sales[0].candyName).toBe('Gummy Bear');
    expect(state.sales[0].quantity).toBe(5);
    expect(state.sales[0].total).toBe(10.0);
    expect(state.transactionCount).toBe(1);
  });

  it('addSale accumulates multiple sales', () => {
    const store = createMockStore();
    store.dispatch(addSale(makeSale({ period: 1 })));
    store.dispatch(addSale(makeSale({ candyId: 'candy_002', candyName: 'Lollipop', period: 1 })));
    store.dispatch(addSale(makeSale({ candyId: 'candy_003', candyName: 'Taffy', period: 2 })));

    const state = store.getState().candySales;
    expect(state.sales.length).toBe(3);
    expect(state.transactionCount).toBe(3);
  });

  it('total revenue tracks correctly across sales', () => {
    const store = createMockStore();
    store.dispatch(addSale(makeSale({ total: 10.0, period: 1 })));
    store.dispatch(addSale(makeSale({ total: 25.5, period: 1 })));
    store.dispatch(addSale(makeSale({ total: 7.0, period: 2 })));

    expect(store.getState().candySales.totalRevenue).toBeCloseTo(42.5);
  });

  it('total candies sold tracks correctly', () => {
    const store = createMockStore();
    store.dispatch(addSale(makeSale({ quantity: 5, period: 1 })));
    store.dispatch(addSale(makeSale({ quantity: 3, period: 1 })));
    store.dispatch(addSale(makeSale({ quantity: 12, period: 2 })));

    expect(store.getState().candySales.totalCandiesSold).toBe(20);
  });

  it('sales history is pruned to keep only last 10 periods', () => {
    const store = createMockStore();

    // Add sales across a wide range of periods
    for (let p = 1; p <= 15; p++) {
      store.dispatch(addSale(makeSale({ period: p })));
    }

    const state = store.getState().candySales;
    // The last sale was at period 15, so minPeriodToKeep = 15 - 10 = 5
    // Only sales with period >= 5 are kept
    const minPeriod = Math.min(...state.sales.map((s: any) => s.period));
    expect(minPeriod).toBeGreaterThanOrEqual(5);
    expect(state.sales.length).toBeLessThan(15);
  });

  it('earlyPeriodProfit tracks profit from periods 1-4', () => {
    const store = createMockStore();
    // Period 1 in day (period value 1, periodInDay = ((1-1) % 8) + 1 = 1)
    store.dispatch(addSale(makeSale({ total: 20.0, period: 1 })));
    // Period 4 in day (period value 4, periodInDay = ((4-1) % 8) + 1 = 4)
    store.dispatch(addSale(makeSale({ total: 15.0, period: 4 })));

    expect(store.getState().candySales.earlyPeriodProfit).toBeCloseTo(35.0);
  });

  it('hasEarlySaleToday is set when selling before the midpoint of the day', () => {
    const store = createMockStore();
    // For 8-period days, earlyThreshold = ceil(8/2) = 4
    // periodInDay for period 2 = ((2-1) % 8) + 1 = 2, which is < 4
    store.dispatch(addSale(makeSale({ period: 2 })));

    expect(store.getState().candySales.hasEarlySaleToday).toBe(true);
  });

  it('hasEarlySaleToday is NOT set when selling at or after the midpoint', () => {
    const store = createMockStore();
    // periodInDay for period 4 = ((4-1) % 8) + 1 = 4, earlyThreshold = 4
    // 4 is NOT < 4, so early flag should not be set
    store.dispatch(addSale(makeSale({ period: 4 })));

    expect(store.getState().candySales.hasEarlySaleToday).toBe(false);
  });

  it('resetEarlySaleFlag clears the early sale flag', () => {
    const store = createMockStore();
    store.dispatch(addSale(makeSale({ period: 1 })));
    expect(store.getState().candySales.hasEarlySaleToday).toBe(true);

    store.dispatch(resetEarlySaleFlag());
    expect(store.getState().candySales.hasEarlySaleToday).toBe(false);
  });

  it('resetCandySales returns to initial state', () => {
    const store = createMockStore();
    store.dispatch(addSale(makeSale({ period: 1 })));
    store.dispatch(addSale(makeSale({ period: 2 })));
    store.dispatch(resetCandySales());

    const state = store.getState().candySales;
    expect(state.sales).toEqual([]);
    expect(state.totalRevenue).toBe(0);
    expect(state.totalCandiesSold).toBe(0);
    expect(state.transactionCount).toBe(0);
  });

  it('selectSalesByPeriod filters sales for a specific period', () => {
    const store = createMockStore();
    store.dispatch(addSale(makeSale({ period: 3 })));
    store.dispatch(addSale(makeSale({ period: 3, candyId: 'candy_002' })));
    store.dispatch(addSale(makeSale({ period: 4 })));

    const period3Sales = selectSalesByPeriod(3)(store.getState() as any);
    expect(period3Sales).toHaveLength(2);
  });

  it('selectRevenueByPeriod calculates revenue for a specific period', () => {
    const store = createMockStore();
    store.dispatch(addSale(makeSale({ total: 10.0, period: 5 })));
    store.dispatch(addSale(makeSale({ total: 20.0, period: 5 })));
    store.dispatch(addSale(makeSale({ total: 99.0, period: 6 })));

    const revenue = selectRevenueByPeriod(5)(store.getState() as any);
    expect(revenue).toBeCloseTo(30.0);
  });
});
